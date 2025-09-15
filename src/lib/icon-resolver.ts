import type { LucideIcon } from "lucide-react";
import {
  FilePlus,
  Map as MapIcon,
  Box,
  Save,
  Folder,
  FolderOpen,
  Trash,
  Eye,
  EyeOff,
  Grid3x3,
  Paintbrush,
  Pen,
  Eraser,
  Type,
  ZoomIn,
  Plus,
  Minus,
  Settings,
  Layers,
} from "lucide-react";

const lucideMap: Record<string, LucideIcon> = {
  "file-plus": FilePlus,
  map: MapIcon,
  box: Box,
  save: Save,
  folder: Folder,
  "folder-open": FolderOpen,
  trash: Trash,
  eye: Eye,
  "eye-off": EyeOff,
  grid: Grid3x3,
  "grid-3x3": Grid3x3,
  paintbrush: Paintbrush,
  pen: Pen,
  eraser: Eraser,
  type: Type,
  "zoom-in": ZoomIn,
  plus: Plus,
  minus: Minus,
  settings: Settings,
  layers: Layers,
};

export function resolveIcon(spec?: string): LucideIcon {
  if (!spec) return FilePlus;
  // Expect formats like 'lucide:map' or 'map'
  const name = spec.startsWith("lucide:") ? spec.slice("lucide:".length) : spec;
  return lucideMap[name] ?? FilePlus;
}
