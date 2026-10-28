// The palette strip under the inspector (epic 30 story 1): every terrain of the palette the
// active map draws with, each with its name and what it is underneath, and the brush's terrain
// marked. Colour and terrain are picked here, never in the toolbar (Georg, 2026-10-28).
import { useMirror } from '@preset.nz/pom';
import { cn } from '@preset.nz/ux-kit';
import { mapPaletteName, mapTerrains, type TerrainSwatch } from '../scene/frame';
import { useActiveMapId } from '../selection';
import { type BrushTerrain, brush } from '../tools/brush';

/** The swatch the brush paints with: the one picked, else the first of the brush's base type. */
export function pickedSwatch(swatches: TerrainSwatch[], picked: BrushTerrain): string | null {
  const own = picked.id ? swatches.find((s) => s.id === picked.id) : undefined;
  if (own && own.baseType === picked.baseType) return own.id;
  return swatches.find((s) => s.baseType === picked.baseType)?.id ?? null;
}

/** The base types as the inspector's choice labels name them. */
const BASE_LABELS: Record<TerrainSwatch['baseType'], string> = {
  water: 'Water',
  plains: 'Plains',
  forest: 'Forest',
  hills: 'Hills',
  mountains: 'Mountains',
};

const describe = (s: TerrainSwatch) =>
  [s.name, BASE_LABELS[s.baseType], ...s.traits]
    .filter((x, i, all) => all.indexOf(x) === i)
    .join(' · ');

export function PaletteStrip() {
  const mirror = useMirror();
  const mapId = useActiveMapId();
  const picked = brush.use();
  if (!mapId) return null;
  const swatches = mapTerrains(mirror, mapId);
  const name = mapPaletteName(mirror, mapId) ?? 'Default';
  const current = pickedSwatch(swatches, picked);
  return (
    <section aria-label="Palette" className="px-3 py-2">
      <h2 className="mb-1.5 truncate text-xs text-muted-foreground">{name}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1">
        {swatches.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={current === s.id}
            title={describe(s)}
            onClick={() => brush.set(s.baseType, s.id)}
            className={cn(
              'flex min-w-0 items-center gap-1.5 rounded-sm px-1 py-0.5 text-left hover:bg-accent',
              current === s.id && 'bg-accent ring-1 ring-primary',
            )}
          >
            <span
              aria-hidden
              className="size-4 shrink-0 rounded-xs ring-1 ring-border"
              style={{ backgroundColor: s.fill }}
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-xs">{s.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {BASE_LABELS[s.baseType]}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
