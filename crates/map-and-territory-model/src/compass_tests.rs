//! The compass (epic 24 story 1): its values, its place in `furniture`, and `compass.set-style`,
//! which resets the label set in the same undo step and keeps the word overrides.

use rhizome_core::{IdSource, Value};
use rhizome_pom::{Document, MemoryStore, Outcome};
use serde_json::{json, Value as Json};

use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

const MAP: &str = "/maps/map";
const AT: &str = "/maps/map/compass";

fn doc_with_compass() -> Doc {
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
        json!({ "parent": MAP, "type": "compass" }),
    )
    .unwrap();
    d
}

fn run(d: &mut Doc, id: &str, p: Json) -> rhizome_pom::Result<Outcome> {
    d.run(id, &p)
}

fn set(d: &mut Doc, key: &str, value: Json) -> rhizome_pom::Result<Outcome> {
    run(
        d,
        "value.set",
        json!({ "at": AT, "key": key, "value": value }),
    )
}

fn set_style(d: &mut Doc, style: &str) -> rhizome_pom::Result<Outcome> {
    run(d, "compass.set-style", json!({ "at": AT, "style": style }))
}

fn value(d: &Doc, key: &str) -> Option<Value> {
    d.tree().at(AT).unwrap().value(key)
}

fn choice(s: &str) -> Option<Value> {
    Some(Value::Choice(s.into()))
}

#[test]
fn add_compass_lands_in_furniture_as_one_undo_step() {
    let d = doc_with_compass();
    let m = d.tree().at(MAP).unwrap();
    let furniture: Vec<_> = m
        .order("furniture")
        .iter()
        .map(|n| n.path().to_string())
        .collect();
    assert_eq!(furniture, [AT]);
    assert!(!m.order("layers").iter().any(|n| n.type_name() == "compass"));
    assert_eq!(d.tree().undo_label(), Some("Add Compass"));
}

#[test]
fn the_compass_has_its_defaults_and_ranges() {
    let mut d = doc_with_compass();
    let text = |s: &str| Some(Value::Text(s.into()));
    // mark, north only: the plain grimdark cross (epic 24, Decided)
    assert_eq!(value(&d, "style"), choice("mark"));
    assert_eq!(value(&d, "labels"), choice("north-only"));
    for key in ["labelN", "labelE", "labelS", "labelW"] {
        assert_eq!(value(&d, key), text(""), "{key}");
    }
    assert_eq!(value(&d, "north"), Some(Value::Float(0.0)));
    assert_eq!(value(&d, "size"), Some(Value::Float(120.0)));
    assert_eq!(value(&d, "anchor"), choice("top-right"));
    assert_eq!(value(&d, "inset"), Some(Value::Float(24.0)));
    assert_eq!(value(&d, "backing"), Some(Value::Bool(true)));
    assert_eq!(value(&d, "face"), choice("map"));
    assert_eq!(value(&d, "hand"), choice("map"));
    assert_eq!(value(&d, "visible"), Some(Value::Bool(true)));

    for (key, v) in [
        ("labels", json!("cardinal")),
        ("labels", json!("none")),
        ("labelN", json!("Throne")),
        ("north", json!(-180.0)),
        ("north", json!(180.0)),
        ("size", json!(16.0)),
        ("size", json!(400.0)),
        ("hand", json!("scratched")),
        ("face", json!("marker")),
    ] {
        assert!(set(&mut d, key, v.clone()).is_ok(), "{key} {v}");
    }
    for (key, v) in [
        // left for later (epic 24, The cut)
        ("labels", json!("traveller")),
        ("style", json!("mariner")),
        ("north", json!(181.0)),
        ("size", json!(15.0)),
        ("size", json!(401.0)),
    ] {
        assert!(set(&mut d, key, v.clone()).is_err(), "{key} {v}");
    }
}

#[test]
fn setting_the_style_resets_the_labels_in_one_undo_step_and_keeps_the_words() {
    let mut d = doc_with_compass();
    set(&mut d, "labelN", json!("Throne")).unwrap();
    set(&mut d, "labelE", json!("Dawn")).unwrap();

    set_style(&mut d, "cross").unwrap();
    assert_eq!(value(&d, "style"), choice("cross"));
    assert_eq!(value(&d, "labels"), choice("cardinal"));
    assert_eq!(value(&d, "labelN"), Some(Value::Text("Throne".into())));
    assert_eq!(value(&d, "labelE"), Some(Value::Text("Dawn".into())));
    assert_eq!(d.tree().undo_label(), Some("Set Style"));

    // a label set picked by hand goes when the style changes again
    set(&mut d, "labels", json!("none")).unwrap();
    set_style(&mut d, "arrow").unwrap();
    assert_eq!(value(&d, "labels"), choice("north-only"));

    d.undo().unwrap();
    assert_eq!(value(&d, "style"), choice("cross"));
    assert_eq!(value(&d, "labels"), choice("none"));
    d.undo().unwrap();
    d.undo().unwrap();
    assert_eq!(value(&d, "style"), choice("mark"));
    assert_eq!(value(&d, "labels"), choice("north-only"));
    assert_eq!(value(&d, "labelN"), Some(Value::Text("Throne".into())));
}

#[test]
fn set_style_is_refused_off_a_compass_or_for_an_unknown_style() {
    let mut d = doc_with_compass();
    assert!(set_style(&mut d, "mariner").is_err());
    assert!(run(
        &mut d,
        "compass.set-style",
        json!({ "at": MAP, "style": "cross" })
    )
    .is_err());
    let enabled = |style: &str| {
        d.is_enabled("compass.set-style", &json!({ "at": AT, "style": style }))
            .unwrap()
    };
    assert!(!enabled("rose"));
    assert!(enabled("cross"));
}
