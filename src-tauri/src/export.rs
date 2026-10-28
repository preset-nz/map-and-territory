//! Export's native half (epic 07): the Save dialog and the file write. The webview draws the
//! PNG and hands the bytes over; it has no fs plugin, so nothing else can write to disk.

use map_and_territory_model::print::Sheet;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::DialogExt;

use crate::document::DocumentHost;
use crate::pdf::build_pdf;

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

/// One entry of a PDF request's manifest: a map's path and the byte length of its PNG.
#[derive(Debug, Deserialize)]
struct ManifestEntry {
    map: String,
    size: usize,
}

/// The maps of a PDF request: the body is their PNGs end to end and the manifest (JSON, an
/// array of `{ map, size }` in the same order) says whose each is and how long.
fn split_manifest<'a>(body: &'a [u8], manifest: &str) -> Result<Vec<(&'a [u8], String)>, String> {
    let entries: Vec<ManifestEntry> =
        serde_json::from_str(manifest).map_err(|e| format!("bad manifest header: {e}"))?;
    let total = entries
        .iter()
        .try_fold(0usize, |n, e| n.checked_add(e.size))
        .ok_or("the sizes don't add up to the body")?;
    if total != body.len() {
        return Err("the sizes don't add up to the body".into());
    }
    let mut at = 0;
    Ok(entries
        .into_iter()
        .map(|e| {
            let png = &body[at..at + e.size];
            at += e.size;
            (png, e.map)
        })
        .collect())
}

/// Lays each map out from the document; a map that isn't there is an error.
fn sheets_of(
    parts: Vec<(&[u8], String)>,
    sheet: impl Fn(&str) -> Option<Sheet>,
) -> Result<Vec<(&[u8], Sheet)>, String> {
    parts
        .into_iter()
        .map(|(png, map)| {
            sheet(&map)
                .map(|s| (png, s))
                .ok_or_else(|| format!("there is no map at {map}"))
        })
        .collect()
}

/// Builds the PDF from the request's maps (see [`split_manifest`]), each laid out from the
/// document with its key, and writes it to the path in the `path` header (percent-encoded).
/// The webview only draws the PNGs; the page is Rust's.
#[tauri::command]
pub fn export_write_pdf(
    request: tauri::ipc::Request<'_>,
    document: tauri::State<'_, DocumentHost>,
) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(body) = request.body() else {
        return Err("expected the PNGs as raw bytes".into());
    };
    let header = |name: &str| {
        request
            .headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| format!("missing {name} header"))
    };
    let parts = split_manifest(body, &percent_decode(header("manifest")?)?)?;
    let laid = sheets_of(parts, |map| document.sheet(map))?;
    let sheets: Vec<(&[u8], &Sheet)> = laid.iter().map(|(png, s)| (*png, s)).collect();
    let pdf = build_pdf(&sheets)?;
    write_file(Path::new(&percent_decode(header("path")?)?), "pdf", &pdf).map(|_| ())
}

/// A map's place on its page, for the webview to size its drawing by: the page and the map's
/// rectangle in points from the page's top-left, and the map's size in pixels at 300 dpi.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SheetSize {
    page_pt: Size,
    map_pt: Region,
    map_px: Size,
}

#[derive(Debug, Serialize)]
struct Size {
    w: f64,
    h: f64,
}

#[derive(Debug, Serialize)]
struct Region {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

impl From<&Sheet> for SheetSize {
    fn from(s: &Sheet) -> Self {
        Self {
            page_pt: Size {
                w: s.page.0,
                h: s.page.1,
            },
            map_pt: Region {
                x: s.map.x,
                y: s.map.y,
                w: s.map.w,
                h: s.map.h,
            },
            map_px: Size {
                w: f64::from(s.map_px.0),
                h: f64::from(s.map_px.1),
            },
        }
    }
}

/// How big to draw the map at `map` for an export: its place on the campaign's page.
#[tauri::command]
pub fn export_sheet(
    map: String,
    document: tauri::State<'_, DocumentHost>,
) -> Result<SheetSize, String> {
    document
        .sheet(&map)
        .map(|s| SheetSize::from(&s))
        .ok_or_else(|| format!("there is no map at {map}"))
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
    fn a_manifest_splits_the_body_into_its_maps() {
        let body = b"aaabbbbb";
        let parts = split_manifest(
            body,
            r#"[{"map":"/maps/fen","size":3},{"map":"/maps/orlo","size":5}]"#,
        )
        .unwrap();
        assert_eq!(parts.len(), 2);
        assert_eq!(parts[0], (&b"aaa"[..], "/maps/fen".to_string()));
        assert_eq!(parts[1], (&b"bbbbb"[..], "/maps/orlo".to_string()));
        // the sizes must add up to the body exactly
        assert!(split_manifest(body, r#"[{"map":"/m","size":3}]"#).is_err());
        assert!(split_manifest(body, r#"[{"map":"/m","size":9}]"#).is_err());
        assert!(split_manifest(
            body,
            r#"[{"map":"/m","size":18446744073709551615},{"map":"/n","size":9}]"#
        )
        .is_err());
        // nonsense is an error, and an empty manifest is an empty body
        assert!(split_manifest(body, "not json").is_err());
        assert!(split_manifest(body, r#"[{"map":"/m"}]"#).is_err());
        assert!(split_manifest(b"", "[]").unwrap().is_empty());
    }

    #[test]
    fn a_map_missing_from_the_document_is_an_error() {
        use map_and_territory_model::print::{lay_out, MapLayout, PageSpec};
        let there = |map: &str| {
            (map == "/maps/fen")
                .then(|| lay_out(PageSpec::default(), 1.6, MapLayout::default(), None))
        };
        let ok = sheets_of(vec![(&b"a"[..], "/maps/fen".into())], there).unwrap();
        assert_eq!(ok.len(), 1);
        let err = sheets_of(vec![(&b"a"[..], "/maps/gone".into())], there).unwrap_err();
        assert!(err.contains("/maps/gone"), "{err}");
    }

    #[test]
    fn the_sheet_size_is_camel_case_json() {
        use map_and_territory_model::print::{lay_out, MapLayout, PageSpec};
        let s = lay_out(PageSpec::default(), 1.6, MapLayout::default(), None);
        let v = serde_json::to_value(SheetSize::from(&s)).unwrap();
        assert_eq!(v["mapPx"]["w"], 1512.0);
        assert!(v["pagePt"]["w"].as_f64().unwrap() > 419.0);
        assert!(v["mapPt"]["x"].is_number() && v["mapPt"]["h"].is_number());
    }
}
