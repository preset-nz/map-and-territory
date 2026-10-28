//! The page layout: the map's place, the key's lines, and what the document says about both.

use rhizome_core::IdSource;
use rhizome_pom::{Document, MemoryStore};
use serde_json::json;

use super::kinds::{ASPECTS, MAP_LAYOUTS};
use super::locations::{Key, KeyEntry};
use super::print::{
    lay_out, map_stands_up, mm_to_pt, sheet, text_width, wrap, MapLayout, PageSize, PageSpec, Sheet,
};
use super::{MapAndTerritory, CAMPAIGN};

type Doc = Document<MapAndTerritory>;

fn page(size: PageSize, landscape: bool, margin_mm: f64) -> PageSpec {
    PageSpec {
        size,
        landscape,
        margin_mm,
    }
}

fn a4(margin_mm: f64) -> PageSpec {
    page(PageSize::A4, false, margin_mm)
}

fn near(a: f64, b: f64) {
    assert!((a - b).abs() < 1e-6, "{a} vs {b}");
}

/// The map's rectangle in mm.
fn map_mm(s: &Sheet) -> [f64; 4] {
    let mm = |pt: f64| pt / mm_to_pt(1.0);
    [mm(s.map.x), mm(s.map.y), mm(s.map.w), mm(s.map.h)]
}

fn place(n: u32, name: &str, hidden: bool) -> KeyEntry {
    KeyEntry {
        number: Some(n),
        name: name.into(),
        category: "Landmark".into(),
        description: "Held by the Vane since the flood (they say).".into(),
        hidden,
    }
}

fn key_of(n: u32) -> Key {
    Key {
        map: "Fen".into(),
        entries: (1..=n)
            .map(|n| place(n, &format!("Place {n}"), false))
            .collect(),
    }
}

#[test]
fn sizes_a4_and_a5_and_swaps_for_landscape() {
    let s = lay_out(a4(10.0), 1.0, MapLayout::default(), None);
    near(s.page.0, mm_to_pt(210.0));
    near(s.page.1, mm_to_pt(297.0));
    assert_eq!(page(PageSize::A5, false, 10.0).page_mm(), (148.0, 210.0));
    assert_eq!(page(PageSize::A5, true, 10.0).page_mm(), (210.0, 148.0));
    near(mm_to_pt(25.4), 72.0);
    assert!((mm_to_pt(210.0) - 595.28).abs() < 0.01);
}

#[test]
fn a_wide_map_is_full_width_inside_the_margins_at_the_top() {
    let s = lay_out(a4(10.0), 16.0 / 10.0, MapLayout::Top(1), None);
    let [x, y, w, h] = map_mm(&s);
    near(x, 10.0);
    near(y, 10.0);
    near(w, 190.0);
    near(h, 118.75);
}

#[test]
fn bottom_alone_and_the_columns_place_the_map_by_their_layout() {
    let at = |layout| map_mm(&lay_out(a4(10.0), 16.0 / 9.0, layout, None));
    let h = 190.0 / (16.0 / 9.0);
    near(at(MapLayout::Top(1))[1], 10.0);
    near(at(MapLayout::Top(2))[1], 10.0);
    near(at(MapLayout::Top(3))[1], 10.0);
    near(at(MapLayout::Bottom)[1], 297.0 - 10.0 - h);
    near(at(MapLayout::Alone)[1], (297.0 - h) / 2.0);
    // the shape is the map's whatever the layout
    near(at(MapLayout::Bottom)[3], h);
}

