//! The pictures on the node pages (epic 27 story 2): one small campaign per page, built through
//! the commands the app runs, with fixed ids so every hand's wobble is pinned and a rerun
//! draws the same picture. `just examples` opens each in the app, exports its maps and
//! writes the images.
//!
//! The campaigns are `docs/examples/<page>.campaign` and the list of pictures is
//! `docs/examples/examples.json`: `[{page, map | maps | rows, image, caption, crop, cut, thumb}]`,
//! where `map` is the map's name in that campaign (or `maps`, several names drawn side by side,
//! each cut and cropped alike, scaled to one height with a 24 px gap, or `rows`, lists of names
//! in rows, each map scaled to a long side of 1200 px, the same hex scale for all, each row
//! centred, 24 px between pieces and rows), `image` the file stem,
//! `caption` the italic line under the picture, `crop` an optional `{x, y, w, h}` in fractions
//! of the exported map, `cut` an optional `{y, h}` band, in fractions of its height, taken out
//! of the middle, and `thumb` an optional `{x, y, w}`: the square of side `w` x the width of
//! the first exported map, at `x` and `y` in fractions of it, that is the page's 128 px
//! thumbnail. Both files sit outside `docs/nodes/`, so the site's sync never publishes the
//! campaigns. Pictures that need a file take it from `docs/examples/files/` (the campaigns
//! name it `files/<name>`).
//!
//! `EXAMPLES=all` writes them again (`just examples` does); without it a stale file fails.

mod common;

use std::path::{Path, PathBuf};

use map_and_territory_model::MapAndTerritory;
use rhizome_core::{IdSource, Value};
use rhizome_pom::{Document, FileStore};
use serde_json::{json, Value as Json};

type Doc = Document<MapAndTerritory>;

/// One picture on a page.
struct Example {
    page: &'static str,
    map: &'static str,
    /// Several maps side by side, in place of `map`.
    maps: &'static [&'static str],
    /// Rows of maps at one scale, in place of `map` and `maps`.
    rows: &'static [&'static [&'static str]],
    image: &'static str,
    caption: &'static str,
    /// `{x, y, w, h}` in fractions of the exported map, or none for all of it.
    crop: Option<[f64; 4]>,
    /// `[y, h]`: a band taken out of the middle, in fractions of the map's height, so the
    /// corners close up. Made by [`cut`], which keeps the grid's lines meeting.
    cut: Option<[f64; 2]>,
    /// `[x, y, w]`: the page's thumbnail, in fractions of the first map as exported.
    thumb: Option<[f64; 3]>,
}

/// A picture of one whole map, to which the rest is added with `..`.
fn ex(
    page: &'static str,
    map: &'static str,
    image: &'static str,
    caption: &'static str,
) -> Example {
    Example {
        page,
        map,
        maps: &[],
        rows: &[],
        image,
        caption,
        crop: None,
        cut: None,
        thumb: None,
    }
}

/// A map's paper in paper px: 16:10 on a 1200 px long side (`paperSize`, `src/render/geometry.ts`).
const PAPER_H: f64 = 750.0;
/// One period of the pointy grid at Hex size 40: two rows of 1.5 × 40 px.
const GRID_PERIOD: f64 = 120.0;

/// The band from `top` px down, `periods` grid periods tall: a whole number of periods, so the
/// hexes above and below the seam join as if nothing was taken out.
fn cut(top: f64, periods: f64) -> Option<[f64; 2]> {
    Some([top / PAPER_H, periods * GRID_PERIOD / PAPER_H])
}

impl Example {
    fn json(&self) -> Json {
        let mut e = json!({
            "page": self.page,
            "image": self.image,
            "caption": self.caption,
        });
        if !self.rows.is_empty() {
            e["rows"] = json!(self.rows);
        } else if !self.maps.is_empty() {
            e["maps"] = json!(self.maps);
        } else {
            e["map"] = json!(self.map);
        }
        if let Some([x, y, w]) = self.thumb {
            e["thumb"] = json!({ "x": x, "y": y, "w": w });
        }
        if let Some([x, y, w, h]) = self.crop {
            e["crop"] = json!({ "x": x, "y": y, "w": w, "h": h });
        }
        if let Some([y, h]) = self.cut {
            e["cut"] = json!({ "y": y, "h": h });
        }
        e
    }
}

