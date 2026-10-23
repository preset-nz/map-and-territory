import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', (e) => console.log('ERR', String(e)));
await p.goto('http://127.0.0.1:8765/index.html');
await p.waitForFunction(() => window.done, null, { timeout: 600000 });
for (const r of await p.evaluate(() => window.results)) console.log(`${r.w}x${r.h} zoom${r.zoom} ${r.mode.padEnd(11)} median ${r.median.toFixed(1)} ms  p90 ${r.p90.toFixed(1)} ms${r.build ? `  (one-off raster ${r.build.toFixed(0)} ms)` : ''}`);
console.log('cores', await p.evaluate(() => navigator.hardwareConcurrency));
await b.close();
