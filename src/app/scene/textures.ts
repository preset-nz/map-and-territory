// Loads the images freeform layers refer to (epic 18). The renderer never touches Tauri, and
// a worker could not anyway, so the main thread fetches the bytes, decodes them and hands the
// bitmap over. A reference is a path as written; Rust resolves a relative one against the
// campaign file and checks the file, so what arrives here has passed the limits.
import { invoke } from '@tauri-apps/api/core';
import type { SceneFrame } from '@/render/types';

export type TextureStatus = 'loading' | 'ready' | 'missing';

export interface TextureLoaderDeps {
  load(path: string): Promise<ArrayBuffer>;
  decode(bytes: ArrayBuffer): Promise<ImageBitmap>;
  send(path: string, bitmap: ImageBitmap): void;
}

export interface TextureLoader {
  /** Starts loading every texture the frame names that is not yet known. */
  want(frame: SceneFrame): void;
  /**
   * Loads what the frame names and settles once each has been handed over or failed: an
   * export of a map that isn't on screen waits for it (epic 32).
   */
  ready(frame: SceneFrame): Promise<void>;
  status(path: string): TextureStatus | undefined;
  /** Forget a path so the next `want` tries again (the file may have come back). */
  retry(path: string): void;
  /** Forget every path that failed to load. True when there were any, so the caller redraws. */
  retryMissing(): boolean;
}

/** The paths freeform, paper and image layers in a frame refer to. */
export function texturePaths(frame: SceneFrame): string[] {
  const out = new Set<string>();
  for (const l of frame.layers) {
    const state = l.state as { texture?: unknown; file?: unknown };
    const t =
      l.type === 'image'
        ? state.file
        : l.type === 'freeform' || l.type === 'paper'
          ? state.texture
          : undefined;
    if (typeof t === 'string' && t) out.add(t);
  }
  return [...out];
}

export function createTextureLoader(deps: TextureLoaderDeps): TextureLoader {
  const known = new Map<string, TextureStatus>();
  const pending = new Map<string, Promise<void>>();
  const loader: TextureLoader = {
    want(frame) {
      for (const path of texturePaths(frame)) {
        if (known.has(path)) continue;
        known.set(path, 'loading');
        const done = deps
          .load(path)
          .then((bytes) => deps.decode(bytes))
          .then((bitmap) => {
            if (known.get(path) !== 'loading') return;
            known.set(path, 'ready');
            deps.send(path, bitmap);
          })
          .catch((e) => {
            known.set(path, 'missing');
            console.warn('[textures] could not load', path, e);
          })
          .finally(() => pending.delete(path));
        pending.set(path, done);
      }
    },
    async ready(frame) {
      loader.want(frame);
      await Promise.all(texturePaths(frame).map((p) => pending.get(p)));
    },
    status: (path) => known.get(path),
    retry(path) {
      if (known.get(path) === 'missing') known.delete(path);
    },
    retryMissing() {
      let any = false;
      for (const [path, status] of known) {
        if (status !== 'missing') continue;
        known.delete(path);
        any = true;
      }
      return any;
    },
  };
  return loader;
}

/** The loader over Tauri: bytes from Rust, decoded in the webview. */
export function tauriTextureLoader(send: TextureLoaderDeps['send']): TextureLoader {
  return createTextureLoader({
    load: (file) => invoke<ArrayBuffer>('texture_bytes', { file }),
    decode: (bytes) => createImageBitmap(new Blob([bytes])),
    send,
  });
}
