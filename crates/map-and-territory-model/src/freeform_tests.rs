//! The voxel grid, through commands by id.

use std::sync::Arc;
use std::time::Instant;

use rhizome_core::{IdSource, Value};
use rhizome_pom::{Document, Host, MemoryStore, Outcome, Pom};
use serde_json::{json, Value as Json};

use super::freeform::{locate, CHUNK_CELLS};
use super::voxels::{decode, encode};
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

const MAP: &str = "/maps/map";
const LAYER: &str = "/maps/map/freeform";

fn doc() -> Doc {
    let mut d = Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    run(
        &mut d,
        "node.add",
        json!({ "parent": "/maps", "type": "map" }),
    )
    .unwrap();
    run(
        &mut d,
        "node.add",
        json!({ "parent": MAP, "type": "freeform" }),
    )
    .unwrap();
    d
}

fn run(d: &mut Doc, id: &str, p: Json) -> rhizome_pom::Result<Outcome> {
    d.run(id, &p)
}

fn cell(q: i64, r: i64, t: &str) -> Json {
    json!({ "q": q, "r": r, "terrainId": t })
}

fn paint(d: &mut Doc, cells: Vec<Json>) -> rhizome_pom::Result<Outcome> {
    run(d, "freeform.paint", json!({ "at": LAYER, "cells": cells }))
}

fn erase(d: &mut Doc, cells: Vec<[i64; 2]>) -> rhizome_pom::Result<Outcome> {
    run(d, "freeform.erase", json!({ "at": LAYER, "cells": cells }))
}

fn chunks(d: &Doc) -> Vec<String> {
    let mut v: Vec<String> = d
        .tree()
        .at(LAYER)
        .unwrap()
        .children()
        .map(|c| c.name().to_string())
        .collect();
    v.sort();
    v
}

/// The chunk's stored value, as the document holds it.
fn raw(d: &Doc, chunk: &str) -> Json {
    let at = format!("{LAYER}/{chunk}");
    match d.tree().at(at.as_str()).unwrap().value("voxels") {
        Some(Value::Shaped(v)) => v,
        other => panic!("{at}: {other:?}"),
    }
}

/// The chunk's 256 slots decoded: `null` for empty, else the voxel.
fn voxels(d: &Doc, chunk: &str) -> Vec<Json> {
    decode(&raw(d, chunk))
        .unwrap()
        .into_iter()
        .map(|v| v.unwrap_or(Json::Null))
        .collect()
}

fn painted(d: &Doc, chunk: &str) -> usize {
    voxels(d, chunk).iter().filter(|v| !v.is_null()).count()
}

#[test]
fn a_freeform_layer_is_a_layer() {
    let d = doc();
    assert_eq!(d.tree().undo_label(), Some("Add Freeform Layer"));
    let node = d.tree().at(LAYER).unwrap();
    assert_eq!(node.value("name"), Some(Value::Text("Freeform 01".into())));
    assert_eq!(node.value("visible"), Some(Value::Bool(true)));
    assert_eq!(node.value("opacity"), Some(Value::Float(1.0)));
    assert_eq!(node.value("blend"), Some(Value::Choice("normal".into())));
}

#[test]
fn render_mode_is_a_choice() {
    let mut d = doc();
    let set = |d: &mut Doc, v: Json| {
        run(
            d,
            "value.set",
            json!({ "at": LAYER, "key": "renderMode", "value": v }),
        )
    };
    set(&mut d, json!("texture-fill")).unwrap();
    assert!(set(&mut d, json!("grey")).is_err());
}

#[test]
fn a_hex_is_located_by_floor_division() {
    assert_eq!(locate(0, 0), ((0, 0), 0));
    assert_eq!(locate(15, 0), ((0, 0), 15));
    assert_eq!(locate(0, 1), ((0, 0), 16));
    assert_eq!(locate(16, 0), ((1, 0), 0));
    assert_eq!(locate(-1, -1), ((-1, -1), 255));
    assert_eq!(locate(-16, 3), ((-1, 0), 3 * 16));
    assert_eq!(locate(-17, 50), ((-2, 3), 2 * 16 + 15));
}

