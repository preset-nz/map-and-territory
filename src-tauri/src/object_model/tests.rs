//! The model driven the way the app will drive it: commands by id with JSON payloads.

use rhizome_core::{IdSource, Node, Value};
use rhizome_pom::{Document, MemoryStore, Outcome};
use serde_json::{json, Value as Json};

use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

fn new_doc() -> Doc {
    Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap()
}

fn run(d: &mut Doc, id: &str, p: Json) -> rhizome_pom::Result<Outcome> {
    d.run(id, &p)
}

fn add_map(d: &mut Doc) -> String {
    run(d, "node.add", json!({ "parent": "/maps", "type": "map" })).unwrap();
    // the newest map is last in `maps`
    let maps = d.tree().at("/maps").unwrap().order("maps");
    maps.last().unwrap().path().to_string()
}

fn names(n: &Node<'_>, order: &str) -> Vec<String> {
    n.order(order)
        .iter()
        .map(|c| c.type_name().to_string())
        .collect()
}

fn text(d: &Doc, at: &str, key: &str) -> String {
    match d.tree().at(at).unwrap().value(key) {
        Some(Value::Text(t)) => t,
        other => panic!("{at} {key}: {other:?}"),
    }
}

fn map_count(d: &Doc) -> usize {
    d.tree().at("/maps").unwrap().children().count()
}

fn set(d: &mut Doc, at: &str, key: &str, value: Json) -> rhizome_pom::Result<Outcome> {
    run(
        d,
        "value.set",
        json!({ "at": at, "key": key, "value": value }),
    )
}

#[test]
fn the_seed_holds_the_campaign_node() {
    let d = new_doc();
    let c = d.tree().at("/campaign/campaign").expect("seeded");
    assert_eq!(c.type_name(), "campaign");
    assert_eq!(map_count(&d), 0, "campaigns start with no maps");
    assert!(!d.is_unsaved(), "the seed isn't an unsaved edit");
    assert!(
        d.tree().undo_label().is_none(),
        "the seed is outside history"
    );
}

#[test]
fn the_campaign_refuses_delete_duplicate_and_a_second_copy() {
    let mut d = new_doc();
    let at = "/campaign/campaign";
    assert!(run(&mut d, "edit.delete", json!({ "at": at })).is_err());
    assert!(run(&mut d, "edit.duplicate", json!({ "at": at })).is_err());
    assert!(run(
        &mut d,
        "node.add",
        json!({ "parent": "/campaign", "type": "campaign" })
    )
    .is_err());
}

#[test]
fn add_a_map_brings_its_anchors_in_one_edit() {
    let mut d = new_doc();
    let path = add_map(&mut d);
    assert_eq!(path, "/maps/map");
    let map = d.tree().at(path.as_str()).unwrap();
    // paper is the bottom, the grid the top
    assert_eq!(names(&map, "layers"), ["paper", "hexgrid"]);
    assert_eq!(text(&d, &path, "name"), "Map 01");
    assert_eq!(d.tree().undo_label(), Some("New Map"));
    assert!(d.is_unsaved());
}

#[test]
fn maps_are_numbered_and_appended_to_the_maps_order() {
    let mut d = new_doc();
    add_map(&mut d);
    let second = add_map(&mut d);
    assert_eq!(second, "/maps/map-2");
    assert_eq!(text(&d, &second, "name"), "Map 02");
    let order: Vec<String> = d
        .tree()
        .at("/maps")
        .unwrap()
        .order("maps")
        .iter()
        .map(|n| n.path().to_string())
        .collect();
    assert_eq!(order, ["/maps/map", "/maps/map-2"]);
}

#[test]
fn a_given_name_is_kept() {
    let mut d = new_doc();
    run(
        &mut d,
        "node.add",
        json!({ "parent": "/maps", "type": "map", "name": "The Reach" }),
    )
    .unwrap();
    assert_eq!(text(&d, "/maps/map", "name"), "The Reach");
}

