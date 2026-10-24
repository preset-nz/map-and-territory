// The native half of the inspector's file fields (epic 18 story 3): facets' `file` field on
// ux-kit's PathField, wired once at startup to app-kit's path functions. Nothing here knows
// about textures; a field names its own `recentKey`, `filters` and `title` (inspector/schema.ts).
import {
  installPathDrop,
  nativeContextMenu,
  pathFieldMenu,
  pathsExist,
  pickFile,
  recentPaths,
  rememberPath,
  revealPath,
} from '@preset.nz/app-kit';
import { type FileHandlers, registerFileHandlers } from '@preset.nz/facets';

let folder: string | undefined;

/** The folder of a file path, or undefined for no path (an Untitled document). */
export function folderOf(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return cut > 0 ? path.slice(0, cut) : undefined;
}

/**
 * Tell the file fields where the campaign file lives. Relative paths resolve against this
 * folder; with none (Untitled) a relative path can't be checked and is never shown Missing.
 */
export function setDocumentFolder(path: string | null | undefined): void {
  folder = folderOf(path);
}

export const fileHandlers: FileHandlers = {
  recent: recentPaths,
  remember: rememberPath,
  pick: pickFile,
  exists: pathsExist,
  reveal: revealPath,
  contextMenu: pathFieldMenu,
  base: () => folder,
};

/** Once at startup: the file fields' handlers, the native context menu and Finder drops. */
export function installFileFields(): void {
  registerFileHandlers(fileHandlers);
  nativeContextMenu();
  installPathDrop().catch((error) => console.error('[files] drop not installed', error));
}
