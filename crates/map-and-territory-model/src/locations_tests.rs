//! `locations.add` and the location kind's policy, through commands by id.

use rhizome_core::{IdSource, Value};
use rhizome_pom::{Document, MemoryStore};
use serde_json::json;

use super::locations::{key, KeyEntry, LOCATIONS};
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

const MAP: &str = "/maps/map";
const LAYER: &str = "/maps/map/locations";

fn doc() -> Doc {
    let mut d = Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    d.run("node.add", &json!({ "parent": "/maps", "type": "map" }))
        .unwrap();
    d.run("node.add", &json!({ "parent": MAP, "type": "locations" }))
        .unwrap();
    d
}

fn names(d: &Doc) -> Vec<String> {
    d.tree()
        .at(LAYER)
        .unwrap()
        .order(LOCATIONS)
        .iter()
        .map(|n| match n.value("name") {
            Some(Value::Text(t)) => t,
            other => panic!("name is {other:?}"),
        })
        .collect()
}

#[test]
fn a_locations_layer_goes_below_the_grid() {
    let d = doc();
    let kinds: Vec<String> = d
        .tree()
        .at(MAP)
        .unwrap()
        .order("layers")
        .iter()
        .map(|n| n.type_name().to_string())
        .collect();
    assert_eq!(kinds, ["paper", "locations", "hexgrid"]);
}

#[test]
fn add_puts_a_named_location_on_a_hex_in_one_undo_step() {
    let mut d = doc();
    d.run(
        "locations.add",
        &json!({ "at": LAYER, "q": 2, "r": -1, "name": "Reedwall Keep" }),
    )
    .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Add Location"));
    d.run("locations.add", &json!({ "at": LAYER, "q": 0, "r": 0 }))
        .unwrap();
    d.run("locations.add", &json!({ "at": LAYER, "q": 1, "r": 0 }))
        .unwrap();
    assert_eq!(names(&d), ["Reedwall Keep", "Location 01", "Location 02"]);
    let keep = &d.tree().at(LAYER).unwrap().order(LOCATIONS)[0];
    assert_eq!(
        keep.value("hexes"),
        Some(Value::Shaped(json!([{ "q": 2, "r": -1 }])))
    );
    d.undo().unwrap();
    assert_eq!(names(&d), ["Reedwall Keep", "Location 01"]);
}

#[test]
fn deleting_a_location_takes_it_out_of_the_order() {
    let mut d = doc();
    d.run("locations.add", &json!({ "at": LAYER, "q": 0, "r": 0 }))
        .unwrap();
    d.run("locations.add", &json!({ "at": LAYER, "q": 1, "r": 0 }))
        .unwrap();
    let first = d.tree().at(LAYER).unwrap().order(LOCATIONS)[0]
        .path()
        .to_string();
    d.run("edit.delete", &json!({ "at": first })).unwrap();
    assert_eq!(names(&d), ["Location 02"]);
}

#[test]
fn a_location_lives_only_in_a_locations_layer() {
    let mut d = doc();
    assert!(d
        .run("locations.add", &json!({ "at": MAP, "q": 0, "r": 0 }))
        .is_err());
    assert!(d
        .run("node.add", &json!({ "parent": MAP, "type": "location" }))
        .is_err());
    assert!(!d
        .is_enabled(
            "locations.add",
            &json!({ "at": "/maps/map/hexgrid", "q": 0, "r": 0 })
        )
        .unwrap());
}

#[test]
fn hidden_and_the_words_are_plain_values() {
    let mut d = doc();
    d.run(
        "locations.add",
        &json!({ "at": LAYER, "q": 0, "r": 0, "name": "Sunken Chapel" }),
    )
    .unwrap();
    let at = d.tree().at(LAYER).unwrap().order(LOCATIONS)[0]
        .path()
        .to_string();
    for (key, v) in [
        ("hidden", json!(true)),
        ("note", json!("under the mere")),
        ("description", json!("The bell still rings at low water.")),
        ("category", json!("shrine")),
    ] {
        d.run("value.set", &json!({ "at": at, "key": key, "value": v }))
            .unwrap();
    }
    assert!(d
        .run(
            "value.set",
            &json!({ "at": at, "key": "category", "value": "castle" })
        )
        .is_err());
}

fn hexes(d: &Doc, at: &str) -> serde_json::Value {
    match d.tree().at(at).unwrap().value("hexes") {
        Some(Value::Shaped(v)) => v,
        other => panic!("hexes is {other:?}"),
    }
}

