import { crc32, pixelsPerMetre, setPngDpi } from '@/app/export/png';

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

function chunk(type: string, data: number[]): number[] {
  const body = [...ascii(type), ...data];
  return [...u32(data.length), ...body, ...u32(crc32(new Uint8Array(body)))];
}

const IHDR = chunk('IHDR', [...u32(2), ...u32(3), 8, 6, 0, 0, 0]);
const IDAT = chunk('IDAT', [1, 2, 3, 4, 5]);
const IEND = chunk('IEND', []);

interface Parsed {
  type: string;
  data: number[];
  crcOk: boolean;
}
function parse(bytes: Uint8Array): Parsed[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: Parsed[] = [];
  let at = 8;
  while (at < bytes.length) {
    const len = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const data = [...bytes.subarray(at + 8, at + 8 + len)];
    const crc = view.getUint32(at + 8 + len);
    out.push({ type, data, crcOk: crc === crc32(bytes.subarray(at + 4, at + 8 + len)) });
    at += 12 + len;
  }
  return out;
}

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(new Uint8Array(ascii('123456789')))).toBe(0xcbf43926);
  });
});

describe('setPngDpi', () => {
  it('300 dpi is 11811 pixels per metre', () => {
    expect(pixelsPerMetre(300)).toBe(11811);
  });

  it('inserts pHYs straight after IHDR with a valid CRC and leaves the rest alone', () => {
    const src = new Uint8Array([...SIG, ...IHDR, ...IDAT, ...IEND]);
    const out = setPngDpi(src, 300);
    const chunks = parse(out);
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'pHYs', 'IDAT', 'IEND']);
    expect(chunks.every((c) => c.crcOk)).toBe(true);
    expect(chunks[1].data).toEqual([...u32(11811), ...u32(11811), 1]);
    expect(chunks[0].data).toEqual(parse(src)[0].data);
    expect(out.length).toBe(src.length + 21);
    // dropping the new chunk gives back the original bytes
    const without = [...out.subarray(0, 8 + IHDR.length), ...out.subarray(8 + IHDR.length + 21)];
    expect(without).toEqual([...src]);
  });

  it('replaces an existing pHYs, wherever it sits', () => {
    const old = chunk('pHYs', [...u32(2835), ...u32(2835), 1]);
    const src = new Uint8Array([...SIG, ...IHDR, ...IDAT, ...old, ...IEND]);
    const chunks = parse(setPngDpi(src));
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'pHYs', 'IDAT', 'IEND']);
    expect(chunks[1].data.slice(0, 4)).toEqual(u32(11811));
  });

  it('takes an ArrayBuffer and rejects what is not a PNG', () => {
    const src = new Uint8Array([...SIG, ...IHDR, ...IEND]);
    expect(parse(setPngDpi(src.buffer)).length).toBe(3);
    expect(() => setPngDpi(new Uint8Array(50))).toThrow('Not a PNG');
    expect(() => setPngDpi(new Uint8Array([...SIG, ...IDAT, ...IEND]))).toThrow('IHDR');
  });
});
