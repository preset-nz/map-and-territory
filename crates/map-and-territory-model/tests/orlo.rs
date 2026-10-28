//! The Orlo campaign: an end-to-end test of how far the app gets towards the four sheets in
//! guidance's Orlo walkthrough (`projects/map-and-territory/design/walkthrough-orlo.md`).
//!
//! It is built through the commands the app runs, by id with JSON payloads, so anything it
//! does a person could do in the window. The painted hexes in `orlo/painted.json` are the ones
//! the walkthrough's drawings paint. The result is saved as `tests/window/fixtures/orlo.campaign`:
//! open it in the app to see how close the sheets come.
//!
//! When a kind lands that takes a walkthrough step further, add the step here and write the
//! file again with `just fixtures orlo`. The
//! walkthrough's "Test campaign" section says which steps the file reaches.

use std::path::PathBuf;

mod common;

use map_and_territory_model::MapAndTerritory;
use rhizome_core::IdSource;
use rhizome_pom::{Document, FileStore, MemoryStore};
use serde::Deserialize;
use serde_json::{json, Value as Json};

type Doc = Document<MapAndTerritory>;

const THEME: &str = "/themes/space-opera";

#[derive(Deserialize)]
struct Sheet {
    cols: i64,
    rows: i64,
    radius: f64,
    /// `[column, row, terrain]` on the drawing's grid: odd rows shifted right.
    cells: Vec<(i64, i64, String)>,
    #[serde(default)]
    lower: Vec<(i64, i64, String)>,
}

#[derive(Deserialize)]
struct Painted {
    drift: Sheet,
    pell: Sheet,
    landing: Sheet,
    caves: Sheet,
}

fn painted() -> Painted {
    serde_json::from_str(include_str!("orlo/painted.json")).unwrap()
}

fn run(d: &mut Doc, id: &str, p: Json) {
    if let Err(e) = d.run(id, &p) {
        panic!("{id} at {}: {e}", p["at"]);
    }
}

fn set(d: &mut Doc, at: &str, key: &str, value: Json) {
    run(
        d,
        "value.set",
        json!({ "at": at, "key": key, "value": value }),
    );
}

fn rgba(hex: &str) -> Json {
    let c = |i: usize| f64::from(u8::from_str_radix(&hex[i..i + 2], 16).unwrap()) / 255.0;
    json!([c(1), c(3), c(5), 1.0])
}

/// The newest child of `parent` in `order`.
fn newest(d: &Doc, parent: &str, order: &str) -> String {
    let n = d.tree().at(parent).unwrap();
    n.order(order).last().unwrap().path().to_string()
}

/// A drawing hex to the app's axial hex. The app puts hex (0, 0) in the middle of the paper,
/// so the drawing's grid is centred first, by an even number of rows to keep the odd-row shift.
fn axial(s: &Sheet, col: i64, row: i64) -> (i64, i64) {
    let (c0, r0) = (s.cols / 2, (s.rows / 2) & !1);
    let (c, r) = (col - c0, row - r0);
    (c - (r - (r & 1)) / 2, r)
}

fn paint(d: &mut Doc, layer: &str, s: &Sheet, cells: &[(i64, i64, String)]) {
    let cells: Vec<Json> = cells
        .iter()
        .map(|(c, r, t)| {
            let (q, r) = axial(s, *c, *r);
            json!({ "q": q, "r": r, "terrainId": t })
        })
        .collect();
    run(d, "freeform.paint", json!({ "at": layer, "cells": cells }));
}

fn map(d: &mut Doc, name: &str, s: &Sheet) -> String {
    run(
        d,
        "node.add",
        json!({ "parent": "/maps", "type": "map", "name": name }),
    );
    let m = newest(d, "/maps", "maps");
    // the drawing's paper colour; epic 33 makes it the palette's `paper`
    set(d, &format!("{m}/paper"), "color", rgba("#f6f6f2"));
    set(d, &format!("{m}/hexgrid"), "size", json!(s.radius));
    m
}

fn layer(d: &mut Doc, m: &str, kind: &str, name: &str) -> String {
    run(
        d,
        "node.add",
        json!({ "parent": m, "type": kind, "name": name }),
    );
    // a new layer goes on top of the stack, under the grid
    let layers = d.tree().at(m).unwrap().order("layers");
    layers[layers.len() - 2].path().to_string()
}

