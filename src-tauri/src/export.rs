//! Export's native half (epic 07): the Save dialog and the file write. The webview draws the
//! PNG and hands the bytes over; it has no fs plugin, so nothing else can write to disk.

use std::path::{Path, PathBuf};
use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::DialogExt;

use crate::document::DocumentHost;
use crate::pdf::{build_pdf, MapLayout, MapSheet, PdfLayout};

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

/// One map of a PDF request: its PNG, where it sits on the page, and its path.
type Part<'a> = (&'a [u8], PdfLayout, Option<String>);

/// The maps of a PDF request: the body is their PNGs end to end, `sizes` their byte lengths
/// (absent: one PNG, the whole body), `layout` each one's `pageW,pageH,x,y,w,h` in points from
/// the page's top-left and `map` each one's path (percent-encoded, empty for none), both
/// `;`-separated.
fn split_sheets<'a>(
    body: &'a [u8],
    sizes: Option<&str>,
    layouts: &str,
    maps: Option<&str>,
) -> Result<Vec<Part<'a>>, String> {
    let sizes: Vec<usize> = match sizes {
        Some(s) => s
            .split(',')
            .map(|n| n.trim().parse().map_err(|_| "bad sizes header".to_string()))
            .collect::<Result<_, _>>()?,
        None => vec![body.len()],
    };
    let layouts: Vec<&str> = layouts.split(';').collect();
    let maps: Vec<&str> = maps.map(|m| m.split(';').collect()).unwrap_or_default();
    if layouts.len() != sizes.len() || (!maps.is_empty() && maps.len() != sizes.len()) {
        return Err("the sizes, layout and map headers disagree".into());
    }
    if sizes.iter().sum::<usize>() != body.len() {
        return Err("the sizes don't add up to the body".into());
    }
    let mut at = 0;
    let mut out = Vec::new();
    for (i, size) in sizes.iter().enumerate() {
        let map = match maps.get(i) {
            Some(m) if !m.is_empty() => Some(percent_decode(m)?),
            _ => None,
        };
        out.push((&body[at..at + size], PdfLayout::parse(layouts[i])?, map));
        at += size;
    }
    Ok(out)
}

/// Builds the PDF from the request's maps (see [`split_sheets`]), each with its key by its
/// layout, and writes it to the path in the `path` header (percent-encoded).
#[tauri::command]
pub fn export_write_pdf(
    request: tauri::ipc::Request<'_>,
    document: tauri::State<'_, DocumentHost>,
) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(body) = request.body() else {
        return Err("expected the PNGs as raw bytes".into());
    };
    let header = |name: &str| request.headers().get(name).and_then(|v| v.to_str().ok());
    let need = |name: &str| header(name).ok_or_else(|| format!("missing {name} header"));
    let parts = split_sheets(body, header("sizes"), need("layout")?, header("map"))?;
    let keyed: Vec<_> = parts
        .iter()
        .map(|(_, _, map)| match map {
            Some(m) => document.sheet(m),
            None => (None, MapLayout::Top(1)),
        })
        .collect();
    let sheets: Vec<MapSheet<'_>> = parts
        .iter()
        .zip(&keyed)
        .map(|((png, layout, _), (key, map_layout))| MapSheet {
            png,
            layout: *layout,
            key: key.as_ref(),
            map_layout: *map_layout,
        })
        .collect();
    let pdf = build_pdf(&sheets)?;
    write_file(Path::new(&percent_decode(need("path")?)?), "pdf", &pdf).map(|_| ())
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

    #[test]
    fn a_request_splits_into_its_maps() {
        let body = b"aaabbbbb";
        let l = "419.53,595.28,28.346,28.346,362.835,255.118";
        let parts = split_sheets(
            body,
            Some("3,5"),
            &format!("{l};{l}"),
            Some("%2Fmaps%2Ffen;"),
        )
        .unwrap();
        assert_eq!(parts.len(), 2);
        assert_eq!(parts[0].0, b"aaa");
        assert_eq!(parts[1].0, b"bbbbb");
        assert_eq!(parts[0].2.as_deref(), Some("/maps/fen"));
        assert_eq!(parts[1].2, None);
        // one map: the whole body, no sizes header
        assert_eq!(split_sheets(body, None, l, None).unwrap()[0].0, body);
        assert!(split_sheets(body, Some("3,4"), &format!("{l};{l}"), None).is_err());
        assert!(split_sheets(body, Some("3,5"), l, None).is_err());
    }
}
