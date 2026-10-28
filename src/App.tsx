import { CommandToolbar } from '@preset.nz/app-kit';
import { useCommands } from '@preset.nz/app-kit/core';
import { useChildren, useMirror } from '@preset.nz/pom';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasHost } from './app/canvas-host';
import { useExportBindings } from './app/export/bindings';
import { AppFrame, useInspectorPanel, useScenePanel } from './app/frame';
import { Inspector } from './app/inspector/inspector';
import { PaletteStrip } from './app/inspector/palette-strip';
import { addedChild, type Reading } from './app/scene/active-map';
import { useSceneBindings } from './app/scene/commands';
import { useMapIds } from './app/scene/maps';
import { ScenePanel } from './app/scene/scene-panel';
import { selection, useActiveMapId } from './app/selection';
import { StatusContent } from './app/status';
import { LAYER_ICONS, PANEL_ICONS, TOOLBAR, useToolBindings } from './app/tools/bindings';
import { useToolPointer } from './app/tools/pointer-tools';
import { camera, ZOOM_STEP } from './app/view/camera';

/**
 * Selects whatever has just been added to `owner`'s `ids` (one more, and new), through
 * `select`. A change of owner is a new baseline, not an add.
 */
function useSelectAdded(
  owner: string | null,
  ids: readonly string[],
  select: (id: string) => void,
) {
  const before = useRef<Reading | null>(null);
  useEffect(() => {
    const now = { owner, ids };
    const added = addedChild(before.current, now);
    before.current = now;
    if (added) select(added);
  }, [owner, ids, select]);
}

/** A map, layer or title that has just been added becomes the selection, as in 2025. */
function useSelectNewMapsAndLayers() {
  const mapId = useActiveMapId();
  useSelectAdded(null, useMapIds(), selection.selectMap);
  useSelectAdded(mapId, useChildren(mapId, 'layers'), selection.selectLayer);
  // furniture selects as a layer does, so the inspector shows the new title
  useSelectAdded(mapId, useChildren(mapId, 'furniture'), selection.selectLayer);
}

export default function App() {
  const panel = useScenePanel();
  const inspectorPanel = useInspectorPanel();

  // The command table arrives from Rust; app-kit forwards the ones Rust doesn't handle here.
  // It also follows the history and routes Cmd+Z inside text fields.
  const scene = useSceneBindings();
  const toolBindings = useToolBindings();
  const exportBindings = useExportBindings();
  const onPointer = useToolPointer();
  const bindings = useMemo(
    () => ({
      ...scene,
      ...Object.fromEntries(
        Object.entries(LAYER_ICONS).map(([id, icon]) => [id, { ...scene[id], icon }]),
      ),
      ...toolBindings,
      ...exportBindings,
      'view.toggle-left-panel': { icon: PANEL_ICONS.left, pressed: panel.open, run: panel.toggle },
      'view.zoom-in': { run: () => camera.zoomCentre(ZOOM_STEP) },
      'view.zoom-out': { run: () => camera.zoomCentre(1 / ZOOM_STEP) },
      'view.fit': { run: camera.fit },
      'view.toggle-right-panel': {
        icon: PANEL_ICONS.right,
        pressed: inspectorPanel.open,
        run: inspectorPanel.toggle,
      },
    }),
    [
      scene,
      toolBindings,
      exportBindings,
      panel.open,
      panel.toggle,
      inspectorPanel.open,
      inspectorPanel.toggle,
    ],
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
      inspectorPanel={inspectorPanel}
      inspectorShortcut={shortcut('view.toggle-right-panel')}
      inspector={<Inspector />}
      inspectorFooter={<PaletteStrip />}
      scene={<ScenePanel />}
      toolbar={<CommandToolbar commands={commands} layout={TOOLBAR} run={run} />}
      canvas={<CanvasHost onPointer={onPointer} />}
      status={<StatusContent />}
    />
  );
}