fn run(d: &mut Doc, id: &str, p: Json) {
    if let Err(e) = d.run(id, &p) {
        panic!("{id} at {}: {e}", p["at"]);
    }
}

fn set(d: &mut Doc, at: &str, key: &str, value: Json) {
    run(
        d,
        "value.set",
        json!({ "at": at, "key": key, "value": value }),
    );
}

fn rgba(hex: &str) -> Json {
    let c = |i: usize| f64::from(u8::from_str_radix(&hex[i..i + 2], 16).unwrap()) / 255.0;
    json!([c(1), c(3), c(5), 1.0])
}

fn newest(d: &Doc, parent: &str, order: &str) -> String {
    let n = d.tree().at(parent).unwrap();
    n.order(order).last().unwrap().path().to_string()
}

/// A map named `name`: cool paper, filling its page, with a grid light enough to read over.
fn map(d: &mut Doc, name: &str) -> String {
    run(
        d,
        "node.add",
        json!({ "parent": "/maps", "type": "map", "name": name }),
    );
    let m = newest(d, "/maps", "maps");
    set(d, &m, "layout", json!("map-full"));
    set(d, &format!("{m}/paper"), "color", rgba("#e9ece4"));
    let grid = format!("{m}/hexgrid");
    set(d, &grid, "size", json!(40.0));
    set(d, &grid, "alpha", json!(0.45));
    m
}

/// A piece of furniture of `kind` on `m`, set at `anchor`, with the values in `more`.
fn furniture(d: &mut Doc, m: &str, kind: &str, anchor: &str, more: &[(&str, Json)]) -> String {
    run(d, "node.add", json!({ "parent": m, "type": kind }));
    let f = newest(d, m, "furniture");
    set(d, &f, "anchor", json!(anchor));
    for (key, value) in more {
        set(d, &f, key, value.clone());
    }
    f
}

fn compass(d: &mut Doc, m: &str, style: &str, anchor: &str, more: &[(&str, Json)]) {
    let c = furniture(d, m, "compass", anchor, more);
    run(d, "compass.set-style", json!({ "at": c, "style": style }));
}

/// The compass page: the four styles, one turned by North, the three hands.
fn compass_page(d: &mut Doc, _: &Path) -> Vec<Example> {
    let m = map(d, "Styles");
    for (style, anchor) in [
        ("mark", "top-left"),
        ("arrow", "top-right"),
        ("cross", "bottom-left"),
        ("rose", "bottom-right"),
    ] {
        compass(d, &m, style, anchor, &[]);
    }

    let m = map(d, "Turned");
    compass(d, &m, "rose", "top-left", &[]);
    compass(d, &m, "rose", "top-right", &[("north", json!(40.0))]);

    let m = map(d, "Hands");
    for (hand, anchor) in [
        ("clean", "top-left"),
        ("drawn", "top-centre"),
        ("scratched", "top-right"),
    ] {
        compass(d, &m, "cross", anchor, &[("hand", json!(hand))]);
    }

    vec![
        Example {
            page: "compass",
            map: "Styles",
            maps: &[],
        rows: &[],
            image: "compass-styles",
            caption: "Style set to Mark, Arrow, Cross and Rose, each at its own Anchor.",
            crop: None,
            cut: cut(195.0, 3.0),
            thumb: Some([0.8375, 0.7467, 0.15]),
        },
        Example {
            page: "compass",
            map: "Turned",
            maps: &[],
        rows: &[],
            image: "compass-north",
            caption: "Two Roses: North at 0 on the left, and at 40 on the right. The points turn clockwise and the labels stay upright.",
            crop: Some([0.0, 0.0, 1.0, 0.32]),
            cut: None,
            thumb: None,
        },
        Example {
            page: "compass",
            map: "Hands",
            maps: &[],
        rows: &[],
            image: "compass-hands",
            caption: "A Cross with Hand set to Clean, Drawn and Scratched.",
            crop: Some([0.0, 0.0, 1.0, 0.32]),
            cut: None,
            thumb: None,
        },
    ]
}

