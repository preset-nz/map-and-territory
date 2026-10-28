//! A minimal PDF for the export (epic 07 story 5): white pages of the given size in points,
//! each map's image placed at a rectangle. Hand-written, no PDF crate: a catalogue, a page
//! tree, two standard fonts, the images, and each page with its content stream.
//!
//! A map with places gets its key (epic 28 story 4): each place's number, name, category and
//! description, set in Helvetica (a standard PDF font, so nothing is embedded). The map's
//! layout (epic 32 story 1) sets it under the map or on pages after it. Hidden places are left
//! out, as from the map. Plain until the campaign booklet restyles it.
//!
//! The image is the exported PNG decoded and composited onto white, then stored as
//! `/FlateDecode` RGB at its own pixel size, so the page shows it at the 300 dpi it was drawn at.

use flate2::{write::ZlibEncoder, Compression};
use map_and_territory_model::locations::Key;
use std::io::{Cursor, Write};

/// Where the image goes on the page, in points measured from the page's top-left corner (the
/// webview's layout, in mm, converted). PDF's own origin is bottom-left; `build_pdf` flips it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PdfLayout {
    pub page_w: f64,
    pub page_h: f64,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

impl PdfLayout {
    /// Parses `"pageW,pageH,x,y,w,h"` (points), the shape the webview sends in a header.
    pub fn parse(s: &str) -> Result<Self, String> {
        let n: Vec<f64> = s
            .split(',')
            .map(|p| p.trim().parse::<f64>())
            .collect::<Result<_, _>>()
            .map_err(|_| "bad layout header".to_string())?;
        let [page_w, page_h, x, y, w, h] = n[..] else {
            return Err("bad layout header".into());
        };
        if n.iter().any(|v| !v.is_finite()) || page_w <= 0.0 || page_h <= 0.0 || w < 0.0 || h < 0.0
        {
            return Err("bad layout header".into());
        }
        Ok(Self {
            page_w,
            page_h,
            x,
            y,
            w,
            h,
        })
    }
}

/// A PDF number: up to three decimals, no trailing zeros.
fn num(v: f64) -> String {
    let s = format!("{v:.3}");
    let s = s.trim_end_matches('0').trim_end_matches('.');
    if s.is_empty() || s == "-0" {
        "0".into()
    } else {
        s.into()
    }
}

/// The PNG as `(width, height, RGB bytes)`, any alpha composited onto white.
fn decode_rgb(png_bytes: &[u8]) -> Result<(u32, u32, Vec<u8>), String> {
    let mut decoder = png::Decoder::new(Cursor::new(png_bytes));
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut reader = decoder.read_info().map_err(|e| format!("bad PNG: {e}"))?;
    let mut buf = vec![0; reader.output_buffer_size().ok_or("PNG is too large")?];
    let info = reader
        .next_frame(&mut buf)
        .map_err(|e| format!("bad PNG: {e}"))?;
    let (w, h) = (info.width, info.height);
    let px = &buf[..info.buffer_size()];
    let over_white = |c: u8, a: u8| -> u8 {
        let (c, a) = (u32::from(c), u32::from(a));
        ((c * a + 255 * (255 - a) + 127) / 255) as u8
    };
    let mut rgb = Vec::with_capacity(w as usize * h as usize * 3);
    match info.color_type {
        png::ColorType::Rgb => rgb.extend_from_slice(px),
        png::ColorType::Rgba => {
            for p in px.as_chunks::<4>().0.iter() {
                rgb.extend(p[..3].iter().map(|&c| over_white(c, p[3])));
            }
        }
        png::ColorType::Grayscale => rgb.extend(px.iter().flat_map(|&g| [g, g, g])),
        png::ColorType::GrayscaleAlpha => {
            for p in px.as_chunks::<2>().0.iter() {
                let g = over_white(p[0], p[1]);
                rgb.extend([g, g, g]);
            }
        }
        png::ColorType::Indexed => return Err("bad PNG: unexpanded palette".into()),
    }
    Ok((w, h, rgb))
}

