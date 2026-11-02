//! `just examples` (epic 27 story 2): the debug build draws the pictures on the node pages.
//!
//! With `MT_EXAMPLE=<campaign path>` and `MT_EXAMPLE_OUT=<dir>` set, a debug build opens that
//! campaign before the webview connects, so the mirror's first read is the campaign, and keeps
//! the job. The webview (`src/app/export/examples.ts`) asks for it, exports the maps through
//! the user's export path, writes each PNG and ends the run. A release build never reads the
//! variables: [`Examples::from_env`] is `None` there, `examples_job` answers null, and the
//! other two commands refuse. All three exist in both builds, so no invoke ever fails at launch.

use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::Value as Json;
use tauri::{AppHandle, Runtime};

/// What the webview does: open `campaign`, write `entries`' images to `out`.
#[derive(Debug, Serialize)]
pub struct Job {
    campaign: PathBuf,
    out: PathBuf,
    /// The manifest's entries for this campaign's page: `{page, map, image, caption, crop?}`.
    entries: Vec<Json>,
}

/// The managed state: the job of this launch, if any.
#[derive(Debug, Default)]
pub struct Examples(Option<Job>);

impl Examples {
    /// The job the environment asks for. Always `None` in a release build.
    #[cfg(debug_assertions)]
    pub fn from_env() -> Result<Self, String> {
        let (Some(campaign), Some(out)) = (
            std::env::var_os("MT_EXAMPLE"),
            std::env::var_os("MT_EXAMPLE_OUT"),
        ) else {
            return Ok(Self(None));
        };
        let campaign = PathBuf::from(campaign);
        let page = campaign
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or("MT_EXAMPLE has no file name")?
            .to_string();
        let manifest = campaign.with_file_name("examples.json");
        let text = std::fs::read_to_string(&manifest)
            .map_err(|e| format!("{}: {e}", manifest.display()))?;
        let all: Vec<Json> =
            serde_json::from_str(&text).map_err(|e| format!("{}: {e}", manifest.display()))?;
        let entries = all
            .into_iter()
            .filter(|e| e["page"].as_str() == Some(page.as_str()))
            .collect();
        std::fs::create_dir_all(&out).map_err(|e| format!("{}: {e}", Path::new(&out).display()))?;
        Ok(Self(Some(Job {
            campaign,
            out: PathBuf::from(out),
            entries,
        })))
    }

    #[cfg(not(debug_assertions))]
    pub fn from_env() -> Result<Self, String> {
        Ok(Self(None))
    }

    /// The campaign to open before the webview connects.
    pub fn campaign(&self) -> Option<&Path> {
        self.0.as_ref().map(|j| j.campaign.as_path())
    }
}

/// The job, or null when this launch has none (always, in a release build).
#[tauri::command]
pub fn examples_job(examples: tauri::State<'_, Examples>) -> Option<&Job> {
    examples.inner().0.as_ref()
}

/// Writes the request body to `<out>/<name>.png`, `name` being the header (percent-encoded).
#[tauri::command]
pub fn examples_write(
    request: tauri::ipc::Request<'_>,
    examples: tauri::State<'_, Examples>,
) -> Result<(), String> {
    let job = examples.inner().0.as_ref().ok_or("no examples job")?;
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("expected the PNG as raw bytes".into());
    };
    let name = request
        .headers()
        .get("name")
        .and_then(|v| v.to_str().ok())
        .ok_or("missing name header")?;
    if name.is_empty() || !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err(format!("bad example name {name}"));
    }
    let path = job.out.join(format!("{name}.png"));
    std::fs::write(&path, bytes).map_err(|e| format!("{}: {e}", path.display()))
}

/// Ends the run without asking about the document: exit 0, or 1 when `failed`.
#[tauri::command]
pub fn examples_done<R: Runtime>(
    app: AppHandle<R>,
    examples: tauri::State<'_, Examples>,
    failed: bool,
) {
    if examples.inner().0.is_some() {
        app.exit(i32::from(failed));
    }
}
