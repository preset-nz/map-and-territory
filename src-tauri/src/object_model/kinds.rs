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

/// A layer kind: its type id and the base of its auto names ("Hex Noise 01").
pub struct LayerKind {
    pub id: &'static str,
    pub base: &'static str,
}

pub const HEX_NOISE: LayerKind = LayerKind {
    id: "hex-noise",
    base: "Hex Noise",
};
pub const FREEFORM: LayerKind = LayerKind {
    id: "freeform",
    base: "Freeform",
};
pub const OUTLINE: LayerKind = LayerKind {
    id: "outline",
    base: "Outline",
};
/// Every layer kind between the anchors.
pub const LAYER_KINDS: [&LayerKind; 3] = [&HEX_NOISE, &FREEFORM, &OUTLINE];

fn rgb(r: u8, g: u8, b: u8) -> [f64; 4] {
    [
        f64::from(r) / 255.0,
        f64::from(g) / 255.0,
        f64::from(b) / 255.0,
        1.0,
    ]
}

/// The values every layer kind starts with. In `maps` with the anchors, so a map can hold them.
fn layer(id: &str, name: &str) -> NodeType {
    NodeType::new(id)
        .in_categories(&["maps"])
        .text("name", name)
        .bool("visible", true)
        .float("opacity", 0.0..=1.0, 1.0)
        .choice("blend", BLEND, "normal")
}

/// One outline path: corners as `{q, r, corner}` and whether it closes.
fn path() -> Shape {
    Shape::record([
        (
            "corners",
            Shape::list(Shape::record([
                ("q", Shape::Int),
                ("r", Shape::Int),
                // a hex corner index, 0 to 5
                ("corner", Shape::Int),
            ])),
        ),
        ("closed", Shape::Bool),
    ])
}

/// A chunk's `voxels`: 256 slots, each empty (null) or `{terrainId, color?}`. A new chunk is all
/// empty.
fn chunk_voxels() -> ValueSpec {
    let voxel = Shape::record([
        ("terrainId", Shape::Text),
        ("color", Shape::optional(Shape::Colour)),
    ]);
    let mut spec = ValueSpec::shaped("voxels", Shape::list(Shape::optional(voxel)));
    spec.default = rhizome_core::Value::Shaped(serde_json::Value::Array(vec![
        serde_json::Value::Null;
        super::freeform::CHUNK_CELLS
    ]));
    spec
}

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

    // The layer family between the anchors: each kind its own schema, all starting with the
    // same common values. Its chunks are `chunk` nodes below.
    k.kind(
        layer(HEX_NOISE.id, HEX_NOISE.base)
            .text("seed", "seed")
            .float("frequency", 0.01..=5.0, 0.15)
            .float("offsetX", -1000.0..=1000.0, 0.0)
            .float("offsetY", -1000.0..=1000.0, 0.0)
            .float("intensity", 0.0..=1.0, 1.0)
            .float("gamma", 0.1..=5.0, 1.0)
            .float("min", 0.0..=1.0, 0.0)
            .float("max", 0.0..=1.0, 1.0)
            .choice("mode", &["shape", "paint"], "shape")
            .choice("terrain", BASE_TYPES, "plains")
            .text("terrainId", ""),
    );
    // The texture is a file reference kept as written (family requirement "No embedded
    // assets"); the rest are the 2025 texture-fill settings.
    k.kind(
        layer(FREEFORM.id, FREEFORM.base)
            .choice("renderMode", &["paint", "texture-fill"], "paint")
            .reference("texture")
            .bool("textureFillInvert", false)
            .float("textureOffsetX", -1000.0..=1000.0, 0.0)
            .float("textureOffsetY", -1000.0..=1000.0, 0.0)
            .float("textureScale", 0.05..=8.0, 1.0)
            .float("textureRotation", -180.0..=180.0, 0.0)
            .choice("textureTiling", &["stretch", "fit", "repeat"], "stretch")
            .choice(
                "textureOverlayMode",
                &["normal", "overlay", "screen", "multiply"],
                "normal",
            ),
    );
    k.kind(
        layer(OUTLINE.id, OUTLINE.base)
            .shaped("paths", Shape::list(path()))
            // the 2025 default stroke, #f8f5e5
            .colour("strokeColor", rgb(0xf8, 0xf5, 0xe5))
            .value(ValueSpec::float("strokeWidth", 1.0..=12.0, 4.0))
            .choice("strokePattern", &["solid", "dashed", "dotted"], "solid")
            .float("roughness", 0.0..=1.0, 0.0),
    );

    // One 16x16 block of a freeform layer's voxel grid, present only where painted. Named
    // `<cq>_<cr>` (floor of q and r over 16); `voxels` is 256 optional records, row-major.
    k.kind(
        NodeType::new("chunk")
            .in_categories(&["maps"])
            .value(chunk_voxels())
            .check(super::freeform::check_chunk),
    )
    .not_duplicable();

    // The built-in catalogue is the nine 2025 settings; `palette.use` points followers at themes.
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
    )
    .presets(super::palette::PaletteAggregate)
    .catalogue(super::palette::catalogue());
}

/// The common layer blend modes (design: Values, "every layer kind except `paper`").
pub const BLEND: &[&str] = &[
    "normal", "multiply", "screen", "overlay", "darken", "lighten",
];
