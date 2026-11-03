//! `just docs`: one markdown page per Map & Territory node kind in `docs/nodes/`, from the
//! words the kinds carry (`crates/map-and-territory-model/src/kinds.rs`). `--check` writes
//! nothing and fails on a missing, stale or orphaned page or a kind without a summary
//! (`just docs-check`, part of `just check`).

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use map_and_territory_model::MapAndTerritory;
use rhizome_core::IdSource;
use rhizome_pom::{Document, MemoryStore, ObjectModel};

const BEGIN: &str =
    "<!-- examples:begin — `just examples` rewrites this block; write outside it -->";
const END: &str = "<!-- examples:end -->";

/// One manifest entry: what the page needs of it.
struct Picture {
    page: String,
    image: String,
    caption: String,
    /// Whether the entry carries the page's thumbnail.
    thumb: bool,
}

/// The pictures of every page, from `docs/examples/examples.json` (written by
/// `crates/map-and-territory-model/tests/examples.rs`), in order.
fn manifest(dir: &Path) -> Result<Vec<Picture>, String> {
    let path = dir.join("../examples/examples.json");
    let text = std::fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))?;
    let all: Vec<serde_json::Value> =
        serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
    let field = |e: &serde_json::Value, k: &str| {
        e[k].as_str()
            .map(String::from)
            .ok_or(format!("{}: an entry has no {k}", path.display()))
    };
    all.iter()
        .map(|e| {
            Ok(Picture {
                page: field(e, "page")?,
                image: field(e, "image")?,
                caption: field(e, "caption")?,
                thumb: e.get("thumb").is_some(),
            })
        })
        .collect()
}

/// `text` with its front matter's `thumbnail:` line, the last one, naming `file` (or gone).
fn with_thumbnail(text: &str, file: Option<&str>) -> String {
    let Some(end) = text.find("\n---\n").map(|i| i + 1) else {
        return text.to_string();
    };
    let (front, rest) = text.split_at(end);
    let mut front: String = front
        .lines()
        .filter(|l| !l.starts_with("thumbnail:"))
        .map(|l| format!("{l}\n"))
        .collect();
    if let Some(file) = file {
        front.push_str(&format!("thumbnail: img/{file}\n"));
    }
    format!("{front}{rest}")
}

/// `text` with the Examples block (heading and markers) for `pictures` in place of the one
/// it has, or at its end.
fn with_block(text: &str, pictures: &[(&str, &str)]) -> String {
    // an existing block is replaced where it stands; whatever follows it is kept
    let (before, after) = match (text.find("## Examples\n\n"), text.find(END)) {
        (Some(at), Some(end)) if end > at => (&text[..at], &text[end + END.len()..]),
        _ => (text, ""),
    };
    let before = before.trim_end_matches('\n');
    let mut block = format!("## Examples\n\n{BEGIN}\n");
    for (i, (image, caption)) in pictures.iter().enumerate() {
        if i > 0 {
            block.push('\n');
        }
        block.push_str(&format!("![{caption}](img/{image}.webp)\n\n*{caption}*\n"));
    }
    block.push_str(END);
    if after.is_empty() {
        block.push('\n');
    }
    format!("{before}\n\n{block}{after}")
}

/// Writes each page's Examples block and `thumbnail:` line, or with `check` reports each that
/// is missing or stale, or names an image `img/` lacks. Returns whether it all holds.
fn examples(dir: &Path, check: bool) -> Result<bool, String> {
    let all = manifest(dir)?;
    let mut pages: Vec<&str> = all.iter().map(|p| p.page.as_str()).collect();
    pages.dedup();
    let mut ok = true;
    for page in pages {
        let pictures: Vec<&Picture> = all.iter().filter(|p| p.page == page).collect();
        let blocks: Vec<(&str, &str)> = pictures
            .iter()
            .map(|p| (p.image.as_str(), p.caption.as_str()))
            .collect();
        let thumb = pictures
            .iter()
            .any(|p| p.thumb)
            .then(|| format!("{page}-thumb.webp"));
        let mut images: Vec<String> = pictures
            .iter()
            .map(|p| format!("{}.webp", p.image))
            .collect();
        images.extend(thumb.clone());
        for image in &images {
            if !dir.join(format!("img/{image}")).exists() {
                eprintln!("error: {page}: docs/nodes/img/{image} is missing: run `just examples`");
                ok = false;
            }
        }
        let file = dir.join(format!("{page}.md"));
        let text =
            std::fs::read_to_string(&file).map_err(|e| format!("{}: {e}", file.display()))?;
        let next = with_thumbnail(&with_block(&text, &blocks), thumb.as_deref());
        if next == text {
            continue;
        }
        if check {
            eprintln!(
                "error: {page}: the Examples block or thumbnail is stale: run `just examples`"
            );
            ok = false;
        } else {
            std::fs::write(&file, next).map_err(|e| format!("{}: {e}", file.display()))?;
        }
    }
    Ok(ok)
}

fn main() -> ExitCode {
    let check = std::env::args().any(|a| a == "--check");
    let doc = Document::<MapAndTerritory>::new_in(
        std::sync::Arc::new(()),
        MemoryStore::default(),
        IdSource::Ulid,
    )
    .expect("Map & Territory's model builds");
    let mut schema = doc.tree().registry().schema();
    // rhizome-pom's own `preset` node is bookkeeping for saved presets (the palette
    // catalogue), not something a person adds; it carries no words and gets no page.
    // `chunk` is storage for a freeform layer's hexes, written by the paint tools and
    // never added by hand, so it gets no page either.
    schema
        .types
        .retain(|t| t.name != "preset" && t.name != "chunk");

    let schema = preset_docs::Catalogue::from(&schema);

    let app = MapAndTerritory::NAME;
    let dir = PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../nodes"));
    if !check {
        match preset_docs::write(&dir, &schema, app) {
            Ok(files) => {
                for f in files {
                    println!("wrote {f}");
                }
            }
            Err(e) => {
                eprintln!("map-and-territory-docs: {e}");
                return ExitCode::FAILURE;
            }
        }
    }
    let mut failed = match examples(&dir, check) {
        Ok(ok) => !ok,
        Err(e) => {
            eprintln!("map-and-territory-docs: {e}");
            return ExitCode::FAILURE;
        }
    };
    // The index shows the thumbnails the pages name, and `examples` may just have added one:
    // write the index again from the pages as they now stand.
    if !check {
        if let Err(e) = preset_docs::write(&dir, &schema, app) {
            eprintln!("map-and-territory-docs: {e}");
            return ExitCode::FAILURE;
        }
    }
    let findings = match preset_docs::check(&dir, &schema, app) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("map-and-territory-docs: {e}");
            return ExitCode::FAILURE;
        }
    };
    for f in &findings {
        // Without --check the pages were just written; what remains is for a person.
        let fails = check && !f.is_warning();
        failed |= fails;
        eprintln!("{}: {f}", if fails { "error" } else { "warning" });
    }
    if failed {
        ExitCode::FAILURE
    } else {
        ExitCode::SUCCESS
    }
}
