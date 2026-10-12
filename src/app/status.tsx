import { useMirror, useNode } from '@preset.nz/pom';
import { StatusItem, StatusSpacer } from '@preset.nz/ux-kit';
import { mapPaletteName } from './scene/frame';
import { displayName } from './scene/tree';
import { selection, useActiveMapId } from './selection';
import { pointerHex, tools } from './tools/tools';

const TOOL_NAMES = {
  paint: 'Paint',
  erase: 'Erase',
  fill: 'Fill',
  select: 'Select',
  outline: 'Outline',
} as const;

/** Active tool and the hex under the pointer on the left; palette and selection on the right. */
export function StatusContent() {
  const tool = tools.use();
  const hex = pointerHex.use();
  const mirror = useMirror();
  const mapId = useActiveMapId();
  const selected = selection.use();
  const selectedRow = useNode('id' in selected ? selected.id : null);
  const palette = mapId ? (mapPaletteName(mirror, mapId) ?? 'Default') : null;
  const what =
    selected.kind === 'campaign' ? 'Campaign' : selectedRow ? displayName(selectedRow) : null;
  return (
    <>
      <StatusItem label="Tool">{TOOL_NAMES[tool]}</StatusItem>
      <StatusItem label="Hex">{hex ? `${hex.q}, ${hex.r}` : '—'}</StatusItem>
      <StatusSpacer />
      {palette && <StatusItem label="Palette">{palette}</StatusItem>}
      {what && <StatusItem label="Selected">{what}</StatusItem>}
    </>
  );
}