#[test]
fn paint_adds_a_chunk_with_the_voxel_in_its_slot() {
    let mut d = doc();
    paint(&mut d, vec![cell(3, 2, "bone-fields")]).unwrap();
    assert_eq!(chunks(&d), ["0_0"]);
    let v = voxels(&d, "0_0");
    assert_eq!(v.len(), CHUNK_CELLS);
    assert_eq!(v[2 * 16 + 3], json!({ "terrainId": "bone-fields" }));
    assert_eq!(painted(&d, "0_0"), 1);
    assert_eq!(d.tree().undo_label(), Some("Paint"));
}

#[test]
fn painting_the_same_block_reuses_the_chunk() {
    let mut d = doc();
    paint(&mut d, vec![cell(0, 0, "a")]).unwrap();
    paint(&mut d, vec![cell(15, 15, "b"), cell(1, 0, "c")]).unwrap();
    assert_eq!(chunks(&d), ["0_0"]);
    assert_eq!(painted(&d, "0_0"), 3);
    // painting a painted hex replaces it
    paint(&mut d, vec![cell(0, 0, "z")]).unwrap();
    assert_eq!(voxels(&d, "0_0")[0], json!({ "terrainId": "z" }));
    assert_eq!(painted(&d, "0_0"), 3);
}

#[test]
fn a_colour_override_is_kept() {
    let mut d = doc();
    let c = json!({ "q": 1, "r": 1, "terrainId": "t", "color": [1.0, 0.5, 0.0, 1.0] });
    paint(&mut d, vec![c]).unwrap();
    assert_eq!(
        voxels(&d, "0_0")[17],
        json!({ "terrainId": "t", "color": [1.0, 0.5, 0.0, 1.0] })
    );
    // an out-of-range colour is refused whole
    let bad = json!({ "q": 2, "r": 2, "terrainId": "t", "color": [2.0, 0.0, 0.0, 1.0] });
    assert!(paint(&mut d, vec![bad]).is_err());
    assert_eq!(painted(&d, "0_0"), 1);
}

#[test]
fn negative_coordinates_make_negative_chunk_names() {
    let mut d = doc();
    paint(
        &mut d,
        vec![
            cell(-1, -1, "a"),
            cell(-16, 3, "b"),
            cell(-17, 50, "c"),
            cell(16, -1, "d"),
        ],
    )
    .unwrap();
    assert_eq!(chunks(&d), ["-1_-1", "-1_0", "-2_3", "1_-1"]);
    assert_eq!(voxels(&d, "-1_-1")[255], json!({ "terrainId": "a" }));
    assert_eq!(voxels(&d, "-1_0")[48], json!({ "terrainId": "b" }));
    assert_eq!(voxels(&d, "-2_3")[47], json!({ "terrainId": "c" }));
    assert_eq!(voxels(&d, "1_-1")[240], json!({ "terrainId": "d" }));
}

#[test]
fn erase_clears_voxels_and_removes_an_emptied_chunk() {
    let mut d = doc();
    paint(
        &mut d,
        vec![cell(0, 0, "a"), cell(1, 0, "a"), cell(20, 0, "a")],
    )
    .unwrap();
    assert_eq!(chunks(&d), ["0_0", "1_0"]);

    erase(&mut d, vec![[0, 0]]).unwrap();
    assert_eq!(painted(&d, "0_0"), 1);
    assert_eq!(d.tree().undo_label(), Some("Erase"));

    // the last voxel goes, and the chunk with it
    erase(&mut d, vec![[1, 0], [20, 0]]).unwrap();
    assert!(chunks(&d).is_empty());

    d.undo().unwrap();
    assert_eq!(chunks(&d), ["0_0", "1_0"], "one undo step brings both back");
}

#[test]
fn the_stored_value_is_the_canonical_encoding() {
    let mut d = doc();
    paint(
        &mut d,
        vec![cell(0, 0, "a"), cell(1, 0, "a"), cell(3, 0, "b")],
    )
    .unwrap();
    assert_eq!(
        raw(&d, "0_0"),
        json!({ "palette": [{ "terrainId": "a" }, { "terrainId": "b" }], "cells": "1*2 0 2 0*252" })
    );
    // painting over keeps it canonical: b replaced by a merges the runs and drops b
    paint(&mut d, vec![cell(2, 0, "a"), cell(3, 0, "a")]).unwrap();
    assert_eq!(
        raw(&d, "0_0"),
        json!({ "palette": [{ "terrainId": "a" }], "cells": "1*4 0*252" })
    );
}

