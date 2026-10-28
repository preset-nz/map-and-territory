// Tool commands and the toolbar's document commands. Rust declares the ids and chords; the
// webview binds them. A bare-key chord (the tools' `1` to `6`) would be taken by the menu while
// a text field has focus, so tools are disabled then: a disabled item's key reaches the field.
import { type Binding, useTextFocus } from '@preset.nz/app-kit/core';
import { Icons } from '@preset.nz/ux-kit';
import { createElement, useMemo } from 'react';
import { useRun } from '../document';
import { MAPS_PATH } from '../scene/frame';
import { LOCATION_TOOLS, TOOL_COMMANDS, type ToolId, tools } from './tools';

const ICONS: Record<ToolId, keyof typeof Icons> = {
  paint: 'PaintBrush',
  erase: 'Eraser',
  fill: 'PaintBucket',
  select: 'Cursor',
  outline: 'Polygon',
  location: 'MapPinPlus',
  'location-move': 'ArrowsOutCardinal',
  'location-delete': 'Trash',
};

const icon = (name: keyof typeof Icons) =>
  createElement(Icons[name] as unknown as React.ComponentType, null);

export function useToolBindings(): Record<string, Binding> {
  const active = tools.use();
  const typing = useTextFocus();
  const run = useRun();
  return useMemo(() => {
    const out: Record<string, Binding> = {};
    for (const [id, tool] of Object.entries(TOOL_COMMANDS)) {
      out[id] = {
        icon: icon(ICONS[tool]),
        pressed: active === tool,
        enabled: !typing,
        run: () => tools.set(tool),
      };
    }
    // Map > New Map runs natively in Rust; this binding is the toolbar's way to the same step.
    out['map-new'] = {
      icon: icon('MapTrifold'),
      run: () => run('node.add', { parent: MAPS_PATH, type: 'map' }),
    };
    return out;
  }, [active, typing, run]);
}

/** Icons for the Layer menu's adds, merged over their scene bindings. */
export const LAYER_ICONS: Record<string, React.ReactNode> = {
  'layer.add-hex-noise': icon('Waveform'),
  'layer.add-freeform': icon('PaintBrushBroad'),
  'layer.add-outline': icon('Polygon'),
  'layer.add-image': icon('Image'),
  'layer.add-locations': icon('MapPinArea'),
};

/** The panel toggles at the toolbar's ends (ux-patterns, Side panels); the right one is mirrored. */
export const PANEL_ICONS = {
  left: icon('SidebarSimple'),
  right: createElement(
    Icons.SidebarSimple as unknown as React.ComponentType<{ className?: string }>,
    {
      className: '-scale-x-100',
    },
  ),
};

/** The toolbar: the left panel toggle, New Map, the layer adds, the tools, and the right panel toggle at the far end. */
export const TOOLBAR = {
  leading: ['view.toggle-left-panel'],
  groups: [
    ['map-new'],
    [
      'layer.add-hex-noise',
      'layer.add-freeform',
      'layer.add-outline',
      'layer.add-image',
      'layer.add-locations',
    ],
    [
      ...Object.keys(TOOL_COMMANDS).filter((id) => !LOCATION_TOOLS.includes(id)),
      { id: 'tool.locations', label: 'Location Tools', items: LOCATION_TOOLS },
    ],
  ],
  trailing: ['view.toggle-right-panel'],
};
