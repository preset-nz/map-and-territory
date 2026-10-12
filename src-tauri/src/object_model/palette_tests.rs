//! Palettes as themes, through commands by id.

use rhizome_core::{IdSource, NodeId, Ref, Value};
use rhizome_pom::{Document, MemoryStore, Outcome, PresetRef};
use serde_json::{json, Value as Json};

use super::palette::{catalogue, rgba, PaletteState};
use super::MapAndTerritory;

type Doc = Document<MapAndTerritory>;

fn new_doc() -> Doc {
    Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap()
}

fn run(d: &mut Doc, id: &str, p: Json) -> rhizome_pom::Result<Outcome> {
    d.run(id, &p)
}

fn add_map(d: &mut Doc) -> String {
    run(d, "node.add", json!({ "parent": "/maps", "type": "map" })).unwrap();
    d.tree()
        .at("/maps")
        .unwrap()
        .order("maps")
        .last()
        .unwrap()
        .path()
        .to_string()
}

fn use_preset(d: &mut Doc, at: &str, name: &str) {
    run(d, "palette.use", json!({ "at": at, "preset": name })).unwrap();
}

fn themes(d: &Doc) -> Vec<String> {
    d.tree()
        .at("/themes")
        .unwrap()
        .children()
        .map(|n| n.path().to_string())
        .collect()
}

/// The theme a follower points at, as a path.
fn follows(d: &Doc, at: &str) -> Option<String> {
    d.tree()
        .at(at)
        .unwrap()
        .resolve("palette")
        .map(|n| n.path().to_string())
}

fn ref_of(d: &Doc, at: &str) -> Option<Ref> {
    d.tree().at(at).unwrap().reference("palette").cloned()
}

fn id_of(d: &Doc, at: &str) -> NodeId {
    d.tree().at(at).unwrap().id()
}

#[test]
fn the_seed_holds_a_doom_forge_theme_the_campaign_follows() {
    let d = new_doc();
    assert_eq!(themes(&d), ["/themes/doom-forge"]);
    assert_eq!(
        follows(&d, "/campaign/campaign").as_deref(),
        Some("/themes/doom-forge")
    );
    let id = id_of(&d, "/themes/doom-forge");
    assert_eq!(ref_of(&d, "/campaign/campaign"), Some(Ref::here(id)));
    assert_eq!(
        d.current_preset(id).unwrap(),
        Some(PresetRef::Catalogue("Doom Forge".into()))
    );
    let grid = d.tree().at("/themes/doom-forge").unwrap().value("gridLine");
    assert_eq!(grid, Some(Value::Colour(rgba("#333333"))));
    assert!(!d.is_unsaved(), "the seed isn't an unsaved edit");
}

#[test]
fn use_makes_a_theme_and_points_the_map_at_it() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    assert_eq!(follows(&d, &map), None, "a new map follows the campaign");
    use_preset(&mut d, &map, "Space Opera");
    assert_eq!(themes(&d), ["/themes/doom-forge", "/themes/space-opera"]);
    assert_eq!(follows(&d, &map).as_deref(), Some("/themes/space-opera"));
    assert_eq!(d.tree().undo_label(), Some("Use Palette"));
}

#[test]
fn use_reuses_a_theme_that_already_matches() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    // the seeded Doom Forge is reused, not copied
    use_preset(&mut d, &map, "Doom Forge");
    assert_eq!(themes(&d), ["/themes/doom-forge"]);
    assert_eq!(follows(&d, &map).as_deref(), Some("/themes/doom-forge"));
    // a second use of a made theme adds nothing
    use_preset(&mut d, &map, "Data Nexus");
    use_preset(&mut d, "/campaign/campaign", "Data Nexus");
    assert_eq!(themes(&d).len(), 2);
    assert_eq!(
        follows(&d, "/campaign/campaign").as_deref(),
        Some("/themes/data-nexus")
    );
}

