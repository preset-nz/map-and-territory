//! A minimal PDF for the export (epic 07 story 5): white pages of the given size in points,
//! each map's image placed at a rectangle. Hand-written, no PDF crate: a catalogue, a page
//! tree, two standard fonts, the images, and each page with its content stream.
//!
//! Nothing is laid out here: the model crate's `print::Sheet` says where the map goes and where
//! each line of its key is set (epic 33 story 3), and this only writes it as PDF. The key's
//! lines are Helvetica, a standard PDF font, so nothing is embedded.
//!
//! The image is the exported PNG decoded and composited onto white, then stored as
//! `/FlateDecode` RGB at its own pixel size, so the page shows it at the 300 dpi it was drawn at.

use flate2::{write::ZlibEncoder, Compression};
use map_and_territory_model::print::{Run, Sheet};
use std::io::{Cursor, Write};

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

/// A map's page: white, the image at its rectangle with a thin black border.
fn map_content(sheet: &Sheet) -> String {
    let (page_w, page_h) = sheet.page;
    let r = sheet.map;
    // PDF's y axis is bottom-up: the rectangle's bottom edge is page height minus its lower edge.
    let bottom = page_h - (r.y + r.h);
    let half = BORDER_PT / 2.0;
    format!(
        "1 1 1 rg\n0 0 {pw} {ph} re f\nq\n{w} 0 0 {h} {x} {y} cm\n/Im0 Do\nQ\n\
         0 0 0 RG\n{lw} w\n{bx} {by} {bw} {bh} re S\n0 g\n",
        pw = num(page_w),
        ph = num(page_h),
        w = num(r.w),
        h = num(r.h),
        x = num(r.x),
        y = num(bottom),
        lw = num(BORDER_PT),
        bx = num(r.x + half),
        by = num(bottom + half),
        bw = num((r.w - BORDER_PT).max(0.0)),
        bh = num((r.h - BORDER_PT).max(0.0)),
    )
}

/// The key's lines as text operators, on a page `page_h` points high.
fn runs_content(runs: &[Run], page_h: f64) -> String {
    let mut out = String::new();
    for r in runs {
        // the sheet's y is top-down, PDF's bottom-up
        let line = format!(
            "BT /{} {} Tf {} {} Td {} Tj ET\n",
            if r.bold { "F2" } else { "F1" },
            num(r.size),
            num(r.x),
            num(page_h - r.y),
            pdf_string(&r.text)
        );
        if r.grey {
            out.push_str("0.4 g\n");
            out.push_str(&line);
            out.push_str("0 g\n");
        } else {
            out.push_str(&line);
        }
    }
    out
}