#[test]
fn erasing_part_of_a_chunk_prunes_the_palette() {
    let mut d = doc();
    paint(
        &mut d,
        vec![cell(0, 0, "a"), cell(1, 0, "b"), cell(2, 0, "c")],
    )
    .unwrap();
    erase(&mut d, vec![[0, 0]]).unwrap();
    assert_eq!(
        raw(&d, "0_0"),
        json!({ "palette": [{ "terrainId": "b" }, { "terrainId": "c" }], "cells": "0 1 2 0*253" })
    );
    // the last two go: the chunk goes with them
    erase(&mut d, vec![[1, 0], [2, 0]]).unwrap();
    assert!(chunks(&d).is_empty());
}

#[test]
fn painting_what_is_already_there_leaves_the_chunk_alone() {
    let mut d = doc();
    paint(&mut d, vec![cell(0, 0, "a")]).unwrap();
    assert!(matches!(
        paint(&mut d, vec![cell(0, 0, "a")]).unwrap(),
        Outcome::Nothing
    ));
}

#[test]
fn fill_across_chunks_writes_each_chunk_canonically() {
    let mut d = doc();
    let cells: Vec<Json> = (14..18)
        .flat_map(|r| (14..18).map(move |q| cell(q, r, "grass")))
        .collect();
    run(
        &mut d,
        "freeform.fill",
        json!({ "at": LAYER, "cells": cells }),
    )
    .unwrap();
    assert_eq!(chunks(&d), ["0_0", "0_1", "1_0", "1_1"]);
    for c in chunks(&d) {
        assert_eq!(painted(&d, &c), 4, "{c}");
        let g = decode(&raw(&d, &c)).unwrap();
        assert_eq!(encode(&g), raw(&d, &c));
    }
}

#[test]
fn erasing_an_unpainted_hex_changes_nothing() {
    let mut d = doc();
    paint(&mut d, vec![cell(0, 0, "a")]).unwrap();
    let undo = d.tree().undo_label().map(String::from);
    let r = erase(&mut d, vec![[5, 5], [40, 40], [-3, -3]]).unwrap();
    assert!(matches!(r, Outcome::Nothing));
    assert_eq!(chunks(&d), ["0_0"]);
    assert_eq!(
        d.tree().undo_label().map(String::from),
        undo,
        "no step added"
    );
}

#[test]
fn fill_is_paint_with_its_own_label() {
    let mut d = doc();
    let cells: Vec<Json> = (0..5).map(|q| cell(q, 0, "water")).collect();
    run(
        &mut d,
        "freeform.fill",
        json!({ "at": LAYER, "cells": cells }),
    )
    .unwrap();
    assert_eq!(painted(&d, "0_0"), 5);
    assert_eq!(d.tree().undo_label(), Some("Fill"));
}

#[test]
fn the_commands_refuse_what_is_not_a_freeform_layer() {
    let mut d = doc();
    run(
        &mut d,
        "node.add",
        json!({ "parent": MAP, "type": "outline" }),
    )
    .unwrap();
    for at in [MAP, "/maps/map/outline", "/maps/map/paper", "/nowhere"] {
        for (id, p) in [
            (
                "freeform.paint",
                json!({ "at": at, "cells": [cell(0, 0, "a")] }),
            ),
            (
                "freeform.fill",
                json!({ "at": at, "cells": [cell(0, 0, "a")] }),
            ),
            ("freeform.erase", json!({ "at": at, "cells": [[0, 0]] })),
        ] {
            assert!(run(&mut d, id, p.clone()).is_err(), "{id} {at}");
            assert!(!d.is_enabled(id, &p).unwrap(), "{id} {at} enabled");
        }
    }
    let ok = json!({ "at": LAYER, "cells": [[0, 0]] });
    assert!(d.is_enabled("freeform.erase", &ok).unwrap());
}

