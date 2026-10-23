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
        if i == 0 { pb.move_to(x, y) } else { pb.line_to(x, y) }
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
    let fills = [[139, 0, 0], [216, 216, 216], [105, 105, 105], [12, 12, 12], [255, 255, 0]];
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
            let t = if v < -1.1 { 0 } else if v < 0.3 { 1 } else if v < 1.0 { 2 } else if v < 1.6 { 3 } else { 4 };
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
            pm.fill_path(&path, &paint, FillRule::Winding, Transform::identity(), None);
        }
    }
    if let Some(path) = grid.finish() {
        paint.set_color_rgba8(51, 51, 51, 255);
        let stroke = Stroke { width: 1.0, ..Stroke::default() };
        pm.stroke_path(&path, &paint, &stroke, Transform::identity(), None);
    }
}
