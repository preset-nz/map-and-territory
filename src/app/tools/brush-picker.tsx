import { useMirror } from '@preset.nz/pom';
import { cn } from '@preset.nz/ux-kit';
import { mapPalette } from '../scene/frame';
import { useActiveMapId } from '../selection';
import { brush, TERRAINS } from './brush';
import { tools } from './tools';

/** The brush's terrains, coloured by the active map's palette. Shown for paint and fill. */
export function BrushPicker() {
  const tool = tools.use();
  const current = brush.use();
  const mirror = useMirror();
  const mapId = useActiveMapId();
  if (tool !== 'paint' && tool !== 'fill') return null;
  const palette = mapPalette(mirror, mapId, mirror.schema);
  return (
    <fieldset aria-label="Brush terrain" className="m-0 flex items-center gap-1 border-0 p-0 px-2">
      {TERRAINS.map((t) => {
        const entry = palette.terrain[t];
        const label = entry.label ?? t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={current === t}
            aria-label={label}
            title={label}
            onClick={() => brush.set(t)}
            style={{ background: entry.fill }}
            className={cn(
              'size-5 rounded-sm ring-1 ring-border',
              current === t && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
            )}
          />
        );
      })}
    </fieldset>
  );
}
