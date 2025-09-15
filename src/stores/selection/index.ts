import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type Selection =
  | { kind: "none" }
  | { kind: "campaign" }
  | { kind: "map"; id: string }
  | { kind: "layer"; id: string };

interface SelectionStore {
  selection: Selection;
  selectCampaign: () => void;
  selectMap: (id: string) => void;
  selectLayer: (id: string) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionStore>()(
  devtools((set) => ({
    selection: { kind: "none" },
    selectCampaign: () => set({ selection: { kind: "campaign" } }),
    selectMap: (id) => set({ selection: { kind: "map", id } }),
    selectLayer: (id) => set({ selection: { kind: "layer", id } }),
    clear: () => set({ selection: { kind: "none" } }),
  })),
);
