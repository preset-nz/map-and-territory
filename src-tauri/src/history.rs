//! The history stub: always reports nothing to undo, so Edit > Undo and Redo
//! are present and greyed. Replace it with the app's real history (anything
//! that implements `History`) when the app has steps to take back.

use preset_app_kit::History;
use tauri::{AppHandle, Runtime};

#[derive(Default)]
pub struct NoHistory;

impl History for NoHistory {
    fn undo_label(&self) -> Option<String> {
        None
    }
    fn redo_label(&self) -> Option<String> {
        None
    }
    fn undo_labels(&self) -> Vec<String> {
        Vec::new()
    }
    fn redo_labels(&self) -> Vec<String> {
        Vec::new()
    }
    fn undo<R: Runtime>(&self, _app: &AppHandle<R>) -> Result<(), String> {
        Ok(())
    }
    fn redo<R: Runtime>(&self, _app: &AppHandle<R>) -> Result<(), String> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nothing_to_undo_or_redo() {
        let h = NoHistory;
        assert_eq!(h.undo_label(), None);
        assert_eq!(h.redo_label(), None);
        assert!(h.undo_labels().is_empty());
        assert!(h.redo_labels().is_empty());
    }
}
