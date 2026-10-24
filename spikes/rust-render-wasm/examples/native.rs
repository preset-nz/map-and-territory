use std::time::Instant;
fn main() {
    for (w, h) in [(2560u32, 1600u32), (5120, 2880)] {
        for zoom in [2.0f32, 1.0] {
            render::frame_alloc(w, h);
            let mut t = Vec::new();
            for i in 0..30 {
                let t0 = Instant::now();
                render::render(zoom, i as f32 * 7.3, i as f32 * 3.1);
                t.push(t0.elapsed().as_secs_f64() * 1000.0);
            }
            t.sort_by(|a, b| a.partial_cmp(b).unwrap());
            println!(
                "{w}x{h} zoom{zoom} native      median {:.1} ms  p90 {:.1} ms",
                t[15], t[27]
            );
        }
    }
}