/// The title page: the four frames, the four faces.
fn title_page(d: &mut Doc, _: &Path) -> Vec<Example> {
    let m = map(d, "Frames");
    for (frame, anchor) in [
        ("none", "top-left"),
        ("rule", "top-right"),
        ("double", "bottom-left"),
        ("plate", "bottom-right"),
    ] {
        furniture(
            d,
            &m,
            "title",
            anchor,
            &[
                ("title", json!("The Sallow Fen")),
                ("frame", json!(frame)),
                ("face", json!("serif")),
            ],
        );
    }

    let m = map(d, "Faces");
    for (face, anchor) in [
        ("condensed", "top-left"),
        ("serif", "top-right"),
        ("blackletter", "bottom-left"),
        ("marker", "bottom-right"),
    ] {
        furniture(
            d,
            &m,
            "title",
            anchor,
            &[
                ("title", json!("The Sallow Fen")),
                ("subtitle", json!("Marches of the Drowned Bishop")),
                ("frame", json!("rule")),
                ("face", json!(face)),
            ],
        );
    }

    vec![
        Example {
            page: "title",
            map: "Frames",
            maps: &[],
            rows: &[],
            image: "title-frames",
            caption: "Frame set to None, Rule, Double and Plate.",
            crop: None,
            cut: cut(135.0, 4.0),
            thumb: Some([0.7775, 0.648, 0.22]),
        },
        Example {
            page: "title",
            map: "Faces",
            maps: &[],
            rows: &[],
            image: "title-faces",
            caption: "Face set to Condensed, Serif, Blackletter and Marker, with a Subtitle.",
            crop: None,
            cut: cut(135.0, 4.0),
            thumb: None,
        },
    ]
}

/// The hex grid page: clean, and inked rough.
fn hexgrid_page(d: &mut Doc, _: &Path) -> Vec<Example> {
    let m = map(d, "Clean");
    set(d, &format!("{m}/hexgrid"), "alpha", json!(1.0));

    let m = map(d, "Rough");
    let grid = format!("{m}/hexgrid");
    set(d, &grid, "alpha", json!(0.8));
    set(d, &grid, "lineWidth", json!(2.0));
    set(d, &grid, "misregistration", json!(3.0));
    set(d, &grid, "cornerJitter", json!(2.0));
    set(d, &grid, "widthNoise", json!(0.6));
    set(d, &grid, "inkNoise", json!(0.4));

    vec![
        Example {
            page: "hexgrid",
            map: "Clean",
            maps: &[],
        rows: &[],
            image: "hexgrid-clean",
            caption: "The grid with Hex size 40 and everything else at its default.",
            crop: None,
            cut: None,
            thumb: None,
        },
        Example {
            page: "hexgrid",
            map: "Rough",
            maps: &[],
        rows: &[],
            image: "hexgrid-rough",
            caption: "Line width 2, Misregistration 3, Corner jitter 2, Width noise 0.6 and Ink noise 0.4: a grid inked by hand.",
            crop: None,
            cut: None,
            thumb: Some([0.35, 0.2, 0.3]),
        },
    ]
}

/// A layer of `kind` on `m`, named `name`, above the others and below the grid.
fn layer(d: &mut Doc, m: &str, kind: &str, name: &str) -> String {
    run(
        d,
        "node.add",
        json!({ "parent": m, "type": kind, "name": name }),
    );
    let layers = d.tree().at(m).unwrap().order("layers");
    layers[layers.len() - 2].path().to_string()
}

/// The pictures kept in `docs/examples/files/`.
fn files_dir() -> PathBuf {
    dir().join("files")
}

