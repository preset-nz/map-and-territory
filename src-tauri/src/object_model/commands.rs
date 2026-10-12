//! M&T's commands. Today that is `node.add`, which replaces POM's built-in of the same id.

use rhizome_core::{Edit, NodeId, Value};
use rhizome_pom::{payload, Commands, Document, Error, Outcome};
use serde::Deserialize;
use serde_json::Value as Json;

use super::kinds::{LAYERS, MAPS};
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

#[derive(Deserialize)]
struct AddArgs {
    parent: String,
    #[serde(rename = "type")]
    type_name: String,
    /// A display name. Without one a map is "Map 01", "Map 02" and so on.
    #[serde(default)]
    name: Option<String>,
}

fn refuse(message: impl Into<String>) -> Error {
    Error::Payload(message.into())
}

/// `node.add`, in one place so `enabled` and `run` agree.
///
/// Only a `map` under `/maps` is addable in epic 15. `paper` and `hexgrid` are refused on
/// their own (a map brings them), and the layer kinds arrive with epic 16. The built-in's
/// `preset` argument isn't taken, because no kind here has presets yet.
fn check(d: &Doc, a: &AddArgs) -> Result<(), String> {
    match a.type_name.as_str() {
        "map" => {}
        "paper" | "hexgrid" => {
            return Err(format!(
                "a {} comes with its map and can't be added on its own",
                a.type_name
            ));
        }
        other => return Err(format!("`{other}` can't be added yet")),
    }
    match d.tree().at(a.parent.as_str()) {
        Some(p) if p.is_category() && p.name() == MAPS => Ok(()),
        Some(_) => Err("a map goes under /maps".into()),
        None => Err(format!("no node at {}", a.parent)),
    }
}

/// "Map 01" style: one past the highest number any sibling name ends in (the 2025
/// `generateName` rule, `src/stores/naming.ts`).
fn next_name(tx: &Edit<'_>, parent: NodeId) -> String {
    let max = tx
        .at(parent)
        .map(|p| {
            p.children()
                .filter_map(|c| match c.value("name") {
                    Some(Value::Text(t)) => Some(t),
                    _ => None,
                })
                .filter(|t| t.to_lowercase().starts_with("map"))
                .filter_map(|t| {
                    let digits: String = t
                        .trim_end()
                        .chars()
                        .rev()
                        .take_while(char::is_ascii_digit)
                        .collect::<Vec<_>>()
                        .into_iter()
                        .rev()
                        .collect();
                    digits.parse::<u64>().ok()
                })
                .max()
                .unwrap_or(0)
        })
        .unwrap_or(0);
    format!("Map {:02}", max + 1)
}

/// A map, its paper and its hexgrid, in the order `layers`, appended to `maps`: one edit.
fn add_map(tx: &mut Edit<'_>, parent: &str, name: Option<String>) -> rhizome_core::Result<NodeId> {
    let parent_id = tx
        .at(parent)
        .map(|n| n.id())
        .ok_or_else(|| rhizome_core::Error::NotFound(parent.into()))?;
    let name = name
        .filter(|n| !n.trim().is_empty())
        .unwrap_or_else(|| next_name(tx, parent_id));
    // the path is the kind's unique name (`map`, `map-2`); the display name is a value
    let map = tx.add_unique(parent_id, "map", "map")?;
    tx.set_value(map, "name", Value::Text(name))?;
    let paper = tx.add(map, "paper", "paper")?;
    let grid = tx.add(map, "hexgrid", "hexgrid")?;
    tx.set_order(map, LAYERS, [paper, grid])?;
    let mut maps: Vec<NodeId> = tx
        .at(parent_id)
        .expect("the parent exists")
        .order(MAPS)
        .iter()
        .map(|n| n.id())
        .collect();
    maps.push(map);
    tx.set_order(parent_id, MAPS, maps)?;
    Ok(map)
}

pub fn declare(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "node.add",
        |_| "New Map".into(),
        |d: &Doc, p: &Json| payload::<AddArgs>(p).is_ok_and(|a| check(d, &a).is_ok()),
        |d: &mut Doc, p: &Json| {
            let a: AddArgs = payload(p)?;
            check(d, &a).map_err(refuse)?;
            Ok(Outcome::from(
                d.edit("New Map", |tx| add_map(tx, &a.parent, a.name))?.1,
            ))
        },
    );
}
