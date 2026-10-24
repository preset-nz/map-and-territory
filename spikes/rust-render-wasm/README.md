# Spike: tiny-skia in wasm vs Canvas 2D, in a worker

Throwaway evidence for guidance `projects/map-and-territory/features/24-rust-renderer/README.md`, story 1. Never merged.

The same map (paper, about 2,000 to 40,000 painted hexes, a hex grid) drawn per frame three ways in a dedicated worker, plus a fourth that pans a cached bitmap:

- `canvas2d`: today's path, Path2D fills and a stroke on an OffscreenCanvas.
- `wasm-scalar`, `wasm-simd`: tiny-skia 0.11 compiled to `wasm32-unknown-unknown` (no wasm-bindgen), the pixmap handed to `putImageData`.
- `cached`: tiny-skia renders once at 1.5× the viewport; each frame is one `drawImage` of that bitmap.

## Run it on the Mac, inside the app's window

Map & Territory only ever runs in its Tauri window (WKWebView), never in a browser (guidance family rule "No browser-only mode"), so the numbers that count come from that window.

```sh
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/render.wasm web/render-scalar.wasm
RUSTFLAGS="-C target-feature=+simd128" cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/render.wasm web/render-simd.wasm
cd web && python3 -m http.server 8765
```

Then serve `web/` with `server.py`, which also takes the page's results as a POST and writes them to a file, and point the app's dev window at it (from the repo root, with `just run` quit):

```sh
python3 spikes/rust-render-wasm/server.py results.txt spikes/rust-render-wasm/web &
pnpm tauri dev --config '{"build":{"beforeDevCommand":"","devUrl":"http://127.0.0.1:8765/index.html"}}'
```

The window loads the spike page in the app's own WKWebView and runs it; `results.txt` appears when it is done. Use `grit.html` instead of `index.html` for the grit scene. `cargo run --release --example native` times the flat scene natively.

## Results on the Mac (2026-10-24)

Georg's M5 Pro, 64 GB, in Map & Territory's dev window (WKWebView, `navigator.hardwareConcurrency` 8). The window was on the built-in 3456×2234 display, not a 5K one; the canvases are offscreen at the sizes listed, so the sizes hold, but compositing to the screen wasn't measured. WebKit's timer has 1 ms resolution, so values of 1 to 2 ms sit at its floor. Medians of 30 frames.

**Flat scene** (`index.html`: paper, flat hex fills, one grid stroke):

| Size | Zoom | Canvas 2D | tiny-skia wasm | wasm with SIMD | pan a cached bitmap | tiny-skia native |
|---|---|---|---|---|---|---|
| 2560×1600 | 2 | 2 ms | 52 ms | 31 ms | 1 ms (raster 90 ms once) | 27 ms |
| 2560×1600 | 1 | 5 ms | 84 ms | 55 ms | 1 ms (134 ms once) | 45 ms |
| 5120×2880 | 2 | 6 ms | 192 ms | 125 ms | 1 ms (299 ms once) | 99 ms |
| 5120×2880 | 1 | 18 ms | 312 ms | 206 ms | 1 ms (470 ms once) | 170 ms |

**Grit scene** (`grit.html`, `grit` in `src/lib.rs`: the flat scene plus a 4096 px paper texture under multiply, and the grid as wobbled short strokes in four widths with a misregistered second pass). wasm is SIMD; a tile is one 512 px tile:

| Size | Zoom | Canvas 2D | tiny-skia wasm, full frame | tiny-skia wasm, per tile (tiles in frame, one worker) |
|---|---|---|---|---|
| 2560×1600 | 2 | 4 ms | 115 ms | 8 ms (20 tiles, 160 ms) |
| 2560×1600 | 1 | 9 ms | 159 ms | 11 ms (20, 220 ms) |
| 5120×2880 | 2 | 10 ms | 411 ms | 8 ms (60, 480 ms) |
| 5120×2880 | 1 | 32 ms | 584 ms | 11 ms (60, 660 ms) |

What it says: on the Mac, Canvas 2D in WKWebView is 10 to 40 times faster than tiny-skia for a full frame, flat or gritty, because WebKit draws it on the GPU. Rust tiles would pass epic 24's 8 ms pan rule, but a fresh 5K view costs over half a second of CPU. The two scenes' pixels weren't compared, only timed. Georg's decision the same day: Map & Territory needs no headless render, so it stays on Canvas 2D (guidance M&T README decision 4).

## Results in the cloud container (2026-10-23)

Headless Chromium, 4 cores, no GPU: every mode rasterises on the CPU, so this is a floor, not the Mac.

| Size | Zoom | canvas2d | wasm-scalar | wasm-simd | cached pan |
|---|---|---|---|---|---|
| 2560×1600 | 2 | 19 ms | 123 ms | 91 ms | 13 ms |
| 2560×1600 | 1 | 123 ms | 222 ms | 153 ms | 18 ms |
| 5120×2880 | 2 | 141 ms | 465 ms | 388 ms | 52 ms |
| 5120×2880 | 1 | 1238 ms | 888 ms | 712 ms | 49 ms |

Medians of 30 frames. Zoom 2 is a 48 px hex radius, the app's 1× at a device pixel ratio of 2.