#[test]
fn add_a_map_then_undo_then_redo() {
    let mut d = new_doc();
    add_map(&mut d);
    assert_eq!(map_count(&d), 1);

    d.undo().unwrap();
    assert_eq!(map_count(&d), 0);
    assert!(!d.is_unsaved(), "undone back to the saved state");
    assert_eq!(d.tree().redo_label(), Some("New Map"));

    d.redo().unwrap();
    let map = d.tree().at("/maps/map").expect("back");
    assert_eq!(names(&map, "layers"), ["paper", "hexgrid"]);
    assert_eq!(text(&d, "/maps/map", "name"), "Map 01");
}

#[test]
fn paper_and_hexgrid_are_refused_on_their_own() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    for t in ["paper", "hexgrid"] {
        for parent in [map.as_str(), "/maps"] {
            let r = run(&mut d, "node.add", json!({ "parent": parent, "type": t }));
            assert!(r.is_err(), "{t} under {parent}");
        }
    }
    assert_eq!(map_count(&d), 1);
    assert_eq!(d.tree().at(map.as_str()).unwrap().children().count(), 2);
}

#[test]
fn other_types_and_places_are_refused() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    for (parent, t) in [
        ("/maps", "palette"),
        ("/maps", "hex-noise"),
        (map.as_str(), "map"),
        ("/themes", "map"),
        ("/nowhere", "map"),
    ] {
        let r = run(&mut d, "node.add", json!({ "parent": parent, "type": t }));
        assert!(r.is_err(), "{t} under {parent}");
    }
    assert_eq!(map_count(&d), 1);
}

#[test]
fn delete_a_map_and_undo_it() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    run(&mut d, "edit.delete", json!({ "at": map })).unwrap();
    assert_eq!(map_count(&d), 0);
    d.undo().unwrap();
    let m = d.tree().at(map.as_str()).expect("restored");
    assert_eq!(names(&m, "layers"), ["paper", "hexgrid"]);
}

#[test]
fn the_anchors_refuse_delete_duplicate_and_a_second_copy() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    for anchor in ["paper", "hexgrid"] {
        let at = format!("{map}/{anchor}");
        assert!(
            run(&mut d, "edit.delete", json!({ "at": at })).is_err(),
            "delete {anchor}"
        );
        assert!(
            run(&mut d, "edit.duplicate", json!({ "at": at })).is_err(),
            "duplicate {anchor}"
        );
        // a pasted copy is a second one under the same map
        let Outcome::Text(fragment) = run(&mut d, "edit.copy", json!({ "at": at })).unwrap() else {
            panic!("copy gives text");
        };
        assert!(
            run(
                &mut d,
                "edit.paste",
                json!({ "parent": map, "fragment": fragment })
            )
            .is_err(),
            "paste {anchor}"
        );
    }
    let m = d.tree().at(map.as_str()).unwrap();
    assert_eq!(names(&m, "layers"), ["paper", "hexgrid"]);
    assert_eq!(m.children().count(), 2);
}

#[test]
fn a_move_past_an_anchor_is_refused() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    let ids: Vec<_> = d
        .tree()
        .at(map.as_str())
        .unwrap()
        .order("layers")
        .iter()
        .map(|n| n.id())
        .collect();
    // swapping the anchors puts the grid under the paper
    let r = d.edit("Reorder", |tx| {
        tx.set_order(map.as_str(), "layers", [ids[1], ids[0]])
    });
    assert!(r.is_err());
    let m = d.tree().at(map.as_str()).unwrap();
    assert_eq!(names(&m, "layers"), ["paper", "hexgrid"]);
}

#[test]
fn removing_an_anchor_from_its_map_is_refused_by_the_check() {
    // the policy and the map check both hold when the tree is edited with raw ops
    let mut d = new_doc();
    let map = add_map(&mut d);
    let r = d.edit("Remove", |tx| tx.remove(format!("{map}/paper").as_str()));
    assert!(r.is_err());
    // a map made without its anchors is refused whole
    let r = d.edit("Bare map", |tx| tx.add("/maps", "map", "bare").map(|_| ()));
    assert!(r.is_err());
    assert_eq!(map_count(&d), 1);
}

