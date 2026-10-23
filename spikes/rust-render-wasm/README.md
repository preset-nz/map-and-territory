# Spike: tiny-skia in wasm vs Canvas 2D, in a worker

Throwaway evidence for guidance `projects/map-and-territory/features/24-rust-renderer/README.md`, story 1. Never merged.

The same map (paper, about 2,000 to 40,000 painted hexes, a hex grid) drawn per frame three ways in a dedicated worker, plus a fourth that pans a cached bitmap:

- `canvas2d`: today's path, Path2D fills and a stroke on an OffscreenCanvas.
- `wasm-scalar`, `wasm-simd`: tiny-skia 0.11 compiled to `wasm32-unknown-unknown` (no wasm-bindgen), the pixmap handed to `putImageData`.
- `cached`: tiny-skia renders once at 1.5× the viewport; each frame is one `drawImage` of that bitmap.

## Run it on the Mac

```sh
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/render.wasm web/render-scalar.wasm
RUSTFLAGS="-C target-feature=+simd128" cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/render.wasm web/render-simd.wasm
cd web && python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/` in Safari (WKWebView's engine) and in Chrome; the table prints on the page. Copy it into epic 24's story 1.

## Results in the cloud container (2026-10-23)

Headless Chromium, 4 cores, no GPU: every mode rasterises on the CPU, so this is a floor, not the Mac.

| Size | Zoom | canvas2d | wasm-scalar | wasm-simd | cached pan |
|---|---|---|---|---|---|
| 2560×1600 | 2 | 19 ms | 123 ms | 91 ms | 13 ms |
| 2560×1600 | 1 | 123 ms | 222 ms | 153 ms | 18 ms |
| 5120×2880 | 2 | 141 ms | 465 ms | 388 ms | 52 ms |
| 5120×2880 | 1 | 1238 ms | 888 ms | 712 ms | 49 ms |

Medians of 30 frames. Zoom 2 is a 48 px hex radius, the app's 1× at a device pixel ratio of 2.
