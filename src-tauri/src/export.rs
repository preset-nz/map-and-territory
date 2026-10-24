//! Export's native half (epic 07): the Save dialog and the file write. The webview draws the
//! PNG and hands the bytes over; it has no fs plugin, so nothing else can write to disk.

use std::path::{Path, PathBuf};
use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::DialogExt;

use crate::pdf::{build_pdf, PdfLayout};

/// `path` with `ext` added when the user typed a name without an extension.
fn with_ext(path: PathBuf, ext: &str) -> PathBuf {
    if path.extension().is_none() {
        path.with_extension(ext)
    } else {
        path
    }
}

/// Decodes the webview's `encodeURIComponent` of a path.
fn percent_decode(s: &str) -> Result<String, String> {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = s.get(i + 1..i + 3).ok_or("bad path header")?;
            out.push(u8::from_str_radix(hex, 16).map_err(|_| "bad path header")?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).map_err(|_| "bad path header".to_string())
}

/// Writes `bytes` to `path`, adding `ext` to a bare name.
fn write_file(path: &Path, ext: &str, bytes: &[u8]) -> Result<PathBuf, String> {
    let path = with_ext(path.to_path_buf(), ext);
    std::fs::write(&path, bytes).map_err(|e| format!("{}: {e}", path.display()))?;
    Ok(path)
}

/// The extension and filter label of an export format: `png` or `pdf`.
fn format_info(format: &str) -> Result<(&'static str, &'static str), String> {
    match format {
        "png" => Ok(("png", "PNG image")),
        "pdf" => Ok(("pdf", "PDF document")),
        other => Err(format!("unknown export format {other}")),
    }
}

/// The Save dialog for an export of `format` (`png` or `pdf`), starting in `dir` when it is
/// given and exists. `None` when cancelled. Async so the blocking dialog never sits on the main thread.
#[tauri::command]
pub async fn export_choose_file<R: Runtime>(
    app: AppHandle<R>,
    name: String,
    dir: Option<String>,
    format: String,
) -> Result<Option<String>, String> {
    let (ext, label) = format_info(&format)?;
    let mut panel = app
        .dialog()
        .file()
        .set_file_name(name)
        .add_filter(label, &[ext]);
    if let Some(dir) = dir.filter(|d| Path::new(d).is_dir()) {
        panel = panel.set_directory(dir);
    }
    Ok(panel
        .blocking_save_file()
        .and_then(|p| p.into_path().ok())
        .map(|p| with_ext(p, ext).to_string_lossy().into_owned()))
}

/// Writes the request body to the path in the `path` header (percent-encoded).
#[tauri::command]
pub fn export_write_file(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("expected the PNG as raw bytes".into());
    };
    let header = request
        .headers()
        .get("path")
        .and_then(|v| v.to_str().ok())
        .ok_or("missing path header")?;
    write_file(Path::new(&percent_decode(header)?), "png", bytes).map(|_| ())
}

/// Builds a one-page PDF from the request body (the PNG) and writes it to the path in the
/// `path` header (percent-encoded). The `layout` header is `pageW,pageH,x,y,w,h` in points,
/// measured from the page's top-left.
#[tauri::command]
pub fn export_write_pdf(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(png) = request.body() else {
        return Err("expected the PNG as raw bytes".into());
    };
    let header = |name: &str| {
        request
            .headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| format!("missing {name} header"))
    };
    let layout = PdfLayout::parse(header("layout")?)?;
    let pdf = build_pdf(png, &layout)?;
    write_file(Path::new(&percent_decode(header("path")?)?), "pdf", &pdf).map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_bare_name_gets_the_extension_and_an_extension_is_kept() {
        assert_eq!(
            with_ext(PathBuf::from("/x/map"), "png"),
            PathBuf::from("/x/map.png")
        );
        assert_eq!(
            with_ext(PathBuf::from("/x/map"), "pdf"),
            PathBuf::from("/x/map.pdf")
        );
        assert_eq!(
            with_ext(PathBuf::from("/x/map.png"), "png"),
            PathBuf::from("/x/map.png")
        );
        assert_eq!(
            with_ext(PathBuf::from("/x/a.b"), "png"),
            PathBuf::from("/x/a.b")
        );
        assert_eq!(format_info("pdf").unwrap().0, "pdf");
        assert!(format_info("exr").is_err());
    }

    #[test]
    fn percent_decoding_restores_paths_with_spaces_and_unicode() {
        assert_eq!(
            percent_decode("%2FUsers%2Fg%2FMy%20Maps%2Fk%C3%A4rte.png").unwrap(),
            "/Users/g/My Maps/kärte.png"
        );
        assert!(percent_decode("%2").is_err());
        assert!(percent_decode("%zz").is_err());
    }

    #[test]
    fn write_file_writes_the_bytes_and_reports_failures() {
        let dir = std::env::temp_dir().join(format!("mt-export-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let written = write_file(&dir.join("map"), "png", &[1, 2, 3]).unwrap();
        assert_eq!(written, dir.join("map.png"));
        assert_eq!(std::fs::read(&written).unwrap(), vec![1, 2, 3]);
        assert!(write_file(&dir.join("missing").join("x.png"), "png", &[1]).is_err());
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
