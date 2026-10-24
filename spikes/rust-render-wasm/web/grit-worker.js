// Grit scene timing: flat terrain, a 4096 px paper texture under multiply, wobbled grid strokes
// with width noise and a misregistered second pass. Same work as `grit` in src/lib.rs.
const hash = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.547; return v - Math.floor(v); };
const TEX = 4096;
function texBitmap() {
  const d = new Uint8ClampedArray(TEX * TEX * 4);
  for (let i = 0; i < TEX * TEX; i++) { const g = 200 + Math.floor(hash(i % TEX, Math.floor(i / TEX)) * 55); d[i * 4] = g; d[i * 4 + 1] = g; d[i * 4 + 2] = Math.floor(g * 0.96); d[i * 4 + 3] = 255; }
  return createImageBitmap(new ImageData(d, TEX, TEX));
}
function gritCanvas(ctx, w, h, zoom, panX, panY, tex) {
  const fills = ['rgba(139,0,0,.59)', 'rgba(216,216,216,.59)', 'rgba(105,105,105,.59)', 'rgba(12,12,12,.59)', 'rgba(255,255,0,.59)'];
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#e9ece4'; ctx.fillRect(0, 0, w, h);
  const r = 24 * zoom, step = Math.sqrt(3) * r, buckets = fills.map(() => new Path2D()), widths = [0, 1, 2, 3].map(() => new Path2D());
  const rows = Math.floor(h / (1.5 * r)) + 2, cols = Math.floor(w / step) + 2;
  for (let row = -1; row < rows; row++) for (let col = -1; col < cols; col++) {
    const cx = col * step + (row % 2 ? step / 2 : 0) - (panX % step), cy = row * 1.5 * r - (panY % (3 * r));
    const px = (cx + panX) / zoom, py = (cy + panY) / zoom;
    const v = Math.sin(px * 0.011) + Math.cos(py * 0.016) + 0.6 * Math.sin((px - py) * 0.006);
    const t = v < -1.1 ? 0 : v < 0.3 ? 1 : v < 1.0 ? 2 : v < 1.6 ? 3 : 4, p = buckets[t];
    for (let k = 0; k < 6; k++) { const a = (60 * k - 90) * Math.PI / 180; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); k ? p.lineTo(x, y) : p.moveTo(x, y); }
    p.closePath();
    for (let k = 0; k < 3; k++) {
      const a0 = (60 * k - 90) * Math.PI / 180, a1 = (60 * (k + 1) - 90) * Math.PI / 180;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      for (let s = 0; s < 4; s++) {
        const f0 = s / 4, f1 = (s + 1) / 4, n = hash(px + k, py + s), j = (n - 0.5) * 1.2 * zoom, b = Math.floor(n * 4) % 4;
        widths[b].moveTo(x0 + (x1 - x0) * f0 + j, y0 + (y1 - y0) * f0 - j); widths[b].lineTo(x0 + (x1 - x0) * f1 - j, y0 + (y1 - y0) * f1 + j);
      }
    }
  }
  buckets.forEach((b, k) => { ctx.fillStyle = fills[k]; ctx.fill(b); });
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(tex, 0, 0, w, w); ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  for (const [pass, dx, a] of [[0, 0, 1], [1, 1.5 * zoom, 90 / 255]]) {
    ctx.strokeStyle = `rgba(30,30,30,${a})`;
    widths.forEach((p, b) => { ctx.lineWidth = (0.6 + 0.4 * b) * zoom * (pass ? 0.7 : 1); ctx.save(); ctx.translate(dx, dx * 0.5); ctx.stroke(p); ctx.restore(); });
  }
}
self.onmessage = async ({ data }) => {
  const { mode, w, h, zoom, frames, wasm } = data, times = [];
  if (mode === 'canvas') {
    const tex = await texBitmap(), ctx = new OffscreenCanvas(w, h).getContext('2d');
    for (let i = 0; i < frames; i++) { const t0 = performance.now(); gritCanvas(ctx, w, h, zoom, i * 7.3, i * 3.1, tex); ctx.getImageData(0, 0, 1, 1); times.push(performance.now() - t0); }
  } else {
    // wasm full frame, or one 512 px tile per frame at a different pan (tile = tile cost)
    const { instance } = await WebAssembly.instantiate(await (await fetch(wasm)).arrayBuffer(), {});
    const ex = instance.exports, tw = mode === 'wasm-tile' ? 512 : w, th = mode === 'wasm-tile' ? 512 : h;
    ex.texture_alloc(TEX); const ptr = ex.frame_alloc(tw, th), ctx = new OffscreenCanvas(tw, th).getContext('2d');
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now();
      ex.grit(zoom, (i % 10) * 512 + 3.7, Math.floor(i / 10) * 512 + 1.3);
      ctx.putImageData(new ImageData(new Uint8ClampedArray(ex.memory.buffer, ptr, tw * th * 4), tw, th), 0, 0); ctx.getImageData(0, 0, 1, 1);
      times.push(performance.now() - t0);
    }
  }
  times.sort((a, b) => a - b);
  self.postMessage({ mode, w, h, zoom, median: times[times.length >> 1], p90: times[Math.floor(times.length * 0.9)] });
};
