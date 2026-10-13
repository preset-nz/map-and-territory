// Opacity and blend belong to the layer (epic 12 story 4): the host applies them to every
// layer type, so no adapter reads them. The set is closed to modes that read only the
// backdrop under the pixels drawn, which keeps a prefix cache sound.
const OPERATIONS: Record<string, GlobalCompositeOperation> = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
};

/** How to composite a layer, or null when it draws straight onto the page (opacity 1, normal). */
export function layerComposite(
  state: unknown,
): { opacity: number; operation: GlobalCompositeOperation } | null {
  const s = (state ?? {}) as { opacity?: unknown; blend?: unknown };
  const raw = Number(s.opacity ?? 1);
  const opacity = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1;
  const operation = OPERATIONS[String(s.blend ?? 'normal')] ?? 'source-over';
  if (opacity === 1 && operation === 'source-over') return null;
  return { opacity, operation };
}
