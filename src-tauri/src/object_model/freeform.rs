//! The freeform layer's voxel grid: a sparse grid of hexes in 16x16 chunks (design: open
//! question 1). A hex `(q, r)` lives in chunk `(floor(q/16), floor(r/16))`, a `chunk` node named
//! `<cq>_<cr>`, at slot `(r - cr*16) * 16 + (q - cq*16)` of its `voxels`. Chunks appear with
//! the first paint in their block and go with the last erase; a blank region costs nothing.
//!
//! Commands: `freeform.paint`, `freeform.erase` and `freeform.fill`. TypeScript computes the
//! hexes (fill's region included), so hex geometry stays out of Rust.

use std::collections::BTreeMap;

use rhizome_core::{Edit, Node, NodeId, Value};
use rhizome_pom::{payload, Commands, Document, Error, Outcome};
use serde::Deserialize;
use serde_json::{json, Value as Json};

use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

/// The stored order on a freeform layer that lists its chunks, in the order they were added.
pub const CHUNKS: &str = "chunks";

/// Hexes along one side of a chunk.
pub const CHUNK: i64 = 16;
/// Slots in a chunk's `voxels`.
pub const CHUNK_CELLS: usize = (CHUNK * CHUNK) as usize;

/// The chunk a hex is in, its name, and its slot in `voxels`.
pub fn locate(q: i64, r: i64) -> ((i64, i64), usize) {
    let (cq, cr) = (q.div_euclid(CHUNK), r.div_euclid(CHUNK));
    let slot = (r.rem_euclid(CHUNK) * CHUNK + q.rem_euclid(CHUNK)) as usize;
    ((cq, cr), slot)
}

pub fn chunk_name(cq: i64, cr: i64) -> String {
    format!("{cq}_{cr}")
}

/// `<cq>_<cr>` back to the block, if it is one.
fn parse_name(name: &str) -> Option<(i64, i64)> {
    let (a, b) = name.split_once('_')?;
    Some((a.parse().ok()?, b.parse().ok()?))
}

/// The `chunk` kind's check: under a freeform layer, named for a block, 256 slots.
pub fn check_chunk(n: &Node<'_>) -> Result<(), String> {
    if n.parent().is_none_or(|p| p.type_name() != "freeform") {
        return Err("a chunk belongs to a freeform layer".into());
    }
    let name = n.name();
    match parse_name(name) {
        Some((q, r)) if chunk_name(q, r) == name => {}
        _ => return Err(format!("`{name}` isn't a chunk name like 0_0 or -1_3")),
    }
    // Borrowed, not `value()`: that clones the list, and this check runs for every chunk on
    // every edit.
    match n.value_ref("voxels") {
        Some(Value::Shaped(Json::Array(a))) if a.len() == CHUNK_CELLS => Ok(()),
        _ => Err(format!("a chunk holds exactly {CHUNK_CELLS} voxels")),
    }
}

#[derive(Deserialize)]
struct PaintCell {
    q: i64,
    r: i64,
    #[serde(rename = "terrainId")]
    terrain_id: String,
    #[serde(default)]
    color: Option<[f64; 4]>,
}

#[derive(Deserialize)]
struct PaintArgs {
    at: String,
    cells: Vec<PaintCell>,
}

#[derive(Deserialize)]
struct EraseArgs {
    at: String,
    cells: Vec<[i64; 2]>,
}

fn is_freeform(d: &Doc, at: &str) -> bool {
    d.tree().at(at).is_some_and(|n| n.type_name() == "freeform")
}

fn voxels_of(chunk: &Node<'_>) -> Vec<Json> {
    match chunk.value("voxels") {
        Some(Value::Shaped(Json::Array(a))) => a,
        _ => vec![Json::Null; CHUNK_CELLS],
    }
}

