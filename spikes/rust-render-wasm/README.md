# Spike: tiny-skia in wasm vs Canvas 2D, in a worker

Throwaway evidence for guidance `projects/map-and-territory/features/24-rust-renderer/README.md`, story 1. Never merged.

The same map (paper, about 2,000 to 40,000 painted hexes, a hex grid) drawn per frame three ways in a dedicated worker, plus a fourth that pans a cached bitmap:

- `canvas2d`: today's path, Path2D fills and a stroke on an OffscreenCanvas.
- `wasm-scalar`, `wasm-simd`: tiny-skia 0.11 compiled to `wasm32-unknown-unknown` (no wasm-bindgen), the pixmap handed to `putImageData`.
- `cached`: tiny-skia renders once at 1.5× the viewport; each frame is one `drawImage` of that bitmap.

## Run it on the Mac, inside the app's window

Map & Territory only ever runs in its Tauri window (WKWebView), never in a browser (guidance M&T README decision 15), so the numbers that count come from that window.

```sh
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/render.wasm web/render-scalar.wasm
RUSTFLAGS="-C target-feature=+simd128" cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/render.wasm web/render-simd.wasm
cd web && python3 -m http.server 8765
```

Then, in a second terminal at the repo root:

1. `just run`, and make the window full screen on the 5K display.
2. Safari ▸ Settings ▸ Advanced ▸ "Show features for web developers", once.
3. Safari ▸ Develop ▸ (this Mac) ▸ Map & Territory opens the Web Inspector on the app's webview (debug builds allow it).
4. In its console: `location.href = 'http://127.0.0.1:8765/'`. The page runs the spike in the app's own WebKit and prints the table.
5. Copy the table into guidance epic 24, story 1. Quit the app; it reloads its own UI on the next launch.

If the window refuses to navigate away from the app, the fallback is a debug-only menu item that loads the spike page in a second window; it isn't built yet.

## Results in the cloud container (2026-10-23)

Headless Chromium, 4 cores, no GPU: every mode rasterises on the CPU, so this is a floor, not the Mac.

| Size | Zoom | canvas2d | wasm-scalar | wasm-simd | cached pan |
|---|---|---|---|---|---|
| 2560×1600 | 2 | 19 ms | 123 ms | 91 ms | 13 ms |
| 2560×1600 | 1 | 123 ms | 222 ms | 153 ms | 18 ms |
| 5120×2880 | 2 | 141 ms | 465 ms | 388 ms | 52 ms |
| 5120×2880 | 1 | 1238 ms | 888 ms | 712 ms | 49 ms |

Medians of 30 frames. Zoom 2 is a 48 px hex radius, the app's 1× at a device pixel ratio of 2.
