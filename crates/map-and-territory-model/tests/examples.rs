//! The pictures on the node pages (epic 27 story 2): one small campaign per page, built through
//! the commands the app runs, with fixed ids so every hand's wobble is pinned and a rerun
//! draws the same picture. `just examples` opens each in the app, exports its maps and
//! writes the images.
//!
//! The campaigns are `docs/examples/<page>.campaign` and the list of pictures is
//! `docs/examples/examples.json`: `[{page, map, image, caption, crop, cut}]`, where `map` is the
//! map's name in that campaign, `image` the file stem, `caption` the italic line under the
//! picture, `crop` an optional `{x, y, w, h}` in fractions of the exported map, and `cut` an
//! optional `{y, h}` band, in fractions of its height, taken out of the middle. Both sit
//! outside `docs/nodes/`, so the site's sync never publishes the campaigns.
//!
//! `EXAMPLES=all` writes them again (`just examples` does); without it a stale file fails.

mod common;

use std::path::{Path, PathBuf};

use map_and_territory_model::MapAndTerritory;
use rhizome_core::{IdSource, Value};
use rhizome_pom::{Document, FileStore, MemoryStore};
use serde_json::{json, Value as Json};

type Doc = Document<MapAndTerritory>;

/// One picture on a page.
struct Example {
    page: &'static str,
    map: &'static str,
    image: &'static str,
    caption: &'static str,
    /// `{x, y, w, h}` in fractions of the exported map, or none for all of it.
    crop: Option<[f64; 4]>,
    /// `[y, h]`: a band taken out of the middle, in fractions of the map's height, so the
    /// corners close up. Made by [`cut`], which keeps the grid's lines meeting.
    cut: Option<[f64; 2]>,
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
            "map": self.map,
            "image": self.image,
            "caption": self.caption,
        });
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
fn compass_page(d: &mut Doc) -> Vec<Example> {
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
            image: "compass-styles",
            caption: "Style set to Mark, Arrow, Cross and Rose, each at its own Anchor.",
            crop: None,
            cut: cut(195.0, 3.0),
        },
        Example {
            page: "compass",
            map: "Turned",
            image: "compass-north",
            caption: "Two Roses: North at 0 on the left, and at 40 on the right. The points turn clockwise and the labels stay upright.",
            crop: Some([0.0, 0.0, 1.0, 0.32]),
            cut: None,
        },
        Example {
            page: "compass",
            map: "Hands",
            image: "compass-hands",
            caption: "A Cross with Hand set to Clean, Drawn and Scratched.",
            crop: Some([0.0, 0.0, 1.0, 0.32]),
            cut: None,
        },
    ]
}

/// The title page: the four frames, the four faces.
fn title_page(d: &mut Doc) -> Vec<Example> {
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
            image: "title-frames",
            caption: "Frame set to None, Rule, Double and Plate.",
            crop: None,
            cut: cut(135.0, 4.0),
        },
        Example {
            page: "title",
            map: "Faces",
            image: "title-faces",
            caption: "Face set to Condensed, Serif, Blackletter and Marker, with a Subtitle.",
            crop: None,
            cut: cut(135.0, 4.0),
        },
    ]
}

/// The hex grid page: clean, and inked rough.
fn hexgrid_page(d: &mut Doc) -> Vec<Example> {
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
            image: "hexgrid-clean",
            caption: "The grid with Hex size 40 and everything else at its default.",
            crop: None,
            cut: None,
        },
        Example {
            page: "hexgrid",
            map: "Rough",
            image: "hexgrid-rough",
            caption: "Line width 2, Misregistration 3, Corner jitter 2, Width noise 0.6 and Ink noise 0.4: a grid inked by hand.",
            crop: None,
            cut: None,
        },
    ]
}

type Page = (&'static str, fn(&mut Doc) -> Vec<Example>);
const PAGES: &[Page] = &[
    ("compass", compass_page),
    ("title", title_page),
    ("hexgrid", hexgrid_page),
];

fn dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../docs/examples")
}

fn write_wanted() -> bool {
    std::env::var("EXAMPLES").is_ok_and(|v| v.split(',').any(|n| n.trim() == "all"))
}

/// The campaign as saved to a file with sequential ids, and the pictures it holds.
fn saved(build: fn(&mut Doc) -> Vec<Example>) -> (String, Vec<Example>) {
    let tmp = std::env::temp_dir().join(format!("examples-{}", std::process::id()));
    std::fs::create_dir_all(&tmp).unwrap();
    let mut file: Doc = Document::new_with_ids(FileStore, IdSource::sequential()).unwrap();
    let examples = build(&mut file);
    let path = tmp.join("example.campaign");
    file.save_as(&path).unwrap();
    let text = std::fs::read_to_string(&path).unwrap();
    std::fs::remove_dir_all(&tmp).ok();
    (text, examples)
}

#[test]
fn the_examples_are_current() {
    let mut manifest = Vec::new();
    for (page, build) in PAGES {
        let (text, examples) = saved(*build);
        common::check_or_write_at(
            &dir().join(format!("{page}.campaign")),
            write_wanted(),
            &text,
            "just examples",
        );
        manifest.extend(examples.iter().map(Example::json));
    }
    let text = format!("{}\n", serde_json::to_string_pretty(&manifest).unwrap());
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
        let mut d: Doc =
            Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
        let examples = build(&mut d);
        let names: Vec<String> = d
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
        assert!(!examples.is_empty());
        for e in &examples {
            assert_eq!(e.page, *page);
            assert!(
                names.iter().any(|n| n == e.map),
                "{page} has no map {}",
                e.map
            );
        }
    }
}
