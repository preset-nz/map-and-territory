//! `booklet.set`, `pages.add` and the page kind's policy, through commands by id.

use rhizome_core::{IdSource, Ref, Value};
use rhizome_pom::{Document, MemoryStore};
use serde_json::json;

use super::booklet::{padded, step, PAGES};
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

fn doc(maps: usize) -> Doc {
    let mut d = Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    for _ in 0..maps {
        d.run("node.add", &json!({ "parent": "/maps", "type": "map" }))
            .unwrap();
    }
    d
}

/// Each page's name and the name of the map it shows.
fn pages(d: &Doc) -> Vec<(String, Option<String>)> {
    let text = |n: &rhizome_core::Node<'_>| match n.value("name") {
        Some(Value::Text(t)) => t,
        other => panic!("name is {other:?}"),
    };
    d.tree()
        .at("/pages")
        .unwrap()
        .order(PAGES)
        .iter()
        .map(|p| (text(p), p.resolve("map").map(|m| text(&m))))
        .collect()
}

fn set(d: &mut Doc, booklet: &str) {
    d.run("booklet.set", &json!({ "booklet": booklet }))
        .unwrap();
}

#[test]
fn the_steps_and_the_padding_follow_the_type() {
    assert_eq!((step("spine", true), step("spine", false)), (4, 4));
    assert_eq!((step("stapled", true), step("stapled", false)), (2, 1));
    // cover, two pages, back at the least, then whole steps
    assert_eq!((padded(2, 4), padded(5, 4), padded(8, 4)), (4, 8, 8));
    assert_eq!((padded(3, 1), padded(5, 2), padded(5, 1)), (4, 6, 5));
}

#[test]
fn a_spine_booklet_gets_a_cover_a_page_per_map_and_a_back_in_fours() {
    let mut d = doc(3);
    set(&mut d, "spine");
    assert_eq!(d.tree().undo_label(), Some("Make Booklet"));
    let names: Vec<(String, Option<String>)> = pages(&d);
    let shown: Vec<Option<&str>> = names.iter().map(|(_, m)| m.as_deref()).collect();
    assert_eq!(
        shown,
        [
            None,
            Some("Map 01"),
            Some("Map 02"),
            Some("Map 03"),
            None,
            None,
            None,
            None
        ]
    );
    assert_eq!(names[0].0, "Cover");
    assert_eq!(names[7].0, "Back");
    // one undo step takes it all back
    d.undo().unwrap();
    assert!(pages(&d).is_empty());
}

#[test]
fn add_pages_adds_the_step_before_the_back() {
    let mut d = doc(1);
    set(&mut d, "stapled");
    assert_eq!(pages(&d).len(), 4);
    d.run("pages.add", &json!({})).unwrap();
    assert_eq!(d.tree().undo_label(), Some("Add Pages"));
    let after = pages(&d);
    assert_eq!(after.len(), 6);
    assert_eq!(after.last().unwrap().0, "Back");
    d.run(
        "value.set",
        &json!({ "at": "/campaign/campaign", "key": "doubleSided", "value": false }),
    )
    .unwrap();
    d.run("pages.add", &json!({})).unwrap();
    assert_eq!(d.tree().undo_label(), Some("Add Page"));
    assert_eq!(pages(&d).len(), 7);
}

#[test]
fn turning_it_off_keeps_the_pages_and_on_again_keeps_them_too() {
    let mut d = doc(1);
    set(&mut d, "stapled");
    set(&mut d, "none");
    assert_eq!(d.tree().undo_label(), Some("Make Collection"));
    assert_eq!(pages(&d).len(), 4);
    assert!(!d.is_enabled("pages.add", &json!({})).unwrap());
    // the same type again is not a change
    assert!(!d
        .is_enabled("booklet.set", &json!({ "booklet": "none" }))
        .unwrap());
    set(&mut d, "spine");
    assert_eq!(pages(&d).len(), 4);
    assert!(d.run("booklet.set", &json!({ "booklet": "zine" })).is_err());
}

#[test]
fn a_map_goes_on_one_page_only() {
    let mut d = doc(1);
    set(&mut d, "spine");
    let map = d.tree().at("/maps/map").unwrap().id();
    let blank = d.tree().at("/pages").unwrap().order(PAGES)[2]
        .path()
        .to_string();
    let r = d.edit("Show Map", |tx| {
        tx.set_ref(blank.as_str(), "map", Ref::here(map))
    });
    assert!(r.is_err(), "{r:?}");
    // a page goes only under /pages
    assert!(d
        .edit("Add", |tx| tx.add("/maps", "page", "page").map(|_| ()))
        .is_err());
}