/// The PDF: each sheet's map on its page, placed at its rectangle with a thin black border, and
/// its key on the same page or on pages after it, as the sheet lays them out. Each sheet comes
/// with its map's PNG.
///
/// Objects: 1 the catalogue, 2 the page tree, 3 and 4 the fonts (Helvetica and its bold),
/// then each map's image, then each page and its content.
pub fn build_pdf(sheets: &[(&[u8], &Sheet)]) -> Result<Vec<u8>, String> {
    // (media box, content, image index)
    let mut pages: Vec<((f64, f64), String, Option<usize>)> = Vec::new();
    let mut images = Vec::new();
    for (i, (png, sheet)) in sheets.iter().enumerate() {
        let (iw, ih, rgb) = decode_rgb(png)?;
        images.push((iw, ih, deflate(&rgb)?));
        let mut content = map_content(sheet);
        let mut rest = sheet.key.iter().peekable();
        if let Some(on_map) = rest.next_if(|p| p.on_map_page) {
            content.push_str(&runs_content(&on_map.runs, sheet.page.1));
        }
        pages.push((sheet.page, content, Some(i)));
        pages.extend(rest.map(|p| (sheet.page, runs_content(&p.runs, sheet.page.1), None)));
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
    use map_and_territory_model::locations::{Key, KeyEntry};
    use map_and_territory_model::print::{lay_out, MapLayout, PageSize, PageSpec};

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

    /// A5 portrait with a 10 mm margin: a 128 mm wide, 90 mm high map at the top.
    fn sheet_of(key: Option<&Key>, layout: MapLayout) -> Sheet {
        let page = PageSpec {
            size: PageSize::A5,
            landscape: false,
            margin_mm: 10.0,
        };
        lay_out(page, 128.0 / 90.0, layout, key)
    }

    fn pdf_of(png: &[u8], key: Option<&Key>, layout: MapLayout) -> Result<Vec<u8>, String> {
        build_pdf(&[(png, &sheet_of(key, layout))])
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
        let sheet = sheet_of(None, MapLayout::Alone);
        let media = numbers_after(&s, "/MediaBox [");
        assert_eq!(media.len(), 4);
        assert!((media[2] - 419.53).abs() < 0.01 && (media[3] - 595.28).abs() < 0.01);
        // the image's matrix: width 0 0 height x y, with y the bottom edge measured upward
        let cm = numbers_after(&s, "q\n");
        let m = sheet.map;
        let want = [m.w, 0.0, 0.0, m.h, m.x, sheet.page.1 - (m.y + m.h)];
        assert_eq!(cm.len(), 6);
        for (got, want) in cm.iter().zip(want) {
            assert!((got - want).abs() < 0.001, "{cm:?} vs {want}");
        }
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
        let sheet = sheet_of(None, MapLayout::Alone);
        let m = sheet.map;
        let bottom = sheet.page.1 - (m.y + m.h);
        let want = [
            m.x + width / 2.0,
            bottom + width / 2.0,
            m.w - width,
            m.h - width,
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

    #[test]
    fn map_top_sets_the_key_under_the_map_on_the_maps_page_flipped_to_pdf_y() {
        let key = the_key();
        let sheet = sheet_of(Some(&key), MapLayout::Top(1));
        let s = text(&build_pdf(&[(&tiny_png(), &sheet)]).unwrap());
        assert_eq!(page_count(&s), 1);
        // the heading is on the map's page, below the map's bottom edge (a smaller PDF y)
        let (x, y) = placed(&s, "Key to Sallow Fen");
        let map_bottom = sheet.page.1 - (sheet.map.y + sheet.map.h);
        assert!(y < map_bottom, "{y} under {map_bottom}");
        assert!((x - sheet.key[0].runs[0].x).abs() < 0.001);
        assert!((y - (sheet.page.1 - sheet.key[0].runs[0].y)).abs() < 0.001);
        assert!(s.find("/Im0 Do").unwrap() < s.find("(Key to Sallow Fen) Tj").unwrap());
        // grey is set around the category and put back
        assert!(s.contains("0.4 g\nBT /F1 9.5 Tf"));
        // a map that fills the page leaves no room: the key starts on a page of its own
        let page = PageSpec {
            size: PageSize::A5,
            landscape: false,
            margin_mm: 10.0,
        };
        let full = lay_out(page, 128.0 / 190.0, MapLayout::Top(1), Some(&key));
        let s = text(&build_pdf(&[(&tiny_png(), &full)]).unwrap());
        assert_eq!(page_count(&s), 2);
    }

    #[test]
    fn several_maps_make_one_pdf_in_order() {
        let key = the_key();
        let png = tiny_png();
        let with_key = sheet_of(Some(&key), MapLayout::Alone);
        let without = sheet_of(None, MapLayout::Alone);
        let s = text(&build_pdf(&[(&png, &with_key), (&png, &without)]).unwrap());
        // two images, map 1, its key page, map 2
        assert_eq!(page_count(&s), 3);
        assert!(s.contains("/Kids [7 0 R 9 0 R 11 0 R]"));
        assert!(s.contains("/XObject << /Im0 5 0 R >>"));
        assert!(s.contains("/XObject << /Im0 6 0 R >>"));
        assert!(build_pdf(&[]).is_err());
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
    fn a_key_in_three_columns_is_set_at_three_x_positions() {
        let s = text(&pdf_of(&tiny_png(), Some(&many(30)), MapLayout::Top(3)).unwrap());
        let mut xs: Vec<f64> = (1..=30)
            .map(|n| placed(&s, &format!("Place {n}")).0)
            .collect();
        xs.dedup();
        assert!(xs.len() >= 3, "{xs:?}");
    }
}
