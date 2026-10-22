//! The document host: the one open campaign as Tauri state, and app-kit's `History` and
//! `Document` for it. Edit > Undo and Redo, File > New, Open, Save, the unsaved mark and the
//! close guard all run against this type once app-kit is installed on it.
//!
//! It is Oblique's host (`oblique/src-tauri/src/document/host.rs`) without the `OnceLock` and
//! the held `open`: M&T has no sidecar and no kinds that depend on runtime data, so the
//! [`Pom`] is built at launch.
//!
//! The host owns the shared `Arc<Pom<MapAndTerritory>>`; the transport's [`PomHost`] holds the
//! same one, so the `pom_*` commands the webview calls and this file's Rust see one document.
//!
//! **Events.** The webview listens only to rhizome's `pom://commit` and `pom://status`, which
//! [`rhizome_pom_tauri::emit`] sends for every call that changes the document:
//!
//! | Action | Events |
//! |---|---|
//! | A command through `pom_run`, `pom_begin`/`end`/`cancel` | commit(s), then status if it changed (rhizome-pom-tauri) |
//! | Undo, Redo (menu) | commit, status |
//! | Menu > Map > New Map | commit, status |
//! | File > New, File > Open, Revert | status with a moved `generation`, no commit: the mirror re-reads `pom_view` |
//! | File > Save, Save As | status (path, unsaved) |
//!
//! app-kit's own `app-kit://history` and `app-kit://document` events follow every change
//! through [`DocumentHost::refresh_on_change`].

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, OnceLock};

use preset_app_kit::{Document, History};
use rhizome_pom::{Error, Host, Pom};
use rhizome_pom_tauri::{emit, PomHost};
use serde_json::json;
use tauri::{AppHandle, Runtime};

use map_and_territory_model::MapAndTerritory;

type Hook = Box<dyn Fn() + Send + Sync>;

pub struct DocumentHost {
    pom: Arc<Pom<MapAndTerritory>>,
    /// Which "Untitled N" the document is, while it has no file. app-kit counts and tells us.
    untitled_number: AtomicU32,
    /// Told after every change, under the document's lock. Unset: nothing.
    changed: Arc<OnceLock<Hook>>,
}

impl DocumentHost {
    /// A host over documents on disk, starting Untitled, and the transport over the same
    /// document. Manage both.
    pub fn launch() -> Result<(Self, PomHost), Error> {
        Ok(Self::over(Pom::<MapAndTerritory>::files()?))
    }

    /// A host over any `Pom` of the model (tests use a memory store).
    pub fn over(pom: Pom<MapAndTerritory>) -> (Self, PomHost) {
        let changed: Arc<OnceLock<Hook>> = Arc::default();
        let hook = changed.clone();
        // Runs with the document locked, on every commit: it only hands over to whoever set
        // `on_change`, and that must not call back into the Pom.
        let pom = Arc::new(pom.on_change(move |_doc| {
            if let Some(f) = hook.get() {
                f();
            }
        }));
        let transport = PomHost::new(pom.clone());
        let host = DocumentHost {
            pom,
            untitled_number: AtomicU32::new(1),
            changed,
        };
        (host, transport)
    }

    /// Sets what is told after every change. Once; a second call is ignored. Runs under the
    /// document's lock: it must not touch the `Pom`.
    pub fn on_change(&self, f: impl Fn() + Send + Sync + 'static) {
        let _ = self.changed.set(Box::new(f));
    }

    /// After every change, re-reads the history for app-kit's menu and window title
    /// (`preset_app_kit::refresh_history`), on the main thread.
    ///
    /// The change hook runs with the document locked, and `refresh_history` reads it, so it
    /// is only ever scheduled. `run_on_main_thread` runs its closure inline when already on
    /// the main thread, which would lock the `Pom` again from inside its own lock; so the
    /// request is sent from a short-lived thread, which always queues. A burst of changes
    /// coalesces into one refresh.
    pub fn refresh_on_change<R: Runtime>(&self, app: AppHandle<R>) {
        let pending = Arc::new(AtomicBool::new(false));
        self.on_change(move || {
            if pending.swap(true, Ordering::SeqCst) {
                return;
            }
            let (app, pending) = (app.clone(), pending.clone());
            std::thread::spawn(move || {
                let inner = app.clone();
                // The loop is gone when quitting: nothing needs the refresh then.
                let _ = app.run_on_main_thread(move || {
                    pending.store(false, Ordering::SeqCst);
                    preset_app_kit::refresh_history(&inner);
                });
            });
        });
    }