fn deflate(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let mut z = ZlibEncoder::new(Vec::new(), Compression::default());
    z.write_all(bytes).map_err(|e| e.to_string())?;
    z.finish().map_err(|e| e.to_string())
}

/// The black rule around the map, in points: 0.3 mm (Georg, 2026-10-28). Drawn inside the
/// map's rectangle, as the screen's paper edge is, so the margins measure the same.
const BORDER_PT: f64 = 0.3 * 72.0 / 25.4;

/// The key's sizes, in points.
const KEY_TITLE: f64 = 16.0;
const KEY_NAME: f64 = 11.0;
const KEY_TEXT: f64 = 9.5;
/// Space between places, in points.
const KEY_GAP: f64 = 7.0;

/// A string as a PDF literal in WinAnsi: Latin-1 as itself, curly quotes and dashes as their
/// WinAnsi codes, anything else as `?`; `(`, `)` and `\` escaped, high bytes in octal.
fn pdf_string(text: &str) -> String {
    let mut out = String::from("(");
    for c in text.chars() {
        let b: u8 = match c {
            '\u{2018}' => 0x91,
            '\u{2019}' => 0x92,
            '\u{201c}' => 0x93,
            '\u{201d}' => 0x94,
            '\u{2013}' => 0x96,
            '\u{2014}' => 0x97,
            '\u{2026}' => 0x85,
            '\u{2022}' => 0x95,
            c if (' '..='~').contains(&c) || ('\u{a0}'..='\u{ff}').contains(&c) => c as u8,
            _ => b'?',
        };
        match b {
            b'(' | b')' | b'\\' => {
                out.push('\\');
                out.push(b as char);
            }
            0x20..=0x7e => out.push(b as char),
            _ => out.push_str(&format!("\\{b:03o}")),
        }
    }
    out.push(')');
    out
}

/// About how wide `text` sets in Helvetica at `size` points: close enough to wrap by.
fn text_width(text: &str, size: f64) -> f64 {
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
fn wrap(text: &str, size: f64, width: f64) -> Vec<String> {
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

/// How a map's page is laid out (epic 32, from Georg's sketch): where the map sits and where
/// its key goes. The map keeps its own shape; the layout gives it its place and size (the
/// webview places it, `layoutPage` in `src/app/export/layout.ts`), and the key fills the rest.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MapLayout {
    /// The map at the top, the key under it in this many columns.
    Top(usize),
    /// The key at the top, the map at the foot.
    Bottom,
    /// The map alone, as large as the page allows; the key on pages of its own.
    Alone,
}

impl MapLayout {
    /// The map's `layout` value; anything unknown is the default, `map-top`. `key-after` was
    /// story 1's name for the map alone.
    pub fn parse(s: &str) -> Self {
        match s {
            "map-top-2col" => Self::Top(2),
            "map-top-3col" => Self::Top(3),
            "map-bottom" => Self::Bottom,
            "map-full" | "key-after" => Self::Alone,
            _ => Self::Top(1),
        }
    }
}

/// One map for the PDF: its drawing, where it sits on its page, its key and its layout.
pub struct MapSheet<'a> {
    pub png: &'a [u8],
    pub layout: PdfLayout,
    pub key: Option<&'a Key>,
    pub map_layout: MapLayout,
}

/// Space between the map and its key, in points.
const UNDER_MAP: f64 = 14.0;
/// Space between key columns, in points.
const COLUMN_GAP: f64 = 14.0;

/// Where the key may go on a page: between two heights in PDF's bottom-up points.
#[derive(Debug, Clone, Copy)]
struct Band {
    top: f64,
    bottom: f64,
}