#[test]
fn every_paper_aspect_stays_on_the_page_and_keeps_its_shape() {
    for size in [PageSize::A5, PageSize::A4] {
        for landscape in [false, true] {
            for aspect in [1.0, 4.0 / 3.0, 1.6, 0.625, 0.25] {
                let p = page(size, landscape, 10.0);
                let s = lay_out(p, aspect, MapLayout::Top(1), None);
                let [x, y, w, h] = map_mm(&s);
                let (pw, ph) = p.page_mm();
                assert!(x >= -1e-9 && y >= -1e-9);
                assert!(x + w <= pw + 1e-9 && y + h <= ph + 1e-9);
                near(w / h, aspect);
                let (rw, rh) = s.map_px;
                assert!(f64::from(rw) <= (pw / 25.4 * 300.0).ceil());
                assert!(f64::from(rh) <= (ph / 25.4 * 300.0).ceil());
            }
        }
    }
}

#[test]
fn a_map_too_tall_for_the_width_fits_the_height_and_is_centred_across() {
    let s = lay_out(page(PageSize::A4, true, 10.0), 1.0, MapLayout::Top(1), None);
    let [x, y, w, h] = map_mm(&s);
    near(h, 190.0);
    near(w, 190.0);
    near(y, 10.0);
    near(x, 10.0 + (277.0 - 190.0) / 2.0);
    near(x + w / 2.0, 297.0 / 2.0);
    // a very tall map on A5
    let s = lay_out(
        page(PageSize::A5, false, 10.0),
        0.25,
        MapLayout::Top(1),
        None,
    );
    let [x, _, w, h] = map_mm(&s);
    near(h, 190.0);
    near(w, 47.5);
    near(x + w / 2.0, 74.0);
}

#[test]
fn zero_margin_fills_the_page_when_the_aspect_matches() {
    let s = lay_out(a4(0.0), 210.0 / 297.0, MapLayout::Top(1), None);
    assert_eq!(map_mm(&s).map(f64::round), [0.0, 0.0, 210.0, 297.0]);
    assert_eq!(s.map_px, (2480, 3508));
    let s = lay_out(a4(0.0), 1.0, MapLayout::Top(1), None);
    assert_eq!(map_mm(&s).map(f64::round), [0.0, 0.0, 210.0, 210.0]);
}

#[test]
fn pixel_edges_are_rounded_and_the_size_is_their_difference() {
    // A5, 10 mm margin, square: 10 mm is 118.11 px, 138 mm is 1629.92 px
    let s = lay_out(
        page(PageSize::A5, false, 10.0),
        1.0,
        MapLayout::Top(1),
        None,
    );
    assert_eq!(s.map_px, (1630 - 118, 1630 - 118));
}

#[test]
fn a_margin_larger_than_the_page_leaves_a_zero_map_inside_it() {
    let s = lay_out(
        page(PageSize::A5, false, 500.0),
        1.6,
        MapLayout::Top(1),
        None,
    );
    assert_eq!(s.map.w, 0.0);
    assert_eq!(s.map.h, 0.0);
    assert_eq!(s.map_px, (0, 0));
    assert!(s.map.x <= s.page.0);
    let s = lay_out(
        page(PageSize::A5, false, -5.0),
        1.0,
        MapLayout::Top(1),
        None,
    );
    near(map_mm(&s)[0], 0.0);
}

#[test]
fn the_key_runs_from_the_page_margin_not_from_the_maps_left_edge() {
    // landscape A4, a square map: it fits the height and sits 43.5 mm in from the margin
    let p = page(PageSize::A4, true, 10.0);
    let key = key_of(3);
    let s = lay_out(p, 1.0, MapLayout::Top(1), Some(&key));
    assert!(map_mm(&s)[0] > 40.0);
    // the map fills the height, so the key is on pages of its own
    assert!(!s.key[0].on_map_page);
    let margin = mm_to_pt(10.0);
    let title = &s.key[0].runs[0];
    assert_eq!(title.text, "Key to Fen");
    near(title.x, margin);
    for run in s.key.iter().flat_map(|p| &p.runs) {
        assert!(run.x >= margin - 1e-9, "{run:?}");
    }
    near(title.y, margin + 16.0);
}

