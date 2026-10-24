//! Spike for M&T epic 24 story 1: paper, painted hexes and a hex grid drawn by tiny-skia in
//! wasm, into a buffer the worker hands to putImageData. Throwaway.
use tiny_skia::*;

static mut PIXMAP: Option<Pixmap> = None;

#[no_mangle]
pub extern "C" fn frame_alloc(w: u32, h: u32) -> *const u8 {
    let p = Pixmap::new(w, h).unwrap();
    unsafe {
        PIXMAP = Some(p);
        PIXMAP.as_ref().unwrap().data().as_ptr()
    }
}

fn hex(pb: &mut PathBuilder, cx: f32, cy: f32, r: f32) {
    for i in 0..6 {
        let a = (60.0 * i as f32 - 90.0).to_radians();
        let (x, y) = (cx + r * a.cos(), cy + r * a.sin());
        if i == 0 {
            pb.move_to(x, y)
        } else {
            pb.line_to(x, y)
        }
    }
    pb.close();
}

/// Draws the map at `zoom` (hex radius 24 paper px times zoom), panned by `pan`.
#[no_mangle]
pub extern "C" fn render(zoom: f32, pan_x: f32, pan_y: f32) {
    let pm = unsafe { PIXMAP.as_mut().unwrap() };
    let (w, h) = (pm.width() as f32, pm.height() as f32);
    pm.fill(Color::from_rgba8(233, 236, 228, 255));
    let r = 24.0 * zoom;
    let step = 3f32.sqrt() * r;
    let fills = [
        [139, 0, 0],
        [216, 216, 216],
        [105, 105, 105],
        [12, 12, 12],
        [255, 255, 0],
    ];
    let mut buckets: Vec<PathBuilder> = (0..5).map(|_| PathBuilder::new()).collect();
    let mut grid = PathBuilder::new();
    let rows = (h / (1.5 * r)) as i32 + 2;
    let cols = (w / step) as i32 + 2;
    for row in -1..rows {
        for col in -1..cols {
            let cx = col as f32 * step + if row % 2 != 0 { step / 2.0 } else { 0.0 } - pan_x % step;
            let cy = row as f32 * 1.5 * r - pan_y % (3.0 * r);
            // the same terrain function as the examples page, in paper space
            let (px, py) = ((cx + pan_x) / zoom, (cy + pan_y) / zoom);
            let v = (px * 0.011).sin() + (py * 0.016).cos() + 0.6 * ((px - py) * 0.006).sin();
            let t = if v < -1.1 {
                0
            } else if v < 0.3 {
                1
            } else if v < 1.0 {
                2
            } else if v < 1.6 {
                3
            } else {
                4
            };
            hex(&mut buckets[t], cx, cy, r);
            hex(&mut grid, cx, cy, r);
        }
    }
    let mut paint = Paint::default();
    paint.anti_alias = true;
    for (t, pb) in buckets.into_iter().enumerate() {
        if let Some(path) = pb.finish() {
            let [cr, cg, cb] = fills[t];
            paint.set_color_rgba8(cr, cg, cb, 150);
            pm.fill_path(
                &path,
                &paint,
                FillRule::Winding,
                Transform::identity(),
                None,
            );
        }
    }
    if let Some(path) = grid.finish() {
        paint.set_color_rgba8(51, 51, 51, 255);
        let stroke = Stroke {
            width: 1.0,
            ..Stroke::default()
        };
        pm.stroke_path(&path, &paint, &stroke, Transform::identity(), None);
    }
}

// ---- grit scene: flat terrain, a paper texture under multiply, grid lines with wobble,
// width noise and a misregistered second pass. Same work as gritCanvas in worker.js.
static mut TEX: Option<Pixmap> = None;

fn hash(x: f32, y: f32) -> f32 {
    let v = (x * 12.9898 + y * 78.233).sin() * 43758.547;
    v - v.floor()
}

#[no_mangle]
pub extern "C" fn texture_alloc(size: u32) {
    let mut p = Pixmap::new(size, size).unwrap();
    for (i, px) in p.pixels_mut().iter_mut().enumerate() {
        let (x, y) = ((i as u32 % size) as f32, (i as u32 / size) as f32);
        let g = 200 + (hash(x, y) * 55.0) as u8;
        *px = PremultipliedColorU8::from_rgba(g, g, (g as f32 * 0.96) as u8, 255).unwrap();
    }
    unsafe { TEX = Some(p) }
}

