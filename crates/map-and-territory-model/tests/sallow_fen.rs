//! The Sallow Fen: the MVP's target map (guidance `projects/map-and-territory/feature/mvp-zine-page.md`),
//! built the way the walkthrough makes it (`design/walkthrough-sallow-fen.md`), as far as the app
//! goes today.
//!
//! It is built through the commands the app runs, by id with JSON payloads, so anything it does a
//! person could do in the window. The landscape is the one on the map furniture examples page:
//! the same terrain field over the same hexes, the Edge of the Fen and the Old Road along the
//! lines that page draws them. The result is saved as `tests/window/fixtures/sallow-fen.campaign`:
//! open it in the app to see how close the page comes.
//!
//! Step 23's locations are points with names and numbers (epic 28's first slice).
//!
//! When a kind lands that takes a walkthrough step further, add the step here and write the file
//! again with `SALLOW_WRITE=1 cargo test -p map-and-territory-model --test sallow_fen`.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use map_and_territory_model::MapAndTerritory;
use rhizome_core::IdSource;
use rhizome_pom::{Document, FileStore, MemoryStore};
use serde_json::{json, Value as Json};

type Doc = Document<MapAndTerritory>;

/// The examples page's hexes: radius 24, pointy-top, odd rows shifted right, over a map 760 by
/// 456 px (its PNG is drawn at twice that).
const RADIUS: f64 = 24.0;
const STEP: f64 = 41.569_219_381_653_05; // √3 × 24
const COLS: i64 = 19;
const ROWS: i64 = 13;
const WIDTH: f64 = 760.0;
const HEIGHT: f64 = 456.0;
/// The drawing's centre hex, which the app puts at the middle of the paper. An even row, so
/// the odd-row shift carries over.
const C0: i64 = COLS / 2;
const R0: i64 = (ROWS / 2) & !1;
/// The app's paper is 1200 px wide; at this size the drawing's 760 px fit across it.
const GRID_SIZE: f64 = 38.0;

/// The examples page's terrain field: which Doom Forge terrain a drawing point holds. A cell
/// holds a terrain's base type, as the brush paints it, and the palette colours it: water is
/// Blood Mires, plains Bone Fields, forest Ash Thickets, hills Iron Graves, mountains Doom Crags.
fn terrain_at(x: f64, y: f64) -> &'static str {
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
fn axial(col: i64, row: i64) -> (i64, i64) {
    let (c, r) = (col - C0, row - R0);
    (c - (r - (r & 1)) / 2, r)
}

/// An axial hex's centre in drawing px.
fn centre(q: i64, r: i64) -> (f64, f64) {
    let x0 = C0 as f64 * STEP;
    let y0 = R0 as f64 * 1.5 * RADIUS;
    (
        x0 + STEP * (q as f64 + r as f64 / 2.0),
        y0 + 1.5 * RADIUS * r as f64,
    )
}

/// A hex corner in drawing px; the app's numbering, pointy-top: 0 at upper right, clockwise.
fn corner_at(q: i64, r: i64, i: i64) -> (f64, f64) {
    let (x, y) = centre(q, r);
    let a = (-30.0 + 60.0 * i as f64).to_radians();
    (x + RADIUS * a.cos(), y + RADIUS * a.sin())
}

type Key = (i64, i64);
type Corner = (i64, i64, i64);

fn key((x, y): (f64, f64)) -> Key {
    ((x * 10.0).round() as i64, (y * 10.0).round() as i64)
}

/// Every hex corner over the drawing and a margin, with its neighbours along hex edges.
struct Corners {
    at: HashMap<Key, (Corner, (f64, f64))>,
    next: HashMap<Key, Vec<Key>>,
}

fn corners() -> Corners {
    let mut at = HashMap::new();
    let mut next: HashMap<Key, Vec<Key>> = HashMap::new();
    for row in -2..ROWS + 2 {
        for col in -2..COLS + 2 {
            let (q, r) = axial(col, row);
            for i in 0..6 {
                let p = corner_at(q, r, i);
                let k = key(p);
                at.entry(k).or_insert(((q, r, i), p));
                let n = key(corner_at(q, r, (i + 1) % 6));
                for (a, b) in [(k, n), (n, k)] {
                    let list = next.entry(a).or_default();
                    if !list.contains(&b) {
                        list.push(b);
                    }
                }
            }
        }
    }
    Corners { at, next }
}