    /// The bytes of the image a freeform layer's `texture` names, for the webview to decode.
    /// The path is as written: a relative one resolves against the campaign file. The same
    /// checks as `freeform.set-texture` run again, because the file may have changed since.
    pub fn texture_bytes(&self, file: &str) -> Result<Vec<u8>, String> {
        let path = self
            .pom
            .read(|d| map_and_territory_model::texture::resolve(d.path(), file))
            .ok_or_else(|| "save the campaign first, or use the image's full path".to_string())?;
        map_and_territory_model::texture::check_file(&path)?;
        std::fs::read(&path).map_err(|e| format!("can't read {}: {e}", path.display()))
    }

    /// Runs `edit.undo` or `edit.redo` through the host, so the commit reaches the webview's
    /// mirror. Nothing to step is not an error.
    fn step<R: Runtime>(&self, app: &AppHandle<R>, undo: bool) -> Result<(), String> {
        let id = if undo { "edit.undo" } else { "edit.redo" };
        match self.pom.run(id, &json!({}), None) {
            Ok((_, events)) => {
                emit(app, events);
                Ok(())
            }
            // nothing to step, or a gesture is open (a drag in progress)
            Err(Error::Disabled(_)) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Menu > Map > New Map: `node.add` for a map under `/maps`, one undo step.
    pub fn new_map<R: Runtime>(&self, app: &AppHandle<R>) -> Result<(), String> {
        let (_, events) = self
            .pom
            .run(
                "node.add",
                &json!({ "parent": "/maps", "type": "map" }),
                None,
            )
            .map_err(|e| e.to_string())?;
        emit(app, events);
        Ok(())
    }
}

impl History for DocumentHost {
    // What `Status` reports is what app-kit shows: it is `None` while a gesture is open, so
    // Undo greys out during a drag. app-kit adds the verb.
    fn undo_label(&self) -> Option<String> {
        self.pom.status().undo
    }

    fn redo_label(&self) -> Option<String> {
        self.pom.status().redo
    }

    fn undo_labels(&self) -> Vec<String> {
        self.pom
            .read(|d| d.tree().undo_labels().map(String::from).collect())
    }

    fn redo_labels(&self) -> Vec<String> {
        self.pom
            .read(|d| d.tree().redo_labels().map(String::from).collect())
    }

    fn undo<R: Runtime>(&self, app: &AppHandle<R>) -> Result<(), String> {
        self.step(app, true)
    }

    fn redo<R: Runtime>(&self, app: &AppHandle<R>) -> Result<(), String> {
        self.step(app, false)
    }
}

impl Document for DocumentHost {
    /// Derived from the tree (`Tree::is_unsaved`), so undoing back to the saved state clears it.
    fn is_unsaved(&self) -> bool {
        self.pom.status().unsaved
    }

    fn path(&self) -> Option<PathBuf> {
        self.pom.read(|d| d.path().map(Path::to_path_buf))
    }

    fn untitled_number(&self) -> u32 {
        self.untitled_number.load(Ordering::Relaxed)
    }

    fn save<R: Runtime>(&self, app: &AppHandle<R>, path: &Path) -> Result<(), String> {
        emit(app, self.pom.save_as(path).map_err(|e| e.to_string())?);
        Ok(())
    }

    fn open<R: Runtime>(&self, app: &AppHandle<R>, path: &Path) -> Result<(), String> {
        // What the load couldn't take as written is in the report; the document opened anyway.
        // Showing it is a later story.
        let (_issues, events) = self.pom.open(path).map_err(|e| e.to_string())?;
        emit(app, events);
        Ok(())
    }

    fn new_document<R: Runtime>(&self, app: &AppHandle<R>, untitled: u32) -> Result<(), String> {
        // before the swap, so the window title the change schedules is already Untitled-N
        let before = self.untitled_number.swap(untitled, Ordering::Relaxed);
        match self.pom.new_document() {
            Ok(events) => {
                emit(app, events);
                Ok(())
            }
            Err(e) => {
                self.untitled_number.store(before, Ordering::Relaxed);
                Err(e.to_string())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use rhizome_core::IdSource;
    use rhizome_pom::MemoryStore;
    use serde_json::Value as Json;
    use tauri::test::{mock_app, MockRuntime};
    use tauri::Listener;

    use super::*;

    /// What the mock app heard: (event name, payload JSON), in order.
    type Heard = Arc<Mutex<Vec<(String, String)>>>;

    fn app_hearing() -> (tauri::App<MockRuntime>, Heard) {
        let app = mock_app();
        let heard = Heard::default();
        for name in [rhizome_pom_tauri::COMMIT, rhizome_pom_tauri::STATUS] {
            let heard = heard.clone();
            app.listen_any(name, move |e| {
                heard
                    .lock()
                    .unwrap()
                    .push((name.to_string(), e.payload().to_string()));
            });
        }
        (app, heard)
    }

    fn names(heard: &Heard) -> Vec<String> {
        let all = heard.lock().unwrap();
        all.iter().map(|(n, _)| n.clone()).collect()
    }

    fn last_status(heard: &Heard) -> Json {
        let all = heard.lock().unwrap();
        let (_, p) = all
            .iter()
            .rev()
            .find(|(n, _)| n == rhizome_pom_tauri::STATUS)
            .expect("a status event");
        serde_json::from_str(p).unwrap()
    }

    fn host(store: &MemoryStore) -> (DocumentHost, PomHost) {
        let store = store.clone();
        let pom =
            Pom::<MapAndTerritory>::new(move || Box::new(store.clone()), IdSource::sequential)
                .unwrap();
        DocumentHost::over(pom)
    }

    fn paths(transport: &PomHost) -> Vec<String> {
        transport
            .host()
            .view()
            .rows
            .iter()
            .map(|r| r.path.to_string())
            .collect()
    }

    #[test]
    fn a_new_document_is_seeded_and_not_unsaved() {
        let (host, transport) = host(&MemoryStore::default());
        assert!(!host.is_unsaved());
        assert_eq!(host.path(), None);
        assert_eq!(host.untitled_number(), 1);
        assert_eq!((host.undo_label(), host.redo_label()), (None, None));
        assert!(host.undo_labels().is_empty() && host.redo_labels().is_empty());
        let paths = paths(&transport);
        assert!(
            paths.contains(&"/campaign/campaign".to_string()),
            "{paths:?}"
        );
        assert!(
            paths.contains(&"/themes/doom-forge".to_string()),
            "{paths:?}"
        );
        assert!(!paths.iter().any(|p| p.starts_with("/maps/")));
    }

    #[test]
    fn new_map_makes_it_unsaved_and_undo_makes_it_clean_again() {
        let (app, heard) = app_hearing();
        let (host, transport) = host(&MemoryStore::default());

        host.new_map(app.handle()).unwrap();
        assert!(host.is_unsaved());
        assert_eq!(host.undo_label().as_deref(), Some("New Map"));
        assert_eq!(host.undo_labels(), ["New Map"]);
        let p = paths(&transport);
        for want in ["/maps/map", "/maps/map/paper", "/maps/map/hexgrid"] {
            assert!(p.contains(&want.to_string()), "{want} in {p:?}");
        }
        // the mirror hears the commit, then the status
        assert_eq!(names(&heard), ["pom://commit", "pom://status"]);
        assert_eq!(last_status(&heard)["unsaved"], true);

        host.undo(app.handle()).unwrap();
        assert!(!host.is_unsaved(), "undone back to the saved state");
        assert!(!paths(&transport).iter().any(|p| p.starts_with("/maps/")));
        assert_eq!(host.redo_label().as_deref(), Some("New Map"));
        assert_eq!(names(&heard).len(), 4, "undo says commit and status too");
        assert_eq!(last_status(&heard)["unsaved"], false);

        host.redo(app.handle()).unwrap();
        assert!(host.is_unsaved());
        assert!(paths(&transport).contains(&"/maps/map".to_string()));
    }

    #[test]
    fn undo_with_nothing_to_undo_is_quiet() {
        let (app, heard) = app_hearing();
        let (host, _t) = host(&MemoryStore::default());
        host.undo(app.handle()).unwrap();
        host.redo(app.handle()).unwrap();
        assert!(names(&heard).is_empty());
    }

    #[test]
    fn save_then_open_round_trips_the_tree() {
        let store = MemoryStore::default();
        let (app, heard) = app_hearing();
        let (host, transport) = host(&store);
        host.new_map(app.handle()).unwrap();
        host.new_map(app.handle()).unwrap();
        let before = transport.host().tree();

        let file = Path::new("/camp/the-reach.campaign");
        host.save(app.handle(), file).unwrap();
        assert_eq!(host.path().as_deref(), Some(file));
        assert!(!host.is_unsaved());
        assert_eq!(last_status(&heard)["path"], "/camp/the-reach.campaign");

        // a different document, then back to the file
        host.new_document(app.handle(), 2).unwrap();
        assert_eq!(host.untitled_number(), 2);
        assert_eq!(host.path(), None);
        assert!(!paths(&transport).iter().any(|p| p.starts_with("/maps/")));

        host.open(app.handle(), file).unwrap();
        assert_eq!(host.path().as_deref(), Some(file));
        assert!(!host.is_unsaved());
        assert!(host.undo_labels().is_empty(), "history is cleared on open");
        assert_eq!(transport.host().tree(), before);
    }

    #[test]
    fn new_and_open_move_the_generation_so_the_mirror_rereads() {
        let store = MemoryStore::default();
        let (app, heard) = app_hearing();
        let (host, transport) = host(&store);
        let g0 = transport.host().status().generation;

        host.new_map(app.handle()).unwrap();
        host.save(app.handle(), Path::new("/a.campaign")).unwrap();
        assert_eq!(transport.host().status().generation, g0, "an edit keeps it");

        host.new_document(app.handle(), 2).unwrap();
        let g1 = last_status(&heard)["generation"].as_u64().unwrap();
        assert!(g1 > g0);
        assert!(
            names(&heard).last().map(String::as_str) == Some("pom://status"),
            "a replacement is a status event, not a commit"
        );

        host.open(app.handle(), Path::new("/a.campaign")).unwrap();
        let g2 = last_status(&heard)["generation"].as_u64().unwrap();
        assert!(g2 > g1);
    }

    #[test]
    fn revert_takes_the_file_back() {
        let store = MemoryStore::default();
        let (app, _heard) = app_hearing();
        let (host, transport) = host(&store);
        host.new_map(app.handle()).unwrap();
        host.save(app.handle(), Path::new("/r.campaign")).unwrap();
        let saved = transport.host().tree();
        let g = transport.host().status().generation;

        host.new_map(app.handle()).unwrap();
        assert!(host.is_unsaved());
        let (_, events) = transport
            .host()
            .run("file.revert", &json!({}), None)
            .unwrap();
        emit(app.handle(), events);
        assert!(!host.is_unsaved());
        assert_eq!(transport.host().tree(), saved);
        assert!(transport.host().status().generation > g);
    }

    #[test]
    fn a_failed_open_leaves_the_document_alone() {
        let (app, _heard) = app_hearing();
        let (host, transport) = host(&MemoryStore::default());
        host.new_map(app.handle()).unwrap();
        let before = transport.host().tree();
        assert!(host
            .open(app.handle(), Path::new("/nowhere.campaign"))
            .is_err());
        assert_eq!(transport.host().tree(), before);
        assert!(host.is_unsaved());
    }
}