#[no_mangle]
pub extern "C" fn grit(zoom: f32, pan_x: f32, pan_y: f32) {
    let pm = unsafe { PIXMAP.as_mut().unwrap() };
    let (w, h) = (pm.width() as f32, pm.height() as f32);
    pm.fill(Color::from_rgba8(233, 236, 228, 255));
    let r = 24.0 * zoom;
    let step = 3f32.sqrt() * r;
    let fills = [
        [139, 0, 0],
        [216, 216, 216],
        [105, 105, 105],
        [12, 12, 12],
        [255, 255, 0],
    ];
    let mut buckets: Vec<PathBuilder> = (0..5).map(|_| PathBuilder::new()).collect();
    let mut widths: Vec<PathBuilder> = (0..4).map(|_| PathBuilder::new()).collect();
    let rows = (h / (1.5 * r)) as i32 + 2;
    let cols = (w / step) as i32 + 2;
    for row in -1..rows {
        for col in -1..cols {
            let cx = col as f32 * step + if row % 2 != 0 { step / 2.0 } else { 0.0 } - pan_x % step;
            let cy = row as f32 * 1.5 * r - pan_y % (3.0 * r);
            let (px, py) = ((cx + pan_x) / zoom, (cy + pan_y) / zoom);
            let v = (px * 0.011).sin() + (py * 0.016).cos() + 0.6 * ((px - py) * 0.006).sin();
            let t = if v < -1.1 {
                0
            } else if v < 0.3 {
                1
            } else if v < 1.0 {
                2
            } else if v < 1.6 {
                3
            } else {
                4
            };
            hex(&mut buckets[t], cx, cy, r);
            // three of six edges per hex (the others belong to neighbours), 4 wobbled segments each
            for k in 0..3 {
                let a0 = (60.0 * k as f32 - 90.0).to_radians();
                let a1 = (60.0 * (k + 1) as f32 - 90.0).to_radians();
                let (x0, y0, x1, y1) = (
                    cx + r * a0.cos(),
                    cy + r * a0.sin(),
                    cx + r * a1.cos(),
                    cy + r * a1.sin(),
                );
                for s in 0..4 {
                    let (f0, f1) = (s as f32 / 4.0, (s + 1) as f32 / 4.0);
                    let n = hash(px + k as f32, py + s as f32);
                    let j = (n - 0.5) * 1.2 * zoom;
                    let b = (n * 4.0) as usize % 4;
                    widths[b].move_to(x0 + (x1 - x0) * f0 + j, y0 + (y1 - y0) * f0 - j);
                    widths[b].line_to(x0 + (x1 - x0) * f1 - j, y0 + (y1 - y0) * f1 + j);
                }
            }
        }
    }
    let mut paint = Paint::default();
    paint.anti_alias = true;
    for (t, pb) in buckets.into_iter().enumerate() {
        if let Some(path) = pb.finish() {
            let [cr, cg, cb] = fills[t];
            paint.set_color_rgba8(cr, cg, cb, 150);
            pm.fill_path(
                &path,
                &paint,
                FillRule::Winding,
                Transform::identity(),
                None,
            );
        }
    }
    let tex = unsafe { TEX.as_ref().unwrap() };
    let sx = w / tex.width() as f32;
    let pp = PixmapPaint {
        opacity: 1.0,
        blend_mode: BlendMode::Multiply,
        quality: FilterQuality::Bilinear,
    };
    pm.draw_pixmap(0, 0, tex.as_ref(), &pp, Transform::from_scale(sx, sx), None);
    let paths: Vec<_> = widths.into_iter().filter_map(|pb| pb.finish()).collect();
    for (pass, (dx, alpha)) in [(0.0f32, 255u8), (1.5 * zoom, 90)].into_iter().enumerate() {
        paint.set_color_rgba8(30, 30, 30, alpha);
        for (b, path) in paths.iter().enumerate() {
            let stroke = Stroke {
                width: (0.6 + 0.4 * b as f32) * zoom * if pass == 1 { 0.7 } else { 1.0 },
                line_cap: LineCap::Round,
                ..Stroke::default()
            };
            pm.stroke_path(
                path,
                &paint,
                &stroke,
                Transform::from_translate(dx, dx * 0.5),
                None,
            );
        }
    }
}
