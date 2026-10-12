//! Layer kinds, `node.add` for layers and the layer-order moves, through commands by id.

use rhizome_core::{IdSource, Value};
use rhizome_pom::{Document, MemoryStore, Outcome};
use serde_json::{json, Value as Json};

use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

const MAP: &str = "/maps/map";

fn doc_with_map() -> Doc {
    let mut d = Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    run(
        &mut d,
        "node.add",
        json!({ "parent": "/maps", "type": "map" }),
    )
    .unwrap();
    d
}

fn run(d: &mut Doc, id: &str, p: Json) -> rhizome_pom::Result<Outcome> {
    d.run(id, &p)
}

/// Adds a layer and returns its path.
fn add(d: &mut Doc, t: &str) -> String {
    run(d, "node.add", json!({ "parent": MAP, "type": t })).unwrap();
    newest(d, t)
}

fn add_above(d: &mut Doc, t: &str, above: &str) -> String {
    run(
        d,
        "node.add",
        json!({ "parent": MAP, "type": t, "above": above }),
    )
    .unwrap();
    newest(d, t)
}

/// The path of the last-created node of a type (the highest `-N` suffix).
fn newest(d: &Doc, t: &str) -> String {
    let map = d.tree().at(MAP).unwrap();
    let mut mine: Vec<String> = map
        .children()
        .filter(|c| c.type_name() == t)
        .map(|c| c.path().to_string())
        .collect();
    mine.sort_by_key(|p| {
        p.rsplit('-')
            .next()
            .and_then(|n| n.parse::<u32>().ok())
            .unwrap_or(1)
    });
    mine.pop().unwrap()
}

/// The layers, bottom to top, as paths.
fn stack(d: &Doc) -> Vec<String> {
    d.tree()
        .at(MAP)
        .unwrap()
        .order("layers")
        .iter()
        .map(|n| n.path().to_string())
        .collect()
}

fn name(d: &Doc, at: &str) -> String {
    match d.tree().at(at).unwrap().value("name") {
        Some(Value::Text(t)) => t,
        other => panic!("{at}: {other:?}"),
    }
}

fn mv(d: &mut Doc, id: &str, at: &str) -> rhizome_pom::Result<Outcome> {
    run(d, id, json!({ "at": at }))
}

fn last(path: &str) -> &str {
    path.rsplit('/').next().unwrap()
}

#[test]
fn a_layer_lands_just_below_the_grid() {
    let mut d = doc_with_map();
    let a = add(&mut d, "hex-noise");
    assert_eq!(
        stack(&d),
        [format!("{MAP}/paper"), a.clone(), format!("{MAP}/hexgrid")]
    );
    let b = add(&mut d, "freeform");
    assert_eq!(
        stack(&d),
        [format!("{MAP}/paper"), a, b, format!("{MAP}/hexgrid")]
    );
}

#[test]
fn a_layer_lands_just_above_the_one_named() {
    let mut d = doc_with_map();
    let a = add(&mut d, "hex-noise");
    let b = add(&mut d, "freeform");
    let c = add_above(&mut d, "outline", &a);
    assert_eq!(
        stack(&d),
        [
            format!("{MAP}/paper"),
            a.clone(),
            c,
            b,
            format!("{MAP}/hexgrid")
        ]
    );
    // above the paper is the bottom of the layers
    let e = add_above(&mut d, "hex-noise", &format!("{MAP}/paper"));
    assert_eq!(stack(&d)[1], e);
    // nothing goes above the grid, or above something that isn't in the map
    for above in [format!("{MAP}/hexgrid"), "/maps/nowhere".to_string()] {
        let r = run(
            &mut d,
            "node.add",
            json!({ "parent": MAP, "type": "outline", "above": above }),
        );
        assert!(r.is_err(), "{above}");
    }
}

