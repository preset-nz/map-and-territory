//! What the window needs that Rust works out: the object model's projection, mirrored to the
//! webview (rhizome epic 07). A rule written here is not written again in TypeScript. Today
//! that is a location's number in its map's key.
//!
//! Rebuilt whole after every change: a campaign is small, and a patch could drift from the
//! tree it came from. Ids are the strings the mirror's rows carry.

use std::collections::BTreeMap;

use rhizome_core::Tree;
use serde::Serialize;

use super::locations;

/// The campaign's derived values, by node id.
#[derive(Debug, Default, Clone, PartialEq, Serialize)]
pub struct Derived {
    /// Each location's number in its map's key. A location in a layer that isn't numbered
    /// has none.
    pub numbers: BTreeMap<String, u32>,
}

impl Derived {
    pub fn of(tree: &Tree) -> Self {
        let mut out = Self::default();
        for map in tree.nodes().into_iter().filter(|n| n.type_name() == "map") {
            for placed in locations::places(&map) {
                if let Some(n) = placed.number {
                    out.numbers.insert(placed.place.id().to_string(), n);
                }
            }
        }
        out
    }
}
