//! `outline.draw`, through commands by id.

use rhizome_core::{IdSource, Value};
use rhizome_pom::{Document, MemoryStore};
use serde_json::{json, Value as Json};

use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

const MAP: &str = "/maps/map";
const LAYER: &str = "/maps/map/outline";

fn doc() -> Doc {
    let mut d = Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    d.run("node.add", &json!({ "parent": "/maps", "type": "map" }))
        .unwrap();
    d.run("node.add", &json!({ "parent": MAP, "type": "outline" }))
        .unwrap();
    d
}

fn corner(q: i64, r: i64, c: i64) -> Json {
    json!({ "q": q, "r": r, "corner": c })
}

fn paths(d: &Doc) -> Json {
    match d.tree().at(LAYER).unwrap().value("paths") {
        Some(Value::Shaped(j)) => j,
        other => panic!("paths is {other:?}"),
    }
}

#[test]
fn draw_replaces_the_paths_and_undo_restores_them() {
    let mut d = doc();
    let one = json!([{ "corners": [corner(0, 0, 0), corner(0, 0, 1)], "closed": false }]);
    d.run("outline.draw", &json!({ "at": LAYER, "paths": one }))
        .unwrap();
    assert_eq!(paths(&d), one);
    assert_eq!(d.tree().undo_label(), Some("Draw Outline"));

    let two = json!([
        { "corners": [corner(0, 0, 0), corner(0, 0, 1)], "closed": false },
        { "corners": [corner(1, 0, 2)], "closed": false },
    ]);
    d.run("outline.draw", &json!({ "at": LAYER, "paths": two }))
        .unwrap();
    assert_eq!(paths(&d), two);

    d.undo().unwrap();
    assert_eq!(paths(&d), one);
}

#[test]
fn draw_refuses_what_is_not_an_outline_layer() {
    let mut d = doc();
    for at in [MAP, "/maps/map/paper", "/nowhere"] {
        assert!(
            d.run("outline.draw", &json!({ "at": at, "paths": [] }))
                .is_err(),
            "{at}"
        );
    }
}

#[test]
fn draw_refuses_a_malformed_path() {
    let mut d = doc();
    let bad = json!([{ "corners": [{ "q": 0, "r": 0 }], "closed": false }]);
    assert!(d
        .run("outline.draw", &json!({ "at": LAYER, "paths": bad }))
        .is_err());
    assert_eq!(paths(&d), json!([]));
}