#[test]
fn an_edited_theme_no_longer_matches_so_use_makes_a_fresh_one() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    run(
        &mut d,
        "value.set",
        json!({ "at": "/themes/doom-forge", "key": "gridLine", "value": [1.0, 0.0, 0.0, 1.0] }),
    )
    .unwrap();
    use_preset(&mut d, &map, "Doom Forge");
    assert_eq!(themes(&d), ["/themes/doom-forge", "/themes/doom-forge-2"]);
    assert_eq!(follows(&d, &map).as_deref(), Some("/themes/doom-forge-2"));
}

#[test]
fn use_a_theme_by_path() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    use_preset(&mut d, &map, "Street Level");
    run(
        &mut d,
        "palette.use",
        json!({ "at": "/campaign/campaign", "theme": "/themes/street-level" }),
    )
    .unwrap();
    assert_eq!(
        follows(&d, "/campaign/campaign").as_deref(),
        Some("/themes/street-level")
    );
    assert_eq!(themes(&d).len(), 2);
}

#[test]
fn a_map_follows_the_campaign_once_cleared() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    use_preset(&mut d, &map, "Space Opera");
    run(&mut d, "palette.use", json!({ "at": map })).unwrap();
    assert_eq!(ref_of(&d, &map), None);
    // the campaign is untouched and still has its theme
    assert_eq!(
        follows(&d, "/campaign/campaign").as_deref(),
        Some("/themes/doom-forge")
    );
    // and the theme the map left stays: themes are the user's to delete
    assert_eq!(themes(&d).len(), 2);
}

#[test]
fn the_campaign_must_name_a_palette() {
    let mut d = new_doc();
    assert!(run(&mut d, "palette.use", json!({ "at": "/campaign/campaign" })).is_err());
}

#[test]
fn bad_arguments_are_refused() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    for p in [
        json!({ "at": map, "preset": "Nope" }),
        json!({ "at": map, "theme": "/maps" }),
        json!({ "at": map, "theme": "/themes/nope" }),
        json!({ "at": map, "preset": "Doom Forge", "theme": "/themes/doom-forge" }),
        json!({ "at": "/themes/doom-forge", "preset": "Doom Forge" }),
        json!({ "at": "/nowhere", "preset": "Doom Forge" }),
    ] {
        assert!(run(&mut d, "palette.use", p.clone()).is_err(), "{p}");
    }
    assert_eq!(themes(&d).len(), 1);
}

#[test]
fn undo_takes_a_use_back_in_one_step() {
    let mut d = new_doc();
    let map = add_map(&mut d);
    use_preset(&mut d, &map, "Gloomy Garden");
    assert_eq!(themes(&d).len(), 2);
    d.undo().unwrap();
    // the theme made for it goes too, and the map follows the campaign again
    assert_eq!(themes(&d).len(), 1);
    assert_eq!(ref_of(&d, &map), None);
    d.redo().unwrap();
    assert_eq!(follows(&d, &map).as_deref(), Some("/themes/gloomy-garden"));
}

#[test]
fn the_catalogue_lists_the_nine_built_ins_with_swatches() {
    let mut d = new_doc();
    let Outcome::Text(t) = run(&mut d, "palette.catalogue", json!({})).unwrap() else {
        panic!("text");
    };
    let list: Vec<Json> = serde_json::from_str(&t).unwrap();
    let names: Vec<&str> = list.iter().map(|e| e["name"].as_str().unwrap()).collect();
    assert_eq!(
        names,
        [
            "Doom Forge",
            "Space Opera",
            "Event Horizon",
            "Gloomy Garden",
            "Excess Throne",
            "Data Nexus",
            "Street Level",
            "Brittle Empire",
            "Hostile Waters"
        ]
    );
    let doom = &list[0];
    assert_eq!(doom["description"], "Apocalyptic metal and dying embers");
    // five palette colours, then the terrains'
    assert_eq!(doom["swatches"].as_array().unwrap().len(), 5 + 5);
    assert_eq!(doom["swatches"][0], "#333333");
    // the catalogue is also POM's preset list for a palette
    let id = id_of(&d, "/themes/doom-forge");
    let presets = d.preset_names(id).unwrap();
    assert_eq!(presets.len(), 9);
    assert_eq!(presets[0], PresetRef::Catalogue("Doom Forge".into()));
}

// ---- colour parity with the 2025 source ----

