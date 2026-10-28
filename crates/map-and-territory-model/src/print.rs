//! The printed page, laid out once (epic 33 story 3): where a map sits on the campaign's page
//! and where each line of its key goes. The PDF draws from a [`Sheet`] today and Booklet mode
//! will (epic 32 story 5), so the window and the print never lay a page out twice.
//!
//! Everything a [`Sheet`] holds is in points from the page's top-left, except the map's pixel
//! size. [`lay_out`] is pure; [`sheet`] reads the page, the map's shape, its layout and its key
//! from the document and calls it.

use rhizome_core::{Node, Value};
use rhizome_pom::Document;

use super::kinds::{DEFAULT_PAGE_MARGIN_MM, DEFAULT_PAGE_ORIENTATION, DEFAULT_PAGE_SIZE};
use super::locations::{self, Key, KeyEntry};
use super::{MapAndTerritory, CAMPAIGN};

type Doc = Document<MapAndTerritory>;

const MM_PER_INCH: f64 = 25.4;
const POINTS_PER_INCH: f64 = 72.0;
/// The resolution a map is drawn at for print.
pub const PRINT_DPI: f64 = 300.0;

/// Millimetres to PDF points, not rounded.
pub fn mm_to_pt(mm: f64) -> f64 {
    mm / MM_PER_INCH * POINTS_PER_INCH
}

/// Millimetres to whole pixels at [`PRINT_DPI`].
fn mm_to_px(mm: f64) -> f64 {
    (mm / MM_PER_INCH * PRINT_DPI).round()
}

/// How a map's page is laid out (epic 32, from Georg's sketch): where the map sits and where
/// its key goes. The map keeps its own shape; the layout gives it its place and size, and the
/// key fills the rest.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MapLayout {
    /// The map at the top, the key under it in this many columns (1 to 3).
    Top(usize),
    /// The key at the top, the map at the foot.
    Bottom,
    /// The map alone, as large as the page allows; the key on pages of its own.
    Alone,
}

impl Default for MapLayout {
    fn default() -> Self {
        Self::Top(1)
    }
}

impl MapLayout {
    /// The map's `layout` value, or None for a name this doesn't know. `key-after` was
    /// story 1's name for the map alone; files from then still say it.
    pub fn parse(s: &str) -> Option<Self> {
        Some(match s {
            "map-top" => Self::Top(1),
            "map-top-2col" => Self::Top(2),
            "map-top-3col" => Self::Top(3),
            "map-bottom" => Self::Bottom,
            "map-full" | "key-after" => Self::Alone,
            _ => return None,
        })
    }

    /// The `layout` value that names this layout; one of `MAP_LAYOUTS`.
    pub fn name(self) -> &'static str {
        match self {
            Self::Top(2) => "map-top-2col",
            Self::Top(n) if n >= 3 => "map-top-3col",
            Self::Top(_) => "map-top",
            Self::Bottom => "map-bottom",
            Self::Alone => "map-full",
        }
    }

    fn align(self) -> Align {
        match self {
            Self::Top(_) => Align::Top,
            Self::Bottom => Align::Bottom,
            Self::Alone => Align::Centre,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Align {
    Top,
    Bottom,
    Centre,
}

/// The paper sizes the campaign offers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PageSize {
    A5,
    A4,
}

impl PageSize {
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "a5" => Some(Self::A5),
            "a4" => Some(Self::A4),
            _ => None,
        }
    }

    /// Portrait width and height in mm.
    fn mm(self) -> (f64, f64) {
        match self {
            Self::A5 => (148.0, 210.0),
            Self::A4 => (210.0, 297.0),
        }
    }
}

/// The campaign's page: its paper, which way up, and the white border around the map.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PageSpec {
    pub size: PageSize,
    pub landscape: bool,
    /// On all four sides, in mm.
    pub margin_mm: f64,
}

impl Default for PageSpec {
    fn default() -> Self {
        Self {
            size: PageSize::parse(DEFAULT_PAGE_SIZE).unwrap_or(PageSize::A5),
            landscape: DEFAULT_PAGE_ORIENTATION == "landscape",
            margin_mm: DEFAULT_PAGE_MARGIN_MM,
        }
    }
}

impl PageSpec {
    /// The page in mm, width then height, turned for landscape.
    pub fn page_mm(&self) -> (f64, f64) {
        let (w, h) = self.size.mm();
        if self.landscape {
            (h, w)
        } else {
            (w, h)
        }
    }