#[test]
fn an_older_campaign_opens_and_becomes_a_booklet() {
    let mut d = doc(2);
    assert!(d.tree().at("/pages").is_some());
    set(&mut d, "spine");
    assert_eq!(pages(&d).len(), 4);
}

/// The path of the page at `i` in the `pages` order.
fn page_at(d: &Doc, i: usize) -> String {
    d.tree().at("/pages").unwrap().order(PAGES)[i]
        .path()
        .to_string()
}

fn set_value(d: &mut Doc, key: &str, value: serde_json::Value) -> rhizome_pom::Result<()> {
    d.run(
        "value.set",
        &json!({ "at": "/campaign/campaign", "key": key, "value": value }),
    )
    .map(|_| ())
}

#[test]
fn a_booklet_value_set_alone_is_refused_without_its_pages() {
    let mut d = doc(1);
    assert!(set_value(&mut d, "booklet", json!("spine")).is_err());
    assert!(pages(&d).is_empty());
    // with pages that fit, the plain value is no breach
    set(&mut d, "stapled");
    set(&mut d, "none");
    set_value(&mut d, "booklet", json!("stapled")).unwrap();
    // six stapled pages (in twos) aren't whole fours for a spine booklet
    d.run("pages.add", &json!({})).unwrap();
    set(&mut d, "none");
    assert!(set_value(&mut d, "booklet", json!("spine")).is_err());
}

#[test]
fn deleting_a_page_is_refused_when_the_count_breaks() {
    let mut d = doc(1);
    set(&mut d, "spine");
    let blank = page_at(&d, 2);
    // a spine booklet goes in fours
    assert!(d.run("edit.delete", &json!({ "at": blank })).is_err());
    assert_eq!(pages(&d).len(), 4);
    set(&mut d, "stapled");
    set_value(&mut d, "doubleSided", json!(false)).unwrap();
    d.run("pages.add", &json!({})).unwrap();
    assert_eq!(pages(&d).len(), 5);
    d.run("edit.delete", &json!({ "at": page_at(&d, 2) }))
        .unwrap();
    // cover, two pages and the back at the least
    assert!(d
        .run("edit.delete", &json!({ "at": page_at(&d, 2) }))
        .is_err());
    assert_eq!(pages(&d).len(), 4);
}

#[test]
fn a_page_is_not_duplicated_or_taken_out_of_the_order() {
    let mut d = doc(1);
    set(&mut d, "spine");
    assert!(!d
        .is_enabled("edit.duplicate", &json!({ "at": page_at(&d, 2) }))
        .unwrap());
    let pages_id = d.tree().at("/pages").unwrap().id();
    let r = d.edit("Drop", |tx| {
        let mut order: Vec<_> = tx
            .at(pages_id)
            .unwrap()
            .order(PAGES)
            .iter()
            .map(|n| n.id())
            .collect();
        order.pop();
        tx.set_order(pages_id, PAGES, order)
    });
    assert!(r.is_err(), "{r:?}");
}

#[test]
fn double_sided_through_booklet_set_pads_where_the_plain_value_is_refused() {
    let mut d = doc(1);
    set(&mut d, "stapled");
    set_value(&mut d, "doubleSided", json!(false)).unwrap();
    d.run("pages.add", &json!({})).unwrap();
    assert_eq!(pages(&d).len(), 5);
    // five pages printed on both sides break the twos
    assert!(set_value(&mut d, "doubleSided", json!(true)).is_err());
    d.run("booklet.set", &json!({ "doubleSided": true }))
        .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Set Double-sided"));
    let after = pages(&d);
    assert_eq!(after.len(), 6);
    assert_eq!(after.last().unwrap().0, "Back");
    // nothing to change
    assert!(!d
        .is_enabled("booklet.set", &json!({ "doubleSided": true }))
        .unwrap());
}

#[test]
fn set_map_puts_a_map_on_a_page_and_takes_it_off() {
    let mut d = doc(2);
    set(&mut d, "spine");
    let page = |d: &Doc, i: usize| {
        d.tree().at("/pages").unwrap().order(PAGES)[i]
            .path()
            .to_string()
    };
    let (cover, first) = (page(&d, 0), page(&d, 1));
    // the first map is on page 1 already
    assert!(!d
        .is_enabled("page.set-map", &json!({ "at": cover, "map": "/maps/map" }))
        .unwrap());
    d.run("page.set-map", &json!({ "at": first, "map": null }))
        .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Take Map off Page"));
    d.run("page.set-map", &json!({ "at": cover, "map": "/maps/map" }))
        .unwrap();
    assert_eq!(d.tree().undo_label(), Some("Put Map on Page"));
    assert_eq!(pages(&d)[0].1.as_deref(), Some("Map 01"));
    assert!(d
        .run("page.set-map", &json!({ "at": "/maps/map", "map": null }))
        .is_err());
}