#[test]
fn chunks_cannot_be_made_by_hand_wrongly() {
    let mut d = doc();
    // not under a freeform layer
    assert!(d
        .edit("x", |tx| tx.add(MAP, "chunk", "0_0").map(|_| ()))
        .is_err());
    // a name that isn't a block
    assert!(d
        .edit("x", |tx| tx.add(LAYER, "chunk", "foo").map(|_| ()))
        .is_err());
    assert!(d
        .edit("x", |tx| tx.add(LAYER, "chunk", "01_0").map(|_| ()))
        .is_err());
    // the wrong number of slots, an old-format list, a non-canonical encoding
    for bad in [
        json!({ "palette": [], "cells": "0*255" }),
        json!([null, null]),
        json!({ "palette": [{ "terrainId": "a" }], "cells": "1 1 0*254" }),
        json!({ "palette": [{ "terrainId": "a" }], "cells": "0*256" }),
    ] {
        let r = d.edit("x", |tx| {
            let c = tx.add(LAYER, "chunk", "0_0")?;
            tx.set_value(c, "voxels", Value::Shaped(bad.clone()))
        });
        assert!(r.is_err(), "{bad}");
    }
    // a bare new chunk takes the default, all empty
    d.edit("x", |tx| tx.add(LAYER, "chunk", "0_0").map(|_| ()))
        .unwrap();
    assert_eq!(raw(&d, "0_0"), json!({ "palette": [], "cells": "0*256" }));
    d.undo().unwrap();
    // a well-formed one is fine, and a chunk has no duplicate of its own
    paint(&mut d, vec![cell(0, 0, "a")]).unwrap();
    assert!(run(
        &mut d,
        "edit.duplicate",
        json!({ "at": format!("{LAYER}/0_0") })
    )
    .is_err());
}

#[test]
fn every_chunk_holds_exactly_256_slots() {
    let mut d = doc();
    paint(
        &mut d,
        vec![cell(0, 0, "a"), cell(-9, 40, "b"), cell(99, -99, "c")],
    )
    .unwrap();
    erase(&mut d, vec![[0, 0]]).unwrap();
    for c in chunks(&d) {
        assert_eq!(voxels(&d, &c).len(), CHUNK_CELLS, "{c}");
    }
}

#[test]
fn duplicating_a_layer_carries_its_chunks() {
    let mut d = doc();
    paint(&mut d, vec![cell(0, 0, "a"), cell(-1, 0, "b")]).unwrap();
    run(&mut d, "edit.duplicate", json!({ "at": LAYER })).unwrap();
    let copy = "/maps/map/freeform-2";
    let mut names: Vec<String> = d
        .tree()
        .at(copy)
        .unwrap()
        .children()
        .map(|c| c.name().to_string())
        .collect();
    names.sort();
    assert_eq!(names, ["-1_0", "0_0"]);
    let v = match d
        .tree()
        .at(format!("{copy}/0_0").as_str())
        .unwrap()
        .value("voxels")
    {
        Some(Value::Shaped(v)) => decode(&v).unwrap(),
        other => panic!("{other:?}"),
    };
    assert_eq!(v[0], Some(json!({ "terrainId": "a" })));
    // painting the copy leaves the original alone
    run(
        &mut d,
        "freeform.paint",
        json!({ "at": copy, "cells": [cell(1, 0, "x")] }),
    )
    .unwrap();
    assert_eq!(painted(&d, "0_0"), 1);
}

#[test]
fn deleting_a_layer_removes_its_chunks() {
    let mut d = doc();
    paint(&mut d, vec![cell(0, 0, "a"), cell(40, 40, "b")]).unwrap();
    run(&mut d, "edit.delete", json!({ "at": LAYER })).unwrap();
    assert!(d.tree().at(LAYER).is_none());
    assert!(d.tree().at(format!("{LAYER}/0_0").as_str()).is_none());
    d.undo().unwrap();
    assert_eq!(chunks(&d), ["0_0", "2_2"]);
}

// ---- gestures, through the host as the webview drives them ----

fn host() -> Arc<dyn Host> {
    let pom =
        Pom::<MapAndTerritory>::new(|| Box::new(MemoryStore::default()), IdSource::sequential)
            .unwrap();
    rhizome_pom::host(Arc::new(pom))
}

fn h_run(h: &Arc<dyn Host>, id: &str, p: Json) {
    h.run(id, &p, None).unwrap_or_else(|e| panic!("{id}: {e}"));
}

#[test]
fn a_stroke_inside_a_gesture_is_one_undo_step() {
    let h = host();
    h_run(&h, "node.add", json!({ "parent": "/maps", "type": "map" }));
    h_run(&h, "node.add", json!({ "parent": MAP, "type": "freeform" }));
    let before = h.status();

    let (token, _) = h.begin("Paint").unwrap();
    for frame in 0..3 {
        let cells: Vec<Json> = (0..4).map(|i| cell(frame * 10 + i, 0, "a")).collect();
        h_run(&h, "freeform.paint", json!({ "at": LAYER, "cells": cells }));
    }
    h.end(token).unwrap();

    let after = h.status();
    assert_eq!(after.undo.as_deref(), Some("Paint"));
    let mut steps = 0;
    // undo until the map's own add is the next step
    while h.status().undo.as_deref() == Some("Paint") {
        h_run(&h, "edit.undo", json!({}));
        steps += 1;
    }
    assert_eq!(steps, 1, "three frames, one step");
    assert_eq!(h.status().undo, before.undo);
    let view = h.view();
    assert!(!view
        .rows
        .iter()
        .any(|r| r.path.to_string().starts_with(LAYER) && r.path.to_string() != LAYER));
}

