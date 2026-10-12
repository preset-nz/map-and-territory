//! The command table for the native menu. app-kit builds the menu bar from
//! these and the built-in items `menu.toml` switches on; each item reaches the
//! webview as one `command` event, bound by id in `src/App.tsx`.

use preset_app_kit::{AppKit, Command};
use tauri::{AppHandle, Runtime};

use crate::history::NoHistory;

pub const MENU_CONFIG: &str = include_str!("../menu.toml");

/// The app's own commands. Empty to start: Undo and Redo are built in.
fn commands() -> Vec<Command> {
    Vec::new()
}

pub fn install<R: Runtime>(app: &AppHandle<R>, name: &str) -> tauri::Result<()> {
    AppKit::<R>::new(name)
        .menu_config(MENU_CONFIG)
        .commands(commands())
        .install_history::<NoHistory>(app)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn menu_config_parses_with_no_document_slots_and_no_settings() {
        let config = preset_app_kit::MenuConfig::parse(MENU_CONFIG).unwrap();
        assert!(config.file.document_slots_on().is_empty());
        assert!(!config.file.close);
        assert!(!config.app.settings);
    }
}
