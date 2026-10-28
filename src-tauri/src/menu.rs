//! The command table for the native menu. app-kit builds the menu bar from these and the
//! built-in items `menu.toml` switches on: File's document slots and Undo/Redo are app-kit's,
//! against the document host (`document.rs`).
//!
//! **Map** is the domain menu, one per collection (menu standard rule 1). Its only item is New
//! Map, which runs `node.add` on the document in Rust and so never reaches the webview, on
//! Opt+Cmd+N: Cmd+N is New (the campaign) in every app (Georg, 2026-10-28). Layer is the
//! second collection and arrives with epic 16.

use preset_app_kit::{shortcut, AppKit, Command, MenuName};
use tauri::{AppHandle, Manager, Runtime};

use crate::document::DocumentHost;
use map_and_territory_model::EXTENSION;

pub const MENU_CONFIG: &str = include_str!("../menu.toml");

/// File > Export > Map as PNG…, the default export (menu standard: Shift+Cmd+E).
pub const EXPORT_MAP_PNG: &str = "file.export-map-png";

/// File > Export > Map as PDF…, with no accelerator: the PNG item has the default's chord.
pub const EXPORT_PDF: &str = "file.export-pdf";
/// File > Export > Campaign as PDF…: every map in one PDF (epic 32), no accelerator.
pub const EXPORT_CAMPAIGN_PDF: &str = "file.export-campaign-pdf";

/// Menu > Map > New Map.
pub const NEW_MAP: &str = "map-new";

/// Commands the webview runs: they need its selection, so Rust forwards them untouched
/// (`on_command` returns false for them).
#[cfg(test)]
const WEBVIEW: [&str; 29] = [
    "file.export-map-png",
    "file.export-pdf",
    "file.export-campaign-pdf",
    "layer.add-hex-noise",
    "layer.add-freeform",
    "layer.add-outline",
    "layer.add-image",
    "layer.add-locations",
    "layer.add-title",
    "layer.add-compass",
    "edit.move-earlier",
    "edit.move-later",
    "edit.move-to-front",
    "edit.move-to-back",
    "view.toggle-left-panel",
    "view.toggle-right-panel",
    "view.zoom-in",
    "view.zoom-out",
    "view.fit",
    "edit.duplicate",
    "edit.delete",
    "tool.paint",
    "tool.erase",
    "tool.fill",
    "tool.select",
    "tool.outline",
    "tool.location",
    "tool.location-move",
    "tool.location-delete",
];

