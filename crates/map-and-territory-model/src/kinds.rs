//! The kinds, their policy and their values. Layer values use the 2025 adapter state
//! field names, so a row's values are the adapter's `state` with colours converted.

use rhizome_core::{NodeType, Origin, Shape, ValueSpec};
use rhizome_pom::Kinds;

/// Where the pinned anchors sit: the map's z-order, index 0 at the bottom.
pub const LAYERS: &str = "layers";
/// The map's furniture (title, compass), drawn after `layers` so no grid line crosses it
/// (map furniture §1). rhizome keeps no empty order, so a map without furniture has none.
pub const FURNITURE: &str = "furniture";
/// The scene panel's map order, on the `/maps` category.
pub const MAPS: &str = "maps";

pub const ASPECTS: &[&str] = &["square", "4:3", "16:10"];
pub const ORIENTATIONS: &[&str] = &["pointy", "flat"];
pub const PAGE_SIZES: &[&str] = &["a5", "a4"];
pub const PAGE_ORIENTATIONS: &[&str] = &["portrait", "landscape"];
pub const LINE_STYLES: &[&str] = &["solid", "dashed", "dotted", "dash-dot"];
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
pub const IMAGE: LayerKind = LayerKind {
    id: "image",
    base: "Image",
};
pub const LAYER_KINDS: [&LayerKind; 4] = [&HEX_NOISE, &FREEFORM, &OUTLINE, &IMAGE];

pub const CARTOUCHE: LayerKind = LayerKind {
    id: "cartouche",
    base: "Title",
};
pub const COMPASS: LayerKind = LayerKind {
    id: "compass",
    base: "Compass",
};
/// Every furniture kind: each lives in a map's `furniture`, never in `layers`.
pub const FURNITURE_KINDS: [&LayerKind; 2] = [&CARTOUCHE, &COMPASS];

/// The compass styles in the MVP (epic 24): `rose` comes in story 2, the rest of disco-02 later.
pub const COMPASS_STYLES: &[&str] = &["mark", "arrow", "cross"];
/// The compass label sets; `traveller` is left for later (epic 24, The cut).
pub const COMPASS_LABELS: &[&str] = &["cardinal", "north-only", "none"];

/// The label set a compass style starts with (disco-02, Styles): a style that points one way
/// shows only north.
pub fn compass_default_labels(style: &str) -> &'static str {
    match style {
        "cross" | "rose" => "cardinal",
        _ => "north-only",
    }
}

pub const FRAMES: &[&str] = &["none", "rule", "double", "plate"];
pub const ALIGNS: &[&str] = &["left", "centre", "right"];
pub const ANCHORS: &[&str] = &[
    "top-left",
    "top-centre",
    "top-right",
    "bottom-left",
    "bottom-centre",
    "bottom-right",
];
/// The faces (map furniture §5): the map's sheet style picks one of these.
pub const FACES: &[&str] = &["condensed", "serif", "blackletter", "marker"];
/// A furniture node's face: `map` follows the map's (map furniture §3).
pub const FURNITURE_FACES: &[&str] = &["map", "condensed", "serif", "blackletter", "marker"];
/// The hands (drawing by hand): the map's sheet style picks one of these.
pub const HANDS: &[&str] = &["clean", "drawn", "scratched"];
/// A furniture node's hand: `map` follows the map's.
pub const FURNITURE_HANDS: &[&str] = &["map", "clean", "drawn", "scratched"];
const FACE_LABELS: &[(&str, &str)] = &[
    ("condensed", "Condensed"),
    ("serif", "Serif"),
    ("blackletter", "Blackletter"),
    ("marker", "Marker"),
];
const HAND_LABELS: &[(&str, &str)] = &[
    ("clean", "Clean"),
    ("drawn", "Drawn"),
    ("scratched", "Scratched"),
];

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
    common(
        id,
        name,
        "layer",
        "What the layer is called in the layer list.",
    )
}

/// The values every furniture kind starts with: the layer's common values (map furniture §3).
fn furniture(id: &str, name: &str) -> NodeType {
    common(
        id,
        name,
        "furniture",
        "What it is called in the scene list.",
    )
}

