import { Icons, SidePanel, StatusBar } from '@preset.nz/ux-kit';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

const PANEL_KEY = 'map-and-territory.scene-panel';
const DEFAULT_PANEL = { open: true, width: 260 };

/** The scene panel's open state and width, per viewer. Storage can be missing; that's fine. */
function readPanel(): { open: boolean; width: number } {
  try {
    const raw = localStorage.getItem(PANEL_KEY);
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

export function useScenePanel() {
  const [panel, setPanel] = useState(readPanel);
  useEffect(() => {
    try {
      localStorage.setItem(PANEL_KEY, JSON.stringify(panel));
    } catch {
      // per-viewer convenience only
    }
  }, [panel]);
  const setOpen = useCallback((open: boolean) => setPanel((p) => ({ ...p, open })), []);
  const setWidth = useCallback((width: number) => setPanel((p) => ({ ...p, width })), []);
  const toggle = useCallback(() => setPanel((p) => ({ ...p, open: !p.open })), []);
  return useMemo(
    () => ({ ...panel, setOpen, setWidth, toggle }),
    [panel, setOpen, setWidth, toggle],
  );
}

interface AppFrameProps {
  panel: ReturnType<typeof useScenePanel>;
  /** The panel toggle's shortcut, from the command table. */
  panelShortcut?: string;
  scene: ReactNode;
  /** Along the top of the canvas area. */
  toolbar?: ReactNode;
  canvas: ReactNode;
  status?: ReactNode;
}

/** Scene panel on the left, the canvas, a status bar along the bottom (epic 16, story 1). */
export function AppFrame({ panel, panelShortcut, scene, toolbar, canvas, status }: AppFrameProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
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
        <div className="flex min-w-0 flex-1 flex-col">
          {toolbar}
          <main className="relative min-h-0 flex-1">{canvas}</main>
        </div>
      </div>
      <StatusBar>{status}</StatusBar>
    </div>
  );
}