#[test]
fn value_set_on_paper_within_and_outside_range() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    let paper = format!("{map}/paper");
    set(&mut d, &paper, "aspect", json!("4:3")).unwrap();
    set(&mut d, &paper, "color", json!([0.5, 0.25, 0.75, 1.0])).unwrap();
    let p = d.tree().at(paper.as_str()).unwrap();
    assert_eq!(p.value("aspect"), Some(Value::Choice("4:3".into())));
    assert_eq!(
        p.value("color"),
        Some(Value::Colour([0.5, 0.25, 0.75, 1.0]))
    );

    assert!(set(&mut d, &paper, "aspect", json!("21:9")).is_err());
    assert!(set(&mut d, &paper, "color", json!([2.0, 0.0, 0.0, 1.0])).is_err());
    assert!(
        set(&mut d, &paper, "visible", json!(false)).is_err(),
        "paper has no visible"
    );
    assert_eq!(
        d.tree().at(paper.as_str()).unwrap().value("aspect"),
        Some(Value::Choice("4:3".into()))
    );
}

#[test]
fn value_set_on_hexgrid_within_and_outside_range() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    let grid = format!("{map}/hexgrid");

    let g = d.tree().at(grid.as_str()).unwrap();
    assert_eq!(g.value("size"), Some(Value::Float(24.0)));
    assert_eq!(g.value("orientation"), Some(Value::Choice("pointy".into())));
    assert_eq!(g.value("usePaletteColor"), Some(Value::Bool(true)));
    assert_eq!(g.value("lineWidth"), Some(Value::Float(1.0)));

    // within
    set(&mut d, &grid, "size", json!(8.0)).unwrap();
    set(&mut d, &grid, "size", json!(120.0)).unwrap();
    set(&mut d, &grid, "orientation", json!("flat")).unwrap();
    set(&mut d, &grid, "lineWidth", json!(8.0)).unwrap();
    set(&mut d, &grid, "alpha", json!(0.5)).unwrap();
    set(&mut d, &grid, "usePaletteColor", json!(false)).unwrap();
    // below the minimum, and outside a hard range
    assert!(set(&mut d, &grid, "size", json!(7.0)).is_err());
    assert!(set(&mut d, &grid, "lineWidth", json!(0.5)).is_err());
    assert!(set(&mut d, &grid, "alpha", json!(1.5)).is_err());
    assert!(set(&mut d, &grid, "orientation", json!("diagonal")).is_err());
    // the sliders' max is soft: a typed value may go past it
    set(&mut d, &grid, "size", json!(200.0)).unwrap();
    assert_eq!(
        d.tree().at(grid.as_str()).unwrap().value("size"),
        Some(Value::Float(200.0))
    );
}

#[test]
fn duplicating_a_map_keeps_its_anchors_pinned() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    set(&mut d, &format!("{map}/paper"), "aspect", json!("square")).unwrap();
    run(&mut d, "edit.duplicate", json!({ "at": map })).unwrap();
    assert_eq!(map_count(&d), 2);

    let copy = d.tree().at("/maps/map-2").expect("the copy");
    assert_eq!(names(&copy, "layers"), ["paper", "hexgrid"]);
    assert_eq!(copy.children().count(), 2);
    // the copy carries the original's values
    assert_eq!(
        d.tree().at("/maps/map-2/paper").unwrap().value("aspect"),
        Some(Value::Choice("square".into()))
    );
    // and the original is untouched
    let orig = d.tree().at(map.as_str()).unwrap();
    assert_eq!(names(&orig, "layers"), ["paper", "hexgrid"]);
    // the copy joins the `maps` order, after its original
    assert_eq!(d.tree().at("/maps").unwrap().order("maps").len(), 2);
}
