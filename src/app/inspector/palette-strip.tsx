// The setting strip under the inspector (epic 30): every terrain of the setting the active map
// draws with as a large swatch, the brush's terrain marked, and the setting's other colours in
// a row below. Names and types show on hover; the editor under the swatches comes with story 4.
// Colour and terrain are picked here, never in the toolbar (Georg, 2026-10-28).
import { useMirror } from '@preset.nz/pom';
import { cn } from '@preset.nz/ux-kit';
import { mapPaletteName, mapRoles, mapTerrains, type TerrainSwatch } from '../scene/frame';
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

/** A terrain's hover text: its name, its type, then its traits. */
export const describeTerrain = (s: TerrainSwatch) =>
  [s.name, BASE_LABELS[s.baseType], ...s.traits]
    .filter((x, i, all) => all.indexOf(x) === i)
    .join(' · ');

export function PaletteStrip() {
  const mirror = useMirror();
  const mapId = useActiveMapId();
  const picked = brush.use();
  if (!mapId) return null;
  const swatches = mapTerrains(mirror, mapId);
  const roles = mapRoles(mirror, mapId);
  const name = mapPaletteName(mirror, mapId) ?? 'Default';
  const current = pickedSwatch(swatches, picked);
  return (
    <section aria-label="Setting" className="px-3 py-2">
      <h2 className="mb-2 truncate text-xs text-muted-foreground">{name}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
        {swatches.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={current === s.id}
            aria-label={describeTerrain(s)}
            title={describeTerrain(s)}
            onClick={() => brush.set(s.baseType, s.id)}
            style={{ backgroundColor: s.fill }}
            className={cn(
              'aspect-square rounded-sm ring-1 ring-border',
              current === s.id && 'ring-2 ring-primary ring-offset-2 ring-offset-sidebar',
            )}
          />
        ))}
      </div>
      {roles.length > 0 && (
        <ul
          aria-label="Colours"
          className="mt-2 flex flex-wrap gap-1.5 border-sidebar-border border-t pt-2"
        >
          {roles.map((r) => (
            <li
              key={r.key}
              aria-label={r.label}
              title={r.label}
              style={{ backgroundColor: r.fill }}
              className="size-5 rounded-xs ring-1 ring-border"
            />
          ))}
        </ul>
      )}
    </section>
  );
}
