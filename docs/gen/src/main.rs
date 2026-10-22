//! `just docs`: one markdown page per Map & Territory node kind in `docs/nodes/`, from the
//! words the kinds carry (`crates/map-and-territory-model/src/kinds.rs`). `--check` writes
//! nothing and fails on a missing, stale or orphaned page or a kind without a summary
//! (`just docs-check`, part of `just check`).

use std::path::PathBuf;
use std::process::ExitCode;

use map_and_territory_model::MapAndTerritory;
use rhizome_core::IdSource;
use rhizome_pom::{Document, MemoryStore, ObjectModel};

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
    let mut failed = false;
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