/// Copies `docs/examples/files/<name>` beside the campaign being built (`tmp`), then runs
/// `command` on `at` with the relative path `files/<name>`, as a person would after saving.
fn with_file(d: &mut Doc, tmp: &Path, command: &str, at: &str, name: &str) {
    let to = tmp.join("files");
    std::fs::create_dir_all(&to).unwrap();
    std::fs::copy(files_dir().join(name), to.join(name)).unwrap();
    run(
        d,
        command,
        json!({ "at": at, "file": format!("files/{name}") }),
    );
}

/// A freeform layer holding the Sallow Fen's terrain field, as the guide paints it. With
/// `keep`, only the cells whose terrain it accepts.
fn terrain(d: &mut Doc, m: &str, keep: fn(&str) -> bool) -> String {
    let t = layer(d, m, "freeform", "Terrain");
    let cells: Vec<Json> = common::terrain_cells()
        .into_iter()
        .filter(|c| keep(c["terrainId"].as_str().unwrap()))
        .collect();
    run(d, "freeform.paint", json!({ "at": t, "cells": cells }));
    t
}

fn every_terrain(_: &str) -> bool {
    true
}

/// The paper page: three colours, and a scan under Multiply.
fn paper_page(d: &mut Doc, tmp: &Path) -> Vec<Example> {
    for (name, colour) in [
        ("Pale", "#e9ece4"),
        ("Parchment", "#d8c9a8"),
        ("Dark", "#2b2a28"),
    ] {
        let m = map(d, name);
        set(d, &format!("{m}/paper"), "color", rgba(colour));
        if name == "Dark" {
            // the setting's grid ink would vanish on it: lines in the pale paper colour
            let grid = format!("{m}/hexgrid");
            set(d, &grid, "usePaletteColor", json!(false));
            set(d, &grid, "color", rgba("#e9ece4"));
        }
    }

    let m = map(d, "Texture");
    let paper = format!("{m}/paper");
    set(d, &paper, "color", rgba("#d8c9a8"));
    with_file(d, tmp, "paper.set-texture", &paper, "lace-grime.jpg");
    set(d, &paper, "textureBlend", json!("multiply"));
    set(d, &paper, "textureFit", json!("cover"));

    vec![
        Example {
            maps: &["Pale", "Parchment", "Dark"],
            crop: Some([0.25, 0.25, 0.5, 0.5]),
            ..ex(
                "paper",
                "",
                "paper-colours",
                "Colour set to #e9ece4, #d8c9a8 and #2b2a28.",
            )
        },
        Example {
            thumb: Some([0.3, 0.2, 0.4]),
            ..ex(
                "paper",
                "Texture",
                "paper-texture",
                "Colour #d8c9a8 with a Texture of a lace-and-grime scan, Mix with paper Multiply and Texture fit Cover.",
            )
        },
    ]
}

/// The hex noise page: a grey landmass, and the same noise painted in a terrain.
fn hex_noise_page(d: &mut Doc, _: &Path) -> Vec<Example> {
    let shaped = |d: &mut Doc, m: &str, name: &str| {
        let n = layer(d, m, "hex-noise", name);
        set(d, &n, "frequency", json!(0.15));
        set(d, &n, "min", json!(0.45));
        n
    };
    let m = map(d, "Shape");
    shaped(d, &m, "Land");

    let m = map(d, "Paint");
    let shape = shaped(d, &m, "Land");
    set(d, &shape, "mode", json!("shape"));
    // its own noise, so the patches half overlap the land instead of repainting it
    let paint = layer(d, &m, "hex-noise", "Forest");
    set(d, &paint, "seed", json!("forest"));
    set(d, &paint, "frequency", json!(0.25));
    set(d, &paint, "min", json!(0.55));
    set(d, &paint, "mode", json!("paint"));
    set(d, &paint, "terrain", json!("blood-mires"));
    set(d, &paint, "opacity", json!(0.5));

    vec![
        Example {
            thumb: Some([0.3, 0.2, 0.4]),
            ..ex(
                "hex-noise",
                "Shape",
                "hex-noise-shape",
                "Mode set to Shape, Frequency 0.15 and Minimum 0.45: a grey landmass.",
            )
        },
        ex(
            "hex-noise",
            "Paint",
            "hex-noise-paint",
            "A second layer with Seed forest, Frequency 0.25, Minimum 0.55, Mode Paint, Terrain Blood Mires and Opacity 0.5, over the shape layer.",
        ),
    ]
}