#[test]
fn a_small_margin_is_kept_not_raised_to_a_floor() {
    let key = key_of(3);
    let s = lay_out(a4(2.0), 1.6, MapLayout::Top(1), Some(&key));
    let first = &s.key[0];
    assert!(first.on_map_page);
    near(first.runs[0].x, mm_to_pt(2.0));
    // the numbers sit at the margin too
    let one = first.runs.iter().find(|r| r.text == "1").unwrap();
    near(one.x, mm_to_pt(2.0));
}

#[test]
fn map_top_sets_the_key_under_the_map_on_the_maps_page() {
    let key = key_of(3);
    let s = lay_out(a4(10.0), 1.6, MapLayout::Top(1), Some(&key));
    assert_eq!(s.key.len(), 1);
    assert!(s.key[0].on_map_page);
    let map_bottom = s.map.y + s.map.h;
    for run in &s.key[0].runs {
        assert!(run.y > map_bottom + 14.0, "{run:?}");
        assert!(run.y <= s.page.1 - mm_to_pt(10.0) + 1e-9, "{run:?}");
    }
}

#[test]
fn a_map_that_fills_the_page_leaves_the_key_pages_of_its_own() {
    let key = key_of(3);
    let s = lay_out(a4(10.0), 190.0 / 277.0, MapLayout::Top(1), Some(&key));
    assert_eq!(s.key.len(), 1);
    assert!(!s.key[0].on_map_page);
}

#[test]
fn the_columns_fill_each_before_the_next() {
    let key = key_of(30);
    let s = lay_out(a4(10.0), 1.6, MapLayout::Top(3), Some(&key));
    let x_of = |name: &str| {
        s.key
            .iter()
            .flat_map(|p| &p.runs)
            .find(|r| r.text == name)
            .unwrap_or_else(|| panic!("{name}"))
            .x
    };
    let mut cols: Vec<f64> = (1..=30).map(|n| x_of(&format!("Place {n}"))).collect();
    cols.dedup();
    assert!(cols.len() >= 3, "{cols:?}");
    // never back to an earlier column within a page
    assert!(cols[0] < cols[1] && cols[1] < cols[2]);
    // the three columns sit between the margins
    let margin = mm_to_pt(10.0);
    assert!(cols.iter().all(|&x| x >= margin));
}

#[test]
fn bottom_sets_the_key_above_the_map() {
    let key = key_of(3);
    let s = lay_out(a4(10.0), 1.6, MapLayout::Bottom, Some(&key));
    assert_eq!(s.key.len(), 1);
    assert!(s.key[0].on_map_page);
    let top = mm_to_pt(10.0);
    for run in &s.key[0].runs {
        assert!(run.y > top && run.y < s.map.y - 14.0 + 1e-9, "{run:?}");
    }
}

#[test]
fn alone_puts_the_whole_key_after_the_map() {
    let s = lay_out(a4(10.0), 1.6, MapLayout::Alone, Some(&key_of(3)));
    assert_eq!(s.key.len(), 1);
    assert!(!s.key[0].on_map_page);
}

#[test]
fn a_long_key_runs_on_to_more_pages_in_order() {
    let mut key = key_of(60);
    for e in &mut key.entries {
        e.description = "A long line about what waits there, ".repeat(4);
    }
    let s = lay_out(a4(10.0), 1.6, MapLayout::Alone, Some(&key));
    assert!(s.key.len() > 2, "{} pages", s.key.len());
    assert!(s.key.iter().skip(1).all(|p| !p.on_map_page));
    let names: Vec<&str> = s
        .key
        .iter()
        .flat_map(|p| &p.runs)
        .filter(|r| r.text.starts_with("Place "))
        .map(|r| r.text.as_str())
        .collect();
    assert_eq!(names.len(), 60);
    assert_eq!(names[0], "Place 1");
    assert_eq!(names[59], "Place 60");
    // every run is inside the page's margins
    let (pw, ph) = s.page;
    let m = mm_to_pt(10.0);
    for r in s.key.iter().flat_map(|p| &p.runs) {
        assert!(r.x >= m - 1e-9 && r.x < pw - m, "{r:?}");
        assert!(r.y <= ph - m + 1e-9, "{r:?}");
    }
}

