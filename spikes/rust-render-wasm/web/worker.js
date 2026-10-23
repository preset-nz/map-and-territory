// Times N frames of the same map drawn two ways in a worker: tiny-skia in wasm + putImageData, or Canvas 2D.
self.onmessage = async ({ data }) => {
  const { mode, w, h, zoom, frames, wasm } = data;
  const canvas = new OffscreenCanvas(w, h), ctx = canvas.getContext('2d');
  const times = [];
  if (mode === 'cached') {
    // rasterise once in wasm at 1.5x the viewport, then pan by drawing the cached bitmap
    const { instance } = await WebAssembly.instantiate(await (await fetch(wasm)).arrayBuffer(), {});
    const ex = instance.exports, cw = Math.round(w * 1.5), ch = Math.round(h * 1.5), ptr = ex.frame_alloc(cw, ch);
    const t0 = performance.now();
    ex.render(zoom, 0, 0);
    const bmp = await createImageBitmap(new ImageData(new Uint8ClampedArray(ex.memory.buffer, ptr, cw * ch * 4).slice(), cw, ch));
    const build = performance.now() - t0;
    for (let i = 0; i < frames; i++) {
      const t1 = performance.now();
      ctx.drawImage(bmp, -((i * 7.3) % (cw - w)), -((i * 3.1) % (ch - h)));
      ctx.getImageData(0, 0, 1, 1);
      times.push(performance.now() - t1);
    }
    times.sort((a, b) => a - b);
    self.postMessage({ mode, w, h, zoom, median: times[times.length >> 1], p90: times[Math.floor(times.length * 0.9)], build });
    return;
  }
  if (mode.startsWith('wasm')) {
    const { instance } = await WebAssembly.instantiate(await (await fetch(wasm)).arrayBuffer(), {});
    const ex = instance.exports, ptr = ex.frame_alloc(w, h);
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now();
      ex.render(zoom, i * 7.3, i * 3.1);
      const img = new ImageData(new Uint8ClampedArray(ex.memory.buffer, ptr, w * h * 4), w, h);
      ctx.putImageData(img, 0, 0);
      ctx.getImageData(0, 0, 1, 1); // flush
      times.push(performance.now() - t0);
    }
  } else {
    const fills = ['rgba(139,0,0,.59)', 'rgba(216,216,216,.59)', 'rgba(105,105,105,.59)', 'rgba(12,12,12,.59)', 'rgba(255,255,0,.59)'];
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now(), panX = i * 7.3, panY = i * 3.1;
      ctx.fillStyle = '#e9ece4'; ctx.fillRect(0, 0, w, h);
      const r = 24 * zoom, step = Math.sqrt(3) * r, buckets = fills.map(() => new Path2D()), grid = new Path2D();
      const rows = Math.floor(h / (1.5 * r)) + 2, cols = Math.floor(w / step) + 2;
      for (let row = -1; row < rows; row++) for (let col = -1; col < cols; col++) {
        const cx = col * step + (row % 2 ? step / 2 : 0) - (panX % step), cy = row * 1.5 * r - (panY % (3 * r));
        const px = (cx + panX) / zoom, py = (cy + panY) / zoom;
        const v = Math.sin(px * 0.011) + Math.cos(py * 0.016) + 0.6 * Math.sin((px - py) * 0.006);
        const t = v < -1.1 ? 0 : v < 0.3 ? 1 : v < 1.0 ? 2 : v < 1.6 ? 3 : 4;
        for (const p of [buckets[t], grid]) for (let k = 0; k < 6; k++) { const a = (60 * k - 90) * Math.PI / 180; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); k ? p.lineTo(x, y) : p.moveTo(x, y); }
        buckets[t].closePath(); grid.closePath();
      }
      buckets.forEach((b, k) => { ctx.fillStyle = fills[k]; ctx.fill(b); });
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke(grid);
      ctx.getImageData(0, 0, 1, 1);
      times.push(performance.now() - t0);
    }
  }
  times.sort((a, b) => a - b);
  self.postMessage({ mode, w, h, zoom, median: times[times.length >> 1], p90: times[Math.floor(times.length * 0.9)] });
};
