//! The shell: the native menu, window restore and the document, from the family's kits. The
//! document is rhizome's, held by `document::DocumentHost`, which app-kit runs File and
//! Undo/Redo against and the webview mirrors through `rhizome-pom-tauri`'s `pom_*` commands.
//! Settings is off until there is a real preference.

mod document;
mod menu;

use tauri::Manager;

/// A freeform layer's texture file, as raw bytes (no JSON round trip).
#[tauri::command]
fn texture_bytes(
    document: tauri::State<'_, document::DocumentHost>,
    file: String,
) -> Result<tauri::ipc::Response, String> {
    document.texture_bytes(&file).map(tauri::ipc::Response::new)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // The window comes back where it was, at the size it was.
        .plugin(preset_app_kit::window_state())
        // The close guard: an unsaved document asks before the window goes (app-kit's).
        .on_window_event(preset_app_kit::on_window_event)
        .setup(|app| {
            // The host exists from launch; so does its document, Untitled. app-kit finds the
            // host with `app.state`, so it is managed before the menu is installed.
            let (document, transport) = document::DocumentHost::launch()?;
            document.refresh_on_change(app.handle().clone());
            app.manage(document);
            app.manage(transport);
            // The product name from tauri.conf.json, never a literal.
            let name = app
                .config()
                .product_name
                .clone()
                .unwrap_or_else(|| app.package_info().name.clone());
            // If the menu bar can't be built the default one stays.
            if let Err(e) = menu::install(app.handle(), &name) {
                eprintln!("{name}: could not build the menu bar: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            rhizome_pom_tauri::commands::pom_status,
            rhizome_pom_tauri::commands::pom_view,
            rhizome_pom_tauri::commands::pom_commands,
            rhizome_pom_tauri::commands::pom_run,
            rhizome_pom_tauri::commands::pom_begin,
            rhizome_pom_tauri::commands::pom_end,
            rhizome_pom_tauri::commands::pom_cancel,
            rhizome_pom_tauri::commands::pom_connect,
            texture_bytes,
            // Not `pom_new`, `pom_open` or `pom_save_as`: app-kit replaces and saves the
            // document, so a replacement made any other way would skip its title, recents
            // and close guard.
            preset_app_kit::app_kit_commands,
            preset_app_kit::app_kit_menu_state,
            preset_app_kit::app_kit_document,
            preset_app_kit::app_kit_document_note,
            preset_app_kit::app_kit_history,
            preset_app_kit::app_kit_undo,
            preset_app_kit::app_kit_redo,
            preset_app_kit::app_kit_text_menu,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| preset_app_kit::on_run_event(app, &event));
}
