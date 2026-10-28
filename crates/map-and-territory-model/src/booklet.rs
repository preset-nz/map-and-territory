//! Booklets (epic 32 story 3). A campaign is a loose collection of maps until its `booklet`
//! value names a booklet type; then it prints as the pages under `/pages`, in the stored
//! order `pages`: the cover first, the back last, at least two pages between. A page refers
//! to at most one map, and a map sits on at most one page. The `maps` order is untouched.
//!
//! Commands: `booklet.set` turns a booklet type on or off (on, a campaign with no pages yet
//! gets a cover, a page per map and a back, padded to the type); `pages.add` adds the type's
//! step of blank pages before the back; `page.set-map` puts a map on a page, or takes it off.

use rhizome_core::{Edit, Node, NodeId, Ref, Value};
use rhizome_pom::{payload, Commands, Document, Error, Outcome};
use serde::Deserialize;

use super::commands::next_name;
use super::kinds::MAPS;
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

/// The category and stored order that hold a booklet's pages.
pub const PAGES: &str = "pages";
/// The reference key from a page to its map.
pub const MAP: &str = "map";
/// The campaign's booklet types: none (a collection of maps), a spine booklet, stapled pages.
pub const BOOKLETS: &[&str] = &["none", "spine", "stapled"];
const CAMPAIGN: &str = "/campaign/campaign";
/// Cover, two pages, back.
const MIN_PAGES: usize = 4;

/// How many pages Add Page adds: a spine booklet folds sheets of four; stapled pages go one
/// at a time, or two when printed on both sides (Georg, 2026-10-28).
pub fn step(booklet: &str, double_sided: bool) -> usize {
    match booklet {
        "spine" => 4,
        "stapled" if double_sided => 2,
        _ => 1,
    }
}

/// The page count `n` pads to: at least the cover, two pages and the back, then up to the
/// next whole step.
pub fn padded(n: usize, step: usize) -> usize {
    n.max(MIN_PAGES).div_ceil(step) * step
}

/// A page lives in `/pages`, and the map it shows is on no other page.
pub fn check_page(n: &Node<'_>) -> Result<(), String> {
    match n.parent() {
        Some(p) if p.is_category() && p.name() == PAGES => {}
        _ => return Err("a page goes under /pages".into()),
    }
    let Some(map) = n.resolve(MAP) else {
        return Ok(());
    };
    if map.type_name() != "map" {
        return Err("a page shows a map".into());
    }
    let pages = map
        .referrers()
        .into_iter()
        .filter(|(r, key)| *key == MAP && r.type_name() == "page")
        .count();
    if pages > 1 {
        return Err("a map goes on one page only".into());
    }
    Ok(())
}

fn text(n: &Node<'_>, key: &str) -> String {
    match n.value(key) {
        Some(Value::Text(t) | Value::Choice(t)) => t,
        _ => String::new(),
    }
}

/// The campaign's booklet type and its step.
fn booklet_of(d: &Doc) -> (String, usize) {
    let Some(c) = d.tree().at(CAMPAIGN) else {
        return ("none".into(), 1);
    };
    let kind = match text(&c, "booklet") {
        k if k.is_empty() => "none".to_string(),
        k => k,
    };
    let double = !matches!(c.value("doubleSided"), Some(Value::Bool(false)));
    let step = step(&kind, double);
    (kind, step)
}

fn page_ids(tx: &Edit<'_>, pages: NodeId) -> Vec<NodeId> {
    tx.at(pages)
        .map(|p| p.order(PAGES).iter().map(|n| n.id()).collect())
        .unwrap_or_default()
}

/// A page named `name` (or the next "Page NN"), showing `map` when given, not yet in the order.
fn new_page(
    tx: &mut Edit<'_>,
    pages: NodeId,
    name: Option<&str>,
    map: Option<NodeId>,
) -> rhizome_core::Result<NodeId> {
    let name = name.map_or_else(|| next_name(tx, pages, "Page"), str::to_string);
    let page = tx.add_unique(pages, "page", "page")?;
    tx.set_value(page, "name", Value::Text(name))?;
    if let Some(map) = map {
        tx.set_ref(page, MAP, Ref::here(map))?;
    }
    Ok(page)
}

/// Blank pages before the back until the booklet has `to` pages.
fn pad(tx: &mut Edit<'_>, pages: NodeId, to: usize) -> rhizome_core::Result<()> {
    let mut order = page_ids(tx, pages);
    while order.len() < to {
        let page = new_page(tx, pages, None, None)?;
        // before the back, which stays last
        let at = order.len().saturating_sub(1);
        order.insert(at, page);
    }
    tx.set_order(pages, PAGES, order)
}

