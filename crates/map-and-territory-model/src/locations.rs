//! Locations (epic 28, first slice): named places on a map. A `locations` layer holds
//! `location` nodes, listed in its stored order `locations` (the webview mirror has no
//! parent-to-children lookup, as with freeform's chunks). A location's number is its place in
//! that order, counted across the map's numbered locations layers by the frame projection, so
//! it is never stored and reordering renumbers.
//!
//! The key ([`key`]) lists a map's places by number for a print ([`Key::printable`] leaves
//! out the hidden). [`places`] numbers them, once: the key reads it, and so does the
//! `Derived` projection the window gets (`derived.rs`).
//!
//! Commands: `locations.add` puts a location on a hex; `locations.hex` grows a location into
//! a hex or shrinks it out of one, so a place can cover an area; `locations.move` shifts all
//! its hexes by a step, so an area keeps its shape. Renaming, editing and deleting are the
//! generic `value.set`, `node.rename` and `edit.delete`. The location's check keeps its hexes
//! non-empty and distinct however they are set.

use rhizome_core::{Edit, Node, NodeId, Value};
use rhizome_pom::{payload, Commands, Document, Error, Outcome};
use serde::Deserialize;
use serde_json::json;

use super::commands::next_name;
use super::kinds::LOCATION_CATEGORY_LABELS;
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

/// The stored order on a locations layer that lists its locations, top first in the key.
pub const LOCATIONS: &str = "locations";
/// The base of a location's auto name ("Location 01").
pub const LOCATION_BASE: &str = "Location";

/// One place in a map's key.
#[derive(Debug, Clone, PartialEq)]
pub struct KeyEntry {
    /// None in a layer that isn't numbered.
    pub number: Option<u32>,
    pub name: String,
    /// The category's name ("Shrine").
    pub category: String,
    pub description: String,
    /// Marked hidden, or in a layer that is switched off: the window may show it, a print
    /// leaves it out.
    pub hidden: bool,
}

/// A map's key: every place, numbered layers first in their numbering, then the rest.
#[derive(Debug, Clone, PartialEq)]
pub struct Key {
    /// The map's name, for the page's heading.
    pub map: String,
    pub entries: Vec<KeyEntry>,
}

impl Key {
    /// The places a print shows, in key order: hidden ones are the owner's secrets and stay out.
    pub fn printable(&self) -> impl Iterator<Item = &KeyEntry> {
        self.entries.iter().filter(|e| !e.hidden)
    }
}

fn text(n: &Node<'_>, key: &str) -> String {
    match n.value(key) {
        Some(Value::Text(t) | Value::Choice(t)) => t,
        _ => String::new(),
    }
}

/// One place with the layer it is in and its number.
pub struct Placed<'a> {
    pub layer: Node<'a>,
    pub place: Node<'a>,
    /// None in a layer that isn't numbered.
    pub number: Option<u32>,
}

/// A map's places in key order. Numbers run from the top of the stack down, across the
/// numbered locations layers, each layer's places in its `locations` order; places in a layer
/// that isn't numbered follow, unnumbered. The one place this rule is written.
pub fn places<'a>(map: &Node<'a>) -> Vec<Placed<'a>> {
    let layers: Vec<Node<'a>> = map
        .order("layers")
        .into_iter()
        .rev()
        .filter(|n| n.type_name() == "locations")
        .collect();
    let numbered = |l: &Node<'_>| !matches!(l.value("numbered"), Some(Value::Bool(false)));
    let mut next = 1;
    let mut out = Vec::new();
    for pass in [true, false] {
        for layer in layers.iter().filter(|l| numbered(l) == pass) {
            for place in layer.order(LOCATIONS) {
                out.push(Placed {
                    layer: *layer,
                    place,
                    number: pass.then(|| {
                        next += 1;
                        next - 1
                    }),
                });
            }
        }
    }
    out
}

/// The key of the map at `map`, or None when there is no map there.
pub fn key(d: &Doc, map: &str) -> Option<Key> {
    let map = d.tree().at(map).filter(|n| n.type_name() == "map")?;
    let off =
        |n: &Node<'_>, key: &str, on: bool| matches!(n.value(key), Some(Value::Bool(b)) if b != on);
    let entries = places(&map)
        .into_iter()
        .map(
            |Placed {
                 layer,
                 place,
                 number,
             }| {
                let category = text(&place, "category");
                KeyEntry {
                    number,
                    name: text(&place, "name"),
                    category: LOCATION_CATEGORY_LABELS
                        .iter()
                        .find(|(id, _)| *id == category)
                        .map_or(category.clone(), |(_, label)| (*label).to_string()),
                    description: text(&place, "description"),
                    hidden: off(&place, "hidden", false) || off(&layer, "visible", true),
                }
            },
        )
        .collect();
    Some(Key {
        map: text(&map, "name"),
        entries,
    })
}

#[derive(Deserialize)]
struct AddArgs {
    at: String,
    q: i64,
    r: i64,
    #[serde(default)]
    name: Option<String>,
}

#[derive(Deserialize)]
struct HexArgs {
    at: String,
    q: i64,
    r: i64,
}

#[derive(Deserialize)]
struct MoveArgs {
    at: String,
    /// The step, in axial hexes.
    dq: i64,
    dr: i64,
}

