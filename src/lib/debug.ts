export function getDebugFlags(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_DEBUG;
  if (!raw) return new Set();
  const v = String(raw).toLowerCase().trim();
  if (v === "1" || v === "true" || v === "all" || v === "*") {
    return new Set(["all"]);
  }
  return new Set(v.split(/[\s,]+/).filter(Boolean));
}

export function debugEnabled(key?: string): boolean {
  const flags = getDebugFlags();
  if (flags.has("all")) return true;
  if (!key) return flags.size > 0;
  return flags.has(key.toLowerCase());
}
