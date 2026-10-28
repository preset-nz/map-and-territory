//! M&T's commands: `node.add` and `edit.duplicate`, which replace POM's built-ins of the same
//! ids (maps, layers and furniture, each kept in its own order), the four layer-order moves, and
//! `node.rename` and `node.set-visible` for undo labels that say what happened.

use rhizome_core::{Edit, NodeId, Value};
use rhizome_pom::{payload, Commands, Document, Error, Outcome};
use serde::Deserialize;
use serde_json::Value as Json;

use super::kinds::{LayerKind, FURNITURE, FURNITURE_KINDS, LAYERS, LAYER_KINDS, MAPS};
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
    /// For a layer: the layer it lands just above. Without it, just below the hexgrid.
    #[serde(default)]
    above: Option<String>,
}

fn refuse(message: impl Into<String>) -> Error {
    Error::Payload(message.into())
}

fn layer_kind(type_name: &str) -> Option<&'static LayerKind> {
    LAYER_KINDS.iter().copied().find(|k| k.id == type_name)
}

fn furniture_kind(type_name: &str) -> Option<&'static LayerKind> {
    FURNITURE_KINDS.iter().copied().find(|k| k.id == type_name)
}

/// The id of a node's parent when that parent is a map.
fn map_of<'a>(d: &'a Doc, at: &str) -> Option<rhizome_core::Node<'a>> {
    d.tree().at(at).filter(|n| n.type_name() == "map")
}

/// `node.add`, in one place so `enabled` and `run` agree.
///
/// A `map` under `/maps`, or a layer kind (`hex-noise`, `freeform`, `outline`, `image`) or a
/// furniture kind (`cartouche`, `compass`) under a map. `paper` and `hexgrid` are refused on
/// their own (a map brings them). The built-in's `preset` argument isn't taken, because no layer
/// kind has presets.
fn check(d: &Doc, a: &AddArgs) -> Result<(), String> {
    if let Some(kind) = furniture_kind(&a.type_name) {
        map_of(d, &a.parent).ok_or_else(|| format!("a {} goes under a map", kind.id))?;
        // furniture always lands at the top of `furniture`; `above` names a layer
        if a.above.is_some() {
            return Err(format!("a {} goes on top of the furniture", kind.id));
        }
        return Ok(());
    }
    if let Some(kind) = layer_kind(&a.type_name) {
        let map = map_of(d, &a.parent).ok_or_else(|| format!("a {} goes under a map", kind.id))?;
        if let Some(above) = &a.above {
            let n = d
                .tree()
                .at(above.as_str())
                .filter(|n| map.order(LAYERS).iter().any(|l| l.id() == n.id()))
                .ok_or_else(|| format!("{above} isn't a layer of {}", a.parent))?;
            if n.type_name() == "hexgrid" {
                return Err("nothing goes above the hexgrid".into());
            }
        }
        return Ok(());
    }
    match a.type_name.as_str() {
        "map" => {}
        "paper" | "hexgrid" => {
            return Err(format!(
                "a {} comes with its map and can't be added on its own",
                a.type_name
            ));
        }
        other => return Err(format!("`{other}` can't be added")),
    }
    match d.tree().at(a.parent.as_str()) {
        Some(p) if p.is_category() && p.name() == MAPS => Ok(()),
        Some(_) => Err("a map goes under /maps".into()),
        None => Err(format!("no node at {}", a.parent)),
    }
}

