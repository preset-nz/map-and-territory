// The setting strip under the inspector (epic 30): every terrain of the setting the active map
// draws with as a large swatch, the brush's terrain marked, and the setting's other colours in
// a row below. Names and types show on hover; the editor under the swatches comes with story 4.
// Colour and terrain are picked here, never in the toolbar (Georg, 2026-10-28).
import { useMirror } from '@preset.nz/pom';
import { cn } from '@preset.nz/ux-kit';
import { useChannel } from '../document';
import {
  mapPaletteName,
  mapRoles,
  mapTerrains,
  type RowSource,
  type TerrainSwatch,
} from '../scene/frame';
import { type Selected, selection, useActiveMapId } from '../selection';
import { type BrushTerrain, brush } from '../tools/brush';

/** The swatch the brush paints with: the one picked, else the first of the brush's base type. */
export function pickedSwatch(swatches: TerrainSwatch[], picked: BrushTerrain): string | null {
  const own = picked.id ? swatches.find((s) => s.id === picked.id) : undefined;
  if (own && own.baseType === picked.baseType) return own.id;
  return swatches.find((s) => s.baseType === picked.baseType)?.id ?? null;
}

/**
 * The hex noise layer the strip picks for, when one is selected: its path and the swatch it
 * paints (the one its `terrain` names, else the setting's first). Otherwise the strip sets the
 * brush.
 */
export function noiseTarget(
  selected: Selected,
  rows: RowSource,
  swatches: TerrainSwatch[],
): { path: string; id: string | null } | null {
  if (selected.kind !== 'layer') return null;
  const row = rows.node(selected.id);
  if (row?.type !== 'hex-noise' || !row.path) return null;
  const own = swatches.find((s) => s.id === row.values?.terrain);
  return { path: row.path, id: (own ?? swatches[0])?.id ?? null };
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
  const selected = selection.use();
  const channel = useChannel();
  if (!mapId) return null;
  const swatches = mapTerrains(mirror, mapId);
  const roles = mapRoles(mirror, mapId);
  const name = mapPaletteName(mirror, mapId) ?? 'Default';
  const noise = noiseTarget(selected, mirror, swatches);
  const current = noise ? noise.id : pickedSwatch(swatches, picked);
  const pick = (s: TerrainSwatch) => {
    if (!noise) return brush.set(s.baseType, s.id);
    // named "Set Terrain" by rhizome, from the value's label
    channel
      .run('value.set', { at: noise.path, key: 'terrain', value: s.id })
      .catch((e) => console.error('[palette-strip] value.set refused', e));
  };
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
            onClick={() => pick(s)}
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