#[test]
fn hidden_places_and_an_empty_key_print_nothing() {
    let mut key = key_of(2);
    key.entries[1].hidden = true;
    let s = lay_out(a4(10.0), 1.6, MapLayout::Alone, Some(&key));
    let texts: Vec<&str> = s.key[0].runs.iter().map(|r| r.text.as_str()).collect();
    assert!(texts.contains(&"Place 1"));
    assert!(!texts.contains(&"Place 2"));
    key.entries.clear();
    assert!(lay_out(a4(10.0), 1.6, MapLayout::Alone, Some(&key))
        .key
        .is_empty());
    assert!(lay_out(a4(10.0), 1.6, MapLayout::Alone, None)
        .key
        .is_empty());
}

#[test]
fn a_category_is_grey_after_the_name_and_a_number_and_name_are_bold() {
    let s = lay_out(a4(10.0), 1.6, MapLayout::Alone, Some(&key_of(1)));
    let runs = &s.key[0].runs;
    let get = |t: &str| runs.iter().find(|r| r.text == t).unwrap();
    assert!(get("1").bold && get("Place 1").bold);
    assert!(get("Landmark").grey && !get("Landmark").bold);
    assert!(get("Landmark").x > get("Place 1").x);
    near(get("Landmark").y, get("Place 1").y);
}

#[test]
fn wrapping_breaks_at_spaces_within_the_width() {
    let lines = wrap("one two three four", 10.0, 40.0);
    assert_eq!(lines, ["one two", "three", "four"]);
    assert!(lines.iter().all(|l| text_width(l, 10.0) <= 40.0));
}

#[test]
fn layout_names_parse_and_unknown_ones_do_not() {
    assert_eq!(MapLayout::parse("key-after"), Some(MapLayout::Alone));
    assert_eq!(MapLayout::parse("map-top-3col"), Some(MapLayout::Top(3)));
    assert_eq!(MapLayout::parse("anything"), None);
    assert_eq!(MapLayout::parse(""), None);
    assert_eq!(MapLayout::default(), MapLayout::Top(1));
}

#[test]
fn the_layout_name_list_and_the_enum_agree() {
    for name in MAP_LAYOUTS {
        let layout = MapLayout::parse(name).unwrap_or_else(|| panic!("{name} doesn't parse"));
        assert_eq!(layout.name(), *name);
    }
    for layout in [
        MapLayout::Top(1),
        MapLayout::Top(2),
        MapLayout::Top(3),
        MapLayout::Bottom,
        MapLayout::Alone,
    ] {
        assert!(MAP_LAYOUTS.contains(&layout.name()), "{}", layout.name());
    }
    assert_eq!(MAP_LAYOUTS.len(), 5);
}

// ---- from the document ----

const MAP: &str = "/maps/map";

fn doc() -> Doc {
    let mut d = Document::new_with_ids(MemoryStore::default(), IdSource::sequential()).unwrap();
    d.run("node.add", &json!({ "parent": "/maps", "type": "map" }))
        .unwrap();
    d
}

fn set(d: &mut Doc, at: &str, key: &str, value: serde_json::Value) {
    d.run(
        "value.set",
        &json!({ "at": at, "key": key, "value": value }),
    )
    .unwrap();
}

#[test]
fn a_fresh_document_lays_out_a_16_10_map_at_the_top_of_an_a5_page() {
    let d = doc();
    let s = sheet(&d, MAP).unwrap();
    near(s.page.0, mm_to_pt(148.0));
    let [x, y, w, h] = map_mm(&s);
    near(x, 10.0);
    near(y, 10.0);
    near(w, 128.0);
    near(h, 80.0);
    assert!(s.key.is_empty());
    assert!(sheet(&d, "/maps/nope").is_none());
    assert!(sheet(&d, CAMPAIGN).is_none(), "not a map");
}