/// The key as content streams. With `first`, it starts on the map's own page in that band, when
/// the heading and the first place fit there; it runs on to pages of its own, filling `cols`
/// columns top to bottom, left to right, before a new page. Empty when no place prints.
fn key_pages(
    key: &Key,
    layout: &PdfLayout,
    first: Option<Band>,
    cols: usize,
) -> (Option<String>, Vec<String>) {
    let entries: Vec<_> = key.entries.iter().filter(|e| !e.hidden).collect();
    if entries.is_empty() {
        return (None, Vec::new());
    }
    // the map's own margins, so the key lines up with it
    let margin = layout.x.max(18.0);
    let cols = cols.max(1);
    let width = layout.page_w - 2.0 * margin;
    let col_w = (width - COLUMN_GAP * (cols - 1) as f64) / cols as f64;
    let full = Band {
        top: layout.page_h - margin,
        bottom: margin,
    };
    let indent = text_width("000 ", KEY_NAME);
    let body_of = |e: &&map_and_territory_model::locations::KeyEntry| -> Vec<String> {
        wrap(e.description.trim(), KEY_TEXT, col_w - indent)
            .into_iter()
            .filter(|l| !l.is_empty())
            .collect()
    };
    let height_of =
        |body: &[String]| KEY_GAP + KEY_NAME * 1.25 + body.len() as f64 * KEY_TEXT * 1.3;
    let heading = KEY_TITLE * 1.8;
    let first = first.filter(|b| b.top - heading - height_of(&body_of(&entries[0])) >= b.bottom);
    let on_map_page = first.is_some();
    let line = |page: &mut String, font: &str, size: f64, x: f64, y: f64, text: &str| {
        page.push_str(&format!(
            "BT /{font} {} Tf {} {} Td {} Tj ET\n",
            num(size),
            num(x),
            num(y),
            pdf_string(text)
        ));
    };
    let mut pages = Vec::new();
    let mut page = String::new();
    let mut band = first.unwrap_or(full);
    let mut y = band.top;
    let mut col = 0;
    let mut in_col = 0;
    let title = if key.map.trim().is_empty() {
        "Key".to_string()
    } else {
        format!("Key to {}", key.map.trim())
    };
    y -= KEY_TITLE;
    line(&mut page, "F2", KEY_TITLE, margin, y, &title);
    y -= KEY_TITLE * 0.8;
    // the columns start under the heading on its page
    let mut col_top = y;
    for e in &entries {
        let body = body_of(e);
        if y - height_of(&body) < band.bottom && in_col > 0 {
            col += 1;
            in_col = 0;
            if col == cols {
                pages.push(std::mem::take(&mut page));
                band = full;
                col = 0;
                col_top = band.top;
            }
            y = col_top;
        }
        in_col += 1;
        let x = margin + col as f64 * (col_w + COLUMN_GAP);
        y -= KEY_GAP + KEY_NAME;
        if let Some(n) = e.number {
            line(&mut page, "F2", KEY_NAME, x, y, &n.to_string());
        }
        let name = if e.name.trim().is_empty() {
            "Untitled"
        } else {
            e.name.trim()
        };
        line(&mut page, "F2", KEY_NAME, x + indent, y, name);
        // bold sets about a tenth wider than the estimate; the category in grey after it,
        // under the name when the column is too narrow for both
        let after = x + indent + text_width(name, KEY_NAME) * 1.1 + KEY_NAME * 0.6;
        page.push_str("0.4 g\n");
        if after + text_width(&e.category, KEY_TEXT) <= x + col_w {
            line(&mut page, "F1", KEY_TEXT, after, y, &e.category);
        } else {
            y -= KEY_TEXT * 1.2;
            line(&mut page, "F1", KEY_TEXT, x + indent, y, &e.category);
        }
        page.push_str("0 g\n");
        y -= KEY_NAME * 0.25;
        for l in body {
            y -= KEY_TEXT * 1.3;
            line(&mut page, "F1", KEY_TEXT, x + indent, y, &l);
        }
    }
    pages.push(page);
    if on_map_page {
        let first = pages.remove(0);
        (Some(first), pages)
    } else {
        (None, pages)
    }
}

/// A map's page: white, the image at its rectangle with a thin black border.
fn map_content(layout: &PdfLayout) -> String {
    // PDF's y axis is bottom-up: the rectangle's bottom edge is page height minus its lower edge.
    let bottom = layout.page_h - (layout.y + layout.h);
    let half = BORDER_PT / 2.0;
    format!(
        "1 1 1 rg\n0 0 {pw} {ph} re f\nq\n{w} 0 0 {h} {x} {y} cm\n/Im0 Do\nQ\n\
         0 0 0 RG\n{lw} w\n{bx} {by} {bw} {bh} re S\n0 g\n",
        pw = num(layout.page_w),
        ph = num(layout.page_h),
        w = num(layout.w),
        h = num(layout.h),
        x = num(layout.x),
        y = num(bottom),
        lw = num(BORDER_PT),
        bx = num(layout.x + half),
        by = num(bottom + half),
        bw = num((layout.w - BORDER_PT).max(0.0)),
        bh = num((layout.h - BORDER_PT).max(0.0)),
    )
}