    /// The margin as laid out: not negative, and not more than half the shorter side.
    fn margin_mm_clamped(&self) -> f64 {
        let (w, h) = self.page_mm();
        self.margin_mm.clamp(0.0, w.min(h) / 2.0)
    }

    /// The page from the campaign node; the defaults for anything missing or unrecognised.
    pub fn read(d: &Doc) -> Self {
        let mut page = Self::default();
        let Some(campaign) = d.tree().at(CAMPAIGN) else {
            return page;
        };
        if let Some(Value::Choice(c)) = campaign.value("pageSize") {
            page.size = PageSize::parse(&c).unwrap_or(page.size);
        }
        if let Some(Value::Choice(c)) = campaign.value("pageOrientation") {
            page.landscape = c == "landscape";
        }
        if let Some(Value::Float(m)) = campaign.value("pageMargin") {
            if m.is_finite() {
                page.margin_mm = m;
            }
        }
        page
    }
}

/// A rectangle in points from the page's top-left.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

/// One line of the key, set at a baseline.
#[derive(Debug, Clone, PartialEq)]
pub struct Run {
    /// The left edge, in points.
    pub x: f64,
    /// The baseline, in points from the page's top.
    pub y: f64,
    pub size: f64,
    pub bold: bool,
    /// Set in grey, for the category after a name.
    pub grey: bool,
    pub text: String,
}

/// One page of the key.
#[derive(Debug, Clone, PartialEq)]
pub struct KeyPage {
    /// Shares the map's page; only ever the first.
    pub on_map_page: bool,
    pub runs: Vec<Run>,
}

/// A map on its page, with its key.
#[derive(Debug, Clone, PartialEq)]
pub struct Sheet {
    /// The page's width and height, in points.
    pub page: (f64, f64),
    /// Where the map sits, in points.
    pub map: Rect,
    /// The map's size in pixels at [`PRINT_DPI`].
    pub map_px: (u32, u32),
    /// The key's pages in order; none when no place prints.
    pub key: Vec<KeyPage>,
}

// The key's sizes, in points.
const KEY_TITLE: f64 = 16.0;
const KEY_NAME: f64 = 11.0;
const KEY_TEXT: f64 = 9.5;
/// Space above each place, in points.
const KEY_GAP: f64 = 7.0;
/// Space between the map and its key, in points.
const UNDER_MAP: f64 = 14.0;
/// Space between key columns, in points.
const COLUMN_GAP: f64 = 14.0;
/// Space under the heading, as a share of its size.
const TITLE_GAP: f64 = 0.8;
/// A name's line is its size plus this share of it, for descenders.
const NAME_LEAD: f64 = 0.25;
/// A line of description is this many times its size.
const TEXT_LINE: f64 = 1.3;
/// A category set under a narrow column's name drops this many times its size.
const CATEGORY_DROP: f64 = 1.2;
/// Space between a name and its category, as a share of the name's size.
const NAME_TO_CATEGORY: f64 = 0.6;
/// Helvetica Bold sets about a tenth wider than the width estimate for regular.
const BOLD_WIDTH: f64 = 1.1;

/// About how wide `text` sets in Helvetica at `size` points: close enough to wrap by.
pub fn text_width(text: &str, size: f64) -> f64 {
    let em: f64 = text
        .chars()
        .map(|c| match c {
            'i' | 'j' | 'l' | '.' | ',' | '\'' | '!' | ':' | ';' | '|' | 'I' => 0.24,
            'f' | 't' | 'r' | ' ' | '(' | ')' | '-' => 0.33,
            'm' | 'w' | 'M' | 'W' => 0.85,
            'A'..='Z' => 0.68,
            _ => 0.55,
        })
        .sum();
    em * size
}

/// `text` broken into lines no wider than `width` at `size`, at spaces.
pub fn wrap(text: &str, size: f64, width: f64) -> Vec<String> {
    let mut lines = Vec::new();
    for para in text.lines() {
        let mut line = String::new();
        for word in para.split_whitespace() {
            let next = if line.is_empty() {
                word.to_string()
            } else {
                format!("{line} {word}")
            };
            if !line.is_empty() && text_width(&next, size) > width {
                lines.push(std::mem::replace(&mut line, word.to_string()));
            } else {
                line = next;
            }
        }
        lines.push(line);
    }
    lines
}

/// Where the key may go on a page: between two heights, in points from the page's top.
#[derive(Debug, Clone, Copy)]
struct Band {
    top: f64,
    bottom: f64,
}

