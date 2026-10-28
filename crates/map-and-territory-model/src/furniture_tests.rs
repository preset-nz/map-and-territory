//! The `furniture` order and the cartouche (epic 23 story 1): furniture lands in its own order
//! after `layers`, the moves never cross between them, and old campaigns open without one.

use rhizome_core::{IdSource, NodeId, Value};
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

fn add(d: &mut Doc, t: &str) -> rhizome_pom::Result<Outcome> {
    run(d, "node.add", json!({ "parent": MAP, "type": t }))
}

/// The paths in one of the map's orders, first to last.
fn order(d: &Doc, name: &str) -> Vec<String> {
    d.tree()
        .at(MAP)
        .unwrap()
        .order(name)
        .iter()
        .map(|n| n.path().to_string())
        .collect()
}

fn id(d: &Doc, at: &str) -> NodeId {
    d.tree().at(at).unwrap().id()
}

fn set(d: &mut Doc, at: &str, key: &str, value: Json) -> rhizome_pom::Result<Outcome> {
    run(
        d,
        "value.set",
        json!({ "at": at, "key": key, "value": value }),
    )
}

#[test]
fn a_new_map_has_no_furniture_and_a_title_is_appended_to_it() {
    let mut d = doc_with_map();
    assert!(order(&d, "furniture").is_empty());

    add(&mut d, "cartouche").unwrap();
    add(&mut d, "cartouche").unwrap();
    let furniture = order(&d, "furniture");
    assert_eq!(
        furniture,
        [format!("{MAP}/cartouche"), format!("{MAP}/cartouche-2")]
    );
    // neither is in `layers`, which still ends at the grid
    assert_eq!(
        order(&d, "layers"),
        [format!("{MAP}/paper"), format!("{MAP}/hexgrid")]
    );
    let name = |at: &str| d.tree().at(at).unwrap().value("name");
    assert_eq!(name(&furniture[0]), Some(Value::Text("Title 01".into())));
    assert_eq!(name(&furniture[1]), Some(Value::Text("Title 02".into())));
}

#[test]
fn add_title_is_one_undo_step_named_add_title() {
    let mut d = doc_with_map();
    add(&mut d, "cartouche").unwrap();
    assert_eq!(d.tree().undo_label(), Some("Add Title"));
    d.undo().unwrap();
    assert!(d.tree().at(&*format!("{MAP}/cartouche")).is_none());
    assert!(order(&d, "furniture").is_empty());
    d.redo().unwrap();
    assert_eq!(order(&d, "furniture"), [format!("{MAP}/cartouche")]);
}

#[test]
fn a_title_goes_under_a_map_and_on_top_of_the_furniture() {
    let mut d = doc_with_map();
    assert!(run(
        &mut d,
        "node.add",
        json!({ "parent": "/maps", "type": "cartouche" })
    )
    .is_err());
    // `above` places a layer; furniture always lands last
    let r = run(
        &mut d,
        "node.add",
        json!({ "parent": MAP, "type": "cartouche", "above": format!("{MAP}/paper") }),
    );
    assert!(r.is_err());
    // and a layer can't be added above a title
    add(&mut d, "cartouche").unwrap();
    let r = run(
        &mut d,
        "node.add",
        json!({ "parent": MAP, "type": "freeform", "above": format!("{MAP}/cartouche") }),
    );
    assert!(r.is_err());
}

#[test]
fn the_map_check_keeps_furniture_out_of_layers_and_layers_out_of_furniture() {
    let mut d = doc_with_map();
    add(&mut d, "cartouche").unwrap();
    add(&mut d, "freeform").unwrap();
    let map = id(&d, MAP);
    let paper = id(&d, &format!("{MAP}/paper"));
    let grid = id(&d, &format!("{MAP}/hexgrid"));
    let title = id(&d, &format!("{MAP}/cartouche"));
    let layer = id(&d, &format!("{MAP}/freeform"));

    // a title between the anchors, under the grid
    let r = d.edit("raw", |tx| {
        tx.set_order(map, "layers", [paper, title, layer, grid])
    });
    assert!(r.is_err(), "a title can't go in layers");
    // a layer over the grid
    let r = d.edit("raw", |tx| tx.set_order(map, "furniture", [title, layer]));
    assert!(r.is_err(), "a layer can't go in furniture");
    // nor the grid itself
    let r = d.edit("raw", |tx| tx.set_order(map, "furniture", [grid, title]));
    assert!(r.is_err(), "an anchor can't go in furniture");

    // the refused edits left both orders as they were
    assert_eq!(order(&d, "furniture"), [format!("{MAP}/cartouche")]);
    assert_eq!(
        order(&d, "layers"),
        [
            format!("{MAP}/paper"),
            format!("{MAP}/freeform"),
            format!("{MAP}/hexgrid")
        ]
    );
}