/// The PDF: each sheet's map on its page, `page_w × page_h` points, placed at its rectangle
/// with a thin black border, and its key under it or on pages after it, by its layout.
///
/// Objects: 1 the catalogue, 2 the page tree, 3 and 4 the fonts (Helvetica and its bold),
/// then each map's image, then each page and its content.
pub fn build_pdf(sheets: &[MapSheet<'_>]) -> Result<Vec<u8>, String> {
    // (media box, content, image index)
    let mut pages: Vec<((f64, f64), String, Option<usize>)> = Vec::new();
    let mut images = Vec::new();
    for (i, sheet) in sheets.iter().enumerate() {
        let l = &sheet.layout;
        let (iw, ih, rgb) = decode_rgb(sheet.png)?;
        images.push((iw, ih, deflate(&rgb)?));
        // PDF's y axis is bottom-up; the layout's is top-down
        let (map_top, map_bottom) = (l.page_h - l.y, l.page_h - (l.y + l.h));
        let margin = l.x.max(18.0);
        let (band, cols) = match sheet.map_layout {
            MapLayout::Top(cols) => (
                Some(Band {
                    top: map_bottom - UNDER_MAP,
                    bottom: margin,
                }),
                cols,
            ),
            MapLayout::Bottom => (
                Some(Band {
                    top: l.page_h - margin,
                    bottom: map_top + UNDER_MAP,
                }),
                1,
            ),
            MapLayout::Alone => (None, 1),
        };
        let (on_map, after) = sheet
            .key
            .map(|k| key_pages(k, l, band, cols))
            .unwrap_or_default();
        let mut content = map_content(l);
        content.push_str(&on_map.unwrap_or_default());
        pages.push(((l.page_w, l.page_h), content, Some(i)));
        pages.extend(after.into_iter().map(|c| ((l.page_w, l.page_h), c, None)));
    }
    if pages.is_empty() {
        return Err("nothing to export".into());
    }

    let mut out: Vec<u8> = b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n".to_vec();
    let mut offsets: Vec<usize> = Vec::new();
    let mut object = |out: &mut Vec<u8>, head: String, stream: Option<&[u8]>| {
        offsets.push(out.len());
        out.extend(format!("{} 0 obj\n", offsets.len()).bytes());
        out.extend(head.bytes());
        if let Some(s) = stream {
            out.extend(b"\nstream\n");
            out.extend(s);
            out.extend(b"\nendstream");
        }
        out.extend(b"\nendobj\n");
    };
    let first_image = 5;
    let first_page = first_image + images.len();
    let kids: Vec<String> = (0..pages.len())
        .map(|i| format!("{} 0 R", first_page + 2 * i))
        .collect();
    object(&mut out, "<< /Type /Catalog /Pages 2 0 R >>".into(), None);
    object(
        &mut out,
        format!(
            "<< /Type /Pages /Kids [{}] /Count {} >>",
            kids.join(" "),
            kids.len()
        ),
        None,
    );
    for font in ["Helvetica", "Helvetica-Bold"] {
        object(
            &mut out,
            format!(
                "<< /Type /Font /Subtype /Type1 /BaseFont /{font} /Encoding /WinAnsiEncoding >>"
            ),
            None,
        );
    }
    for (iw, ih, image) in &images {
        object(
            &mut out,
            format!(
                "<< /Type /XObject /Subtype /Image /Width {iw} /Height {ih} \
                 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length {} >>",
                image.len()
            ),
            Some(image),
        );
    }
    for (i, ((pw, ph), content, image)) in pages.iter().enumerate() {
        let xobject = image
            .map(|n| format!(" /XObject << /Im0 {} 0 R >>", first_image + n))
            .unwrap_or_default();
        object(
            &mut out,
            format!(
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {} {}] \
                 /Resources << /Font << /F1 3 0 R /F2 4 0 R >>{xobject} >> /Contents {} 0 R >>",
                num(*pw),
                num(*ph),
                first_page + 2 * i + 1
            ),
            None,
        );
        object(
            &mut out,
            format!("<< /Length {} >>", content.len()),
            Some(content.as_bytes()),
        );
    }

    let xref_at = out.len();
    out.extend(format!("xref\n0 {}\n", offsets.len() + 1).bytes());
    out.extend(b"0000000000 65535 f \n");
    for o in &offsets {
        out.extend(format!("{o:010} 00000 n \n").bytes());
    }
    out.extend(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF\n",
            offsets.len() + 1
        )
        .bytes(),
    );
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use map_and_territory_model::locations::KeyEntry;

    /// A 2×1 RGBA PNG: an opaque red pixel and a fully transparent one.
    fn tiny_png() -> Vec<u8> {
        let mut out = Vec::new();
        let mut enc = png::Encoder::new(&mut out, 2, 1);
        enc.set_color(png::ColorType::Rgba);
        enc.set_depth(png::BitDepth::Eight);
        let mut w = enc.write_header().unwrap();
        w.write_image_data(&[255, 0, 0, 255, 0, 0, 0, 0]).unwrap();
        w.finish().unwrap();
        out
    }

    fn pdf_of(png: &[u8], key: Option<&Key>, map_layout: MapLayout) -> Result<Vec<u8>, String> {
        build_pdf(&[MapSheet {
            png,
            layout: layout(),
            key,
            map_layout,
        }])
    }

    fn layout() -> PdfLayout {
        // A5 portrait, 10 mm margin: the map is 128 mm wide and 90 mm high at the top.
        PdfLayout {
            page_w: 419.53,
            page_h: 595.28,
            x: 28.346,
            y: 28.346,
            w: 362.835,
            h: 255.118,
        }
    }

    /// The file as text with one byte per char (binary becomes `?`), so offsets still index it.
    fn text(bytes: &[u8]) -> String {
        bytes
            .iter()
            .map(|&b| if b.is_ascii() { b as char } else { '?' })
            .collect()
    }

    fn numbers_after(s: &str, key: &str) -> Vec<f64> {
        let at = s.find(key).expect(key) + key.len();
        s[at..]
            .split([']', '\n', 'c'])
            .next()
            .unwrap()
            .split_whitespace()
            .map(|n| n.parse().unwrap())
            .collect()
    }

    #[test]
    fn header_media_box_and_placement() {
        let pdf = pdf_of(&tiny_png(), None, MapLayout::Alone).unwrap();
        let s = text(&pdf);
        assert!(s.starts_with("%PDF-1.4\n"));
        assert!(s.ends_with("%%EOF\n"));
        assert_eq!(
            numbers_after(&s, "/MediaBox ["),
            vec![0.0, 0.0, 419.53, 595.28]
        );
        // the image's matrix: width 0 0 height x y, with y the bottom edge measured upward
        let cm = numbers_after(&s, "q\n");
        let l = layout();
        let bottom = l.page_h - (l.y + l.h);
        let want = [l.w, 0.0, 0.0, l.h, l.x, bottom];
        assert_eq!(cm.len(), 6);
        for (got, want) in cm.iter().zip(want) {
            assert!((got - want).abs() < 0.001, "{cm:?} vs {want}");
        }
        // the map sits at the top: its top edge is 28.346 pt below the page's top
        assert!((cm[5] + cm[3] - (l.page_h - l.y)).abs() < 0.002);
        assert!(s.contains("/Subtype /Image /Width 2 /Height 1"));
        assert!(s.contains("/Filter /FlateDecode"));
    }

    /// Writes the test PDF to `$OUT_PDF`, to open in a viewer (export plan 3.4).
    #[test]
    #[ignore = "writes the test PDF to $OUT_PDF"]
    fn write_a_pdf() {
        let out = std::env::var("OUT_PDF").expect("OUT_PDF");
        let pdf = pdf_of(&tiny_png(), Some(&many(24)), MapLayout::Top(3)).unwrap();
        std::fs::write(out, pdf).unwrap();
    }

    #[test]
    fn a_black_border_sits_inside_the_map_after_the_image() {
        let pdf = pdf_of(&tiny_png(), None, MapLayout::Alone).unwrap();
        let s = text(&pdf);
        let image_at = s.find("/Im0 Do").unwrap();
        let rule_at = s.find("0 0 0 RG\n").expect("a black stroke");
        assert!(rule_at > image_at, "the border is drawn over the image");
        let (width, rest) = s[rule_at + "0 0 0 RG\n".len()..]
            .split_once(" w\n")
            .unwrap();
        let width: f64 = width.parse().unwrap();
        assert!(
            (width - 0.3 * 72.0 / 25.4).abs() < 0.001,
            "0.3 mm, got {width}"
        );
        let re: Vec<f64> = rest
            .split(" re S")
            .next()
            .unwrap()
            .split_whitespace()
            .map(|n| n.parse().unwrap())
            .collect();
        let l = layout();
        let bottom = l.page_h - (l.y + l.h);
        let want = [
            l.x + width / 2.0,
            bottom + width / 2.0,
            l.w - width,
            l.h - width,
        ];
        for (got, want) in re.iter().zip(want) {
            assert!((got - want).abs() < 0.002, "{re:?} vs {want:?}");
        }
    }

    #[test]
    fn xref_offsets_point_at_their_objects_and_the_trailer_is_valid() {
        let pdf = pdf_of(&tiny_png(), None, MapLayout::Alone).unwrap();
        let s = text(&pdf);
        let start: usize = s
            .rsplit("startxref\n")
            .next()
            .unwrap()
            .lines()
            .next()
            .unwrap()
            .parse()
            .unwrap();
        assert!(s[start..].starts_with("xref\n0 8\n"));
        let rows: Vec<&str> = s[start..].lines().skip(2).take(8).collect();
        assert_eq!(rows[0], "0000000000 65535 f ");
        for (i, row) in rows.iter().enumerate().skip(1) {
            assert_eq!(row.len(), 19, "20-byte entries with the newline");
            let at: usize = row[..10].parse().unwrap();
            assert!(
                s[at..].starts_with(&format!("{i} 0 obj\n")),
                "object {i} at {at}"
            );
        }
        assert!(s[start..].contains("trailer\n<< /Size 8 /Root 1 0 R >>"));
    }

    #[test]
    fn the_image_is_rgb_composited_on_white() {
        let (w, h, rgb) = decode_rgb(&tiny_png()).unwrap();
        assert_eq!((w, h), (2, 1));
        assert_eq!(rgb, vec![255, 0, 0, 255, 255, 255]);
        // the stream round-trips through flate
        let pdf = pdf_of(&tiny_png(), None, MapLayout::Alone).unwrap();
        let key = b"stream\n";
        let image_obj = pdf
            .windows(15)
            .position(|w| w == b"/Subtype /Image")
            .unwrap();
        let from = image_obj + pdf[image_obj..].windows(7).position(|w| w == key).unwrap() + 7;
        let to = from
            + pdf[from..]
                .windows(10)
                .position(|w| w == b"\nendstream")
                .unwrap();
        let mut back = Vec::new();
        std::io::copy(
            &mut flate2::read::ZlibDecoder::new(&pdf[from..to]),
            &mut back,
        )
        .unwrap();
        assert_eq!(back, rgb);
    }

    #[test]
    fn layout_header_parses_and_rejects_nonsense() {
        let l = PdfLayout::parse("419.53,595.28,28.346,28.346,362.835,255.118").unwrap();
        assert_eq!(l.page_w, 419.53);
        assert!(PdfLayout::parse("1,2,3").is_err());
        assert!(PdfLayout::parse("a,b,c,d,e,f").is_err());
        assert!(PdfLayout::parse("0,10,0,0,1,1").is_err());
    }

    #[test]
    fn bad_png_is_an_error() {
        assert!(pdf_of(b"nope", None, MapLayout::Alone).is_err());
    }

    fn the_key() -> Key {
        let entry = |number, name: &str, hidden| KeyEntry {
            number,
            name: name.into(),
            category: "Landmark".into(),
            description: "Held by the Vane since the flood (they say).".into(),
            hidden,
        };
        Key {
            map: "Sallow Fen".into(),
            entries: vec![
                entry(Some(1), "Reedwall Keep", false),
                entry(Some(2), "Sunken Chapel", true),
                entry(Some(3), "The Weeping Well", false),
                entry(None, "Gallows Ford", false),
            ],
        }
    }

    fn page_count(s: &str) -> usize {
        let at = s.find("/Count ").unwrap() + "/Count ".len();
        s[at..].split(' ').next().unwrap().parse().unwrap()
    }

    #[test]
    fn the_key_follows_the_map_on_a_second_page_in_order_without_the_hidden() {
        let pdf = pdf_of(&tiny_png(), Some(&the_key()), MapLayout::Alone).unwrap();
        let s = text(&pdf);
        assert_eq!(page_count(&s), 2);
        assert!(s.contains("/Kids [6 0 R 8 0 R]"));
        let at = |t: &str| {
            s.find(&format!("({t}) Tj"))
                .unwrap_or_else(|| panic!("{t}"))
        };
        assert!(at("Key to Sallow Fen") < at("Reedwall Keep"));
        assert!(at("Reedwall Keep") < at("The Weeping Well"));
        assert!(at("The Weeping Well") < at("Gallows Ford"));
        assert!(!s.contains("Sunken Chapel"));
        // the parentheses in the description are escaped
        assert!(s.contains("\\(they say\\)."));
        // no key without places to print
        let none = Key {
            map: "Empty".into(),
            entries: vec![],
        };
        let s = text(&pdf_of(&tiny_png(), Some(&none), MapLayout::Alone).unwrap());
        assert_eq!(page_count(&s), 1);
    }

    #[test]
    fn a_long_key_runs_on_to_more_pages_and_the_xref_still_holds() {
        let mut key = the_key();
        key.entries = (1..=60)
            .map(|n| KeyEntry {
                number: Some(n),
                name: format!("Place {n}"),
                category: "Ruin".into(),
                description: "A long line about what waits there, ".repeat(4),
                hidden: false,
            })
            .collect();
        let pdf = pdf_of(&tiny_png(), Some(&key), MapLayout::Alone).unwrap();
        let s = text(&pdf);
        let pages = page_count(&s);
        assert!(pages > 3, "{pages} pages");
        assert!(s.contains("(Place 60) Tj"));
        let start: usize = s
            .rsplit("startxref\n")
            .next()
            .unwrap()
            .lines()
            .next()
            .unwrap()
            .parse()
            .unwrap();
        let objects = 5 + 2 * pages;
        assert!(s[start..].starts_with(&format!("xref\n0 {}\n", objects + 1)));
        for (i, row) in s[start..].lines().skip(3).take(objects).enumerate() {
            let at: usize = row[..10].parse().unwrap();
            assert!(s[at..].starts_with(&format!("{} 0 obj\n", i + 1)));
        }
    }

    #[test]
    fn key_text_is_winansi_with_curly_quotes_and_unknowns_as_marks() {
        assert_eq!(pdf_string("Rook\u{2019}s (old)"), "(Rook\\222s \\(old\\))");
        assert_eq!(pdf_string("caf\u{e9} \u{4e2d}"), "(caf\\351 ?)");
        let lines = wrap("one two three four", 10.0, 40.0);
        assert_eq!(lines, ["one two", "three", "four"]);
        assert!(lines.iter().all(|l| text_width(l, 10.0) <= 40.0));
    }

    #[test]
    fn map_top_sets_the_key_under_the_map_on_its_own_page() {
        let key = the_key();
        let s = text(&pdf_of(&tiny_png(), Some(&key), MapLayout::Top(1)).unwrap());
        assert_eq!(page_count(&s), 1);
        // the heading is on the map's page, below the map's bottom edge
        let l = layout();
        let map_bottom = l.page_h - (l.y + l.h);
        let at = s.find("(Key to Sallow Fen) Tj").unwrap();
        let td = s[..at].rsplit(" Tf ").next().unwrap();
        let y: f64 = td.split_whitespace().nth(1).unwrap().parse().unwrap();
        assert!(y < map_bottom - UNDER_MAP, "{y} under {map_bottom}");
        assert!(s.find("/Im0 Do").unwrap() < at);
        // a map that fills the page leaves no room: the key starts on a page of its own
        let full = PdfLayout {
            h: l.page_h - 2.0 * l.y,
            ..l
        };
        let s = text(
            &build_pdf(&[MapSheet {
                png: &tiny_png(),
                layout: full,
                key: Some(&key),
                map_layout: MapLayout::Top(1),
            }])
            .unwrap(),
        );
        assert_eq!(page_count(&s), 2);
        assert_eq!(MapLayout::parse("key-after"), MapLayout::Alone);
        assert_eq!(MapLayout::parse("map-top-3col"), MapLayout::Top(3));
        assert_eq!(MapLayout::parse("anything"), MapLayout::Top(1));
    }

    #[test]
    fn several_maps_make_one_pdf_in_order() {
        let key = the_key();
        let png = tiny_png();
        let sheet = |key| MapSheet {
            png: &png,
            layout: layout(),
            key,
            map_layout: MapLayout::Alone,
        };
        let s = text(&build_pdf(&[sheet(Some(&key)), sheet(None)]).unwrap());
        // two images, map 1, its key page, map 2
        assert_eq!(page_count(&s), 3);
        assert!(s.contains("/Kids [7 0 R 9 0 R 11 0 R]"));
        assert!(s.contains("/XObject << /Im0 5 0 R >>"));
        assert!(s.contains("/XObject << /Im0 6 0 R >>"));
        assert!(build_pdf(&[]).is_err());
    }

    /// Where each `(text) Tj` is set: its x and y.
    fn placed(s: &str, t: &str) -> (f64, f64) {
        let at = s
            .find(&format!("({t}) Tj"))
            .unwrap_or_else(|| panic!("{t}"));
        let td: Vec<f64> = s[..at]
            .rsplit(" Tf ")
            .next()
            .unwrap()
            .split_whitespace()
            .take(2)
            .map(|n| n.parse().unwrap())
            .collect();
        (td[0], td[1])
    }

    fn many(n: u32) -> Key {
        Key {
            map: "Fen".into(),
            entries: (1..=n)
                .map(|n| KeyEntry {
                    number: Some(n),
                    name: format!("Place {n}"),
                    category: "Ruin".into(),
                    description: "What waits there.".into(),
                    hidden: false,
                })
                .collect(),
        }
    }

    #[test]
    fn a_key_in_three_columns_fills_each_before_the_next() {
        let key = many(30);
        let s = text(&pdf_of(&tiny_png(), Some(&key), MapLayout::Top(3)).unwrap());
        let xs: Vec<f64> = (1..=30)
            .map(|n| placed(&s, &format!("Place {n}")).0)
            .collect();
        let mut columns = xs.clone();
        columns.dedup();
        assert!(columns.len() >= 3, "{columns:?}");
        // left to right, never back, until a new page starts at the first column again
        assert!(xs[0] < xs[29] || page_count(&s) > 1);
        let (_, first_y) = placed(&s, "Place 1");
        let l = layout();
        assert!(first_y < l.page_h - (l.y + l.h));
    }

    #[test]
    fn map_bottom_sets_the_key_above_the_map() {
        let l = PdfLayout {
            y: 595.28 - 28.346 - 255.118,
            ..layout()
        };
        let png = tiny_png();
        let key = the_key();
        let s = text(
            &build_pdf(&[MapSheet {
                png: &png,
                layout: l,
                key: Some(&key),
                map_layout: MapLayout::Bottom,
            }])
            .unwrap(),
        );
        assert_eq!(page_count(&s), 1);
        let (_, y) = placed(&s, "Gallows Ford");
        assert!(y > l.page_h - l.y + UNDER_MAP, "{y}");
    }
}
