//! One of everything: a campaign with each thing the app can put on a map once, not every
//! style of it (Georg, 2026-10-28). Every terrain of the palette in its own band, a hex noise
//! layer, an open and a closed outline, a place and a hidden one, a title and a compass, on one
//! map. Open it to see a new
//! kind or a palette change against all the rest at once.
//!
//! `every-layout.campaign` is the same map once per page layout (epic 32) and once as a square
//! and a 4:3 map, with more places so
//! the key fills its columns: export it as one PDF to see every layout side by side. Write it
//! again with `just fixtures every-layout`. `booklet.campaign` is the same as a spine booklet
//! (`just fixtures booklet`).
//!
//! Built through the commands the app runs, as `sallow_fen.rs` is. When a kind lands (roads and
//! rivers, epic 29; locations' areas, epic 28) or cells paint terrain ids (epic 26), add it here and write
//! the file again with `just fixtures one-of-everything`.

use std::path::PathBuf;

mod common;

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

/// Each page layout, in the map kind's order, and what its map is called.
const LAYOUTS: [(&str, &str); 5] = [
    ("map-top", "Map on top, key below"),
    ("map-top-2col", "Key in two columns"),
    ("map-top-3col", "Key in three columns"),
    ("map-bottom", "Key on top, map below"),
    ("map-full", "Map alone"),
];

/// The paper shapes besides 16:10, each once after the layouts.
const SHAPES: [(&str, &str); 2] = [("square", "Square map"), ("4:3", "4:3 map")];

/// Places for the key, with a line each.
const PLACES: [(&str, &str); 10] = [
    (
        "Reedwall Keep",
        "Held by the Vane since the flood, three towers and a drowned gate.",
    ),
    (
        "Weeping Well",
        "Its water tastes of salt; the village will not drink from it.",
    ),
    (
        "Gallows Ford",
        "Knee-deep in summer, a swim in spring. A rope still hangs.",
    ),
    ("Old Mill", "The wheel turns with no stream under it."),
    (
        "Crow Hill",
        "A beacon stands ready; nobody remembers who lights it.",
    ),
    (
        "Saltmarsh Inn",
        "Warm beds, thin walls, a landlord who sells to both sides.",
    ),
    (
        "Barrow of Kings",
        "Seven mounds, one opened, one that hums at night.",
    ),
    ("Ferryman's Hut", "The fare is a coin and a secret."),
    (
        "Blackwater",
        "Deep, cold and full of eels as long as a man.",
    ),
    (
        "Standing Stones",
        "Count them twice: the number is never the same.",
    ),
];

/// The one-of-everything map with ten more places, once per layout, then once more for each
/// other paper shape.
fn build_layouts(d: &mut Doc) {
    build(d);
    set(d, "/campaign/campaign", "name", json!("Every Layout"));
    let m = newest(d, "/maps", "maps");
    let places = d.tree().at(m.as_str()).unwrap().order("layers")[4]
        .path()
        .to_string();
    for (i, (name, line)) in PLACES.iter().enumerate() {
        // two rows of five, four columns apart, so no name runs into the next
        let i = i as i64;
        let (q, r) = axial(
            (i / 2) * 4 - 9 + (i % 2) * 2,
            if i % 2 == 0 { -3 } else { 3 },
        );
        run(
            d,
            "locations.add",
            json!({ "at": places, "q": q, "r": r, "name": name }),
        );
        let at = newest(d, &places, "locations");
        set(d, &at, "description", json!(line));
    }
    for (i, (layout, name)) in LAYOUTS.iter().enumerate() {
        let at = if i == 0 {
            m.clone()
        } else {
            // a copy lands just after its source, so copy the last one to keep the order
            let last = newest(d, "/maps", "maps");
            run(d, "edit.duplicate", json!({ "at": last }));
            newest(d, "/maps", "maps")
        };
        set(d, &at, "name", json!(name));
        set(d, &at, "layout", json!(layout));
    }
    // the other shapes, one example each, on the first layout (Georg)
    for (aspect, name) in SHAPES {
        let last = newest(d, "/maps", "maps");
        run(d, "edit.duplicate", json!({ "at": last }));
        let at = newest(d, "/maps", "maps");
        set(d, &at, "name", json!(name));
        set(d, &at, "layout", json!(LAYOUTS[0].0));
        set(d, &format!("{at}/paper"), "aspect", json!(aspect));
    }
}

/// Every layout as a spine booklet (epic 32 story 4): a cover, a page per map, the back.
fn build_booklet(d: &mut Doc) {
    build_layouts(d);
    set(
        d,
        "/campaign/campaign",
        "name",
        json!("Every Layout Booklet"),
    );
    run(d, "booklet.set", json!({ "booklet": "spine" }));
}

fn fixture() -> PathBuf {
    common::fixture("one-of-everything")
}

fn saved_text() -> String {
    saved_text_of(build, "one-of-everything.campaign")
}

fn saved_text_of(build: fn(&mut Doc), name: &str) -> String {
    let dir = std::env::temp_dir().join(format!("{name}-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let mut file: Doc = Document::new_with_ids(FileStore, IdSource::sequential()).unwrap();
    build(&mut file);
    let path = dir.join(name);
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
    common::check_or_write("one-of-everything", &text);
}

#[test]
fn the_fixture_opens() {
    let (d, _): (Doc, _) = Document::open(FileStore, fixture()).unwrap();
    assert!(!d.is_unsaved());
}

#[test]
fn every_layout_holds_the_same_map_once_per_layout_and_shape() {
    let mut d: Doc =
        Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    build_layouts(&mut d);
    let maps = d.tree().at("/maps").unwrap().order("maps");
    let layouts: Vec<String> = maps
        .iter()
        .map(|m| match m.value("layout") {
            Some(rhizome_core::Value::Choice(c)) => c,
            other => panic!("layout is {other:?}"),
        })
        .collect();
    let mut want: Vec<String> = LAYOUTS.iter().map(|(l, _)| l.to_string()).collect();
    want.extend(["map-top".to_string(), "map-top".to_string()]);
    assert_eq!(layouts, want);
    // every copy keeps the twelve places
    for m in &maps {
        let places = &m.order("layers")[4];
        assert_eq!(places.type_name(), "locations");
        assert_eq!(places.order("locations").len(), 12);
    }
}

#[test]
fn every_layout_fixture_is_current() {
    let text = saved_text_of(build_layouts, "every-layout.campaign");
    common::check_or_write("every-layout", &text);
}

#[test]
fn booklet_fixture_is_current() {
    let text = saved_text_of(build_booklet, "booklet.campaign");
    common::check_or_write("booklet", &text);
}
