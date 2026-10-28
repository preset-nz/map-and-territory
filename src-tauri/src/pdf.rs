//! A minimal PDF for the export (epic 07 story 5): a white page of the given size in points
//! with one image placed at a rectangle. Hand-written, no PDF crate: the file is a catalogue,
//! a page tree, a page, a content stream and one image XObject.
//!
//! A map with places gets the key after it (epic 28 story 4): each place's number, name,
//! category and description, set in Helvetica (one of PDF's standard fonts, so nothing is
//! embedded) on pages of the same size. Hidden places are left out, as from the map. A plain
//! page until the campaign booklet restyles it.
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

/// The key's pages as content streams: a heading, then each printed place, a new page when
/// the next one would cross the bottom margin. Empty when no place prints.
fn key_pages(key: &Key, layout: &PdfLayout) -> Vec<String> {
    let entries: Vec<_> = key.entries.iter().filter(|e| !e.hidden).collect();
    if entries.is_empty() {
        return Vec::new();
    }
    // the map's own margins, so the key lines up with it
    let margin = layout.x.max(18.0);
    let width = layout.page_w - 2.0 * margin;
    let (top, bottom) = (layout.page_h - margin, margin);
    let mut pages = Vec::new();
    let mut page = String::new();
    let mut y = top;
    let line = |page: &mut String, font: &str, size: f64, x: f64, y: f64, text: &str| {
        page.push_str(&format!(
            "BT /{font} {} Tf {} {} Td {} Tj ET\n",
            num(size),
            num(x),
            num(y),
            pdf_string(text)
        ));
    };
    let title = if key.map.trim().is_empty() {
        "Key".to_string()
    } else {
        format!("Key to {}", key.map.trim())
    };
    y -= KEY_TITLE;
    line(&mut page, "F2", KEY_TITLE, margin, y, &title);
    y -= KEY_TITLE * 0.8;
    let indent = text_width("000 ", KEY_NAME);
    for e in entries {
        let body = wrap(e.description.trim(), KEY_TEXT, width - indent);
        let body: Vec<&String> = body.iter().filter(|l| !l.is_empty()).collect();
        let height = KEY_GAP + KEY_NAME * 1.25 + body.len() as f64 * KEY_TEXT * 1.3;
        if y - height < bottom && !page.is_empty() && y < top - KEY_TITLE * 2.0 {
            pages.push(std::mem::take(&mut page));
            y = top;
        }
        y -= KEY_GAP + KEY_NAME;
        if let Some(n) = e.number {
            line(&mut page, "F2", KEY_NAME, margin, y, &n.to_string());
        }
        let name = if e.name.trim().is_empty() {
            "Untitled"
        } else {
            e.name.trim()
        };
        line(&mut page, "F2", KEY_NAME, margin + indent, y, name);
        // bold sets about a tenth wider than the estimate; the category in grey after it
        let after = margin + indent + text_width(name, KEY_NAME) * 1.1 + KEY_NAME * 0.6;
        page.push_str("0.4 g\n");
        line(&mut page, "F1", KEY_TEXT, after, y, &e.category);
        page.push_str("0 g\n");
        y -= KEY_NAME * 0.25;
        for l in body {
            y -= KEY_TEXT * 1.3;
            line(&mut page, "F1", KEY_TEXT, margin + indent, y, l);
        }
    }
    pages.push(page);
    pages
}