#[test]
fn a_location_grows_into_an_area_and_shrinks_back() {
    let mut d = doc();
    d.run(
        "locations.add",
        &json!({ "at": LAYER, "q": 0, "r": 0, "name": "The Mire" }),
    )
    .unwrap();
    let at = d.tree().at(LAYER).unwrap().order(LOCATIONS)[0]
        .path()
        .to_string();
    d.run("locations.hex", &json!({ "at": at, "q": 1, "r": 0 }))
        .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Grow Location"));
    d.run("locations.hex", &json!({ "at": at, "q": 1, "r": -1 }))
        .unwrap();
    assert_eq!(
        hexes(&d, &at),
        json!([{ "q": 0, "r": 0 }, { "q": 1, "r": 0 }, { "q": 1, "r": -1 }])
    );
    d.run("locations.hex", &json!({ "at": at, "q": 0, "r": 0 }))
        .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Shrink Location"));
    assert_eq!(
        hexes(&d, &at),
        json!([{ "q": 1, "r": 0 }, { "q": 1, "r": -1 }])
    );
    d.undo().unwrap();
    assert_eq!(hexes(&d, &at)[0], json!({ "q": 0, "r": 0 }));
}

#[test]
fn a_location_keeps_its_last_hex() {
    let mut d = doc();
    d.run("locations.add", &json!({ "at": LAYER, "q": 2, "r": 3 }))
        .unwrap();
    let at = d.tree().at(LAYER).unwrap().order(LOCATIONS)[0]
        .path()
        .to_string();
    let last = json!({ "at": at, "q": 2, "r": 3 });
    assert!(!d.is_enabled("locations.hex", &last).unwrap());
    assert!(d.run("locations.hex", &last).is_err());
    assert!(!d
        .is_enabled("locations.hex", &json!({ "at": LAYER, "q": 0, "r": 0 }))
        .unwrap());
    assert_eq!(hexes(&d, &at), json!([{ "q": 2, "r": 3 }]));
}

fn place(d: &mut Doc, layer: &str, name: &str, values: &[(&str, serde_json::Value)]) {
    d.run(
        "locations.add",
        &json!({ "at": layer, "q": 0, "r": 0, "name": name }),
    )
    .unwrap();
    let at = d
        .tree()
        .at(layer)
        .unwrap()
        .order(LOCATIONS)
        .last()
        .unwrap()
        .path()
        .to_string();
    for (k, v) in values {
        d.run("value.set", &json!({ "at": at, "key": k, "value": v }))
            .unwrap();
    }
}

#[test]
fn the_key_numbers_from_the_top_layer_and_lists_the_unnumbered_last() {
    let mut d = doc();
    // a second and a third layer, each added above the first
    d.run("node.add", &json!({ "parent": MAP, "type": "locations" }))
        .unwrap();
    d.run("node.add", &json!({ "parent": MAP, "type": "locations" }))
        .unwrap();
    let layers: Vec<String> = d
        .tree()
        .at(MAP)
        .unwrap()
        .order("layers")
        .iter()
        .filter(|n| n.type_name() == "locations")
        .map(|n| n.path().to_string())
        .collect();
    let [low, mid, top] = &layers[..] else {
        panic!("{layers:?}")
    };
    place(
        &mut d,
        low,
        "Reedwall Keep",
        &[("description", json!("Held by the Vane."))],
    );
    place(
        &mut d,
        low,
        "Sunken Chapel",
        &[("hidden", json!(true)), ("category", json!("shrine"))],
    );
    place(&mut d, top, "Gallows Ford", &[]);
    place(&mut d, mid, "Old Road", &[]);
    d.run(
        "value.set",
        &json!({ "at": mid, "key": "numbered", "value": false }),
    )
    .unwrap();

    let k = key(&d, MAP).unwrap();
    let rows: Vec<(Option<u32>, &str)> = k
        .entries
        .iter()
        .map(|e| (e.number, e.name.as_str()))
        .collect();
    assert_eq!(
        rows,
        [
            (Some(1), "Gallows Ford"),
            (Some(2), "Reedwall Keep"),
            (Some(3), "Sunken Chapel"),
            (None, "Old Road"),
        ]
    );
    assert_eq!(
        k.entries[2],
        KeyEntry {
            number: Some(3),
            name: "Sunken Chapel".into(),
            category: "Shrine".into(),
            description: String::new(),
            hidden: true,
        }
    );
    assert_eq!(k.entries[1].description, "Held by the Vane.");
    assert!(key(&d, LAYER).is_none());

    // a layer switched off keeps its numbers but hides its places from a print
    d.run(
        "value.set",
        &json!({ "at": top, "key": "visible", "value": false }),
    )
    .unwrap();
    let k = key(&d, MAP).unwrap();
    assert_eq!((k.entries[0].number, k.entries[0].hidden), (Some(1), true));
    assert!(!k.entries[1].hidden);
}
