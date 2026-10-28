//! Map & Territory's object model on POM: the campaign tree, its kinds and policy, and
//! the commands that edit it. Design: `guidance/projects/map-and-territory/design/object-model.md`.
//!
//! Headless on purpose: this crate never depends on Tauri, so a CLI or Python module can
//! link it. The app's document host (`src-tauri/src/document.rs`) carries it to the
//! webview. `Context = ()` and `Projection = ()`: M&T has no sidecar, and nothing in Rust
//! draws.

mod commands;
mod compass;
mod freeform;
mod kinds;
pub mod locations;
mod outline;
mod palette;
mod settings_2025;
pub mod texture;
mod voxels;

#[cfg(test)]
mod compass_tests;
#[cfg(test)]
mod freeform_tests;
#[cfg(test)]
mod furniture_tests;
#[cfg(test)]
mod layer_tests;
#[cfg(test)]
mod locations_tests;
#[cfg(test)]
mod outline_tests;
#[cfg(test)]
mod palette_tests;
#[cfg(test)]
mod tests;
#[cfg(test)]
mod texture_tests;

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
        compass::declare(c);
        locations::declare(c);
        palette::declare(c);
    }
}