// ---- the perf gate: `cargo test --release -- --ignored --nocapture` ----

#[test]
#[ignore = "timing; run with --release -- --ignored --nocapture"]
fn one_stroke_frame_on_the_heavy_fixture() {
    let h = host();
    let maps: usize = std::env::var("MAPS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(4);
    let side: i64 = std::env::var("SIDE")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(142);
    for m in 0..maps {
        h_run(&h, "node.add", json!({ "parent": "/maps", "type": "map" }));
        let map = if m == 0 {
            "/maps/map".to_string()
        } else {
            format!("/maps/map-{}", m + 1)
        };
        h_run(&h, "node.add", json!({ "parent": map, "type": "freeform" }));
        let layer = format!("{map}/freeform");
        // ~20k hexes: a 142 x 142 block
        let cells: Vec<Json> = (0..side)
            .flat_map(|r| (0..side).map(move |q| cell(q, r, "bone-fields")))
            .collect();
        h_run(&h, "freeform.paint", json!({ "at": layer, "cells": cells }));
    }
    let last = if maps == 1 {
        "/maps/map".to_string()
    } else {
        format!("/maps/map-{maps}")
    };
    let layer = format!("{last}/freeform");
    let layer = layer.as_str();
    let (token, _) = h.begin("Paint").unwrap();
    let mut ms = Vec::new();
    for frame in 0..9 {
        // one frame of a stroke: ~30 cells along a line
        let cells: Vec<Json> = (0..30).map(|i| cell(frame * 30 + i, 70, "water")).collect();
        let t = Instant::now();
        let (_, events) = h
            .run(
                "freeform.paint",
                &json!({ "at": layer, "cells": cells }),
                None,
            )
            .unwrap();
        ms.push(t.elapsed().as_secs_f64() * 1000.0);
        drop(events);
    }
    h.end(token).unwrap();
    ms.sort_by(f64::total_cmp);
    println!(
        "freeform.paint, 30 cells, {maps} maps x {side}x{side} hexes: median {:.3} ms, min {:.3}, max {:.3}",
        ms[ms.len() / 2],
        ms[0],
        ms[ms.len() - 1]
    );
}

/// The layer's `chunks` order, as chunk names.
fn order(d: &Doc, layer: &str) -> Vec<String> {
    d.tree()
        .at(layer)
        .unwrap()
        .order("chunks")
        .iter()
        .map(|n| n.name().to_string())
        .collect()
}

fn child_names(d: &Doc, layer: &str) -> Vec<String> {
    let mut v: Vec<String> = d
        .tree()
        .at(layer)
        .unwrap()
        .children()
        .map(|c| c.name().to_string())
        .collect();
    v.sort();
    v
}

fn assert_in_step(d: &Doc, layer: &str) {
    let mut o = order(d, layer);
    o.sort();
    assert_eq!(
        o,
        child_names(d, layer),
        "chunks order vs children at {layer}"
    );
}

#[test]
fn the_chunks_order_follows_the_children() {
    let mut d = doc();
    assert_in_step(&d, LAYER);
    paint(
        &mut d,
        vec![cell(0, 0, "a"), cell(20, 0, "a"), cell(-1, 0, "a")],
    )
    .unwrap();
    assert_eq!(order(&d, LAYER).len(), 3);
    assert_in_step(&d, LAYER);
    // painting a known block adds nothing to the order
    paint(&mut d, vec![cell(1, 1, "a")]).unwrap();
    assert_eq!(order(&d, LAYER).len(), 3);

    // erase to empty drops the chunk from the order
    erase(&mut d, vec![[20, 0]]).unwrap();
    assert_eq!(order(&d, LAYER).len(), 2);
    assert_in_step(&d, LAYER);
    erase(&mut d, vec![[0, 0], [1, 1], [-1, 0]]).unwrap();
    assert!(order(&d, LAYER).is_empty());
    assert!(chunks(&d).is_empty());

    // undo puts both back
    d.undo().unwrap();
    assert_eq!(order(&d, LAYER).len(), 2);
    assert_in_step(&d, LAYER);
    d.undo().unwrap();
    assert_eq!(order(&d, LAYER).len(), 3);
    assert_in_step(&d, LAYER);
    d.redo().unwrap();
    assert_in_step(&d, LAYER);
}

#[test]
fn a_duplicate_keeps_its_own_chunks_order() {
    let mut d = doc();
    paint(
        &mut d,
        vec![cell(0, 0, "a"), cell(20, 0, "a"), cell(-1, 0, "a")],
    )
    .unwrap();
    run(&mut d, "edit.duplicate", json!({ "at": LAYER })).unwrap();
    let copy = "/maps/map/freeform-2";
    assert_eq!(order(&d, copy).len(), 3);
    assert_in_step(&d, copy);
    assert_in_step(&d, LAYER);
    // the copy's order names the copy's chunks, not the original's
    let copy_ids: Vec<_> = d
        .tree()
        .at(copy)
        .unwrap()
        .children()
        .map(|c| c.id())
        .collect();
    for n in d.tree().at(copy).unwrap().order("chunks") {
        assert!(copy_ids.contains(&n.id()));
    }
    // painting the copy extends only its order
    run(
        &mut d,
        "freeform.paint",
        json!({ "at": copy, "cells": [cell(40, 40, "x")] }),
    )
    .unwrap();
    assert_eq!(order(&d, copy).len(), 4);
    assert_eq!(order(&d, LAYER).len(), 3);
    assert_in_step(&d, copy);
}

// ---- the saved file, for measuring: `OUT=<path> cargo test -- --ignored saved_file` ----

/// Saves `d` to an in-memory file and writes its text to the path in env var `var`.
fn write_saved(mut d: Doc, store: &MemoryStore, var: &str) {
    let Ok(out) = std::env::var(var) else {
        panic!("set {var} to the path to write");
    };
    d.save_as("/measure.campaign").unwrap();
    let text = store.get("/measure.campaign").unwrap();
    std::fs::write(&out, &text).unwrap();
    println!("{var}: {} bytes -> {out}", text.len());
}

fn doc_in(store: &MemoryStore) -> Doc {
    Document::new_with_ids(store.clone(), IdSource::sequential()).unwrap()
}

#[test]
#[ignore = "writes the saved small campaign to $OUT"]
fn saved_file_small_campaign() {
    let store = MemoryStore::default();
    let mut d = doc_in(&store);
    run(
        &mut d,
        "node.add",
        json!({ "parent": "/maps", "type": "map" }),
    )
    .unwrap();
    run(
        &mut d,
        "node.add",
        json!({ "parent": MAP, "type": "freeform" }),
    )
    .unwrap();
    let mut cells = Vec::new();
    // a six-hex river running diagonally
    for i in 0..6 {
        cells.push(cell(2 + i, 1 + i, "water"));
    }
    // a 4 x 3 block of grass
    for r in 8..11 {
        for q in 3..7 {
            cells.push(cell(q, r, "grass"));
        }
    }
    // one forest hex with a colour override
    cells.push(json!({ "q": 10, "r": 4, "terrainId": "forest", "color": [0.1, 0.4, 0.15, 1.0] }));
    paint(&mut d, cells).unwrap();
    write_saved(d, &store, "OUT");
}

#[test]
#[ignore = "writes the saved heavy campaign (4 maps x 142x142) to $OUT_HEAVY"]
fn saved_file_heavy_fixture() {
    let store = MemoryStore::default();
    let mut d = doc_in(&store);
    for m in 0..4 {
        run(
            &mut d,
            "node.add",
            json!({ "parent": "/maps", "type": "map" }),
        )
        .unwrap();
        let map = if m == 0 {
            "/maps/map".to_string()
        } else {
            format!("/maps/map-{}", m + 1)
        };
        run(
            &mut d,
            "node.add",
            json!({ "parent": map, "type": "freeform" }),
        )
        .unwrap();
        let cells: Vec<Json> = (0..142)
            .flat_map(|r| (0..142).map(move |q| cell(q, r, "bone-fields")))
            .collect();
        run(
            &mut d,
            "freeform.paint",
            json!({ "at": format!("{map}/freeform"), "cells": cells }),
        )
        .unwrap();
    }
    write_saved(d, &store, "OUT_HEAVY");
}