/// Walkthrough opening: the campaign and one palette for the space sheets. A palette can't
/// be made in the app yet (epic 33 story 2), so the built-in Space Opera is used and its values
/// set by command, as the inspector will.
fn campaign(d: &mut Doc) {
    set(d, "/campaign/campaign", "name", json!("Orlo"));
    run(
        d,
        "palette.use",
        json!({ "at": "/campaign/campaign", "preset": "Space Opera" }),
    );
    set(d, THEME, "name", json!("Orlo Survey"));
    set(
        d,
        THEME,
        "description",
        json!("Pale paper, near-black ink, one signal colour"),
    );
    set(d, THEME, "gridLine", rgba("#c9d0d0"));
    set(d, THEME, "background", rgba("#f6f6f2"));
    set(d, THEME, "primary", rgba("#1b2124"));
    set(d, THEME, "secondary", rgba("#59636a"));
    set(d, THEME, "accent", rgba("#b04a1c"));
    let terrain = |id: &str, base: &str, name: &str, colour: &str| json!({ "id": id, "baseType": base, "traits": [], "name": name, "colour": rgba(colour) });
    set(
        d,
        THEME,
        "terrains",
        json!([
            // the drift should stay paper (gap T1); a near-paper tint until then
            terrain("drift", "plains", "Drift", "#ebece8"),
            terrain("dense-drift", "hills", "Dense drift", "#dcdeda"),
            terrain("mare", "plains", "Mare", "#d6d5cf"),
            terrain("water", "water", "Brine", "#a9bfc8"),
            terrain("salt", "plains", "Salt flat", "#efece2"),
            terrain("steppe", "plains", "Steppe", "#e3d6ad"),
            terrain("scrub", "forest", "Scrub", "#c3c79c"),
            terrain("hills", "hills", "Broken hills", "#d2c3a8"),
            terrain("ridge", "mountains", "Basalt ridge", "#a89f93"),
            terrain("cave-floor", "plains", "Cave floor", "#e8e2d4"),
            terrain("rubble", "hills", "Boulder choke", "#c9bfae"),
            terrain("cave-water", "water", "Sump", "#a9bfc8"),
        ]),
    );
}

fn build(d: &mut Doc) {
    let p = painted();
    campaign(d);

    // Sheet 1, steps 1, 2 and 7: the map, the grid, the drift painted
    let m = map(d, "The Tamsin Drift", &p.drift);
    let l = layer(d, &m, "freeform", "Drift");
    paint(d, &l, &p.drift, &p.drift.cells);

    // Sheet 2, steps 19 and 20: the mare painted
    let m = map(d, "Pell · Mare Cindra", &p.pell);
    let l = layer(d, &m, "freeform", "Mare");
    paint(d, &l, &p.pell, &p.pell.cells);

    // Sheet 3, steps 30 to 32: the terrain painted
    let m = map(d, "Brand's Landing", &p.landing);
    let l = layer(d, &m, "freeform", "Terrain");
    paint(d, &l, &p.landing, &p.landing.cells);

    // Sheet 4, steps 41, 42 and 44: floor, choke and sump, and the lower series below them
    let m = map(d, "The Kettle Holes", &p.caves);
    let l = layer(d, &m, "freeform", "Lower series");
    paint(d, &l, &p.caves, &p.caves.lower);
    let l = layer(d, &m, "freeform", "Floor");
    paint(d, &l, &p.caves, &p.caves.cells);
}

fn fixture() -> PathBuf {
    common::fixture("orlo")
}

fn saved_text() -> String {
    let dir = std::env::temp_dir().join(format!("orlo-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let mut file: Doc = Document::new_with_ids(FileStore, IdSource::sequential()).unwrap();
    build(&mut file);
    let path = dir.join("orlo.campaign");
    file.save_as(&path).unwrap();
    let text = std::fs::read_to_string(&path).unwrap();
    std::fs::remove_dir_all(&dir).ok();
    text
}

#[test]
fn the_four_sheets_build_through_commands() {
    let mut d: Doc =
        Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    build(&mut d);
    let maps: Vec<String> = d
        .tree()
        .at("/maps")
        .unwrap()
        .order("maps")
        .iter()
        .map(|n| n.path().to_string())
        .collect();
    assert_eq!(maps.len(), 4);
    let caves = d.tree().at(maps[3].as_str()).unwrap();
    let stack: Vec<String> = caves
        .order("layers")
        .iter()
        .map(|n| n.type_name().to_string())
        .collect();
    // the lower series is under the floor, both between the anchors
    assert_eq!(stack, ["paper", "freeform", "freeform", "hexgrid"]);
}

#[test]
fn the_fixture_is_current() {
    let text = saved_text();
    common::check_or_write("orlo", &text);
}

#[test]
fn the_fixture_opens() {
    let (d, _): (Doc, _) = Document::open(FileStore, fixture()).unwrap();
    assert!(!d.is_unsaved());
    assert_eq!(d.tree().at("/maps").unwrap().children().count(), 4);
}