/// A cover, a page for each map in `maps` order, and a back.
fn build(tx: &mut Edit<'_>, pages: NodeId) -> rhizome_core::Result<()> {
    let maps: Vec<NodeId> = tx
        .at(format!("/{MAPS}").as_str())
        .map(|m| m.order(MAPS).iter().map(|n| n.id()).collect())
        .unwrap_or_default();
    let mut order = vec![new_page(tx, pages, Some("Cover"), None)?];
    for map in maps {
        order.push(new_page(tx, pages, None, Some(map))?);
    }
    order.push(new_page(tx, pages, Some("Back"), None)?);
    tx.set_order(pages, PAGES, order)
}

#[derive(Deserialize)]
struct MapArgs {
    at: String,
    /// The map's path; none takes the page's map off.
    map: Option<String>,
}

/// The page at `at` and the map `map` names, checked: a page, a map, on no other page.
fn page_and_map(d: &Doc, a: &MapArgs) -> Result<(NodeId, Option<NodeId>), Error> {
    let page = match d.tree().at(a.at.as_str()) {
        Some(n) if n.type_name() == "page" => n,
        _ => return Err(Error::Payload(format!("{} isn't a page", a.at))),
    };
    let Some(path) = &a.map else {
        return Ok((page.id(), None));
    };
    let map = match d.tree().at(path.as_str()) {
        Some(n) if n.type_name() == "map" => n,
        _ => return Err(Error::Payload(format!("{path} isn't a map"))),
    };
    let elsewhere = map
        .referrers()
        .into_iter()
        .any(|(r, key)| key == MAP && r.type_name() == "page" && r.id() != page.id());
    if elsewhere {
        return Err(Error::Payload("that map is on another page".into()));
    }
    Ok((page.id(), Some(map.id())))
}

#[derive(Deserialize)]
struct SetArgs {
    booklet: String,
}

fn pages_id(d: &Doc) -> Result<NodeId, Error> {
    d.tree()
        .at(format!("/{PAGES}").as_str())
        .map(|n| n.id())
        .ok_or_else(|| Error::Payload("the campaign has no /pages".into()))
}

pub fn declare(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "booklet.set",
        |_| "Make Booklet".into(),
        |d: &Doc, p: &serde_json::Value| {
            payload::<SetArgs>(p).is_ok_and(|a| {
                BOOKLETS.contains(&a.booklet.as_str()) && booklet_of(d).0 != a.booklet
            })
        },
        |d: &mut Doc, p: &serde_json::Value| {
            let a: SetArgs = payload(p)?;
            if !BOOKLETS.contains(&a.booklet.as_str()) {
                return Err(Error::Payload(format!("no booklet type {}", a.booklet)));
            }
            let pages = pages_id(d)?;
            let double = d
                .tree()
                .at(CAMPAIGN)
                .is_none_or(|c| !matches!(c.value("doubleSided"), Some(Value::Bool(false))));
            let label = if a.booklet == "none" {
                "Make Collection"
            } else {
                "Make Booklet"
            };
            Ok(Outcome::from(
                d.edit(label, |tx| {
                    tx.set_value(CAMPAIGN, "booklet", Value::Choice(a.booklet.clone()))?;
                    if a.booklet == "none" {
                        // the pages stay, for turning it back on
                        return Ok(());
                    }
                    if page_ids(tx, pages).is_empty() {
                        build(tx, pages)?;
                    }
                    let n = page_ids(tx, pages).len();
                    pad(tx, pages, padded(n, step(&a.booklet, double)))
                })?
                .1,
            ))
        },
    );
    c.add(
        "pages.add",
        |d: &Doc| {
            if booklet_of(d).1 == 1 {
                "Add Page".into()
            } else {
                "Add Pages".into()
            }
        },
        |d: &Doc, _: &serde_json::Value| booklet_of(d).0 != "none",
        |d: &mut Doc, _: &serde_json::Value| {
            let (kind, step) = booklet_of(d);
            if kind == "none" {
                return Err(Error::Payload("the campaign isn't a booklet".into()));
            }
            let pages = pages_id(d)?;
            let label = if step == 1 { "Add Page" } else { "Add Pages" };
            Ok(Outcome::from(
                d.edit(label, |tx| {
                    // a booklet set by its value alone has no pages yet
                    if page_ids(tx, pages).is_empty() {
                        build(tx, pages)?;
                    }
                    let n = page_ids(tx, pages).len();
                    pad(tx, pages, padded(n + step, step))
                })?
                .1,
            ))
        },
    );
    c.add(
        "page.set-map",
        |_| "Set Page Map".into(),
        |d: &Doc, p: &serde_json::Value| {
            payload::<MapArgs>(p).is_ok_and(|a| page_and_map(d, &a).is_ok())
        },
        |d: &mut Doc, p: &serde_json::Value| {
            let a: MapArgs = payload(p)?;
            let (page, map) = page_and_map(d, &a)?;
            let label = if map.is_some() {
                "Put Map on Page"
            } else {
                "Take Map off Page"
            };
            Ok(Outcome::from(
                d.edit(label, |tx| match map {
                    Some(m) => tx.set_ref(page, MAP, Ref::here(m)),
                    None => tx.clear_ref(page, MAP),
                })?
                .1,
            ))
        },
    );
}