#[test]
fn layers_are_named_per_kind() {
    let mut d = doc_with_map();
    let n1 = add(&mut d, "hex-noise");
    let n2 = add(&mut d, "hex-noise");
    let f1 = add(&mut d, "freeform");
    let o1 = add(&mut d, "outline");
    assert_eq!(name(&d, &n1), "Hex Noise 01");
    assert_eq!(name(&d, &n2), "Hex Noise 02");
    assert_eq!(name(&d, &f1), "Freeform 01");
    assert_eq!(name(&d, &o1), "Outline 01");
    // paths are the kind's unique names; the display name is a value
    assert_eq!(last(&n1), "hex-noise");
    assert_eq!(last(&n2), "hex-noise-2");
    // a given name is kept
    run(
        &mut d,
        "node.add",
        json!({ "parent": MAP, "type": "outline", "name": "Coast" }),
    )
    .unwrap();
    assert_eq!(name(&d, &newest(&d, "outline")), "Coast");
}

#[test]
fn add_is_one_labelled_undo_step() {
    let mut d = doc_with_map();
    add(&mut d, "hex-noise");
    assert_eq!(d.tree().undo_label(), Some("Add Hex Noise Layer"));
    add(&mut d, "freeform");
    assert_eq!(d.tree().undo_label(), Some("Add Freeform Layer"));
    add(&mut d, "outline");
    assert_eq!(d.tree().undo_label(), Some("Add Outline Layer"));

    d.undo().unwrap();
    assert_eq!(stack(&d).len(), 4, "paper, noise, freeform, grid");
    d.redo().unwrap();
    assert_eq!(stack(&d).len(), 5);
}

#[test]
fn layers_go_only_under_a_map() {
    let mut d = doc_with_map();
    for parent in ["/maps", "/themes", "/campaign/campaign", "/nowhere"] {
        let r = run(
            &mut d,
            "node.add",
            json!({ "parent": parent, "type": "outline" }),
        );
        assert!(r.is_err(), "{parent}");
    }
    assert_eq!(stack(&d).len(), 2);
}

#[test]
fn the_layer_kinds_have_the_common_values_and_their_own() {
    let mut d = doc_with_map();
    let n = add(&mut d, "hex-noise");
    let f = add(&mut d, "freeform");
    let o = add(&mut d, "outline");
    for at in [&n, &f, &o] {
        let node = d.tree().at(at.as_str()).unwrap();
        assert_eq!(node.value("visible"), Some(Value::Bool(true)));
        assert_eq!(node.value("opacity"), Some(Value::Float(1.0)));
        assert_eq!(node.value("blend"), Some(Value::Choice("normal".into())));
    }
    let noise = d.tree().at(n.as_str()).unwrap();
    assert_eq!(noise.value("frequency"), Some(Value::Float(0.15)));
    assert_eq!(noise.value("mode"), Some(Value::Choice("shape".into())));
    let outline = d.tree().at(o.as_str()).unwrap();
    assert_eq!(outline.value("strokeWidth"), Some(Value::Float(4.0)));

    let set = |d: &mut Doc, at: &str, key: &str, v: Json| {
        run(d, "value.set", json!({ "at": at, "key": key, "value": v }))
    };
    set(&mut d, &n, "frequency", json!(2.5)).unwrap();
    assert!(set(&mut d, &n, "frequency", json!(9.0)).is_err());
    assert!(set(&mut d, &n, "gamma", json!(0.0)).is_err());
    set(&mut d, &n, "mode", json!("paint")).unwrap();
    assert!(set(&mut d, &n, "mode", json!("grey")).is_err());
    set(&mut d, &f, "renderMode", json!("texture-fill")).unwrap();
    set(&mut d, &o, "strokeWidth", json!(12.0)).unwrap();
    assert!(set(&mut d, &o, "strokeWidth", json!(13.0)).is_err());
    set(&mut d, &o, "strokePattern", json!("dashed")).unwrap();
    set(&mut d, &o, "opacity", json!(0.5)).unwrap();
    // paths are a shaped list of {corners: [{q, r, corner}], closed}
    let path = json!([{ "corners": [{ "q": 0, "r": 0, "corner": 2 }, { "q": 1, "r": -1, "corner": 5 }], "closed": false }]);
    set(&mut d, &o, "paths", path.clone()).unwrap();
    assert!(set(&mut d, &o, "paths", json!([{ "closed": true }])).is_err());
    assert_eq!(
        d.tree().at(o.as_str()).unwrap().value("paths"),
        Some(Value::Shaped(path))
    );
}