/// The PDF: white, `layout.page_w × page_h` points, `png` placed at the layout's rectangle
/// with a thin black border, then the key's pages when `key` has places to print.
pub fn build_pdf(png: &[u8], layout: &PdfLayout, key: Option<&Key>) -> Result<Vec<u8>, String> {
    let (iw, ih, rgb) = decode_rgb(png)?;
    let image = deflate(&rgb)?;
    // PDF's y axis is bottom-up: the rectangle's bottom edge is page height minus its lower edge.
    let bottom = layout.page_h - (layout.y + layout.h);
    let half = BORDER_PT / 2.0;
    let content = format!(
        "1 1 1 rg\n0 0 {pw} {ph} re f\nq\n{w} 0 0 {h} {x} {y} cm\n/Im0 Do\nQ\n\
         0 0 0 RG\n{lw} w\n{bx} {by} {bw} {bh} re S\n",
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
    );

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
    let key_pages = key.map(|k| key_pages(k, layout)).unwrap_or_default();
    // objects 6 and 7 are the fonts, then each key page and its content
    let kids: Vec<String> = std::iter::once("3 0 R".to_string())
        .chain((0..key_pages.len()).map(|i| format!("{} 0 R", 8 + 2 * i)))
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
    object(
        &mut out,
        format!(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {} {}] \
             /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>",
            num(layout.page_w),
            num(layout.page_h)
        ),
        None,
    );
    object(
        &mut out,
        format!("<< /Length {} >>", content.len()),
        Some(content.as_bytes()),
    );
    object(
        &mut out,
        format!(
            "<< /Type /XObject /Subtype /Image /Width {iw} /Height {ih} \
             /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length {} >>",
            image.len()
        ),
        Some(&image),
    );
    if !key_pages.is_empty() {
        for font in ["Helvetica", "Helvetica-Bold"] {
            object(
                &mut out,
                format!(
                    "<< /Type /Font /Subtype /Type1 /BaseFont /{font} /Encoding /WinAnsiEncoding >>"
                ),
                None,
            );
        }
    }
    for (i, content) in key_pages.iter().enumerate() {
        object(
            &mut out,
            format!(
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {} {}] \
                 /Resources << /Font << /F1 6 0 R /F2 7 0 R >> >> /Contents {} 0 R >>",
                num(layout.page_w),
                num(layout.page_h),
                9 + 2 * i
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
        let pdf = build_pdf(&tiny_png(), &layout(), None).unwrap();
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
        let pdf = build_pdf(&tiny_png(), &layout(), Some(&the_key())).unwrap();
        std::fs::write(out, pdf).unwrap();
    }

    #[test]
    fn a_black_border_sits_inside_the_map_after_the_image() {
        let pdf = build_pdf(&tiny_png(), &layout(), None).unwrap();
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
        let pdf = build_pdf(&tiny_png(), &layout(), None).unwrap();
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
        assert!(s[start..].starts_with("xref\n0 6\n"));
        let rows: Vec<&str> = s[start..].lines().skip(2).take(6).collect();
        assert_eq!(rows[0], "0000000000 65535 f ");
        for (i, row) in rows.iter().enumerate().skip(1) {
            assert_eq!(row.len(), 19, "20-byte entries with the newline");
            let at: usize = row[..10].parse().unwrap();
            assert!(
                s[at..].starts_with(&format!("{i} 0 obj\n")),
                "object {i} at {at}"
            );
        }
        assert!(s[start..].contains("trailer\n<< /Size 6 /Root 1 0 R >>"));
    }

    #[test]
    fn the_image_is_rgb_composited_on_white() {
        let (w, h, rgb) = decode_rgb(&tiny_png()).unwrap();
        assert_eq!((w, h), (2, 1));
        assert_eq!(rgb, vec![255, 0, 0, 255, 255, 255]);
        // the stream round-trips through flate
        let pdf = build_pdf(&tiny_png(), &layout(), None).unwrap();
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
        assert!(build_pdf(b"nope", &layout(), None).is_err());
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
        let pdf = build_pdf(&tiny_png(), &layout(), Some(&the_key())).unwrap();
        let s = text(&pdf);
        assert_eq!(page_count(&s), 2);
        assert!(s.contains("/Kids [3 0 R 8 0 R]"));
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
        let s = text(&build_pdf(&tiny_png(), &layout(), Some(&none)).unwrap());
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
        let pdf = build_pdf(&tiny_png(), &layout(), Some(&key)).unwrap();
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
        let objects = 7 + 2 * (pages - 1);
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
}
