import { CommandToolbar } from '@preset.nz/app-kit';
import { useCommands } from '@preset.nz/app-kit/core';
import { useChildren, useMirror } from '@preset.nz/pom';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasHost } from './app/canvas-host';
import { AppFrame, useScenePanel } from './app/frame';
import { addedMap } from './app/scene/active-map';
import { useSceneBindings } from './app/scene/commands';
import { useMapIds } from './app/scene/maps';
import { ScenePanel } from './app/scene/scene-panel';
import { selection, useActiveMapId } from './app/selection';
import { LAYER_ICONS, TOOLBAR, useToolBindings } from './app/tools/bindings';
import { BrushPicker } from './app/tools/brush-picker';
import { useToolPointer } from './app/tools/pointer-tools';

/** Selects whatever has just been added to `ids` (one more, and new), through `select`. */
function useSelectAdded(ids: readonly string[], select: (id: string) => void) {
  const before = useRef<readonly string[] | null>(null);
  useEffect(() => {
    const added = before.current === null ? null : addedMap(before.current, ids);
    before.current = ids;
    if (added) select(added);
  }, [ids, select]);
}

/** A map or layer that has just been added becomes the selection, as in 2025. */
function useSelectNewMapsAndLayers() {
  useSelectAdded(useMapIds(), selection.selectMap);
  useSelectAdded(useChildren(useActiveMapId(), 'layers'), selection.selectLayer);
}

export default function App() {
  const panel = useScenePanel();

  // The command table arrives from Rust; app-kit forwards the ones Rust doesn't handle here.
  // It also follows the history and routes Cmd+Z inside text fields.
  const scene = useSceneBindings();
  const toolBindings = useToolBindings();
  const onPointer = useToolPointer();
  const bindings = useMemo(
    () => ({
      ...scene,
      ...Object.fromEntries(
        Object.entries(LAYER_ICONS).map(([id, icon]) => [id, { ...scene[id], icon }]),
      ),
      ...toolBindings,
      'view.toggle-left-panel': { pressed: panel.open, run: panel.toggle },
    }),
    [scene, toolBindings, panel.open, panel.toggle],
  );
  const { commands, run, shortcut } = useCommands(bindings);

  // Connect, listen, then read the document. Starting twice is a no-op.
  const mirror = useMirror();
  useEffect(() => {
    mirror.start().catch((error) => console.error('[document] could not connect', error));
  }, [mirror]);
  useSelectNewMapsAndLayers();

  return (
    <AppFrame
      panel={panel}
      panelShortcut={shortcut('view.toggle-left-panel')}
      scene={<ScenePanel />}
      toolbar={
        <CommandToolbar commands={commands} layout={TOOLBAR} run={run}>
          <BrushPicker />
        </CommandToolbar>
      }
      canvas={<CanvasHost onPointer={onPointer} />}
    />
  );
}