/// A line along hex edges that follows `target` (a coordinate for each position along the
/// line) from `start` until `done`: at each corner it takes the unvisited edge that keeps it
/// closest to the target and doesn't turn back; an edge that makes no headway costs a little,
/// so the line only steps sideways where the target moves. `along` reads the position,
/// `across` the coordinate the target gives.
fn walk(
    c: &Corners,
    start: (f64, f64),
    along: fn((f64, f64)) -> f64,
    across: fn((f64, f64)) -> f64,
    target: &dyn Fn(f64) -> f64,
    done: &dyn Fn((f64, f64)) -> bool,
) -> Vec<Json> {
    let mut cur = *c
        .at
        .keys()
        .min_by(|a, b| {
            let d = |k: &Key| {
                let p = c.at[k].1;
                (p.0 - start.0).hypot(p.1 - start.1)
            };
            d(a).total_cmp(&d(b))
        })
        .unwrap();
    let mut seen = HashSet::from([cur]);
    let mut out = Vec::new();
    loop {
        let ((q, r, i), p) = c.at[&cur];
        out.push(json!({ "q": q, "r": r, "corner": i }));
        if done(p) {
            break;
        }
        let Some(step) = c.next[&cur]
            .iter()
            .filter(|k| !seen.contains(k) && along(c.at[k].1) >= along(p) - 0.5)
            .min_by(|a, b| {
                let off = |k: &Key| {
                    let n = c.at[k].1;
                    let stalled = if along(n) - along(p) < 1.0 { 8.0 } else { 0.0 };
                    (across(n) - target(along(n))).abs() + stalled
                };
                off(a).total_cmp(&off(b))
            })
            .copied()
        else {
            break;
        };
        seen.insert(step);
        cur = step;
    }
    out
}

/// Straight lines between `(position, coordinate)` points, as the examples page's curves read.
fn through(points: &'static [(f64, f64)]) -> impl Fn(f64) -> f64 {
    move |t| {
        let i = points.iter().rposition(|p| p.0 <= t).unwrap_or(0);
        let (a, b) = (points[i], points[(i + 1).min(points.len() - 1)]);
        if b.0 == a.0 {
            return a.1;
        }
        a.1 + (b.1 - a.1) * ((t - a.0) / (b.0 - a.0)).clamp(0.0, 1.0)
    }
}

/// The Edge of the Fen, north to south: x for each y, read off the examples page.
const FEN: &[(f64, f64)] = &[
    (0.0, 470.0),
    (75.0, 475.0),
    (150.0, 487.0),
    (225.0, 492.0),
    (300.0, 487.0),
    (375.0, 500.0),
    (456.0, 525.0),
];
/// The Old Road, west to east: y for each x.
const ROAD: &[(f64, f64)] = &[
    (0.0, 297.0),
    (75.0, 290.0),
    (225.0, 302.0),
    (350.0, 280.0),
    (475.0, 250.0),
    (625.0, 240.0),
    (760.0, 245.0),
];

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

fn furniture(d: &mut Doc, m: &str, kind: &str) -> String {
    run(d, "node.add", json!({ "parent": m, "type": kind }));
    newest(d, m, "furniture")
}