/// "Map 01" style: one past the highest number any sibling name ends in (the 2025
/// `generateName` rule, `src/stores/naming.ts`).
fn next_name(tx: &Edit<'_>, parent: NodeId, base: &str) -> String {
    let max = tx
        .at(parent)
        .map(|p| {
            p.children()
                .filter_map(|c| match c.value("name") {
                    Some(Value::Text(t)) => Some(t),
                    _ => None,
                })
                .filter(|t| t.to_lowercase().starts_with(&base.to_lowercase()))
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
    format!("{base} {:02}", max + 1)
}

/// A map, its paper and its hexgrid, in the order `layers`, appended to `maps`: one edit.
fn add_map(tx: &mut Edit<'_>, parent: &str, name: Option<String>) -> rhizome_core::Result<NodeId> {
    let parent_id = tx
        .at(parent)
        .map(|n| n.id())
        .ok_or_else(|| rhizome_core::Error::NotFound(parent.into()))?;
    let name = name
        .filter(|n| !n.trim().is_empty())
        .unwrap_or_else(|| next_name(tx, parent_id, "Map"));
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

/// A layer of `kind` in a map's `layers`: just below the hexgrid, or just above `above`.
fn add_layer(
    tx: &mut Edit<'_>,
    map: &str,
    kind: &LayerKind,
    name: Option<String>,
    above: Option<String>,
) -> rhizome_core::Result<NodeId> {
    let map_id = tx
        .at(map)
        .map(|n| n.id())
        .ok_or_else(|| rhizome_core::Error::NotFound(map.into()))?;
    let name = name
        .filter(|n| !n.trim().is_empty())
        .unwrap_or_else(|| next_name(tx, map_id, kind.base));
    let above = above
        .map(|a| {
            tx.at(a.as_str())
                .map(|n| n.id())
                .ok_or(rhizome_core::Error::NotFound(a))
        })
        .transpose()?;
    let layer = tx.add_unique(map_id, kind.id, kind.id)?;
    tx.set_value(layer, "name", Value::Text(name))?;
    let mut order = layer_ids(tx.at(map_id).expect("the map exists"));
    order.retain(|id| *id != layer);
    let at = match above {
        Some(a) => order
            .iter()
            .position(|id| *id == a)
            .map_or(order.len() - 1, |i| i + 1),
        // before the hexgrid, which is last
        None => order.len().saturating_sub(1),
    };
    order.insert(at, layer);
    tx.set_order(map_id, LAYERS, order)?;
    Ok(layer)
}

/// A furniture node of `kind`, appended to the map's `furniture`: on top of everything.
fn add_furniture(
    tx: &mut Edit<'_>,
    map: &str,
    kind: &LayerKind,
    name: Option<String>,
) -> rhizome_core::Result<NodeId> {
    let map_id = tx
        .at(map)
        .map(|n| n.id())
        .ok_or_else(|| rhizome_core::Error::NotFound(map.into()))?;
    let name = name
        .filter(|n| !n.trim().is_empty())
        .unwrap_or_else(|| next_name(tx, map_id, kind.base));
    let node = tx.add_unique(map_id, kind.id, kind.id)?;
    tx.set_value(node, "name", Value::Text(name))?;
    // creates the order on a map that had no furniture yet
    tx.append_to_order(map_id, FURNITURE, node)?;
    Ok(node)
}

fn layer_ids(map: rhizome_core::Node<'_>) -> Vec<NodeId> {
    map.order(LAYERS).iter().map(|n| n.id()).collect()
}

#[derive(Clone, Copy)]
enum Move {
    Forward,
    Backward,
    Front,
    Back,
}

#[derive(Deserialize)]
struct AtArgs {
    at: String,
}

/// Where a move would put the layer at `at`, or why it can't move. The anchors hold the ends
/// of `layers` (paper first, hexgrid last), so a move stays in `1..len-1`.
fn moved(d: &Doc, at: &str, how: Move) -> Result<(NodeId, Vec<NodeId>), String> {
    let node = d.tree().at(at).ok_or_else(|| format!("no node at {at}"))?;
    if layer_kind(node.type_name()).is_none() {
        return Err("only a layer between the anchors can be moved".into());
    }
    let map = node.parent().ok_or("a layer has a map")?;
    let mut ids = layer_ids(map);
    let from = ids
        .iter()
        .position(|id| *id == node.id())
        .ok_or("the layer isn't in its map's order")?;
    // the top slot is just below the hexgrid, the bottom just above the paper
    let (lo, hi) = (1, ids.len().saturating_sub(2));
    let to = match how {
        Move::Forward => (from + 1).min(hi),
        Move::Backward => from.saturating_sub(1).max(lo),
        Move::Front => hi,
        Move::Back => lo,
    };
    if to == from {
        return Err("it can't move any further".into());
    }
    let id = ids.remove(from);
    ids.insert(to, id);
    Ok((node.id(), ids))
}

fn declare_move(c: &mut Commands<MapAndTerritory>, id: &str, label: &'static str, how: Move) {
    c.add(
        id,
        move |_| label.into(),
        move |d: &Doc, p: &Json| payload::<AtArgs>(p).is_ok_and(|a| moved(d, &a.at, how).is_ok()),
        move |d: &mut Doc, p: &Json| {
            let a: AtArgs = payload(p)?;
            let (_, ids) = moved(d, &a.at, how).map_err(refuse)?;
            let map = d
                .tree()
                .at(a.at.as_str())
                .and_then(|n| n.parent())
                .map(|m| m.id())
                .expect("moved() found the map");
            Ok(Outcome::from(
                d.edit(label, |tx| tx.set_order(map, LAYERS, ids))?.1,
            ))
        },
    );
}

pub fn declare(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "node.add",
        |_| "New".into(),
        |d: &Doc, p: &Json| payload::<AddArgs>(p).is_ok_and(|a| check(d, &a).is_ok()),
        |d: &mut Doc, p: &Json| {
            let a: AddArgs = payload(p)?;
            check(d, &a).map_err(refuse)?;
            if let Some(kind) = furniture_kind(&a.type_name) {
                // "Add Title": the menu item's words, not "Add Title Layer"
                let label = format!("Add {}", kind.base);
                return Ok(Outcome::from(
                    d.edit(&label, |tx| add_furniture(tx, &a.parent, kind, a.name))?
                        .1,
                ));
            }
            Ok(Outcome::from(match layer_kind(&a.type_name) {
                Some(kind) => {
                    let label = format!("Add {} Layer", kind.base);
                    d.edit(&label, |tx| add_layer(tx, &a.parent, kind, a.name, a.above))?
                        .1
                }
                None => d.edit("New Map", |tx| add_map(tx, &a.parent, a.name))?.1,
            }))
        },
    );
    // Forward is toward the top of the stack (a higher index); the ids are the menu
    // standard's, which names the same moves Bring Forward and Send Backward.
    declare_move(c, "edit.move-earlier", "Bring Forward", Move::Forward);
    declare_move(c, "edit.move-later", "Send Backward", Move::Backward);
    declare_move(c, "edit.move-to-front", "Bring to Front", Move::Front);
    declare_move(c, "edit.move-to-back", "Send to Back", Move::Back);

    declare_duplicate(c);
    super::freeform::declare(c);
    super::texture::declare(c);
    super::outline::declare(c);
    declare_rename(c);
    declare_set_visible(c);
}

/// Whether POM's Duplicate would offer the node: duplicable, and under its kind's
/// `max_per_parent`. The same test as the built-in this replaces.
fn can_duplicate(d: &Doc, at: &str) -> bool {
    let Some(n) = d.tree().at(at) else {
        return false;
    };
    if n.is_root() || n.is_category() || n.is_opaque() {
        return false;
    }
    let policy = d.policy(n.type_name());
    let siblings = n.parent().map_or(0, |p| {
        p.children()
            .filter(|c| c.type_name() == n.type_name())
            .count()
    });
    policy.duplicable && policy.max_per_parent.is_none_or(|max| siblings < max)
}

/// `edit.duplicate { at }`, replacing POM's. rhizome's copy puts the copy into every order its
/// parent has, at the end of those that don't hold the original; under a map that would put a
/// layer's copy in `furniture` and a title's under the grid, which the map's check refuses.
/// So under a map the copy is taken out of the other family's order and the anchors are put
/// back at their ends. Anywhere else it is POM's duplicate.
fn declare_duplicate(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "edit.duplicate",
        |_| "Duplicate".into(),
        |d: &Doc, p: &Json| payload::<AtArgs>(p).is_ok_and(|a| can_duplicate(d, &a.at)),
        |d: &mut Doc, p: &Json| {
            let a: AtArgs = payload(p)?;
            let map = d
                .tree()
                .at(a.at.as_str())
                .and_then(|n| n.parent())
                .filter(|p| p.type_name() == "map")
                .map(|m| m.id());
            let Some(map) = map else {
                return Ok(d.duplicate(&a.at)?.into());
            };
            Ok(Outcome::from(
                d.edit("Duplicate", |tx| {
                    let copy = tx.copy(a.at.as_str(), map)?;
                    tidy_orders(tx, map, copy)
                })?
                .1,
            ))
        },
    );
}

/// After a copy under a map: the copy only in its own family's order, paper first and hexgrid
/// last in `layers`.
fn tidy_orders(tx: &mut Edit<'_>, map: NodeId, copy: NodeId) -> rhizome_core::Result<()> {
    let plan: Vec<(&str, Vec<NodeId>)> = {
        let m = tx.at(map).expect("the map exists");
        let is_furniture = m
            .children()
            .find(|c| c.id() == copy)
            .and_then(|c| furniture_kind(c.type_name()))
            .is_some();
        let layers = m.order(LAYERS);
        let (paper, rest): (Vec<&rhizome_core::Node<'_>>, Vec<_>) = layers
            .iter()
            .filter(|n| !(is_furniture && n.id() == copy))
            .partition(|n| n.type_name() == "paper");
        let (grid, middle): (Vec<_>, Vec<_>) = rest
            .into_iter()
            .partition(|n: &&rhizome_core::Node<'_>| n.type_name() == "hexgrid");
        let layers: Vec<NodeId> = paper
            .into_iter()
            .chain(middle)
            .chain(grid)
            .map(|n| n.id())
            .collect();
        let furniture: Vec<NodeId> = m
            .order(FURNITURE)
            .iter()
            .map(|n| n.id())
            .filter(|id| is_furniture || *id != copy)
            .collect();
        vec![(LAYERS, layers), (FURNITURE, furniture)]
    };
    for (order, ids) in plan {
        tx.set_order(map, order, ids)?;
    }
    Ok(())
}

#[derive(Deserialize)]
struct RenameArgs {
    at: String,
    name: String,
}

#[derive(Deserialize)]
struct VisibleArgs {
    at: String,
    visible: bool,
}

/// Whether the node at `at` has a value `key` in its schema.
fn has_value(d: &Doc, at: &str, key: &str) -> bool {
    d.tree()
        .at(at)
        .and_then(|n| n.node_type())
        .is_some_and(|t| t.spec(key).is_some())
}

/// "Layer" for a layer kind, "Map" for a map, the base for furniture ("Title"): the word the
/// undo label uses.
fn noun(d: &Doc, at: &str) -> &'static str {
    match d
        .tree()
        .at(at)
        .map(|n| n.type_name().to_string())
        .as_deref()
    {
        Some("map") => "Map",
        Some(t) => furniture_kind(t).map_or("Layer", |k| k.base),
        None => "Layer",
    }
}

/// `node.rename { at, name }`: a plain `name` set, labelled "Rename".
fn declare_rename(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "node.rename",
        |_| "Rename".into(),
        |d: &Doc, p: &Json| {
            payload::<RenameArgs>(p)
                .is_ok_and(|a| !a.name.trim().is_empty() && has_value(d, &a.at, "name"))
        },
        |d: &mut Doc, p: &Json| {
            let a: RenameArgs = payload(p)?;
            if a.name.trim().is_empty() {
                return Err(refuse("a name can't be empty"));
            }
            if !has_value(d, &a.at, "name") {
                return Err(refuse(format!("{} has no name", a.at)));
            }
            Ok(Outcome::from(
                d.edit("Rename", |tx| {
                    tx.set_value(a.at.as_str(), "name", Value::Text(a.name))
                })?
                .1,
            ))
        },
    );
}

/// `node.set-visible { at, visible }`: a plain `visible` set, labelled "Show Layer", "Hide
/// Map" and so on. Refused for kinds without the value (the paper is always drawn).
fn declare_set_visible(c: &mut Commands<MapAndTerritory>) {
    c.add(
        "node.set-visible",
        |_| "Show".into(),
        |d: &Doc, p: &Json| payload::<VisibleArgs>(p).is_ok_and(|a| has_value(d, &a.at, "visible")),
        |d: &mut Doc, p: &Json| {
            let a: VisibleArgs = payload(p)?;
            if !has_value(d, &a.at, "visible") {
                return Err(refuse(format!("{} has no visible", a.at)));
            }
            let label = format!(
                "{} {}",
                if a.visible { "Show" } else { "Hide" },
                noun(d, &a.at)
            );
            Ok(Outcome::from(
                d.edit(&label, |tx| {
                    tx.set_value(a.at.as_str(), "visible", Value::Bool(a.visible))
                })?
                .1,
            ))
        },
    );
}