#[test]
fn the_layer_moves_refuse_a_title_and_leave_the_furniture_alone() {
    let mut d = doc_with_map();
    add(&mut d, "cartouche").unwrap();
    add(&mut d, "cartouche").unwrap();
    add(&mut d, "freeform").unwrap();
    add(&mut d, "hex-noise").unwrap();
    let furniture = order(&d, "furniture");
    for m in [
        "edit.move-earlier",
        "edit.move-later",
        "edit.move-to-front",
        "edit.move-to-back",
    ] {
        let title = format!("{MAP}/cartouche");
        assert!(run(&mut d, m, json!({ "at": title })).is_err(), "{m}");
    }
    let layers = order(&d, "layers");
    run(
        &mut d,
        "edit.move-to-back",
        json!({ "at": format!("{MAP}/hex-noise") }),
    )
    .unwrap();
    assert_ne!(order(&d, "layers"), layers, "the layer moved");
    assert_eq!(order(&d, "furniture"), furniture, "the furniture didn't");
    assert_eq!(
        order(&d, "layers").last().unwrap(),
        &format!("{MAP}/hexgrid")
    );
}

#[test]
fn duplicating_a_layer_or_a_title_keeps_each_in_its_own_order() {
    let mut d = doc_with_map();
    add(&mut d, "freeform").unwrap();
    add(&mut d, "cartouche").unwrap();

    run(
        &mut d,
        "edit.duplicate",
        json!({ "at": format!("{MAP}/freeform") }),
    )
    .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Duplicate"));
    assert_eq!(
        order(&d, "layers"),
        [
            format!("{MAP}/paper"),
            format!("{MAP}/freeform"),
            format!("{MAP}/freeform-2"),
            format!("{MAP}/hexgrid")
        ]
    );
    assert_eq!(order(&d, "furniture"), [format!("{MAP}/cartouche")]);

    run(
        &mut d,
        "edit.duplicate",
        json!({ "at": format!("{MAP}/cartouche") }),
    )
    .unwrap();
    assert_eq!(
        order(&d, "furniture"),
        [format!("{MAP}/cartouche"), format!("{MAP}/cartouche-2")]
    );
    assert_eq!(order(&d, "layers").len(), 4, "no title went under the grid");
    // one step each
    d.undo().unwrap();
    assert_eq!(order(&d, "furniture"), [format!("{MAP}/cartouche")]);
}

#[test]
fn a_title_hides_and_deletes_like_a_layer() {
    let mut d = doc_with_map();
    add(&mut d, "cartouche").unwrap();
    let at = format!("{MAP}/cartouche");
    run(
        &mut d,
        "node.set-visible",
        json!({ "at": at, "visible": false }),
    )
    .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Hide Title"));
    run(&mut d, "edit.delete", json!({ "at": at })).unwrap();
    assert!(order(&d, "furniture").is_empty());
}

#[test]
fn the_cartouche_has_its_defaults_and_ranges() {
    let mut d = doc_with_map();
    add(&mut d, "cartouche").unwrap();
    let at = format!("{MAP}/cartouche");
    let n = d.tree().at(at.as_str()).unwrap();
    let text = |s: &str| Some(Value::Text(s.into()));
    let choice = |s: &str| Some(Value::Choice(s.into()));
    assert_eq!(n.value("title"), text(""));
    assert_eq!(n.value("subtitle"), text(""));
    assert_eq!(n.value("credit"), text(""));
    assert_eq!(n.value("frame"), choice("rule"));
    assert_eq!(n.value("align"), choice("centre"));
    assert_eq!(n.value("titleSize"), Some(Value::Float(30.0)));
    assert_eq!(n.value("anchor"), choice("top-left"));
    assert_eq!(n.value("inset"), Some(Value::Float(24.0)));
    assert_eq!(n.value("backing"), Some(Value::Bool(true)));
    assert_eq!(n.value("face"), choice("map"));
    assert_eq!(n.value("hand"), choice("map"));
    assert_eq!(n.value("visible"), Some(Value::Bool(true)));
    assert_eq!(n.value("opacity"), Some(Value::Float(1.0)));
    assert_eq!(n.value("blend"), choice("normal"));

    for (key, v) in [
        ("frame", json!("none")),
        ("align", json!("right")),
        ("anchor", json!("bottom-centre")),
        ("face", json!("blackletter")),
        ("face", json!("map")),
        ("frame", json!("double")),
        ("frame", json!("plate")),
        ("hand", json!("scratched")),
        ("hand", json!("map")),
        ("titleSize", json!(12.0)),
        // a soft max: a typed size may go past the slider's end
        ("titleSize", json!(200.0)),
        ("inset", json!(0.0)),
        ("inset", json!(200.0)),
        ("title", json!("The Sallow Fen")),
    ] {
        assert!(set(&mut d, &at, key, v.clone()).is_ok(), "{key} {v}");
    }
    for (key, v) in [
        // `banner` and `title-block` are left for later (epic 23, The cut)
        ("frame", json!("banner")),
        ("hand", json!("rough")),
        ("align", json!("center")),
        ("anchor", json!("middle")),
        ("titleSize", json!(11.0)),
        ("inset", json!(-1.0)),
        ("inset", json!(201.0)),
    ] {
        assert!(set(&mut d, &at, key, v.clone()).is_err(), "{key} {v}");
    }
    // a typed title is the title's, not the map's name
    assert_eq!(
        d.tree().at(MAP).unwrap().value("name"),
        Some(Value::Text("Map 01".into()))
    );
}