fn build(d: &mut Doc) {
    // Steps 1 and 2: the campaign, on Doom Forge (a new document's palette), printed A5 landscape
    set(d, "/campaign/campaign", "name", json!("The Sallow Fen"));
    set(
        d,
        "/campaign/campaign",
        "pageOrientation",
        json!("landscape"),
    );

    // Steps 3, 4 and 6: the map, its paper and grid. The grid is scaled from the walkthrough's
    // 24 px so the examples page's whole landscape fills the 1200 px sheet. Its ink is the
    // palette's, which the title and compass print in; the lines are lighter by `alpha`, and
    // inked by hand (epic 20).
    run(
        d,
        "node.add",
        json!({ "parent": "/maps", "type": "map", "name": "The Sallow Fen" }),
    );
    let m = newest(d, "/maps", "maps");
    set(d, &format!("{m}/paper"), "color", rgba("#e9ece4"));
    let grid = format!("{m}/hexgrid");
    set(d, &grid, "size", json!(GRID_SIZE));
    set(d, &grid, "alpha", json!(0.45));
    set(d, &grid, "misregistration", json!(1.0));
    set(d, &grid, "cornerJitter", json!(0.6));
    set(d, &grid, "widthNoise", json!(0.35));
    set(d, &grid, "inkNoise", json!(0.3));

    // Steps 8 to 10: the terrain, from the examples page's field. That page lays its colours
    // over the paper at about 0.55, so the layer does too.
    let terrain = layer(d, &m, "freeform", "Terrain");
    set(d, &terrain, "opacity", json!(0.6));
    let mut cells = Vec::new();
    for row in -1..=ROWS {
        for col in -1..=COLS {
            let x = col as f64 * STEP + if row % 2 != 0 { STEP / 2.0 } else { 0.0 };
            let y = row as f64 * 1.5 * RADIUS;
            let (q, r) = axial(col, row);
            cells.push(json!({ "q": q, "r": r, "terrainId": terrain_at(x, y) }));
        }
    }
    run(
        d,
        "freeform.paint",
        json!({ "at": terrain, "cells": cells }),
    );

    // Step 11: the Edge of the Fen, north to south along hex edges, in ink
    let c = corners();
    let fen_x = through(FEN);
    let fen = walk(&c, (fen_x(-20.0), -20.0), |p| p.1, |p| p.0, &fen_x, &|p| {
        p.1 > HEIGHT + 20.0
    });
    let edge = layer(d, &m, "outline", "Edge of the Fen");
    set(d, &edge, "strokeColor", rgba("#1d211c"));
    set(d, &edge, "strokeWidth", json!(3.0));
    run(
        d,
        "outline.draw",
        json!({ "at": edge, "paths": [{ "corners": fen, "closed": false }] }),
    );

    // Step 12 stand-in: the Old Road is a hex path (disco-10, after the MVP). Until then, a
    // dashed outline along the hex edges nearest the examples page's road.
    let road_y = through(ROAD);
    let road = walk(&c, (-20.0, road_y(0.0)), |p| p.0, |p| p.1, &road_y, &|p| {
        p.0 > WIDTH + 20.0
    });
    let old_road = layer(d, &m, "outline", "Old Road");
    set(d, &old_road, "strokeColor", rgba("#1d211c"));
    set(d, &old_road, "strokeWidth", json!(2.0));
    set(d, &old_road, "strokePattern", json!("dashed"));
    run(
        d,
        "outline.draw",
        json!({ "at": old_road, "paths": [{ "corners": road, "closed": false }] }),
    );

    // Step 23: the locations, the Sunken Chapel hidden (epic 28, first slice: points only)
    let places = layer(d, &m, "locations", "Locations");
    for (name, col, row, category, hidden) in [
        ("Reedwall Keep", 5, 3, "stronghold", false),
        ("The Weeping Well", 13, 4, "landmark", false),
        ("Gallows Ford", 11, 7, "landmark", false),
        ("Sunken Chapel", 15, 9, "shrine", true),
    ] {
        let (q, r) = axial(col, row);
        run(
            d,
            "locations.add",
            json!({ "at": places, "q": q, "r": r, "name": name }),
        );
        let n = d.tree().at(&places).unwrap();
        let at = n.order("locations").last().unwrap().path().to_string();
        set(d, &at, "category", json!(category));
        if hidden {
            set(d, &at, "hidden", json!(true));
        }
    }

    // Step 14: the title, double-ruled in the serif, with its subtitle and credit
    let title = furniture(d, &m, "cartouche");
    set(d, &title, "frame", json!("double"));
    set(d, &title, "face", json!("serif"));
    set(
        d,
        &title,
        "subtitle",
        json!("Marches of the Drowned Bishop"),
    );
    set(d, &title, "credit", json!("Surveyed in the year 1347"));
    set(d, &title, "inset", json!(28.0));
    // the examples page sets it at 30 of its 760 px; the same share of the 1200 px sheet
    set(d, &title, "titleSize", json!(46.0));

    // Step 19, on the map: the band below it is out of the MVP. An arrow, bottom right, where
    // the examples page has it in the band.
    let compass = furniture(d, &m, "compass");
    run(
        d,
        "compass.set-style",
        json!({ "at": compass, "style": "arrow" }),
    );
    set(d, &compass, "anchor", json!("bottom-right"));

    // Steps 29 to 32: the grimdark copy. Scratched with the marker on the map's sheet style, so
    // the title and compass follow it; the title on a plate, the compass a plain mark.
    run(d, "edit.duplicate", json!({ "at": m }));
    let grim = newest(d, "/maps", "maps");
    set(d, &grim, "name", json!("The Sallow Fen, grimdark"));
    set(d, &grim, "hand", json!("scratched"));
    set(d, &grim, "face", json!("marker"));
    let grim_title = format!("{grim}/{}", title.rsplit('/').next().unwrap());
    set(d, &grim_title, "frame", json!("plate"));
    set(d, &grim_title, "face", json!("map"));
    set(d, &grim_title, "title", json!("The Sallow Fen"));
    let grim_compass = format!("{grim}/{}", compass.rsplit('/').next().unwrap());
    run(
        d,
        "compass.set-style",
        json!({ "at": grim_compass, "style": "mark" }),
    );
}

