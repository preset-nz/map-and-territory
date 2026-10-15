import type { RenderEnv } from '@/layers/types';
import type { SceneFrame } from '@/render/types';

/** The hex grid's size and orientation, from the frame's hexgrid layer, for every layer to draw on. */
export function gridEnv(frame: SceneFrame): RenderEnv['grid'] {
  const layer = frame.layers.find((l) => l.type === 'hexgrid');
  if (!layer) return undefined;
  const st = (layer.state ?? {}) as Record<string, unknown>;
  const size = Math.max(4, Number(st.size ?? 16));
  const orientation = st.orientation === 'flat' ? 'flat' : 'pointy';
  return { size, orientation };
}