/// The key's pages. With `first`, it starts on the map's own page in that band, when the heading
/// and the first place fit there; it runs on to pages of its own, filling `cols` columns top to
/// bottom, left to right, before a new page. Empty when no place prints.
fn key_pages(
    key: &Key,
    page: (f64, f64),
    margin: f64,
    first: Option<Band>,
    cols: usize,
) -> Vec<KeyPage> {
    let entries: Vec<&KeyEntry> = key.printable().collect();
    if entries.is_empty() {
        return Vec::new();
    }
    let cols = cols.max(1);
    let width = page.0 - 2.0 * margin;
    let col_w = (width - COLUMN_GAP * (cols - 1) as f64) / cols as f64;
    let full = Band {
        top: margin,
        bottom: page.1 - margin,
    };
    let indent = text_width("000 ", KEY_NAME);
    let body_of = |e: &KeyEntry| -> Vec<String> {
        wrap(e.description.trim(), KEY_TEXT, col_w - indent)
            .into_iter()
            .filter(|l| !l.is_empty())
            .collect()
    };
    let height_of = |body: &[String]| {
        KEY_GAP + KEY_NAME * (1.0 + NAME_LEAD) + body.len() as f64 * KEY_TEXT * TEXT_LINE
    };
    let heading = KEY_TITLE * (1.0 + TITLE_GAP);
    let first = first.filter(|b| b.top + heading + height_of(&body_of(entries[0])) <= b.bottom);
    let on_map_page = first.is_some();

    let mut pages: Vec<KeyPage> = Vec::new();
    let mut runs: Vec<Run> = Vec::new();
    let mut band = first.unwrap_or(full);
    let push =
        |runs: &mut Vec<Run>, size: f64, bold: bool, grey: bool, x: f64, y: f64, text: &str| {
            if !text.is_empty() {
                runs.push(Run {
                    x,
                    y,
                    size,
                    bold,
                    grey,
                    text: text.to_string(),
                });
            }
        };
    let mut y = band.top;
    let mut col = 0;
    let mut in_col = 0;
    let title = if key.map.trim().is_empty() {
        "Key".to_string()
    } else {
        format!("Key to {}", key.map.trim())
    };
    y += KEY_TITLE;
    push(&mut runs, KEY_TITLE, true, false, margin, y, &title);
    y += KEY_TITLE * TITLE_GAP;
    // the columns start under the heading on its page
    let mut col_top = y;
    for e in entries {
        let body = body_of(e);
        if y + height_of(&body) > band.bottom && in_col > 0 {
            col += 1;
            in_col = 0;
            if col == cols {
                pages.push(KeyPage {
                    on_map_page: on_map_page && pages.is_empty(),
                    runs: std::mem::take(&mut runs),
                });
                band = full;
                col = 0;
                col_top = band.top;
            }
            y = col_top;
        }
        in_col += 1;
        let x = margin + col as f64 * (col_w + COLUMN_GAP);
        y += KEY_GAP + KEY_NAME;
        if let Some(n) = e.number {
            push(&mut runs, KEY_NAME, true, false, x, y, &n.to_string());
        }
        let name = if e.name.trim().is_empty() {
            "Untitled"
        } else {
            e.name.trim()
        };
        push(&mut runs, KEY_NAME, true, false, x + indent, y, name);
        // the category in grey after the name, under it when the column is too narrow for both
        let after =
            x + indent + text_width(name, KEY_NAME) * BOLD_WIDTH + KEY_NAME * NAME_TO_CATEGORY;
        if after + text_width(&e.category, KEY_TEXT) <= x + col_w {
            push(&mut runs, KEY_TEXT, false, true, after, y, &e.category);
        } else {
            y += KEY_TEXT * CATEGORY_DROP;
            push(&mut runs, KEY_TEXT, false, true, x + indent, y, &e.category);
        }
        y += KEY_NAME * NAME_LEAD;
        for l in body {
            y += KEY_TEXT * TEXT_LINE;
            push(&mut runs, KEY_TEXT, false, false, x + indent, y, &l);
        }
    }
    pages.push(KeyPage {
        on_map_page: on_map_page && pages.is_empty(),
        runs,
    });
    pages
}