/// The common values, in `maps`. The group tag is what the map's order check reads.
fn common(id: &str, name: &str, group: &str, name_help: &str) -> NodeType {
    NodeType::new(id)
        .in_categories(&["maps"])
        .group(group)
        .text("name", name)
        .described("Name", name_help)
        .bool("visible", true)
        .described("Visible", "Whether the layer is drawn.")
        .float("opacity", 0.0..=1.0, 1.0)
        .described(
            "Opacity",
            "How much of the layer shows through; 0 hides it, 1 draws it in full.",
        )
        .choice("blend", BLEND, "normal")
        .described("Blend", "How the layer mixes with the layers beneath it.")
        .choice_labels(BLEND_LABELS)
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

/// A chunk's `voxels`: a palette of whole voxels (`{terrainId, color?}`) and a run-length string
/// over the 256 slots (see `voxels.rs`; the chunk check enforces the canonical encoding). A new
/// chunk is all empty.
fn chunk_voxels() -> ValueSpec {
    let voxel = Shape::record([
        ("terrainId", Shape::Text),
        ("color", Shape::optional(Shape::Colour)),
    ]);
    let mut spec = ValueSpec::shaped(
        "voxels",
        Shape::record([("palette", Shape::list(voxel)), ("cells", Shape::Text)]),
    );
    spec.default = rhizome_core::Value::Shaped(super::voxels::empty());
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
            .label("Campaign")
            .summary("The whole document: its maps, its palettes and the notes that go with them.")
            .group("document")
            .category("document")
            .in_categories(&["campaign"])
            .text("name", "")
            .described("Name", "What you call the campaign.")
            .text("description", "")
            .described(
                "Description",
                "Notes about the campaign, such as its setting or premise.",
            )
            .choice("pageSize", PAGE_SIZES, "a5")
            .described(
                "Page size",
                "The paper every map in the campaign is exported onto. A4 is A5 enlarged, so the map looks the same.",
            )
            .choice_labels(&[("a5", "A5"), ("a4", "A4")])
            .choice("pageOrientation", PAGE_ORIENTATIONS, "portrait")
            .described(
                "Page orientation",
                "Whether the page is taller than it is wide, or wider than it is tall.",
            )
            .choice_labels(&[("portrait", "Portrait"), ("landscape", "Landscape")])
            .value(
                ValueSpec::float("pageMargin", 0.0..=40.0, 10.0)
                    .described(
                        "Page margin",
                        "The plain white border around the map on the exported page.",
                    )
                    .unit("mm"),
            )
            // A reference has no words of its own; `.described` would land on the value above.
            .reference("palette"),
    )
    .max_per_parent(1)
    .not_deletable()
    .not_duplicable();

    // paper and hexgrid sit under a map, so they share its category
    k.kind(
        NodeType::new("map")
            .label("Map")
            .summary("One hexmap in the campaign: a paper, a hex grid and the layers between them.")
            .group("document")
            .category("document")
            .in_categories(&["maps"])
            .text("name", "")
            .described("Name", "What you call the map.")
            .text("description", "")
            .described(
                "Description",
                "Notes about this map, such as the region it covers.",
            )
            .bool("visible", true)
            .described("Visible", "Whether the map is shown.")
            // The sheet style (map furniture §3): furniture left on `map` follows these.
            .choice("face", FACES, "condensed")
            .described("Face", "The lettering of every title left on Map: a condensed sans in capitals, an old atlas serif, blackletter, or a marker in capitals.")
            .choice_labels(FACE_LABELS)
            .choice("hand", HANDS, "clean")
            .described("Hand", "How every title left on Map is drawn: ruled, pen-drawn, or scratched in and gone over twice.")
            .choice_labels(HAND_LABELS)
            .reference("palette")
            .check(|map| {
                let count = |t: &str| map.children().filter(|c| c.type_name() == t).count();
                match (count("paper"), count("hexgrid")) {
                    (1, 1) => check_orders(map),
                    _ => Err("a map has exactly one paper and one hexgrid".into()),
                }
            }),
    );

    // Always drawn, so no `visible`, `opacity` or `blend`.
    k.kind(
        NodeType::new("paper")
            .label("Paper")
            .summary("The sheet the map is drawn on: a flat colour at the bottom of every map.")
            .group("layer")
            .category("background")
            .in_categories(&["maps"])
            .choice("aspect", ASPECTS, "16:10")
            .described("Aspect", "The shape of the sheet, as width to height.")
            .choice_labels(&[("square", "Square"), ("4:3", "4:3"), ("16:10", "16:10")])
            .colour("color", WHITE)
            .described("Colour", "The colour of the paper.")
            .choice("textureBlend", &["normal", "multiply"], "multiply")
            .described(
                "Mix with paper",
                "How the image mixes with the paper colour: image only, or multiplied over the colour so the paper shows through its light parts.",
            )
            .choice_labels(&[("normal", "Image only"), ("multiply", "Multiply")])
            .choice("textureFit", &["cover", "contain", "repeat"], "cover")
            .described("Texture fit", "Cover fills the sheet and crops the edges, fit keeps the whole image inside, repeat tiles it.")
            .choice_labels(&[("cover", "Cover"), ("contain", "Fit"), ("repeat", "Repeat")])
            .float("textureScale", 0.05..=8.0, 1.0)
            .described("Texture scale", "How large the image is drawn; 1 is its fitted size. Repeat tiles it at its own size times this.")
            // the reference goes last: a `.described` after it would land on the value before
            .reference("texture"),
    )
    .max_per_parent(1)
    .not_deletable()
    .not_duplicable()
    .pinned_first(LAYERS);

    // Ranges are the 2025 sliders'; `size`, `lineWidth`, `dashLength`, `gapLength`, `misregistration`, `cornerJitter`, `noiseScale` and `inkScale` stop their travel at the max
    // but a typed value may go past it.
    k.kind(
        NodeType::new("hexgrid")
            .label("Hex Grid")
            .summary(
                "The hex grid drawn over the map, and the grid every other layer is laid out on.",
            )
            .group("layer")
            .category("grid")
            .in_categories(&["maps"])
            .text("name", "Hex Grid")
            .described("Name", "What the layer is called in the layer list.")
            .bool("visible", true)
            .described("Visible", "Whether the grid lines are drawn.")
            .float("opacity", 0.0..=1.0, 1.0)
            .described(
                "Opacity",
                "How much of the grid shows through; 0 hides it, 1 draws it in full.",
            )
            .choice("blend", BLEND, "normal")
            .described("Blend", "How the grid mixes with the layers beneath it.")
            .choice_labels(BLEND_LABELS)
            .value(
                ValueSpec::float("size", 8.0..=120.0, 24.0)
                    .soft_max()
                    .described(
                        "Hex size",
                        "The radius of one hex, from its centre to a corner.",
                    )
                    .unit("px"),
            )
            .choice("orientation", ORIENTATIONS, "pointy")
            .described(
                "Orientation",
                "Which way the hexes sit: a corner up, or a flat edge up.",
            )
            .choice_labels(&[("pointy", "Pointy-top"), ("flat", "Flat-top")])
            .colour("color", BLACK)
            .described(
                "Line colour",
                "The colour of the grid lines when the palette's isn't used.",
            )
            .bool("usePaletteColor", true)
            .described(
                "Palette colour",
                "Draw the lines in the palette's grid line colour instead of the colour above.",
            )
            .float("alpha", 0.0..=1.0, 1.0)
            .described(
                "Line strength",
                "How solid the grid lines are, on top of the layer's opacity.",
            )
            .value(
                ValueSpec::float("lineWidth", 1.0..=8.0, 1.0)
                    .soft_max()
                    .described("Line width", "How thick the grid lines are.")
                    .unit("px"),
            )
            .bool("hairline", false)
            .described(
                "Hairline",
                "Always the thinnest line the output can draw: one screen pixel at any zoom, one pixel of the 300 dpi export on paper. Line width and width noise don't apply.",
            )
            .choice("lineStyle", LINE_STYLES, "solid")
            .described(
                "Line style",
                "Whether the grid lines are unbroken, dashed, dotted, or dashes and dots in turn.",
            )
            .choice_labels(&[
                ("solid", "Solid"),
                ("dashed", "Dashed"),
                ("dotted", "Dotted"),
                ("dash-dot", "Dash-dot"),
            ])
            .value(
                ValueSpec::float("dashLength", 1.0..=20.0, 4.0)
                    .soft_max()
                    .described(
                        "Dash length",
                        "How long each dash is, in line widths. Each edge stretches the pattern slightly so it fits whole repeats.",
                    ),
            )
            .value(
                ValueSpec::float("gapLength", 0.5..=20.0, 2.0)
                    .soft_max()
                    .described(
                        "Gap length",
                        "The empty space between dashes and dots, in line widths.",
                    ),
            )
            .text("seed", "grid")
            .described(
                "Seed",
                "The text the grid's misregistration and corner jitter grow from; the same seed always gives the same grid.",
            )
            .value(
                ValueSpec::float("misregistration", 0.0..=12.0, 0.0)
                    .soft_max()
                    .described(
                        "Misregistration",
                        "How far the whole grid sits off the paper, as if printed out of register. The seed picks the direction.",
                    )
                    .unit("px"),
            )
            .value(
                ValueSpec::float("cornerJitter", 0.0..=8.0, 0.0)
                    .soft_max()
                    .described(
                        "Corner jitter",
                        "How far each corner of the grid wanders from its place, up to this distance. The lines stay joined but go irregular.",
                    )
                    .unit("px"),
            )
            .float("widthNoise", 0.0..=1.0, 0.0)
            .described(
                "Width noise",
                "How much the line swells and thins along its length, like a pen with uneven pressure. At 1 it goes from almost nothing to double its width. Solid lines only.",
            )
            .value(
                ValueSpec::float("noiseScale", 2.0..=200.0, 24.0)
                    .soft_max()
                    .described(
                        "Noise scale",
                        "The length of one swell along the line. Solid lines only.",
                    )
                    .unit("px"),
            )
            .bool("joinCorners", true)
            .described(
                "Join at corners",
                "Make the lines that meet at a corner the same width there, so they join cleanly. Off, each line has its own swells and widths jump at corners. Solid lines only.",
            )
            .float("inkNoise", 0.0..=1.0, 0.0)
            .described(
                "Ink noise",
                "How uneven the ink is: patches where the line is stronger and weaker, with a fine grain over them, like a print with uneven ink. It never goes lighter than the line's colour at full strength, and some ink always remains.",
            )
            .value(
                ValueSpec::float("inkScale", 4.0..=400.0, 40.0)
                    .soft_max()
                    .described(
                        "Ink scale",
                        "The size of one patch of stronger or weaker ink.",
                    )
                    .unit("px"),
            ),
    )
    .max_per_parent(1)
    .not_deletable()
    .not_duplicable()
    .pinned_last(LAYERS);

    // The layer family between the anchors: each kind its own schema, all starting with the
    // same common values. Its chunks are `chunk` nodes below.
    k.kind(
        layer(HEX_NOISE.id, HEX_NOISE.base)
            .label("Hex Noise")
            .summary("Fills hexes from smooth noise, as greys to shape a landmass or as terrain colour.")
            .category("generator")
            .text("seed", "seed")
            .described("Seed", "The text the noise grows from; the same seed always gives the same pattern.")
            .float("frequency", 0.01..=5.0, 0.15)
            .described("Frequency", "How fast the noise changes from hex to hex; higher gives smaller, busier patches.")
            .float("offsetX", -1000.0..=1000.0, 0.0)
            .described("Offset X", "Slides the noise sideways without changing its shape.")
            .float("offsetY", -1000.0..=1000.0, 0.0)
            .described("Offset Y", "Slides the noise up or down without changing its shape.")
            .float("intensity", 0.0..=1.0, 1.0)
            .described("Intensity", "How bright the grey is in shape mode; 0 is black.")
            .float("gamma", 0.1..=5.0, 1.0)
            .described("Gamma", "Bends the noise towards its low or high end; 1 leaves it as it is.")
            .float("min", 0.0..=1.0, 0.0)
            .described("Minimum", "Hexes whose noise is below this are left empty.")
            .float("max", 0.0..=1.0, 1.0)
            .described("Maximum", "Hexes whose noise is above this are left empty.")
            .choice("mode", &["shape", "paint"], "shape")
            .described("Mode", "Shape fills hexes with grey for use as a mask; paint fills them with terrain colour.")
            .choice_labels(&[("shape", "Shape"), ("paint", "Paint")])
            .choice("terrain", BASE_TYPES, "plains")
            .described("Terrain", "The kind of terrain painted in paint mode.")
            .choice_labels(&[
                ("water", "Water"),
                ("plains", "Plains"),
                ("forest", "Forest"),
                ("hills", "Hills"),
                ("mountains", "Mountains"),
            ])
            .text("terrainId", "")
            .described("Palette terrain", "The id of one terrain in the palette to paint with, in place of the kind above."),
    );
    // The texture is a file reference kept as written (family requirement "No embedded
    // assets"); the rest are the 2025 texture-fill settings.
    k.kind(
        layer(FREEFORM.id, FREEFORM.base)
            .label("Freeform")
            .summary("Hexes you paint by hand, each filled with a terrain from the palette.")
            .category("painting")
            .choice("renderMode", &["paint", "texture-fill"], "paint")
            .described("Render mode", "Paint fills each painted hex with its terrain colour; texture fill shows an image through the painted hexes.")
            .choice_labels(&[("paint", "Paint"), ("texture-fill", "Texture fill")])
            .reference("texture")
            .bool("textureFillInvert", false)
            .described("Invert fill", "Show the image everywhere except the painted hexes.")
            .float("textureOffsetX", -1000.0..=1000.0, 0.0)
            .described("Texture offset X", "Slides the image sideways.")
            .float("textureOffsetY", -1000.0..=1000.0, 0.0)
            .described("Texture offset Y", "Slides the image up or down.")
            .float("textureScale", 0.05..=8.0, 1.0)
            .described("Texture scale", "How large the image is drawn; 1 is its fitted size.")
            .float("textureRotation", -180.0..=180.0, 0.0)
            .described("Texture rotation", "Turns the image about the middle of the map.")
            .unit("°")
            .choice("textureTiling", &["stretch", "fit", "repeat"], "stretch")
            .described("Texture tiling", "Stretch fills the map, fit keeps the image's proportions, repeat tiles it.")
            .choice_labels(&[("stretch", "Stretch"), ("fit", "Fit"), ("repeat", "Repeat")])
            .choice(
                "textureOverlayMode",
                &["normal", "overlay", "screen", "multiply"],
                "normal",
            )
            .described(
                "Mix with terrain",
                "How the image mixes with the painted hexes' terrain colours: image only, or the colours with the image's grain. Not used with Invert fill, where nothing painted is under the image.",
            )
            .choice_labels(&[
                ("normal", "Image only"),
                ("overlay", "Overlay"),
                ("screen", "Screen"),
                ("multiply", "Multiply"),
            ]),
    );
    k.kind(
        layer(OUTLINE.id, OUTLINE.base)
            .label("Outline")
            .summary("Lines drawn along hex edges, for coasts, borders and roads.")
            .category("lines")
            .shaped("paths", Shape::list(path()))
            .described(
                "Paths",
                "The lines drawn, each a run of hex corners, open or closed.",
            )
            // the 2025 default stroke, #f8f5e5
            .colour("strokeColor", rgb(0xf8, 0xf5, 0xe5))
            .described("Stroke colour", "The colour of every line on the layer.")
            .value(
                ValueSpec::float("strokeWidth", 1.0..=12.0, 4.0)
                    .described("Stroke width", "How thick the lines are.")
                    .unit("px"),
            )
            .choice("strokePattern", &["solid", "dashed", "dotted"], "solid")
            .described(
                "Stroke pattern",
                "Whether the lines are unbroken, dashed or dotted.",
            )
            .choice_labels(&[
                ("solid", "Solid"),
                ("dashed", "Dashed"),
                ("dotted", "Dotted"),
            ])
            .float("roughness", 0.0..=1.0, 0.0)
            .described(
                "Roughness",
                "How far the corners wander off the grid, for a hand-drawn line; 0 is exact.",
            ),
    );

    // The image is a file reference kept as written, like the textures; it goes last so no
    // `.described` lands on the value before it.
    k.kind(
        layer(IMAGE.id, IMAGE.base)
            .label("Image")
            .summary("A picture from a file laid over the map, for stains, paper grain or a scanned drawing.")
            .category("painting")
            .choice("fit", &["cover", "contain", "repeat"], "cover")
            .described("Fit", "Cover fills the paper and crops the edges, fit shows the whole picture, repeat tiles it.")
            .choice_labels(&[("cover", "Cover"), ("contain", "Fit"), ("repeat", "Repeat")])
            .float("scale", 0.05..=8.0, 1.0)
            .described("Scale", "How large the picture is drawn; 1 is its fitted size.")
            .float("offsetX", -1000.0..=1000.0, 0.0)
            .described("Offset X", "Slides the picture sideways.")
            .float("offsetY", -1000.0..=1000.0, 0.0)
            .described("Offset Y", "Slides the picture up or down.")
            .float("rotation", -180.0..=180.0, 0.0)
            .described("Rotation", "Turns the picture about the middle of the paper.")
            .unit("°")
            .reference("file"),
    );

    // The title cartouche (epic 23 story 1, disco-03). Draws in the grid's ink on the paper's
    // colour, which the frame projection resolves; no colour of its own (map furniture §3).
    k.kind(
        furniture(CARTOUCHE.id, CARTOUCHE.base)
            .label("Title")
            .summary("The map's title in a box, with an optional subtitle and credit line, printed over the grid.")
            .category("furniture")
            .text("title", "")
            .described("Title", "The words printed as the title. Blank prints the map's name, so renaming the map changes it.")
            .text("subtitle", "")
            .described("Subtitle", "A second line under the title, in an italic serif at half its size. Blank leaves it out.")
            .text("credit", "")
            .described("Credit", "A small third line in a typewriter face, such as who surveyed the map and when. Blank leaves it out.")
            .choice("frame", FRAMES, "rule")
            .described("Frame", "What is drawn around the lines: nothing, a ruled box, a double rule, or a solid plate with the lines reversed out of it.")
            .choice_labels(&[
                ("none", "None"),
                ("rule", "Rule"),
                ("double", "Double"),
                ("plate", "Plate"),
            ])
            .choice("align", ALIGNS, "centre")
            .described("Align", "Where the lines sit within the box.")
            .choice_labels(&[("left", "Left"), ("centre", "Centre"), ("right", "Right")])
            .value(
                ValueSpec::float("titleSize", 12.0..=120.0, 30.0)
                    .soft_max()
                    .described("Title size", "How tall the title is. The subtitle is half of it and the credit a third.")
                    .unit("px"),
            )
            .choice("anchor", ANCHORS, "top-left")
            .described("Anchor", "Which corner or edge of the paper the title sits at.")
            .choice_labels(&[
                ("top-left", "Top left"),
                ("top-centre", "Top centre"),
                ("top-right", "Top right"),
                ("bottom-left", "Bottom left"),
                ("bottom-centre", "Bottom centre"),
                ("bottom-right", "Bottom right"),
            ])
            .value(
                ValueSpec::float("inset", 0.0..=200.0, 24.0)
                    .described("Inset", "How far the title sits in from the paper's edges.")
                    .unit("px"),
            )
            .bool("backing", true)
            .described("Backing", "A plain plate in the paper's colour behind the title, so busy terrain doesn't show through it.")
            .choice("face", FURNITURE_FACES, "map")
            .described("Face", "The lettering of the title. Map follows the map's face.")
            .choice_labels(&[("map", "Map")])
            .choice_labels(FACE_LABELS)
            .choice("hand", FURNITURE_HANDS, "map")
            .described("Hand", "How the frame is drawn and the lines lean. Map follows the map's hand.")
            .choice_labels(&[("map", "Map")])
            .choice_labels(HAND_LABELS),
    );

    // The compass (epic 24 story 1, disco-02). Like the title, it draws in the grid's ink on the
    // paper's colour; the frame projection resolves its words. `compass.set-style` changes
    // `style` and resets `labels` in one step.
    k.kind(
        furniture(COMPASS.id, COMPASS.base)
            .label("Compass")
            .summary("A compass that shows where north is, printed over the grid.")
            .category("furniture")
            .choice("style", COMPASS_STYLES, "mark")
            .described("Style", "How the compass is drawn: a plain cross with a crossbar, a split arrow, or four split points. Changing it also sets Labels to the style's own.")
            .choice_labels(&[("mark", "Mark"), ("arrow", "Arrow"), ("cross", "Cross")])
            .choice("labels", COMPASS_LABELS, compass_default_labels("mark"))
            .described("Labels", "Which directions are named: all four, north only, or none. Mark and Arrow point one way, so they only ever name north.")
            .choice_labels(&[
                ("cardinal", "N, E, S, W"),
                ("north-only", "North only"),
                ("none", "None"),
            ])
            .text("labelN", "")
            .described("North word", "A word to print for north instead of N. Blank prints N.")
            .text("labelE", "")
            .described("East word", "A word to print for east instead of E. Blank prints E.")
            .text("labelS", "")
            .described("South word", "A word to print for south instead of S. Blank prints S.")
            .text("labelW", "")
            .described("West word", "A word to print for west instead of W. Blank prints W.")
            .value(
                ValueSpec::float("north", -180.0..=180.0, 0.0)
                    .described("North", "Where north points, turned clockwise from straight up. The labels stay upright.")
                    .unit("°"),
            )
            .value(
                ValueSpec::float("size", 16.0..=400.0, 120.0)
                    .described("Size", "How far the points reach across; the labels sit outside them.")
                    .unit("px"),
            )
            .choice("anchor", ANCHORS, "top-right")
            .described("Anchor", "Which corner or edge of the paper the compass sits at.")
            .choice_labels(&[
                ("top-left", "Top left"),
                ("top-centre", "Top centre"),
                ("top-right", "Top right"),
                ("bottom-left", "Bottom left"),
                ("bottom-centre", "Bottom centre"),
                ("bottom-right", "Bottom right"),
            ])
            .value(
                ValueSpec::float("inset", 0.0..=200.0, 24.0)
                    .described("Inset", "How far the compass sits in from the paper's edges.")
                    .unit("px"),
            )
            .bool("backing", true)
            .described("Backing", "A plain disc in the paper's colour behind the compass, so busy terrain doesn't show through it.")
            .bool("ring", true)
            .described("Ring", "A line round the disc, drawn in the compass's hand.")
            .choice("face", FURNITURE_FACES, "map")
            .described("Face", "The lettering of the labels. Map follows the map's face.")
            .choice_labels(&[("map", "Map")])
            .choice_labels(FACE_LABELS)
            .choice("hand", FURNITURE_HANDS, "map")
            .described("Hand", "How the compass is drawn and its labels lean. Map follows the map's hand.")
            .choice_labels(&[("map", "Map")])
            .choice_labels(HAND_LABELS),
    );

    // One 16x16 block of a freeform layer's voxel grid, present only where painted. Named
    // `<cq>_<cr>` (floor of q and r over 16); `voxels` is a palette and run-length cells, row-major.
    k.kind(
        NodeType::new("chunk")
            .label("Chunk")
            .summary("A 16 by 16 block of a freeform layer's hexes; kept in the file, never added by hand.")
            .group("internal")
            .in_categories(&["maps"])
            .value(chunk_voxels().described("Voxels", "The block's hexes as a palette of terrains and a run-length string of which slot holds which."))
            .check(super::freeform::check_chunk),
    )
    .not_duplicable();

    // The built-in catalogue is the nine 2025 settings; `palette.use` points followers at themes.
    k.kind(
        NodeType::new("palette")
            .label("Palette")
            .summary("A set of colours and terrains for the maps that follow it.")
            .group("theme")
            .category("colour")
            .in_categories(&["themes"])
            .text("name", "")
            .described("Name", "What the palette is called.")
            .text("description", "")
            .described("Description", "A line on the look the palette gives a map.")
            .colour("gridLine", BLACK)
            .described("Grid line", "The colour of the hex grid lines when a grid follows the palette.")
            .colour("primary", BLACK)
            .described("Primary", "The palette's main colour.")
            .colour("secondary", BLACK)
            .described("Secondary", "The palette's second colour.")
            .colour("accent", BLACK)
            .described("Accent", "The palette's highlight colour.")
            .colour("background", WHITE)
            .described("Background", "The palette's background colour.")
            .shaped("terrains", Shape::list(terrain()))
            .described("Terrains", "The terrains painted with this palette: each a name, a base type, traits and a colour."),
    )
    .presets(super::palette::PaletteAggregate)
    .catalogue(super::palette::catalogue());
}

/// Each of a map's orders holds only its own family: layer kinds and the anchors in `layers`,
/// furniture in `furniture` (map furniture §1). On the map's check, so no edit, raw or by
/// command, can move a title under the grid or a layer over it.
fn check_orders(map: &rhizome_core::Node<'_>) -> Result<(), String> {
    for (order, group) in [(LAYERS, "layer"), (FURNITURE, "furniture")] {
        for n in map.order(order) {
            if n.node_type().and_then(|t| t.group_tag()) != Some(group) {
                return Err(format!("a {} can't go in `{order}`", n.type_name()));
            }
        }
    }
    Ok(())
}

/// The common layer blend modes (design: Values, "every layer kind except `paper`").
pub const BLEND: &[&str] = &[
    "normal", "multiply", "screen", "overlay", "darken", "lighten",
];
const BLEND_LABELS: &[(&str, &str)] = &[
    ("normal", "Normal"),
    ("multiply", "Multiply"),
    ("screen", "Screen"),
    ("overlay", "Overlay"),
    ("darken", "Darken"),
    ("lighten", "Lighten"),
];
