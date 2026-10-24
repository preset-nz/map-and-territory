import { Icons, SidePanel, SidePanelContent, StatusBar } from '@preset.nz/ux-kit';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_PANEL = { open: true, width: 260 };

/** The scene panel's open state and width, per viewer. Storage can be missing; that's fine. */
function readPanel(key: string): { open: boolean; width: number } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_PANEL;
    const v = JSON.parse(raw) as Partial<typeof DEFAULT_PANEL>;
    return {
      open: typeof v.open === 'boolean' ? v.open : DEFAULT_PANEL.open,
      width: typeof v.width === 'number' ? v.width : DEFAULT_PANEL.width,
    };
  } catch {
    return DEFAULT_PANEL;
  }
}

/** A side panel's open state and width, kept under `name` per viewer. */
export function useSidePanel(name: string) {
  const key = `map-and-territory.${name}`;
  const [panel, setPanel] = useState(() => readPanel(key));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(panel));
    } catch {
      // per-viewer convenience only
    }
  }, [key, panel]);
  const setOpen = useCallback((open: boolean) => setPanel((p) => ({ ...p, open })), []);
  const setWidth = useCallback((width: number) => setPanel((p) => ({ ...p, width })), []);
  const toggle = useCallback(() => setPanel((p) => ({ ...p, open: !p.open })), []);
  return useMemo(
    () => ({ ...panel, setOpen, setWidth, toggle }),
    [panel, setOpen, setWidth, toggle],
  );
}

export const useScenePanel = () => useSidePanel('scene-panel');
export const useInspectorPanel = () => useSidePanel('inspector-panel');

type Panel = ReturnType<typeof useSidePanel>;

interface AppFrameProps {
  panel: Panel;
  inspectorPanel: Panel;
  /** The inspector toggle's shortcut, from the command table. */
  inspectorShortcut?: string;
  inspector: ReactNode;
  /** The panel toggle's shortcut, from the command table. */
  panelShortcut?: string;
  scene: ReactNode;
  /** Across the full width of the window, above both panels (ux-patterns, Toolbar). */
  toolbar?: ReactNode;
  canvas: ReactNode;
  status?: ReactNode;
}

/** The toolbar across the top, then the scene panel on the left, the canvas, the inspector on the right, and a status bar along the bottom (epic 16, story 1). */
export function AppFrame({
  panel,
  panelShortcut,
  inspectorPanel,
  inspectorShortcut,
  inspector,
  scene,
  toolbar,
  canvas,
  status,
}: AppFrameProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {toolbar}
      <div className="flex min-h-0 flex-1">
        <SidePanel
          side="left"
          title="Scene"
          icon={<Icons.TreeStructure />}
          shortcut={panelShortcut}
          open={panel.open}
          onOpenChange={panel.setOpen}
          width={panel.width}
          onWidthChange={panel.setWidth}
        >
          {scene}
        </SidePanel>
        <main className="relative min-w-0 flex-1">{canvas}</main>
        <SidePanel
          side="right"
          title="Inspector"
          icon={<Icons.SlidersHorizontal />}
          shortcut={inspectorShortcut}
          open={inspectorPanel.open}
          onOpenChange={inspectorPanel.setOpen}
          width={inspectorPanel.width}
          onWidthChange={inspectorPanel.setWidth}
        >
          <SidePanelContent>{inspector}</SidePanelContent>
        </SidePanel>
      </div>
      <StatusBar>{status}</StatusBar>
    </div>
  );
}