/// The freeform page: painted terrain, and an image shown through the painted hexes.
fn freeform_page(d: &mut Doc, tmp: &Path) -> Vec<Example> {
    let m = map(d, "Paint");
    let t = terrain(d, &m, every_terrain);
    set(d, &t, "opacity", json!(0.6));

    let m = map(d, "Texture");
    let t = terrain(d, &m, |t| t != "plains");
    set(d, &t, "renderMode", json!("texture-fill"));
    with_file(d, tmp, "freeform.set-texture", &t, "teal-lace.jpg");

    vec![
        Example {
            thumb: Some([0.3, 0.2, 0.4]),
            ..ex(
                "freeform",
                "Paint",
                "freeform-paint",
                "Painted hexes at Opacity 0.6: each takes the colour of its terrain.",
            )
        },
        ex(
            "freeform",
            "Texture",
            "freeform-texture",
            "Render mode set to Texture fill, with a Texture of teal lace: it shows through every hex but the plains.",
        ),
    ]
}

/// A horizontal run of hex edges along the top of row `r`, `hexes` hexes long, centred on the
/// paper: the corners from the upper left of its first hex to the upper right of its last.
fn row_path(r: i64, hexes: i64) -> Json {
    let first = -(hexes / 2) - r.div_euclid(2);
    let mut corners = vec![json!({ "q": first, "r": r, "corner": 4 })];
    for q in first..first + hexes {
        corners.push(json!({ "q": q, "r": r, "corner": 5 }));
        corners.push(json!({ "q": q, "r": r, "corner": 0 }));
    }
    json!({ "corners": corners, "closed": false })
}

/// The outline page: the three stroke patterns.
fn outline_page(d: &mut Doc, _: &Path) -> Vec<Example> {
    let m = map(d, "Patterns");
    for (name, pattern, row, rough) in [
        ("Solid", "solid", -4, false),
        ("Dashed", "dashed", 0, false),
        ("Dotted", "dotted", 4, true),
    ] {
        let o = layer(d, &m, "outline", name);
        set(d, &o, "strokeColor", rgba("#1d211c"));
        set(d, &o, "strokeWidth", json!(3.0));
        set(d, &o, "strokePattern", json!(pattern));
        if rough {
            set(d, &o, "roughness", json!(1.0));
        }
        run(
            d,
            "outline.draw",
            json!({ "at": o, "paths": [row_path(row, 13)] }),
        );
    }

    vec![Example {
        thumb: Some([0.3, 0.08, 0.4]),
        ..ex(
            "outline",
            "Patterns",
            "outline-patterns",
            "Three layers with Stroke pattern Solid, Dashed and Dotted, Stroke width 3; the Dotted one also at Roughness 1.",
        )
    }]
}

/// The image page: a scan multiplied over painted terrain.
fn image_page(d: &mut Doc, tmp: &Path) -> Vec<Example> {
    let m = map(d, "Stain");
    let t = terrain(d, &m, every_terrain);
    set(d, &t, "opacity", json!(0.6));
    let i = layer(d, &m, "image", "Ink");
    with_file(d, tmp, "image.set-file", &i, "ink-splats.jpg");
    set(d, &i, "blend", json!("multiply"));

    vec![Example {
        thumb: Some([0.3, 0.2, 0.4]),
        ..ex(
            "image",
            "Stain",
            "image-stain",
            "An Image of an ink-splat scan with Blend set to Multiply, over painted terrain: the ink stains the map.",
        )
    }]
}

/// A locations layer named `name` on `m` with `places` as (name, q, r).
fn places(d: &mut Doc, m: &str, name: &str, more: &[(&str, Json)], places: &[(&str, i64, i64)]) {
    let l = layer(d, m, "locations", name);
    for (key, value) in more {
        set(d, &l, key, value.clone());
    }
    for (place, q, r) in places {
        run(
            d,
            "locations.add",
            json!({ "at": l, "q": q, "r": r, "name": place }),
        );
    }
}

