//! What the fixture tests share: where a fixture lives, and checking it against what the
//! commands build or writing it again.
//!
//! `FIXTURES=<name>[,<name>…]` writes those fixtures instead of checking them, and
//! `FIXTURES=all` writes every one: `just fixtures every-layout`, or `just fixtures` for all.
//! The names are the files' stems: `one-of-everything`, `every-layout`, `booklet`, `map-shapes`, `orlo`, `sallow-fen`.

// Each test file takes what it uses.
#![allow(dead_code)]

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

/// Writes `text` to `path` when `write`; otherwise fails if the file isn't `text`. `how` is
/// the command that writes it again, for the failure message. For files outside
/// `tests/window/fixtures`, with a switch of their own (`EXAMPLES=all`).
pub fn check_or_write_at(path: &Path, write: bool, text: &str, how: &str) {
    if write {
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, text).unwrap();
        return;
    }
    let on_disk = std::fs::read_to_string(path).unwrap_or_default();
    assert!(
        on_disk == text,
        "{} is stale: write it again with `{how}`",
        path.display()
    );
}

/// The Sallow Fen's drawing: 19 by 13 hexes, pointy-top, odd rows shifted right.
pub const COLS: i64 = 19;
pub const ROWS: i64 = 13;
/// The drawing's centre hex, which the app puts at the middle of the paper. An even row, so
/// the odd-row shift carries over.
pub const C0: i64 = COLS / 2;
pub const R0: i64 = (ROWS / 2) & !1;

/// The examples page's terrain field: which Doom Forge terrain a drawing point holds. A cell
/// holds a terrain's base type, as the brush paints it, and the palette colours it: water is
/// Blood Mires, plains Bone Fields, forest Ash Thickets, hills Iron Graves, mountains Doom Crags.
pub fn terrain_at(x: f64, y: f64) -> &'static str {
    let v = (x * 0.011).sin() + (y * 0.016).cos() + 0.6 * ((x - y) * 0.006).sin();
    if v < -1.1 {
        "water"
    } else if v < 0.3 {
        "plains"
    } else if v < 1.0 {
        "forest"
    } else if v < 1.6 {
        "hills"
    } else {
        "mountains"
    }
}

/// A drawing hex (column, row) as the app's axial hex.
pub fn axial(col: i64, row: i64) -> (i64, i64) {
    let (c, r) = (col - C0, row - R0);
    (c - (r - (r & 1)) / 2, r)
}

/// The painted hexes of the drawing, the border hex on every side included: `freeform.paint`'s
/// cells, each the terrain `terrain_at` gives at its centre (radius 24, so a step of √3 × 24).
pub fn terrain_cells() -> Vec<serde_json::Value> {
    const RADIUS: f64 = 24.0;
    const STEP: f64 = 41.569_219_381_653_05;
    let mut cells = Vec::new();
    for row in -1..=ROWS {
        for col in -1..=COLS {
            let x = col as f64 * STEP + if row % 2 != 0 { STEP / 2.0 } else { 0.0 };
            let y = row as f64 * 1.5 * RADIUS;
            let (q, r) = axial(col, row);
            cells.push(serde_json::json!({ "q": q, "r": r, "terrainId": terrain_at(x, y) }));
        }
    }
    cells
}