#[test]
fn moves_reorder_within_the_anchors() {
    let mut d = doc_with_map();
    let a = add(&mut d, "hex-noise");
    let b = add(&mut d, "freeform");
    let c = add(&mut d, "outline");
    let (paper, grid) = (format!("{MAP}/paper"), format!("{MAP}/hexgrid"));

    // Bring Forward: up the stack
    mv(&mut d, "edit.move-earlier", &a).unwrap();
    assert_eq!(
        stack(&d),
        [paper.clone(), b.clone(), a.clone(), c.clone(), grid.clone()]
    );
    assert_eq!(d.tree().undo_label(), Some("Bring Forward"));
    // Send Backward
    mv(&mut d, "edit.move-later", &c).unwrap();
    assert_eq!(
        stack(&d),
        [paper.clone(), b.clone(), c.clone(), a.clone(), grid.clone()]
    );
    assert_eq!(d.tree().undo_label(), Some("Send Backward"));
    // Bring to Front: just below the grid
    mv(&mut d, "edit.move-to-front", &b).unwrap();
    assert_eq!(
        stack(&d),
        [paper.clone(), c.clone(), a.clone(), b.clone(), grid.clone()]
    );
    assert_eq!(d.tree().undo_label(), Some("Bring to Front"));
    // Send to Back: just above the paper
    mv(&mut d, "edit.move-to-back", &a).unwrap();
    assert_eq!(stack(&d), [paper, a, c.clone(), b, grid]);
    assert_eq!(d.tree().undo_label(), Some("Send to Back"));

    d.undo().unwrap();
    assert_eq!(stack(&d)[1], c, "one undo step per move");
}

#[test]
fn moves_are_refused_at_the_anchors() {
    let mut d = doc_with_map();
    let a = add(&mut d, "hex-noise");
    let b = add(&mut d, "freeform");
    let paper = format!("{MAP}/paper");
    let grid = format!("{MAP}/hexgrid");
    let before = stack(&d);

    // the top layer can't go further forward or to the front, the bottom one not back
    for (id, at) in [
        ("edit.move-earlier", &b),
        ("edit.move-to-front", &b),
        ("edit.move-later", &a),
        ("edit.move-to-back", &a),
    ] {
        assert!(mv(&mut d, id, at).is_err(), "{id} {at}");
        assert!(
            !d.is_enabled(id, &json!({ "at": at })).unwrap(),
            "{id} {at} enabled"
        );
    }
    // the anchors themselves don't move at all
    for id in [
        "edit.move-earlier",
        "edit.move-later",
        "edit.move-to-front",
        "edit.move-to-back",
    ] {
        for anchor in [&paper, &grid] {
            assert!(mv(&mut d, id, anchor).is_err(), "{id} {anchor}");
        }
    }
    // what can move says so
    assert!(d
        .is_enabled("edit.move-later", &json!({ "at": b }))
        .unwrap());
    assert!(d
        .is_enabled("edit.move-earlier", &json!({ "at": a }))
        .unwrap());
    assert_eq!(stack(&d), before);
}

#[test]
fn a_lone_layer_cannot_move() {
    let mut d = doc_with_map();
    let a = add(&mut d, "outline");
    for id in [
        "edit.move-earlier",
        "edit.move-later",
        "edit.move-to-front",
        "edit.move-to-back",
    ] {
        assert!(mv(&mut d, id, &a).is_err(), "{id}");
    }
}

#[test]
fn a_duplicate_lands_above_its_source_between_the_anchors() {
    let mut d = doc_with_map();
    let a = add(&mut d, "hex-noise");
    let b = add(&mut d, "freeform");
    run(&mut d, "edit.duplicate", json!({ "at": a })).unwrap();
    let s = stack(&d);
    assert_eq!(s.len(), 5);
    assert_eq!(s[0], format!("{MAP}/paper"));
    assert_eq!(s[1], a);
    assert_eq!(
        s[2],
        format!("{MAP}/hex-noise-2"),
        "straight above its source"
    );
    assert_eq!(s[3], b);
    assert_eq!(s[4], format!("{MAP}/hexgrid"));
}

