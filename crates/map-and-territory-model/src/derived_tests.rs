//! `Derived`: the numbers the window reads from the mirror, against the rules
//! that produce them in Rust.

use rhizome_core::IdSource;
use rhizome_pom::{Document, MemoryStore, ObjectModel};
use serde_json::json;

use super::derived::Derived;
use super::locations::key;
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

const MAP: &str = "/maps/map";

fn run(d: &mut Doc, id: &str, payload: serde_json::Value) {
    d.run(id, &payload).unwrap();
}

fn set(d: &mut Doc, at: &str, key: &str, value: serde_json::Value) {
    run(
        d,
        "value.set",
        json!({ "at": at, "key": key, "value": value }),
    );
}

/// A map with two numbered layers (`/maps/map/locations` below `/maps/map/locations-2`) and
/// an unnumbered one on top, two places in each. Returns the doc.
fn doc() -> Doc {
    let mut d = Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    run(
        &mut d,
        "node.add",
        json!({ "parent": "/maps", "type": "map" }),
    );
    for name in ["locations", "locations-2", "locations-3"] {
        run(
            &mut d,
            "node.add",
            json!({ "parent": MAP, "type": "locations", "name": name }),
        );
    }
    set(
        &mut d,
        &format!("{MAP}/locations-3"),
        "numbered",
        json!(false),
    );
    for layer in ["locations", "locations-2", "locations-3"] {
        for q in 0..2 {
            run(
                &mut d,
                "locations.add",
                json!({ "at": format!("{MAP}/{layer}"), "q": q, "r": 0 }),
            );
        }
    }
    d
}

#[test]
fn numbers_are_the_keys_and_an_unnumbered_layer_has_none() {
    let d = doc();
    let derived = Derived::of(d.tree());
    let entries = key(&d, MAP).unwrap().entries;
    assert_eq!(entries.len(), 6);
    let places: Vec<String> = ["locations-3", "locations-2", "locations"]
        .iter()
        .flat_map(|layer| {
            d.tree()
                .at(format!("{MAP}/{layer}"))
                .unwrap()
                .order("locations")
                .into_iter()
                .map(|n| n.id().to_string())
                .collect::<Vec<_>>()
        })
        .collect();
    // the key lists the numbered layers first, top of the stack down, then the rest
    let in_key_order = [&places[2..4], &places[4..6], &places[0..2]].concat();
    for (id, entry) in in_key_order.iter().zip(&entries) {
        assert_eq!(derived.numbers.get(id).copied(), entry.number, "{id}");
    }
    assert_eq!(derived.numbers.len(), 4);
    assert_eq!(
        in_key_order[..4]
            .iter()
            .map(|id| derived.numbers[id])
            .collect::<Vec<_>>(),
        [1, 2, 3, 4]
    );
    for id in &places[0..2] {
        assert!(!derived.numbers.contains_key(id), "unnumbered: {id}");
    }
}

#[test]
fn reordering_a_layer_renumbers() {
    let mut d = doc();
    let before = Derived::of(d.tree());
    let layer = d.tree().at(format!("{MAP}/locations")).unwrap();
    let ids: Vec<_> = layer
        .order("locations")
        .into_iter()
        .map(|n| n.id())
        .collect();
    // the bottom layer brought to the front of the stack starts the numbering
    run(
        &mut d,
        "edit.move-to-front",
        json!({ "at": format!("{MAP}/locations") }),
    );
    let after = Derived::of(d.tree());
    assert_ne!(before.numbers, after.numbers);
    assert_eq!(after.numbers[&ids[0].to_string()], 1);
}

#[test]
fn it_is_mirrored_as_json_by_id_and_changes_with_the_tree() {
    let mut d = doc();
    let json = MapAndTerritory::mirrored(d.projection()).unwrap();
    assert_eq!(json["numbers"].as_object().unwrap().len(), 4);
    // the document's own projection is what `project` built after each command
    assert_eq!(d.projection(), &Derived::of(d.tree()));
    d.undo().unwrap();
    assert_eq!(d.projection(), &Derived::of(d.tree()));
}

#[test]
fn a_maps_drawn_aspect_is_its_paper_turned_by_its_orientation() {
    let mut d = doc();
    let id = d.tree().at(MAP).unwrap().id().to_string();
    let aspect = |d: &Doc| Derived::of(d.tree()).aspects.get(&id).cloned();
    assert_eq!(aspect(&d).as_deref(), Some("16:10"));
    let paper = format!("{MAP}/paper");
    set(&mut d, &paper, "orientation", json!("portrait"));
    assert_eq!(aspect(&d).as_deref(), Some("10:16"));
    set(&mut d, &paper, "aspect", json!("16:9"));
    assert_eq!(aspect(&d).as_deref(), Some("9:16"));
    set(&mut d, &paper, "aspect", json!("square"));
    assert_eq!(aspect(&d).as_deref(), Some("square"));
    // the mirrored projection carries it, as the window reads it
    let mirrored = MapAndTerritory::mirrored(&Derived::of(d.tree())).unwrap();
    assert_eq!(mirrored["aspects"][&id], json!("square"));
}