/// The locations page: the three markers, the four name styles.
fn locations_page(d: &mut Doc, _: &Path) -> Vec<Example> {
    let m = map(d, "Markers");
    // the layer added last numbers first, so Number goes last and its places are 1 to 3
    for (name, marker, q0, names) in [
        (
            "Number",
            "number",
            -4,
            ["Reedwall Keep", "Weeping Well", "Gallows Ford"],
        ),
        (
            "Dot",
            "dot",
            0,
            ["Sunken Chapel", "Toll House", "The Hollow"],
        ),
        (
            "None",
            "none",
            4,
            ["Drowned Mill", "Ash Cairn", "Bishop's Rest"],
        ),
    ]
    .into_iter()
    .rev()
    {
        let spots: Vec<(&str, i64, i64)> = [(-2, 0), (0, 0), (2, 0)]
            .iter()
            .zip(names)
            .map(|(&(r, _), n)| (n, q0 - r / 2, r))
            .collect();
        places(d, &m, name, &[("marker", json!(marker))], &spots);
    }

    let m = map(d, "Names");
    // a band of forest across the middle, so each name sits on mid-grey ground
    let band = layer(d, &m, "freeform", "Forest");
    let cells: Vec<Json> = (-1..=1)
        .flat_map(|r| {
            (-12..=12).map(move |q| json!({ "q": q - r / 2, "r": r, "terrainId": "forest" }))
        })
        .collect();
    run(d, "freeform.paint", json!({ "at": band, "cells": cells }));
    for (name, style, q0) in [
        ("Plain", "plain", -6),
        ("Outline", "outline", -2),
        ("Glow", "glow", 2),
        ("Label", "label", 6),
    ] {
        places(
            d,
            &m,
            name,
            &[("labelStyle", json!(style))],
            &[("Reedwall Keep", q0, 0)],
        );
    }

    vec![
        Example {
            thumb: Some([0.25, 0.22, 0.4]),
            crop: Some([0.1, 0.3, 0.8, 0.4]),
            ..ex(
                "locations",
                "Markers",
                "locations-markers",
                "Three layers with Marker set to Number, Dot and None, each with three places.",
            )
        },
        Example {
            crop: Some([0.0, 0.3, 1.0, 0.4]),
            ..ex(
                "locations",
                "Names",
                "locations-names",
                "Name style set to Plain, Outline, Glow and Label, over painted forest.",
            )
        },
    ]
}

/// The map page: the four shapes of paper, each with a title that names it.
fn map_page(d: &mut Doc, _: &Path) -> Vec<Example> {
    for (name, aspect, orientation) in [
        ("Square", "square", "landscape"),
        ("4:3", "4:3", "landscape"),
        ("16:10", "16:10", "landscape"),
        ("16:9 Portrait", "16:9", "portrait"),
    ] {
        let m = map(d, name);
        let paper = format!("{m}/paper");
        set(d, &paper, "aspect", json!(aspect));
        set(d, &paper, "orientation", json!(orientation));
        // parchment, so each sheet stands out from the page it is printed on
        set(d, &paper, "color", rgba("#d8c9a8"));
        set(d, &format!("{m}/hexgrid"), "size", json!(80.0));
        furniture(
            d,
            &m,
            "title",
            "top-left",
            &[("title", json!(name)), ("titleSize", json!(72.0))],
        );
    }

    vec![Example {
        rows: &[&["Square", "16:9 Portrait"], &["4:3", "16:10"]],
        thumb: Some([0.0, 0.0, 0.6]),
        ..ex(
            "map",
            "",
            "map-shapes",
            "Aspect set to Square, 16:9, 4:3 and 16:10, the 16:9 with Orientation Portrait.",
        )
    }]
}

type Page = (&'static str, fn(&mut Doc, &Path) -> Vec<Example>);
const PAGES: &[Page] = &[
    ("compass", compass_page),
    ("title", title_page),
    ("hexgrid", hexgrid_page),
    ("paper", paper_page),
    ("hex-noise", hex_noise_page),
    ("freeform", freeform_page),
    ("outline", outline_page),
    ("image", image_page),
    ("locations", locations_page),
    ("map", map_page),
];

fn dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../docs/examples")
}

