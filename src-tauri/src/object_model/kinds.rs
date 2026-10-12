//! The kinds, their policy and their values. Layer values use the 2025 adapter state
//! field names, so a row's values are the adapter's `state` with colours converted.

use rhizome_core::{NodeType, Origin, Shape, ValueSpec};
use rhizome_pom::Kinds;

/// Where the pinned anchors sit: the map's z-order, index 0 at the bottom.
pub const LAYERS: &str = "layers";
/// The scene panel's map order, on the `/maps` category.
pub const MAPS: &str = "maps";

pub const ASPECTS: &[&str] = &["square", "4:3", "16:10"];
pub const ORIENTATIONS: &[&str] = &["pointy", "flat"];
/// The 2025 `BaseTerrainType`.
pub const BASE_TYPES: &[&str] = &["water", "plains", "forest", "hills", "mountains"];
/// The 2025 `TerrainTrait`.
pub const TRAITS: &[&str] = &[
    "vast",
    "local",
    "sprawling",
    "corrupted",
    "toxic",
    "artificial",
    "ruined",
    "frozen",
    "burning",
    "radioactive",
    "dense",
    "sparse",
    "clustered",
    "magical",
    "haunted",
    "unstable",
];

const WHITE: [f64; 4] = [1.0, 1.0, 1.0, 1.0];
const BLACK: [f64; 4] = [0.0, 0.0, 0.0, 1.0];

/// The 2025 `TerrainType`, as a record.
fn terrain() -> Shape {
    Shape::record([
        ("id", Shape::Text),
        ("baseType", Shape::choice(BASE_TYPES)),
        ("traits", Shape::list(Shape::choice(TRAITS))),
        ("name", Shape::Text),
        ("colour", Shape::Colour),
        ("description", Shape::optional(Shape::Text)),
    ])
}

pub fn declare(k: &mut Kinds) {
    k.category("campaign", Origin::Loaded)
        .category("maps", Origin::Loaded)
        .category("themes", Origin::Loaded);

    k.kind(
        NodeType::new("campaign")
            .in_categories(&["campaign"])
            .text("name", "")
            .text("description", "")
            .reference("palette"),
    )
    .max_per_parent(1)
    .not_deletable()
    .not_duplicable();

    // paper and hexgrid sit under a map, so they share its category
    k.kind(
        NodeType::new("map")
            .in_categories(&["maps"])
            .text("name", "")
            .text("description", "")
            .bool("visible", true)
            .reference("palette")
            .check(|map| {
                let count = |t: &str| map.children().filter(|c| c.type_name() == t).count();
                match (count("paper"), count("hexgrid")) {
                    (1, 1) => Ok(()),
                    _ => Err("a map has exactly one paper and one hexgrid".into()),
                }
            }),
    );

    // Always drawn, so no `visible`, `opacity` or `blend`.
    k.kind(
        NodeType::new("paper")
            .in_categories(&["maps"])
            .choice("aspect", ASPECTS, "16:10")
            .colour("color", WHITE),
    )
    .max_per_parent(1)
    .not_deletable()
    .not_duplicable()
    .pinned_first(LAYERS);

    // Ranges are the 2025 sliders'; `size` and `lineWidth` stop their travel at the max
    // but a typed value may go past it.
    k.kind(
        NodeType::new("hexgrid")
            .in_categories(&["maps"])
            .text("name", "Hex Grid")
            .bool("visible", true)
            .float("opacity", 0.0..=1.0, 1.0)
            .choice("blend", BLEND, "normal")
            .value(ValueSpec::float("size", 8.0..=120.0, 24.0).soft_max())
            .choice("orientation", ORIENTATIONS, "pointy")
            .colour("color", BLACK)
            .bool("usePaletteColor", true)
            .float("alpha", 0.0..=1.0, 1.0)
            .value(ValueSpec::float("lineWidth", 1.0..=8.0, 1.0).soft_max()),
    )
    .max_per_parent(1)
    .not_deletable()
    .not_duplicable()
    .pinned_last(LAYERS);

    // The preset catalogue and `palette.use` are story 2.
    k.kind(
        NodeType::new("palette")
            .in_categories(&["themes"])
            .text("name", "")
            .text("description", "")
            .colour("gridLine", BLACK)
            .colour("primary", BLACK)
            .colour("secondary", BLACK)
            .colour("accent", BLACK)
            .colour("background", WHITE)
            .shaped("terrains", Shape::list(terrain())),
    );
}

/// The common layer blend modes (design: Values, "every layer kind except `paper`").
pub const BLEND: &[&str] = &[
    "normal", "multiply", "screen", "overlay", "darken", "lighten",
];
