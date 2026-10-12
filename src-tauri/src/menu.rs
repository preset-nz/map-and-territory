//! The command table for the native menu. app-kit builds the menu bar from these and the
//! built-in items `menu.toml` switches on: File's document slots and Undo/Redo are app-kit's,
//! against the document host (`document.rs`).
//!
//! **Map** is the domain menu, one per collection (menu standard rule 1). Its only item is New
//! Map, which runs `node.add` on the document in Rust and so never reaches the webview. No
//! accelerator: Cmd+N is New (the campaign). Layer is the second collection and arrives with
//! epic 16.

use preset_app_kit::{AppKit, Command};
use tauri::{AppHandle, Manager, Runtime};

use crate::document::DocumentHost;
use crate::object_model::EXTENSION;

pub const MENU_CONFIG: &str = include_str!("../menu.toml");

/// Menu > Map > New Map.
pub const NEW_MAP: &str = "map-new";

/// The app's own commands, in menu order.
pub fn commands() -> Vec<Command> {
    vec![Command::item(NEW_MAP, "New Map").domain("Map").section(0)]
}

/// Handles the commands that run natively. `true` when the id was handled; app-kit forwards
/// the rest to the webview.
fn on_command<R: Runtime>(app: &AppHandle<R>, id: &str) -> bool {
    match id {
        NEW_MAP => {
            if let Err(e) = app.state::<DocumentHost>().new_map(app) {
                eprintln!("New Map: {e}");
            }
            true
        }
        _ => false,
    }
}

/// Installs app-kit over the managed [`DocumentHost`]. Call after `app.manage(host)`: app-kit
/// reads the document straight away.
pub fn install<R: Runtime>(app: &AppHandle<R>, name: &str) -> tauri::Result<()> {
    AppKit::<R>::new(name)
        .menu_config(MENU_CONFIG)
        .file_type(&format!("{name} campaign"), EXTENSION)
        .commands(commands())
        .on_command(on_command)
        .install::<DocumentHost>(app)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn menu_config_parses_with_the_file_slots_on_and_settings_off() {
        let config = preset_app_kit::MenuConfig::parse(MENU_CONFIG).unwrap();
        // New, Open…, Open Recent, Save, Save As… and Revert, and Close with them
        assert_eq!(config.file.document_slots_on().len(), 6);
        assert!(config.file.close);
        assert!(!config.app.settings);
    }

    #[test]
    fn new_map_is_in_the_map_menu_with_no_accelerator() {
        let table = commands();
        let ids: Vec<&str> = table.iter().map(|c| c.id()).collect();
        assert_eq!(ids, [NEW_MAP]);
        // Command's fields are app-kit's; its Debug shows the domain, label and chord
        let shown = format!("{:?}", table[0]);
        assert!(shown.contains("\"Map\""), "{shown}");
        assert!(shown.contains("\"New Map\""), "{shown}");
        assert!(shown.contains("accelerator: None"), "{shown}");
    }
}
