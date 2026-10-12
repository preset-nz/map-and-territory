//! The shell: the native menu and window restore, from the family's kits. The
//! app has no documents yet, so app-kit runs over a history stub. Settings is
//! off until there is a real preference.

mod history;
mod menu;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // The window comes back where it was, at the size it was.
        .plugin(preset_app_kit::window_state())
        .manage(history::NoHistory)
        .on_window_event(preset_app_kit::on_window_event)
        .setup(|app| {
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
            preset_app_kit::app_kit_commands,
            preset_app_kit::app_kit_menu_state,
            preset_app_kit::app_kit_history,
            preset_app_kit::app_kit_undo,
            preset_app_kit::app_kit_redo,
            preset_app_kit::app_kit_text_menu,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            preset_app_kit::on_run_event(app, &event);
        });
}