fn write_wanted() -> bool {
    std::env::var("EXAMPLES").is_ok_and(|v| v.split(',').any(|n| n.trim() == "all"))
}

/// The campaign as saved to a file with sequential ids, the pictures it holds and the names
/// of its maps. The document is saved once first, so a file can be given by a path relative
/// to it, as in the window, and again at the end.
fn saved(build: fn(&mut Doc, &Path) -> Vec<Example>) -> (String, Vec<Example>, Vec<String>) {
    static NEXT: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
    let n = NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    let tmp = std::env::temp_dir().join(format!("examples-{}-{n}", std::process::id()));
    std::fs::create_dir_all(&tmp).unwrap();
    let mut file: Doc = Document::new_with_ids(FileStore, IdSource::sequential()).unwrap();
    let path = tmp.join("example.campaign");
    file.save_as(&path).unwrap();
    let examples = build(&mut file, &tmp);
    file.save_as(&path).unwrap();
    let text = std::fs::read_to_string(&path).unwrap();
    let names = file
        .tree()
        .at("/maps")
        .unwrap()
        .order("maps")
        .iter()
        .map(|m| match m.value("name") {
            Some(Value::Text(t)) => t,
            other => panic!("name is {other:?}"),
        })
        .collect();
    std::fs::remove_dir_all(&tmp).ok();
    (text, examples, names)
}

/// `text` with each `maps` and `rows` array on one line, as Biome formats a short list, so
/// `just check`'s formatter leaves the manifest alone.
fn one_line_maps(text: &str) -> String {
    let mut out = String::new();
    let mut lines = text.lines();
    while let Some(line) = lines.next() {
        let head = line.trim_end();
        if head.ends_with("\"maps\": [") || head.ends_with("\"rows\": [") {
            let indent = line.len() - line.trim_start().len();
            let mut items = Vec::new();
            for item in lines.by_ref() {
                if item.trim_start().starts_with(']')
                    && item.len() - item.trim_start().len() == indent
                {
                    break;
                }
                items.push(item.trim());
            }
            let comma = if lines.clone().next().is_some() {
                ","
            } else {
                ""
            };
            let joined = items.join(" ").replace("[ ", "[").replace(" ]", "]");
            out.push_str(&format!(
                "{}[{}]{comma}\n",
                head.trim_end_matches('['),
                joined.trim_end_matches(',')
            ));
        } else {
            out.push_str(line);
            out.push('\n');
        }
    }
    out.trim_end().to_string()
}

#[test]
fn the_examples_are_current() {
    let mut manifest = Vec::new();
    for (page, build) in PAGES {
        let (text, examples, _) = saved(*build);
        common::check_or_write_at(
            &dir().join(format!("{page}.campaign")),
            write_wanted(),
            &text,
            "just examples",
        );
        manifest.extend(examples.iter().map(Example::json));
    }
    let text = format!(
        "{}\n",
        one_line_maps(&serde_json::to_string_pretty(&manifest).unwrap())
    );
    common::check_or_write_at(
        &dir().join("examples.json"),
        write_wanted(),
        &text,
        "just examples",
    );
}

#[test]
fn every_picture_names_a_map_of_its_page() {
    for (page, build) in PAGES {
        let (_, examples, names) = saved(*build);
        assert!(!examples.is_empty());
        for e in &examples {
            assert_eq!(e.page, *page);
            let wanted = if !e.rows.is_empty() {
                e.rows.concat()
            } else if e.maps.is_empty() {
                vec![e.map]
            } else {
                e.maps.to_vec()
            };
            for w in wanted {
                assert!(names.iter().any(|n| n == w), "{page} has no map {w}");
            }
        }
        let thumbs = examples.iter().filter(|e| e.thumb.is_some()).count();
        assert_eq!(thumbs, 1, "{page} needs exactly one thumbnail");
    }
}
