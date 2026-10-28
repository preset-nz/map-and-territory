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

const DEFAULT_FOOTER = 180;
const MIN_FOOTER = 72;

/** The inspector footer's height (the palette strip), per viewer, dragged by its top edge. */
export function useFooterHeight(name: string) {
  const key = `map-and-territory.${name}`;
  const [height, setHeight] = useState(() => {
    try {
      const v = Number(localStorage.getItem(key));
      return Number.isFinite(v) && v >= MIN_FOOTER ? v : DEFAULT_FOOTER;
    } catch {
      return DEFAULT_FOOTER;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, String(height));
    } catch {
      // per-viewer convenience only
    }
  }, [key, height]);
  return { height, setHeight: (h: number) => setHeight(Math.max(MIN_FOOTER, Math.round(h))) };
}

/**
 * Under the inspector, outside its scroll: a footer whose top edge drags its height, so the
 * palette strip can grow (Georg, 2026-10-28). Arrow keys on the edge step it by 16 px.
 */
function InspectorFooter({ children }: { children: ReactNode }) {
  const { height, setHeight } = useFooterHeight('palette-strip');
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const start = height;
    const move = (ev: PointerEvent) => setHeight(start + startY - ev.clientY);
    const end = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    setHeight(height + (e.key === 'ArrowUp' ? 16 : -16));
  };
  return (
    <div
      className="relative flex shrink-0 flex-col border-sidebar-border border-t"
      style={{ height }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: a focusable, keyboard-operable splitter (WAI-ARIA window splitter); <hr> is not focusable */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize Palette"
        aria-valuenow={height}
        tabIndex={0}
        onPointerDown={startDrag}
        onKeyDown={onKey}
        className="absolute inset-x-0 -top-0.5 z-10 h-1 cursor-row-resize touch-none hover:bg-primary/30 focus-visible:bg-primary/40 focus-visible:outline-none"
      />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
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
  /** Under the inspector, outside its scroll: the palette strip (epic 30). */
  inspectorFooter?: ReactNode;
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
  inspectorFooter,
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
          {inspectorFooter && <InspectorFooter>{inspectorFooter}</InspectorFooter>}
        </SidePanel>
      </div>
      <StatusBar>{status}</StatusBar>
    </div>
  );
}
