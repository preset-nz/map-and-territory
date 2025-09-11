export type NameType = "campaign" | "map" | "layer" | string;

export interface GenerateNameOptions {
  type: NameType;
  base: string; // e.g. 'Hex Noise', 'Map'
  existing: string[]; // sibling names to check against
  padTo?: number; // default 2
  duplicateOf?: string; // if set, generate a copy name
}

function normalizeList(list: string[]): string[] {
  return list.map((n) => (n ?? "").trim()).filter(Boolean);
}

export function generateName(opts: GenerateNameOptions): string {
  const padTo = Math.max(1, opts.padTo ?? 2);
  const existing = new Set(normalizeList(opts.existing));
  // Duplicate mode → prefer "<name> Copy", then "<name> Copy 2", ...
  if (opts.duplicateOf && opts.duplicateOf.trim()) {
    const base = opts.duplicateOf.trim();
    const candidate = `${base} Copy`;
    if (!existing.has(candidate)) return candidate;
    let i = 2;
    while (existing.has(`${base} Copy ${i}`)) i++;
    return `${base} Copy ${i}`;
  }
  // New item numbering: "<base> 01", "<base> 02", ...
  const clean = (opts.base || "Item").trim();
  // Find trailing-number matches of the same base
  let max = 0;
  for (const name of existing) {
    if (!name.toLowerCase().startsWith(clean.toLowerCase())) continue;
    const m = name.match(/(\d+)\s*$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  const next = max + 1;
  const padded = String(next).padStart(padTo, "0");
  return `${clean} ${padded}`;
}

// no legacy wrapper; all call sites should use generateName