#[test]
fn delete_a_layer_and_undo_it() {
    let mut d = doc_with_map();
    let a = add(&mut d, "hex-noise");
    let b = add(&mut d, "outline");
    run(&mut d, "edit.delete", json!({ "at": a })).unwrap();
    assert_eq!(
        stack(&d),
        [format!("{MAP}/paper"), b.clone(), format!("{MAP}/hexgrid")]
    );
    d.undo().unwrap();
    assert_eq!(
        stack(&d),
        [format!("{MAP}/paper"), a, b, format!("{MAP}/hexgrid")]
    );
}

#[test]
fn duplicating_a_map_keeps_its_layers_in_order() {
    let mut d = doc_with_map();
    let a = add(&mut d, "hex-noise");
    let b = add(&mut d, "outline");
    run(&mut d, "edit.duplicate", json!({ "at": MAP })).unwrap();
    let copy: Vec<String> = d
        .tree()
        .at("/maps/map-2")
        .unwrap()
        .order("layers")
        .iter()
        .map(|n| last(&n.path().to_string()).to_string())
        .collect();
    assert_eq!(copy, ["paper", last(&a), last(&b), "hexgrid"]);
}

#[test]
fn rename_is_a_labelled_value_set() {
    let mut d = doc_with_map();
    let a = add(&mut d, "outline");
    run(&mut d, "node.rename", json!({ "at": a, "name": "Coast" })).unwrap();
    assert_eq!(name(&d, &a), "Coast");
    assert_eq!(d.tree().undo_label(), Some("Rename"));
    // maps, hexgrid and campaign have names; paper does not
    run(
        &mut d,
        "node.rename",
        json!({ "at": MAP, "name": "The Reach" }),
    )
    .unwrap();
    assert_eq!(name(&d, MAP), "The Reach");
    run(
        &mut d,
        "node.rename",
        json!({ "at": format!("{MAP}/hexgrid"), "name": "Grid" }),
    )
    .unwrap();
    for (at, n) in [
        (format!("{MAP}/paper"), "x"),
        (a.clone(), "  "),
        (a.clone(), ""),
        ("/nowhere".to_string(), "x"),
    ] {
        let r = run(&mut d, "node.rename", json!({ "at": at, "name": n }));
        assert!(r.is_err(), "{at} {n:?}");
        assert!(!d
            .is_enabled("node.rename", &json!({ "at": at, "name": n }))
            .unwrap());
    }
    d.undo().unwrap();
    d.undo().unwrap();
    d.undo().unwrap();
    assert_eq!(name(&d, &a), "Outline 01");
}

#[test]
fn set_visible_is_labelled_by_kind() {
    let mut d = doc_with_map();
    let a = add(&mut d, "hex-noise");
    let vis = |d: &Doc, at: &str| d.tree().at(at).unwrap().value("visible");

    run(
        &mut d,
        "node.set-visible",
        json!({ "at": a, "visible": false }),
    )
    .unwrap();
    assert_eq!(vis(&d, &a), Some(Value::Bool(false)));
    assert_eq!(d.tree().undo_label(), Some("Hide Layer"));
    run(
        &mut d,
        "node.set-visible",
        json!({ "at": a, "visible": true }),
    )
    .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Show Layer"));

    run(
        &mut d,
        "node.set-visible",
        json!({ "at": MAP, "visible": false }),
    )
    .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Hide Map"));
    run(
        &mut d,
        "node.set-visible",
        json!({ "at": MAP, "visible": true }),
    )
    .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Show Map"));

    // the paper is always drawn
    let paper = format!("{MAP}/paper");
    assert!(run(
        &mut d,
        "node.set-visible",
        json!({ "at": paper, "visible": false })
    )
    .is_err());
    assert!(!d
        .is_enabled(
            "node.set-visible",
            &json!({ "at": paper, "visible": false })
        )
        .unwrap());
    assert!(run(
        &mut d,
        "node.set-visible",
        json!({ "at": "/campaign/campaign", "visible": false })
    )
    .is_err());
}
