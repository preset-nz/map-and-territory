//! Locations (epic 28, first slice): named places on a map. A `locations` layer holds
//! `location` nodes, listed in its stored order `locations` (the webview mirror has no
//! parent-to-children lookup, as with freeform's chunks). A location's number is its place in
//! that order, counted across the map's numbered locations layers by the frame projection, so
//! it is never stored and reordering renumbers.
//!
//! Commands: `locations.add` puts a location on a hex; `locations.hex` grows a location into
//! a hex or shrinks it out of one, so a place can cover an area. Renaming, editing, moving and
//! deleting are the generic `value.set`, `node.rename` and `edit.delete`.

use rhizome_core::{Edit, Node, NodeId, Value};
use rhizome_pom::{payload, Commands, Document, Error, Outcome};
use serde::Deserialize;
use serde_json::json;

use super::commands::next_name;
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

/// The stored order on a locations layer that lists its locations, top first in the key.
pub const LOCATIONS: &str = "locations";
/// The base of a location's auto name ("Location 01").
pub const LOCATION_BASE: &str = "Location";

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

/// A location lives only under a locations layer.
pub fn check_location(n: &Node<'_>) -> Result<(), String> {
    match n.parent() {
        Some(p) if p.type_name() == "locations" => Ok(()),
        _ => Err("a location goes in a locations layer".into()),
    }
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
    let hexes = match n.value("hexes") {
        Some(Value::Shaped(v)) => v
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(|h| Some((h.get("q")?.as_i64()?, h.get("r")?.as_i64()?)))
            .collect(),
        _ => Vec::new(),
    };
    Ok((n.id(), hexes))
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
            let value = json!(next
                .iter()
                .map(|&(q, r)| json!({ "q": q, "r": r }))
                .collect::<Vec<_>>());
            Ok(Outcome::from(
                d.edit(label, |tx| tx.set_value(id, "hexes", Value::Shaped(value)))?
                    .1,
            ))
        },
    );
}
