import { useChildren, useNodeAt } from '@preset.nz/pom';
import { MAPS_PATH } from './frame';

/** The campaign's maps, in the scene panel's order. */
export function useMapIds(): readonly string[] {
  const maps = useNodeAt(MAPS_PATH);
  return useChildren(maps?.id, 'maps');
}