/// Lays a map of width over height `aspect` out on `page` by `layout`, with its `key`.
///
/// The map keeps its shape and is as wide as the page inside the margins, at the top margin,
/// the bottom one or centred, by the layout; if that is taller than the page inside the
/// margins, it fits the height and is centred across. A margin too large for the page leaves a
/// zero-size map at the centre.
///
/// Pixels: the map's pixel rect rounds its edges (left, top, right, bottom), then takes the size
/// as right minus left, so rounding never pushes the rect past the page. The size can differ
/// from the rounded width by one pixel.
pub fn lay_out(page: PageSpec, aspect: f64, layout: MapLayout, key: Option<&Key>) -> Sheet {
    let (page_w, page_h) = page.page_mm();
    let margin = page.margin_mm_clamped();
    let avail_w = page_w - 2.0 * margin;
    let avail_h = page_h - 2.0 * margin;
    let ratio = if aspect > 0.0 && aspect.is_finite() {
        aspect
    } else {
        1.0
    };

    let mut w = avail_w;
    let mut h = w / ratio;
    if h > avail_h {
        h = avail_h;
        w = h * ratio;
    }
    let y = match layout.align() {
        Align::Bottom => margin + avail_h - h,
        Align::Centre => margin + (avail_h - h) / 2.0,
        Align::Top => margin,
    };
    let x = margin + (avail_w - w) / 2.0;

    let (left, top) = (mm_to_px(x), mm_to_px(y));
    let (right, bottom) = (mm_to_px(x + w), mm_to_px(y + h));

    let map = Rect {
        x: mm_to_pt(x),
        y: mm_to_pt(y),
        w: mm_to_pt(w),
        h: mm_to_pt(h),
    };
    let page_pt = (mm_to_pt(page_w), mm_to_pt(page_h));
    let margin_pt = mm_to_pt(margin);
    let (band, cols) = match layout {
        MapLayout::Top(cols) => (
            Some(Band {
                top: map.y + map.h + UNDER_MAP,
                bottom: page_pt.1 - margin_pt,
            }),
            cols,
        ),
        MapLayout::Bottom => (
            Some(Band {
                top: margin_pt,
                bottom: map.y - UNDER_MAP,
            }),
            1,
        ),
        MapLayout::Alone => (None, 1),
    };
    Sheet {
        page: page_pt,
        map,
        map_px: ((right - left) as u32, (bottom - top) as u32),
        key: key
            .map(|k| key_pages(k, page_pt, margin_pt, band, cols))
            .unwrap_or_default(),
    }
}

/// Whether a map stands up, taller than wide (Georg, 2026-10-29): a map with its key on the
/// page lies across it, so the key has room; a map alone turns with the page. Nothing on the
/// map says so, so turning the campaign's page turns every map at once. The window's frame
/// projection asks the same (`mapStandsUp`, `src/app/scene/frame.ts`): keep the two in step.
pub fn map_stands_up(layout: MapLayout, page: &PageSpec) -> bool {
    layout == MapLayout::Alone && !page.landscape
}

/// The paper's width over height: its `aspect` choice, turned over when the map stands up (a
/// square has no way up). Matches the window's `orientedAspect` and `resolveAspectRatio`.
fn paper_aspect(paper: Option<&Node<'_>>, stands_up: bool) -> f64 {
    let choice = |key: &str| match paper.and_then(|p| p.value(key)) {
        Some(Value::Choice(c)) => Some(c),
        _ => None,
    };
    let aspect = choice("aspect").unwrap_or_else(|| "16:10".into());
    let (aw, ah) = if aspect == "square" {
        (1.0, 1.0)
    } else {
        aspect
            .split_once(':')
            .and_then(|(a, b)| Some((a.parse::<f64>().ok()?, b.parse::<f64>().ok()?)))
            .filter(|(a, b)| *a > 0.0 && *b > 0.0)
            .unwrap_or((16.0, 10.0))
    };
    if stands_up {
        ah / aw
    } else {
        aw / ah
    }
}

/// The map at `map_path` on the campaign's page, or None when there is no map there.
pub fn sheet(d: &Doc, map_path: &str) -> Option<Sheet> {
    let map = d.tree().at(map_path).filter(|n| n.type_name() == "map")?;
    let paper = map
        .order("layers")
        .into_iter()
        .find(|n| n.type_name() == "paper");
    let layout = match map.value("layout") {
        Some(Value::Choice(c)) => MapLayout::parse(&c).unwrap_or_default(),
        _ => MapLayout::default(),
    };
    let key = locations::key(d, map_path);
    let page = PageSpec::read(d);
    let aspect = paper_aspect(paper.as_ref(), map_stands_up(layout, &page));
    Some(lay_out(page, aspect, layout, key.as_ref()))
}