#[test]
fn the_map_carries_the_sheet_style() {
    let mut d = doc_with_map();
    let map = d.tree().at(MAP).unwrap();
    assert_eq!(map.value("face"), Some(Value::Choice("condensed".into())));
    assert_eq!(map.value("hand"), Some(Value::Choice("clean".into())));
    assert!(set(&mut d, MAP, "hand", json!("scratched")).is_ok());
    assert!(set(&mut d, MAP, "face", json!("marker")).is_ok());
    // the map has no `map` to follow
    assert!(set(&mut d, MAP, "hand", json!("map")).is_err());
    assert!(set(&mut d, MAP, "face", json!("map")).is_err());
}

#[test]
fn a_campaign_saved_before_furniture_opens_with_none_and_takes_a_title() {
    let store = MemoryStore::default();
    let mut d = Document::new_with_ids(store.clone(), IdSource::sequential()).unwrap();
    run(
        &mut d,
        "node.add",
        json!({ "parent": "/maps", "type": "map" }),
    )
    .unwrap();
    add(&mut d, "freeform").unwrap();
    d.save_as("/old.campaign").unwrap();
    let saved = store.get("/old.campaign").unwrap();
    assert!(!saved.contains("furniture"), "no empty order is written");

    let (mut d, report) = Document::<MapAndTerritory>::open(store, "/old.campaign").unwrap();
    assert!(report.issues.is_empty(), "{:?}", report.issues);
    assert!(order(&d, "furniture").is_empty());
    add(&mut d, "cartouche").unwrap();
    assert_eq!(order(&d, "furniture"), [format!("{MAP}/cartouche")]);
}

#[test]
fn the_orlo_campaign_opens_with_no_furniture() {
    let store = MemoryStore::default();
    store.put(
        "/orlo.campaign",
        include_str!("../../../tests/window/fixtures/orlo.campaign"),
    );
    let (d, _report) = Document::<MapAndTerritory>::open(store, "/orlo.campaign").unwrap();
    let maps = d.tree().at("/maps").unwrap().order("maps");
    assert!(!maps.is_empty());
    for m in maps {
        assert!(m.order("furniture").is_empty(), "{}", m.path());
        assert_eq!(m.order("layers").last().unwrap().type_name(), "hexgrid");
    }
}

#[test]
fn duplicating_a_map_copies_its_title_into_the_copy_s_furniture() {
    let mut d = doc_with_map();
    add(&mut d, "freeform").unwrap();
    add(&mut d, "cartouche").unwrap();
    run(&mut d, "edit.duplicate", json!({ "at": MAP })).unwrap();
    let copy = d.tree().at("/maps/map-2").expect("the copy");
    let types = |order: &str| -> Vec<String> {
        copy.order(order)
            .iter()
            .map(|n| n.type_name().to_string())
            .collect()
    };
    assert_eq!(types("layers"), ["paper", "freeform", "hexgrid"]);
    assert_eq!(types("furniture"), ["cartouche"]);
    // the copy's title is its own node, not the original's
    assert_eq!(
        copy.order("furniture")[0].path().to_string(),
        "/maps/map-2/cartouche"
    );
    assert_eq!(order(&d, "furniture"), [format!("{MAP}/cartouche")]);
}