/// Sets `cells` (slot, voxel) per chunk. Adds the chunk on first paint.
fn paint(tx: &mut Edit<'_>, layer: NodeId, cells: &[PaintCell]) -> rhizome_core::Result<()> {
    let mut by_chunk: BTreeMap<(i64, i64), Vec<(usize, Json)>> = BTreeMap::new();
    for c in cells {
        let (chunk, slot) = locate(c.q, c.r);
        let voxel = match c.color {
            Some(col) => json!({ "terrainId": c.terrain_id, "color": col }),
            None => json!({ "terrainId": c.terrain_id }),
        };
        by_chunk.entry(chunk).or_default().push((slot, voxel));
    }
    for ((cq, cr), sets) in by_chunk {
        let name = chunk_name(cq, cr);
        let existing = tx.at(layer).and_then(|l| l.child(&name)).map(|n| {
            let v = voxels_of(&n);
            (n.id(), v)
        });
        let (id, mut voxels, is_new) = match existing {
            Some((id, v)) => (id, v, false),
            None => {
                let id = tx.add(layer, "chunk", &name)?;
                // the webview mirror has no parent-to-children lookup, so the layer lists its
                // chunks in a stored order
                tx.append_to_order(layer, CHUNKS, id)?;
                (id, vec![Json::Null; CHUNK_CELLS], true)
            }
        };
        let before = voxels.clone();
        for (slot, voxel) in sets {
            voxels[slot] = voxel;
        }
        if is_new || voxels != before {
            tx.set_value(id, "voxels", Value::Shaped(Json::Array(voxels)))?;
        }
    }
    Ok(())
}

/// Clears `cells`; a chunk left with no voxel is removed. Unpainted hexes are skipped.
fn erase(tx: &mut Edit<'_>, layer: NodeId, cells: &[[i64; 2]]) -> rhizome_core::Result<()> {
    let mut by_chunk: BTreeMap<(i64, i64), Vec<usize>> = BTreeMap::new();
    for [q, r] in cells {
        let (chunk, slot) = locate(*q, *r);
        by_chunk.entry(chunk).or_default().push(slot);
    }
    for ((cq, cr), slots) in by_chunk {
        let name = chunk_name(cq, cr);
        let Some((id, mut voxels)) = tx.at(layer).and_then(|l| l.child(&name)).map(|n| {
            let v = voxels_of(&n);
            (n.id(), v)
        }) else {
            continue;
        };
        let before = voxels.clone();
        for slot in slots {
            voxels[slot] = Json::Null;
        }
        if voxels.iter().all(Json::is_null) {
            tx.remove(id)?;
        } else if voxels != before {
            tx.set_value(id, "voxels", Value::Shaped(Json::Array(voxels)))?;
        }
    }
    Ok(())
}

fn declare_paint(c: &mut Commands<MapAndTerritory>, id: &'static str, label: &'static str) {
    c.add(
        id,
        move |_| label.into(),
        |d: &Doc, p: &Json| payload::<PaintArgs>(p).is_ok_and(|a| is_freeform(d, &a.at)),
        move |d: &mut Doc, p: &Json| {
            let a: PaintArgs = payload(p)?;
            let layer = freeform_id(d, &a.at)?;
            Ok(Outcome::from(
                d.edit(label, |tx| paint(tx, layer, &a.cells))?.1,
            ))
        },
    );
}

fn freeform_id(d: &Doc, at: &str) -> Result<NodeId, Error> {
    match d.tree().at(at) {
        Some(n) if n.type_name() == "freeform" => Ok(n.id()),
        _ => Err(Error::Payload(format!("{at} isn't a freeform layer"))),
    }
}

pub fn declare(c: &mut Commands<MapAndTerritory>) {
    declare_paint(c, "freeform.paint", "Paint");
    declare_paint(c, "freeform.fill", "Fill");
    c.add(
        "freeform.erase",
        |_| "Erase".into(),
        |d: &Doc, p: &Json| payload::<EraseArgs>(p).is_ok_and(|a| is_freeform(d, &a.at)),
        |d: &mut Doc, p: &Json| {
            let a: EraseArgs = payload(p)?;
            let layer = freeform_id(d, &a.at)?;
            Ok(Outcome::from(
                d.edit("Erase", |tx| erase(tx, layer, &a.cells))?.1,
            ))
        },
    );
}
