// PNG metadata for the export (epic 07 story 4): the physical size, as a pHYs chunk. The pixels
// are untouched; only the chunk list changes. Pure, so it is tested without a window.

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const INCH_M = 0.0254;

/** Pixels per metre at `dpi`, rounded as the PNG spec's writers do: 300 dpi is 11811. */
export function pixelsPerMetre(dpi: number): number {
  return Math.round(dpi / INCH_M);
}

let table: Uint32Array | null = null;

/** CRC-32 as PNG chunks use it (ISO 3309), over `bytes`. */
export function crc32(bytes: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/**
 * `png` with a pHYs chunk for `dpi` (unit: metre) straight after IHDR, replacing any pHYs it
 * already had. Throws on bytes that are not a PNG. Every other chunk is copied as it was.
 */
export function setPngDpi(png: ArrayBuffer | Uint8Array, dpi = 300): Uint8Array {
  const src = png instanceof Uint8Array ? png : new Uint8Array(png);
  if (src.length < 8 + 25 || SIGNATURE.some((b, i) => src[i] !== b)) {
    throw new Error('Not a PNG');
  }
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  const phys = new Uint8Array(9);
  const ppm = pixelsPerMetre(dpi);
  const pv = new DataView(phys.buffer);
  pv.setUint32(0, ppm);
  pv.setUint32(4, ppm);
  phys[8] = 1;
  const inserted = chunk('pHYs', phys);

  const parts: Uint8Array[] = [src.subarray(0, 8)];
  let at = 8;
  let first = true;
  while (at + 12 <= src.length) {
    const length = view.getUint32(at);
    const end = at + 12 + length;
    if (end > src.length) throw new Error('Truncated PNG');
    const type = String.fromCharCode(src[at + 4], src[at + 5], src[at + 6], src[at + 7]);
    if (first) {
      if (type !== 'IHDR') throw new Error('PNG does not start with IHDR');
      parts.push(src.subarray(at, end), inserted);
      first = false;
    } else if (type !== 'pHYs') {
      parts.push(src.subarray(at, end));
    }
    at = end;
  }
  if (first) throw new Error('PNG has no IHDR');
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
