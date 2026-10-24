/**
 * Layer-boundary enforcement: guidance projects/map-and-territory/design/
 * architecture.md §6 (source of truth; transcribed here, not invented).
 * Wired into `just check` as a build-failing gate. Oblique's config is the
 * reference shape.
 */
const NO_STORES =
  'Adapters, the renderer and pure helpers take what they need as arguments or RenderEnv; ' +
  'they never read the store.';

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports make the dependency graph impossible to reason about.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Modules nothing imports yet: expected while src/ is port material.',
      from: {
        orphan: true,
        // branding.ts is required by family rule even before anything shows the name.
        pathNot: ['\\.(test|spec)\\.[jt]sx?$', '\\.d\\.ts$', '^src/test/', '^src/branding\\.ts$'],
      },
      to: {},
    },
    {
      name: 'engine-does-not-read-stores',
      severity: 'error',
      comment: NO_STORES,
      from: { path: '^src/(layers/adapters|render|lib)/' },
      to: { path: '^src/(stores|components)/' },
    },
    {
      name: 'ui-stays-dumb',
      severity: 'error',
      comment:
        'src/components/ui/ (the kit set from the template) imports only @/lib, @/components ' +
        'and @preset.nz/ux-kit.',
      from: { path: '^src/components/ui/' },
      to: { path: '^src/', pathNot: '^src/(lib|components)/' },
    },
    {
      name: 'renderer-never-imports-tauri',
      severity: 'error',
      comment: 'Rust does files and OS; the renderer, layers and helpers never touch Tauri.',
      from: { path: '^src/(layers|render|lib)/' },
      to: { path: '@tauri-apps/' },
    },
    {
      name: 'renderer-never-reads-the-document',
      severity: 'error',
      comment:
        'The renderer gets a SceneFrame and nothing else: layers, render and lib import ' +
        'neither @preset.nz/pom nor the app module that builds frames from it (object-model doc).',
      from: { path: '^src/(layers|render|lib)/' },
      to: { path: ['@preset\\.nz/pom', 'packages/rhizome/', '^src/app/'] },
    },
    {
      name: 'documents-only-through-pom',
      severity: 'error',
      comment:
        "@preset.nz/pom's transport is the webview's one channel to the document host; nothing " +
        'in src/ calls @tauri-apps/api itself. One exception, 2026-10-14 (epic 18): ' +
        'src/app/scene/textures.ts reads a texture file as raw bytes, which POM commands (JSON) cannot carry. Second, 2026-10-25 (epic 07 story 4): ' +
        'src/app/export/native.ts hands the exported PNG to Rust to write, and asks for the Save dialog.',
      from: { path: '^src/', pathNot: '^src/app/(scene/textures|export/native)\\.ts$' },
      to: { path: '@tauri-apps/api' },
    },
  ],
  options: {
    // A package taken by path resolves outside node_modules; it is checked in its own repo.
    doNotFollow: { path: ['node_modules', '^\\.\\./\\.\\./packages/'] },
    exclude: { path: '^src/test/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
