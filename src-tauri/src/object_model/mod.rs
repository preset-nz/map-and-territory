//! Map & Territory's object model on POM: the campaign tree, its kinds and policy, and
//! the commands that edit it. Design: `guidance/projects/map-and-territory/design/object-model.md`.
//!
//! Headless on purpose. Nothing here imports Tauri; the document host that carries this
//! model to the webview is a later story. `Context = ()` and `Projection = ()`: M&T has no
//! sidecar, and nothing in Rust draws.

mod commands;
mod freeform;
mod kinds;
mod palette;
mod settings_2025;

#[cfg(test)]
mod freeform_tests;
#[cfg(test)]
mod layer_tests;
#[cfg(test)]
mod palette_tests;
#[cfg(test)]
mod tests;

use rhizome_core::{Edit, Value};
use rhizome_pom::{Commands, Kinds, ObjectModel};

/// The extension of a campaign file.
pub const EXTENSION: &str = "campaign";

pub struct MapAndTerritory;

impl ObjectModel for MapAndTerritory {
    const NAME: &'static str = "Map & Territory";
    const EXTENSION: &'static str = EXTENSION;
    type Projection = ();
    type Context = ();

    fn kinds(k: &mut Kinds, _: &()) {
        kinds::declare(k);
    }

    /// Every new document holds the campaign node, which carries the campaign's own values
    /// (rhizome refuses `add` under `/`, so they can't live on a category).
    fn seed(tx: &mut Edit<'_>, _: &()) -> rhizome_core::Result<()> {
        let campaign = tx.add("/campaign", "campaign", "campaign")?;
        tx.set_value(campaign, "name", Value::Text("Untitled Campaign".into()))?;
        palette::seed(tx, campaign)
    }

    fn commands(c: &mut Commands<Self>) {
        commands::declare(c);
        palette::declare(c);
    }
}