const TS: &str = include_str!("../../../src/palettes/settings.ts");

fn quoted(line: &str, key: &str) -> Option<String> {
    let rest = line.trim().strip_prefix(key)?.strip_prefix(": '")?;
    Some(rest[..rest.find('\'')?].to_string())
}

fn hex(h: &str) -> [f64; 4] {
    let n = |i: usize| f64::from(u8::from_str_radix(&h[i..i + 2], 16).unwrap()) / 255.0;
    [n(1), n(3), n(5), 1.0]
}

/// The 2025 settings read straight from `settings.ts`, line by line.
fn parse_2025() -> Vec<PaletteState> {
    use super::palette::TerrainState;
    let mut out: Vec<PaletteState> = Vec::new();
    let (mut in_palette, mut in_terrains) = (false, false);
    let mut terrain: Option<TerrainState> = None;
    for line in TS.lines() {
        let l = line.trim();
        if l.starts_with("static readonly") && l.contains("TerrainSetting =") {
            out.push(PaletteState {
                name: String::new(),
                description: String::new(),
                grid_line: [0.0; 4],
                primary: [0.0; 4],
                secondary: [0.0; 4],
                accent: [0.0; 4],
                background: [0.0; 4],
                terrains: vec![],
            });
            (in_palette, in_terrains) = (false, false);
            continue;
        }
        let Some(cur) = out.last_mut() else { continue };
        if l.starts_with("palette: {") {
            in_palette = true;
        } else if l.starts_with("terrains: [") {
            (in_palette, in_terrains) = (false, true);
        } else if in_terrains {
            if l.starts_with("id:") {
                terrain = Some(TerrainState {
                    id: quoted(l, "id").unwrap(),
                    base_type: String::new(),
                    traits: vec![],
                    name: String::new(),
                    colour: [0.0; 4],
                    description: None,
                });
            } else if let Some(t) = terrain.as_mut() {
                if let Some(b) = l.strip_prefix("baseType: BaseTerrainType.") {
                    t.base_type = b.trim_end_matches(',').to_lowercase();
                } else if let Some(tr) = l.strip_prefix("traits: [") {
                    t.traits = tr
                        .trim_end_matches("],")
                        .split(',')
                        .map(|x| x.trim().trim_start_matches("TerrainTrait.").to_lowercase())
                        .collect();
                } else if let Some(n) = quoted(l, "themedName") {
                    t.name = n;
                } else if let Some(c) = quoted(l, "color") {
                    t.colour = hex(&c);
                } else if let Some(x) = quoted(l, "description") {
                    t.description = Some(x);
                } else if l == "}," {
                    cur.terrains.push(terrain.take().unwrap());
                }
            }
        } else if in_palette {
            if let Some(v) = quoted(l, "name") {
                cur.name = v;
            } else if let Some(v) = quoted(l, "description") {
                cur.description = v;
            } else if let Some(v) = quoted(l, "gridLine") {
                cur.grid_line = hex(&v);
            } else if let Some(v) = quoted(l, "primary") {
                cur.primary = hex(&v);
            } else if let Some(v) = quoted(l, "secondary") {
                cur.secondary = hex(&v);
            } else if let Some(v) = quoted(l, "accent") {
                cur.accent = hex(&v);
            } else if let Some(v) = quoted(l, "background") {
                cur.background = hex(&v);
            }
        }
    }
    out
}

#[test]
fn catalogue_matches_2025() {
    let ts = parse_2025();
    let rust = catalogue();
    assert_eq!(ts.len(), 9, "settings.ts has nine settings");
    assert_eq!(rust.len(), ts.len());
    for ((name, mine), theirs) in rust.iter().zip(&ts) {
        assert_eq!(*name, theirs.name);
        assert_eq!(
            mine.terrains.len(),
            theirs.terrains.len(),
            "{name}: terrain count"
        );
        // whole-state equality covers every colour, trait, name and description
        assert_eq!(mine, theirs, "{name}");
    }
    let terrains: usize = ts.iter().map(|s| s.terrains.len()).sum();
    assert_eq!(terrains, 50, "the parser saw every terrain");
}