fn fixture() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tests/window/fixtures/sallow-fen.campaign")
}

fn saved_text() -> String {
    let dir = std::env::temp_dir().join(format!("sallow-fen-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let mut file: Doc = Document::new_with_ids(FileStore, IdSource::sequential()).unwrap();
    build(&mut file);
    let path = dir.join("sallow-fen.campaign");
    file.save_as(&path).unwrap();
    let text = std::fs::read_to_string(&path).unwrap();
    std::fs::remove_dir_all(&dir).ok();
    text
}

#[test]
fn the_fen_builds_through_commands() {
    let mut d: Doc =
        Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    build(&mut d);
    let maps = d.tree().at("/maps").unwrap().order("maps");
    assert_eq!(maps.len(), 2);
    for m in maps {
        let stack: Vec<String> = m
            .order("layers")
            .iter()
            .map(|n| n.type_name().to_string())
            .collect();
        assert_eq!(
            stack,
            [
                "paper",
                "freeform",
                "outline",
                "outline",
                "locations",
                "hexgrid"
            ]
        );
        let furniture: Vec<String> = m
            .order("furniture")
            .iter()
            .map(|n| n.type_name().to_string())
            .collect();
        assert_eq!(furniture, ["cartouche", "compass"]);
        // the grimdark copy keeps its own four places
        let places = m.order("layers")[4];
        assert_eq!(places.order("locations").len(), 4);
        for p in places.order("locations") {
            assert_eq!(p.parent().unwrap().id(), places.id());
        }
    }
}

#[test]
fn the_lines_run_the_length_of_the_map() {
    let c = corners();
    let fen_x = through(FEN);
    let fen = walk(&c, (fen_x(-20.0), -20.0), |p| p.1, |p| p.0, &fen_x, &|p| {
        p.1 > HEIGHT + 20.0
    });
    // about 13 rows, two edges each
    assert!(fen.len() > 20, "{}", fen.len());
    let road_y = through(ROAD);
    let road = walk(&c, (-20.0, road_y(0.0)), |p| p.0, |p| p.1, &road_y, &|p| {
        p.0 > WIDTH + 20.0
    });
    assert!(road.len() > 30, "{}", road.len());
}

#[test]
fn the_fixture_is_current() {
    let text = saved_text();
    if std::env::var_os("SALLOW_WRITE").is_some() {
        std::fs::write(fixture(), &text).unwrap();
        return;
    }
    let on_disk = std::fs::read_to_string(fixture()).unwrap_or_default();
    assert!(
        on_disk == text,
        "tests/window/fixtures/sallow-fen.campaign is stale: write it again with SALLOW_WRITE=1"
    );
}

#[test]
fn the_fixture_opens() {
    let (d, _): (Doc, _) = Document::open(FileStore, fixture()).unwrap();
    assert!(!d.is_unsaved());
    assert_eq!(d.tree().at("/maps").unwrap().children().count(), 2);
}