#[test]
fn the_page_the_paper_and_the_layout_come_from_the_document() {
    let mut d = doc();
    set(&mut d, CAMPAIGN, "pageSize", json!("a4"));
    set(&mut d, CAMPAIGN, "pageOrientation", json!("landscape"));
    set(&mut d, CAMPAIGN, "pageMargin", json!(2.0));
    let paper = format!("{MAP}/paper");
    set(&mut d, &paper, "aspect", json!("square"));
    set(&mut d, MAP, "layout", json!("map-bottom"));
    let spec = PageSpec::read(&d);
    assert_eq!(spec, page(PageSize::A4, true, 2.0));
    let s = sheet(&d, MAP).unwrap();
    // a square on landscape A4 with a 2 mm margin fills the height, so the layout's place makes no difference
    let [x, y, w, h] = map_mm(&s);
    near(w, 206.0);
    near(h, 206.0);
    near(y, 2.0);
    near(x, 2.0 + (293.0 - 206.0) / 2.0);
}

#[test]
fn a_map_alone_turns_with_the_page_and_a_map_with_its_key_lies_across_it() {
    let mut d = doc();
    let paper = format!("{MAP}/paper");
    // the campaign's page is portrait by default; the map's layout is map-top
    let [_, _, w, h] = map_mm(&sheet(&d, MAP).unwrap());
    near(w / h, 1.6);
    set(&mut d, MAP, "layout", json!("map-full"));
    // 10:16 on A5 inside 10 mm margins (128 x 190): height-limited
    let [_, _, w, h] = map_mm(&sheet(&d, MAP).unwrap());
    near(w / h, 0.625);
    near(h, 190.0);
    // turning the campaign's page lays it down again, with nothing set on the map
    set(
        &mut d,
        "/campaign/campaign",
        "pageOrientation",
        json!("landscape"),
    );
    let [_, _, w, h] = map_mm(&sheet(&d, MAP).unwrap());
    near(w / h, 1.6);
    assert!(map_stands_up(
        MapLayout::Alone,
        &page(PageSize::A5, false, 10.0)
    ));
    assert!(!map_stands_up(
        MapLayout::Top(1),
        &page(PageSize::A5, false, 10.0)
    ));
    assert!(!map_stands_up(
        MapLayout::Bottom,
        &page(PageSize::A5, false, 10.0)
    ));
    assert!(!map_stands_up(
        MapLayout::Alone,
        &page(PageSize::A5, true, 10.0)
    ));
    for aspect in ASPECTS {
        set(&mut d, &paper, "aspect", json!(aspect));
        assert!(sheet(&d, MAP).is_some());
    }
}

#[test]
fn the_maps_key_is_laid_out_without_its_hidden_places() {
    let mut d = doc();
    d.run("node.add", &json!({ "parent": MAP, "type": "locations" }))
        .unwrap();
    let layer = format!("{MAP}/locations");
    for name in ["Reedwall Keep", "Sunken Chapel"] {
        d.run(
            "locations.add",
            &json!({ "at": layer, "q": 0, "r": 0, "name": name }),
        )
        .unwrap();
    }
    let chapel = d.tree().at(&layer).unwrap().order("locations")[1].path();
    set(&mut d, &chapel.to_string(), "hidden", json!(true));
    let s = sheet(&d, MAP).unwrap();
    let texts: Vec<String> = s
        .key
        .iter()
        .flat_map(|p| &p.runs)
        .map(|r| r.text.clone())
        .collect();
    assert!(texts.iter().any(|t| t == "Reedwall Keep"));
    assert!(!texts.iter().any(|t| t == "Sunken Chapel"));
}
