//! One of everything: a campaign with each thing the app can put on a map once, not every
//! style of it (Georg, 2026-10-28). Every terrain of the palette in its own band, a hex noise
//! layer, an open and a closed outline, a place and a hidden one, a title and a compass, on one
//! map. Open it to see a new
//! kind or a palette change against all the rest at once.
//!
//! Built through the commands the app runs, as `sallow_fen.rs` is. When a kind lands (roads and
//! rivers, epic 29; locations' areas, epic 28) or cells paint terrain ids (epic 26), add it here and write
//! the file again with `EVERYTHING_WRITE=1 cargo test -p map-and-territory-model --test
//! one_of_everything`.

use std::path::{Path, PathBuf};

use map_and_territory_model::MapAndTerritory;
use rhizome_core::IdSource;
use rhizome_pom::{Document, FileStore, MemoryStore};
use serde_json::{json, Value as Json};

type Doc = Document<MapAndTerritory>;

/// Doom Forge's terrains by base type, one each. Cells hold a base type until epic 26, so
/// painting the five paints every terrain of the palette.
const TERRAINS: [&str; 5] = ["water", "plains", "forest", "hills", "mountains"];
/// Each terrain's band: this many columns wide, over these rows.
const BAND: i64 = 4;
const ROWS: std::ops::RangeInclusive<i64> = -6..=6;

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

fn newest(d: &Doc, parent: &str, order: &str) -> String {
    let n = d.tree().at(parent).unwrap();
    n.order(order).last().unwrap().path().to_string()
}

fn layer(d: &mut Doc, m: &str, kind: &str, name: &str) -> String {
    run(
        d,
        "node.add",
        json!({ "parent": m, "type": kind, "name": name }),
    );
    let layers = d.tree().at(m).unwrap().order("layers");
    layers[layers.len() - 2].path().to_string()
}

/// An offset hex (column, row; odd rows shifted right, pointy-top) as the app's axial hex.
fn axial(col: i64, row: i64) -> (i64, i64) {
    (col - (row - (row & 1)) / 2, row)
}

fn corner(col: i64, row: i64, i: i64) -> Json {
    let (q, r) = axial(col, row);
    json!({ "q": q, "r": r, "corner": i })
}

fn build(d: &mut Doc) {
    set(d, "/campaign/campaign", "name", json!("One of Everything"));
    run(
        d,
        "node.add",
        json!({ "parent": "/maps", "type": "map", "name": "One of Everything" }),
    );
    let m = newest(d, "/maps", "maps");

    // the noise under the terrain, so it shows round the bands
    let noise = layer(d, &m, "hex-noise", "Noise");
    set(d, &noise, "opacity", json!(0.5));

    // every terrain, one band each, west to east
    let terrain = layer(d, &m, "freeform", "Terrain");
    let first = -(TERRAINS.len() as i64 * BAND) / 2;
    let mut cells = Vec::new();
    for (i, t) in TERRAINS.iter().enumerate() {
        for col in 0..BAND {
            for row in ROWS {
                let (q, r) = axial(first + i as i64 * BAND + col, row);
                cells.push(json!({ "q": q, "r": r, "terrainId": t }));
            }
        }
    }
    run(
        d,
        "freeform.paint",
        json!({ "at": terrain, "cells": cells }),
    );

    // an open line along the top of the bands and a closed ring round one hex
    let lines = layer(d, &m, "outline", "Lines");
    let top = *ROWS.start();
    let open: Vec<Json> = (first..first + TERRAINS.len() as i64 * BAND)
        .flat_map(|col| [corner(col, top, 4), corner(col, top, 5)])
        .collect();
    let ring: Vec<Json> = (0..6).map(|i| corner(0, 0, i)).collect();
    run(
        d,
        "outline.draw",
        json!({ "at": lines, "paths": [
            { "corners": open, "closed": false },
            { "corners": ring, "closed": true },
        ] }),
    );

    // a place and a hidden one
    let places = layer(d, &m, "locations", "Locations");
    for (name, col, hidden) in [("Keep", -6, false), ("Secret", 6, true)] {
        let (q, r) = axial(col, 0);
        run(
            d,
            "locations.add",
            json!({ "at": places, "q": q, "r": r, "name": name }),
        );
        if hidden {
            let n = d.tree().at(&places).unwrap();
            let at = n.order("locations").last().unwrap().path().to_string();
            set(d, &at, "hidden", json!(true));
        }
    }

    run(d, "node.add", json!({ "parent": m, "type": "cartouche" }));
    run(d, "node.add", json!({ "parent": m, "type": "compass" }));
    let compass = newest(d, &m, "furniture");
    run(
        d,
        "compass.set-style",
        json!({ "at": compass, "style": "rose" }),
    );
}

fn fixture() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/window/fixtures/one-of-everything.campaign")
}

fn saved_text() -> String {
    let dir = std::env::temp_dir().join(format!("one-of-everything-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let mut file: Doc = Document::new_with_ids(FileStore, IdSource::sequential()).unwrap();
    build(&mut file);
    let path = dir.join("one-of-everything.campaign");
    file.save_as(&path).unwrap();
    let text = std::fs::read_to_string(&path).unwrap();
    std::fs::remove_dir_all(&dir).ok();
    text
}

#[test]
fn it_holds_one_of_each_kind() {
    let mut d: Doc =
        Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    build(&mut d);
    let map = &d.tree().at("/maps").unwrap().order("maps")[0];
    let kinds = |order: &str| -> Vec<String> {
        map.order(order)
            .iter()
            .map(|n| n.type_name().to_string())
            .collect()
    };
    assert_eq!(
        kinds("layers"),
        [
            "paper",
            "hex-noise",
            "freeform",
            "outline",
            "locations",
            "hexgrid"
        ]
    );
    assert_eq!(kinds("furniture"), ["cartouche", "compass"]);
}

#[test]
fn the_fixture_is_current() {
    let text = saved_text();
    if std::env::var_os("EVERYTHING_WRITE").is_some() {
        std::fs::write(fixture(), &text).unwrap();
        return;
    }
    let on_disk = std::fs::read_to_string(fixture()).unwrap_or_default();
    assert!(
        on_disk == text,
        "tests/window/fixtures/one-of-everything.campaign is stale: write it again with EVERYTHING_WRITE=1"
    );
}

#[test]
fn the_fixture_opens() {
    let (d, _): (Doc, _) = Document::open(FileStore, fixture()).unwrap();
    assert!(!d.is_unsaved());
}
