import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Plugins must not import store modules directly; they go through
 * ToolContext and AppAPI seams. Biome enforces this at lint time
 * (biome.json override for src/plugin/**); this test keeps the rule
 * visible in the suite and independent of the linter.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("plugin store import boundary", () => {
  it("no file under src/plugin imports @/stores", () => {
    const offenders = walk(join(process.cwd(), "src/plugin")).filter((f) =>
      /from\s+["']@\/stores(\/|["'])/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
