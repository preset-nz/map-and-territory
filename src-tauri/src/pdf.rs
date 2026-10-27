//! A minimal one-page PDF for the export (epic 07 story 5): a white page of the given size in
//! points with one image placed at a rectangle. Hand-written, no PDF crate: the file is a
//! catalogue, a page tree, a page, a content stream and one image XObject.
//!
//! The image is the exported PNG decoded and composited onto white, then stored as
//! `/FlateDecode` RGB at its own pixel size, so the page shows it at the 300 dpi it was drawn at.

use flate2::{write::ZlibEncoder, Compression};
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

/// A one-page PDF: white, `layout.page_w × page_h` points, `png` placed at the layout's
/// rectangle with a thin black border.
pub fn build_pdf(png: &[u8], layout: &PdfLayout) -> Result<Vec<u8>, String> {
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
    object(&mut out, "<< /Type /Catalog /Pages 2 0 R >>".into(), None);
    object(
        &mut out,
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>".into(),
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
        let pdf = build_pdf(&tiny_png(), &layout()).unwrap();
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

    #[test]
    fn a_black_border_sits_inside_the_map_after_the_image() {
        let pdf = build_pdf(&tiny_png(), &layout()).unwrap();
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
        let pdf = build_pdf(&tiny_png(), &layout()).unwrap();
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
        let pdf = build_pdf(&tiny_png(), &layout()).unwrap();
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
        assert!(build_pdf(b"nope", &layout()).is_err());
    }
}
