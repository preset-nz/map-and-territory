/**
 * Layout store: the editor state the canvas viewport reads, the active tool
 * and the pointer position. The 2025 sidebar, theme and navigation state went
 * with the web interface in epic 14.
 */

import { create } from "zustand";

interface MousePosition {
  x: number;
  y: number;
  hex: { q: number; r: number } | null;
}

interface LayoutStore {
  activeTool: string;
  mousePosition: MousePosition;
  setActiveTool: (tool: string) => void;
  setMousePosition: (
    x: number,
    y: number,
    hex?: { q: number; r: number } | null,
  ) => void;
}

export const useLayoutStore = create<LayoutStore>()((set) => ({
  activeTool: "select",
  mousePosition: { x: 0, y: 0, hex: null },
  setActiveTool: (tool) => set({ activeTool: tool }),
  setMousePosition: (x, y, hex) =>
    set({ mousePosition: { x, y, hex: hex ?? null } }),
}));
