// The faces furniture letters in (map furniture §5): each face id to its family and file, and
// the loader that puts the files into the render worker's `fonts`. The files come from
// @fontsource packages so the licence gate sees them (epic 23, "Faces through npm").
//
// The families carry an `MT` prefix so a face installed on the machine never stands in for one
// that failed to load: the window check would otherwise pass on the system's copy.
import barlowCondensed from '@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2?url';
import imFellItalic from '@fontsource/im-fell-english/files/im-fell-english-latin-400-italic.woff2?url';
import imFell from '@fontsource/im-fell-english/files/im-fell-english-latin-400-normal.woff2?url';
import permanentMarker from '@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff2?url';
import unifraktur from '@fontsource/unifrakturmaguntia/files/unifrakturmaguntia-latin-400-normal.woff2?url';

export type FaceId = 'condensed' | 'serif' | 'blackletter' | 'marker';

export interface Face {
  family: string;
  /** What draws when the file didn't load: the platform's nearest. */
  fallback: string;
  weight: string;
  /** Set in capitals (map furniture §5: condensed and marker). */
  caps: boolean;
}

export const FACES: Record<FaceId, Face> = {
  condensed: {
    family: 'MT Barlow Condensed',
    fallback: '"Arial Narrow", "Helvetica Neue", sans-serif',
    weight: '600',
    caps: true,
  },
  serif: { family: 'MT IM Fell English', fallback: 'Georgia, serif', weight: '400', caps: false },
  blackletter: {
    family: 'MT UnifrakturMaguntia',
    fallback: 'Georgia, serif',
    weight: '400',
    caps: false,
  },
  marker: {
    family: 'MT Permanent Marker',
    fallback: '"Marker Felt", "Chalkboard SE", sans-serif',
    weight: '400',
    caps: true,
  },
};

/** The subtitle's italic serif: IM Fell's italic, the same family as `serif`. */
export const ITALIC_SERIF = { family: FACES.serif.family, fallback: 'Georgia, serif' };
/** The credit line's mono: the platform's, as the UI's (map furniture §5, body text). */
export const MONO = 'Menlo, ui-monospace, monospace';

interface FaceFile {
  family: string;
  url: string;
  weight: string;
  style: 'normal' | 'italic';
}

const FILES: FaceFile[] = [
  { family: FACES.condensed.family, url: barlowCondensed, weight: '600', style: 'normal' },
  { family: FACES.serif.family, url: imFell, weight: '400', style: 'normal' },
  { family: FACES.serif.family, url: imFellItalic, weight: '400', style: 'italic' },
  { family: FACES.blackletter.family, url: unifraktur, weight: '400', style: 'normal' },
  { family: FACES.marker.family, url: permanentMarker, weight: '400', style: 'normal' },
];

/** A canvas `font` for a face id at `size` paper px; an unknown id reads as `condensed`. */
export function faceFont(face: string, size: number): string {
  const f = FACES[face as FaceId] ?? FACES.condensed;
  return `normal ${f.weight} ${size}px "${f.family}", ${f.fallback}`;
}

/** Whether a face id is set in capitals. */
export function faceCaps(face: string): boolean {
  return (FACES[face as FaceId] ?? FACES.condensed).caps;
}

/** What the worker found: whether it has `fonts` at all, and each file's outcome. */
export interface FacesReport {
  /** `FontFace` and the scope's `fonts` both exist. False under a worker without them. */
  available: boolean;
  loaded: string[];
  failed: string[];
}

interface FontScope {
  fonts?: { add(face: FontFace): unknown };
  fetch?: typeof fetch;
}

/**
 * Loads every face file into `scope.fonts`. Never rejects: a file that fails is reported and
 * its face draws in its fallback, so neither a frame nor an export waits forever. The bytes
 * are fetched rather than given to `FontFace` as a `url()`, so a failure says which request
 * failed.
 */
export async function loadFaces(scope: FontScope): Promise<FacesReport> {
  if (typeof FontFace === 'undefined' || !scope.fonts || typeof scope.fetch !== 'function') {
    return { available: false, loaded: [], failed: [] };
  }
  const fonts = scope.fonts;
  const get = scope.fetch.bind(scope);
  const results = await Promise.allSettled(
    FILES.map(async (f) => {
      const res = await get(f.url);
      if (!res.ok) throw new Error(`${res.status} for ${f.url}`);
      const face = new FontFace(f.family, await res.arrayBuffer(), {
        weight: f.weight,
        style: f.style,
      });
      await face.load();
      fonts.add(face);
    }),
  );
  const report: FacesReport = { available: true, loaded: [], failed: [] };
  results.forEach((r, i) => {
    const name = `${FILES[i].family} ${FILES[i].style}`;
    if (r.status === 'fulfilled') report.loaded.push(name);
    else report.failed.push(`${name}: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
  });
  return report;
}