/// The app's own commands, in menu order. Domain menus sit after View in the order they are
/// first declared: Map, then Layer.
pub fn commands() -> Vec<Command> {
    let layer = |id, label, section| Command::item(id, label).domain("Layer").section(section);
    let tool = |id, label, key| {
        Command::toggle(id, label)
            .domain("Tool")
            .section(0)
            .accelerator(key)
    };
    // the bare digits run out: the location tools after Add sit behind its toolbar flyout,
    // without a chord, in their own section
    let tool_bare = |id, label| Command::toggle(id, label).domain("Tool").section(1);
    vec![
        // View > Show Left Panel: the family's bracket pattern (menu standard decision 14).
        // app-kit 0.1.2 has no built-in panel toggle; the tick is the webview's to report.
        Command::toggle("view.toggle-left-panel", "Show Left Panel")
            .accelerator("CmdOrCtrl+[")
            .menu(MenuName::View)
            .section(0),
        // View > Show Right Panel, the inspector (menu standard decision 14).
        Command::toggle("view.toggle-right-panel", "Show Right Panel")
            .accelerator("CmdOrCtrl+]")
            .menu(MenuName::View)
            .section(0),
        // View > Zoom (menu standard decision 4). The camera is view state in the webview.
        Command::item("view.zoom-in", "Zoom In")
            .accelerator(shortcut::ZOOM_IN)
            .menu(MenuName::View)
            .section(1),
        Command::item("view.zoom-out", "Zoom Out")
            .accelerator(shortcut::ZOOM_OUT)
            .menu(MenuName::View)
            .section(1),
        Command::item("view.fit", "Fit in Window")
            .accelerator("CmdOrCtrl+0")
            .menu(MenuName::View)
            .section(2),
        // Edit, after Undo and Redo and before Cut, Copy and Paste. POM's built-ins run with
        // the selection as `{at}`; the webview relabels them ("Delete Layer").
        Command::item("edit.duplicate", "Duplicate")
            .accelerator("CmdOrCtrl+D")
            .menu(MenuName::Edit)
            .section(1),
        // Cmd+Backspace, as Finder: a bare Backspace accelerator is taken by the menu before a
        // focused text field sees it, so renaming couldn't delete a character.
        Command::item("edit.delete", "Delete")
            .accelerator("CmdOrCtrl+Backspace")
            .menu(MenuName::Edit)
            .section(1),
        // File > Export ▸ (menu standard rule: `<Format>…`, the default gets Shift+Cmd+E). The
        // PDFs have no chord. The webview enables them with an active map.
        Command::item(EXPORT_MAP_PNG, "Map as PNG…")
            .accelerator("CmdOrCtrl+Shift+E")
            .menu(MenuName::File)
            .section(1)
            .submenu("Export"),
        Command::item(EXPORT_PDF, "Map as PDF…")
            .menu(MenuName::File)
            .section(1)
            .submenu("Export"),
        Command::item(EXPORT_CAMPAIGN_PDF, "Campaign as PDF…")
            .menu(MenuName::File)
            .section(1)
            .submenu("Export"),
        Command::item(NEW_MAP, "New Map")
            .domain("Map")
            .section(0)
            .accelerator("CmdOrCtrl+Alt+N"),
        layer("layer.add-hex-noise", "Add Hex Noise Layer", 0),
        layer("layer.add-freeform", "Add Freeform Layer", 0),
        layer("layer.add-outline", "Add Outline Layer", 0),
        layer("layer.add-image", "Add Image Layer", 0),
        layer("layer.add-locations", "Add Locations Layer", 0),
        // The furniture kinds (epics 23 and 24): added on top of the grid, in the map's
        // `furniture`. No chord, like the layer Add items.
        layer("layer.add-title", "Add Title", 0),
        layer("layer.add-compass", "Add Compass", 0),
        // Bring Forward is up the stack (menu standard: Opt+Up). Ids are POM's move ids.
        layer("edit.move-earlier", "Bring Forward", 1).accelerator(shortcut::MOVE_EARLIER),
        layer("edit.move-later", "Send Backward", 1).accelerator(shortcut::MOVE_LATER),
        layer("edit.move-to-front", "Bring to Front", 2).accelerator("Alt+Shift+Up"),
        layer("edit.move-to-back", "Send to Back", 2).accelerator("Alt+Shift+Down"),
        // The Tool menu, after Layer: one radio-like group, bare digits (menu standard). The
        // webview sets `pressed` on the active one and drops the digits while a text field has
        // focus, so the key reaches the field.
        tool("tool.paint", "Paint", "1"),
        tool("tool.erase", "Erase", "2"),
        tool("tool.fill", "Fill", "3"),
        tool("tool.select", "Select", "4"),
        tool("tool.outline", "Outline", "5"),
        tool("tool.location", "Add Location", "6").section(1),
        tool_bare("tool.location-move", "Move Location"),
        tool_bare("tool.location-delete", "Delete Location"),
    ]
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
    fn new_map_is_in_the_map_menu_on_opt_cmd_n() {
        let table = commands();
        let new_map = table.iter().find(|c| c.id() == NEW_MAP).unwrap();
        // Command's fields are app-kit's; its Debug shows the domain, label and chord
        let shown = format!("{new_map:?}");
        assert!(shown.contains("\"Map\""), "{shown}");
        assert!(shown.contains("\"New Map\""), "{shown}");
        assert!(
            shown.contains("accelerator: Some(\"CmdOrCtrl+Alt+N\")"),
            "{shown}"
        );
    }

    #[test]
    fn webview_commands_are_in_the_table_and_not_handled_natively() {
        let table = commands();
        for id in WEBVIEW {
            assert!(table.iter().any(|c| c.id() == id), "{id} is in the table");
        }
        // the table has only New Map besides them
        assert_eq!(table.len(), WEBVIEW.len() + 1);
    }

    #[test]
    fn ids_and_chords_are_unique() {
        let table = commands();
        let mut ids: Vec<&str> = table.iter().map(|c| c.id()).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), table.len());
        let mut chords: Vec<String> = table
            .iter()
            .filter_map(|c| {
                let shown = format!("{c:?}");
                let at = shown.find("accelerator: Some(\"")?;
                let rest = &shown[at + 19..];
                Some(rest[..rest.find('"')?].to_string())
            })
            .collect();
        assert_eq!(chords.len(), 19);
        chords.sort();
        chords.dedup();
        assert_eq!(chords.len(), 19);
    }
}
