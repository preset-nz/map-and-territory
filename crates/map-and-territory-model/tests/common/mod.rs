//! What the fixture tests share: where a fixture lives, and checking it against what the
//! commands build or writing it again.
//!
//! `FIXTURES=<name>[,<name>…]` writes those fixtures instead of checking them, and
//! `FIXTURES=all` writes every one: `just fixtures every-layout`, or `just fixtures` for all.
//! The names are the files' stems: `one-of-everything`, `every-layout`, `booklet`, `map-shapes`, `orlo`, `sallow-fen`.

use std::path::{Path, PathBuf};

/// `tests/window/fixtures/<name>.campaign`.
pub fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/window/fixtures")
        .join(format!("{name}.campaign"))
}

/// Whether `FIXTURES` asks for `name` to be written.
fn wanted(name: &str) -> bool {
    std::env::var("FIXTURES")
        .is_ok_and(|v| v.split(',').any(|n| n.trim() == name || n.trim() == "all"))
}

/// Writes the fixture when `FIXTURES` names it; otherwise fails if it isn't `text`.
pub fn check_or_write(name: &str, text: &str) {
    let path = fixture(name);
    if wanted(name) {
        std::fs::write(&path, text).unwrap();
        return;
    }
    let on_disk = std::fs::read_to_string(&path).unwrap_or_default();
    assert!(
        on_disk == text,
        "tests/window/fixtures/{name}.campaign is stale: write it again with `just fixtures {name}`"
    );
}