/// A location lives only under a locations layer, on at least one hex, each hex once.
pub fn check_location(n: &Node<'_>) -> Result<(), String> {
    match n.parent() {
        Some(p) if p.type_name() == "locations" => {}
        _ => return Err("a location goes in a locations layer".into()),
    }
    let hexes = hexes_of(n);
    if hexes.is_empty() {
        return Err("a location is on at least one hex".into());
    }
    let mut seen = hexes.clone();
    seen.sort_unstable();
    seen.dedup();
    if seen.len() != hexes.len() {
        return Err("a location covers each hex once".into());
    }
    Ok(())
}

/// A location's hexes, in stored order.
fn hexes_of(n: &Node<'_>) -> Vec<(i64, i64)> {
    match n.value("hexes") {
        Some(Value::Shaped(v)) => v
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(|h| Some((h.get("q")?.as_i64()?, h.get("r")?.as_i64()?)))
            .collect(),
        _ => Vec::new(),
    }
}

fn hexes_value(hexes: &[(i64, i64)]) -> Value {
    Value::Shaped(json!(hexes
        .iter()
        .map(|&(q, r)| json!({ "q": q, "r": r }))
        .collect::<Vec<_>>()))
}

fn locations_id(d: &Doc, at: &str) -> Result<NodeId, Error> {
    match d.tree().at(at) {
        Some(n) if n.type_name() == "locations" => Ok(n.id()),
        _ => Err(Error::Payload(format!("{at} isn't a locations layer"))),
    }
}

/// The location at `at` and its hexes, in stored order.
fn location(d: &Doc, at: &str) -> Result<(NodeId, Vec<(i64, i64)>), Error> {
    let n = match d.tree().at(at) {
        Some(n) if n.type_name() == "location" => n,
        _ => return Err(Error::Payload(format!("{at} isn't a location"))),
    };
    Ok((n.id(), hexes_of(&n)))
}

/// `hexes` with `(q, r)` toggled: taken out when it is there, else appended. `None` when that
/// would leave the location on no hex.
fn toggled(mut hexes: Vec<(i64, i64)>, q: i64, r: i64) -> Option<(Vec<(i64, i64)>, bool)> {
    match hexes.iter().position(|&h| h == (q, r)) {
        Some(_) if hexes.len() == 1 => None,
        Some(i) => {
            hexes.remove(i);
            Some((hexes, false))
        }
        None => {
            hexes.push((q, r));
            Some((hexes, true))
        }
    }
}

/// A location on hex `(q, r)`, appended to the layer's `locations`: one edit.
fn add(
    tx: &mut Edit<'_>,
    layer: NodeId,
    q: i64,
    r: i64,
    name: Option<String>,
) -> rhizome_core::Result<NodeId> {
    let name = name
        .filter(|n| !n.trim().is_empty())
        .unwrap_or_else(|| next_name(tx, layer, LOCATION_BASE));
    let node = tx.add_unique(layer, "location", "location")?;
    tx.set_value(node, "name", Value::Text(name))?;
    tx.set_value(node, "hexes", Value::Shaped(json!([{ "q": q, "r": r }])))?;
    tx.append_to_order(layer, LOCATIONS, node)?;
    Ok(node)
}

pub fn declare(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "locations.add",
        |_| "Add Location".into(),
        |d: &Doc, p: &serde_json::Value| {
            payload::<AddArgs>(p).is_ok_and(|a| locations_id(d, &a.at).is_ok())
        },
        |d: &mut Doc, p: &serde_json::Value| {
            let a: AddArgs = payload(p)?;
            let layer = locations_id(d, &a.at)?;
            Ok(Outcome::from(
                d.edit("Add Location", |tx| add(tx, layer, a.q, a.r, a.name))?
                    .1,
            ))
        },
    );
    c.add(
        "locations.hex",
        |_| "Grow or Shrink Location".into(),
        |d: &Doc, p: &serde_json::Value| {
            payload::<HexArgs>(p).is_ok_and(|a| {
                location(d, &a.at).is_ok_and(|(_, hexes)| toggled(hexes, a.q, a.r).is_some())
            })
        },
        |d: &mut Doc, p: &serde_json::Value| {
            let a: HexArgs = payload(p)?;
            let (id, hexes) = location(d, &a.at)?;
            let (next, grew) = toggled(hexes, a.q, a.r)
                .ok_or_else(|| Error::Payload("a location keeps at least one hex".into()))?;
            let label = if grew {
                "Grow Location"
            } else {
                "Shrink Location"
            };
            Ok(Outcome::from(
                d.edit(label, |tx| tx.set_value(id, "hexes", hexes_value(&next)))?
                    .1,
            ))
        },
    );
    c.add(
        "locations.move",
        |_| "Move Location".into(),
        |d: &Doc, p: &serde_json::Value| {
            payload::<MoveArgs>(p)
                .is_ok_and(|a| (a.dq, a.dr) != (0, 0) && location(d, &a.at).is_ok())
        },
        |d: &mut Doc, p: &serde_json::Value| {
            let a: MoveArgs = payload(p)?;
            if (a.dq, a.dr) == (0, 0) {
                return Err(Error::Payload("a move goes somewhere".into()));
            }
            let (id, hexes) = location(d, &a.at)?;
            let moved: Vec<(i64, i64)> = hexes.iter().map(|&(q, r)| (q + a.dq, r + a.dr)).collect();
            Ok(Outcome::from(
                d.edit("Move Location", |tx| {
                    tx.set_value(id, "hexes", hexes_value(&moved))
                })?
                .1,
            ))
        },
    );
}
