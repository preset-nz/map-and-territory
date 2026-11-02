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

/// The pictures of every page, from `docs/examples/examples.json` (written by
/// `crates/map-and-territory-model/tests/examples.rs`): `(page, image, caption)` in order.
fn manifest(dir: &Path) -> Result<Vec<(String, String, String)>, String> {
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
        .map(|e| Ok((field(e, "page")?, field(e, "image")?, field(e, "caption")?)))
        .collect()
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

/// Writes each page's Examples block, or with `check` reports each that is missing, stale or
/// names an image `img/` lacks. Returns whether it all holds.
fn examples(dir: &Path, check: bool) -> Result<bool, String> {
    let all = manifest(dir)?;
    let mut pages: Vec<&str> = all.iter().map(|(p, _, _)| p.as_str()).collect();
    pages.dedup();
    let mut ok = true;
    for page in pages {
        let pictures: Vec<(&str, &str)> = all
            .iter()
            .filter(|(p, _, _)| p == page)
            .map(|(_, i, c)| (i.as_str(), c.as_str()))
            .collect();
        for (image, _) in &pictures {
            if !dir.join(format!("img/{image}.webp")).exists() {
                eprintln!(
                    "error: {page}: docs/nodes/img/{image}.webp is missing: run `just examples`"
                );
                ok = false;
            }
        }
        let file = dir.join(format!("{page}.md"));
        let text =
            std::fs::read_to_string(&file).map_err(|e| format!("{}: {e}", file.display()))?;
        let next = with_block(&text, &pictures);
        if next == text {
            continue;
        }
        if check {
            eprintln!("error: {page}: the Examples block is stale: run `just examples`");
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
    let findings = match preset_docs::check(&dir, &schema, app) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("map-and-territory-docs: {e}");
            return ExitCode::FAILURE;
        }
    };
    let mut failed = match examples(&dir, check) {
        Ok(ok) => !ok,
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
