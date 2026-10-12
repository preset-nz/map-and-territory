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
      name: 'plugins-use-the-host-api',
      severity: 'error',
      comment:
        'Plugins go through ToolContext and the AppAPI seam; importing src/stores reintroduces ' +
        'the coupling the plugin model exists to avoid (CLAUDE.md hard rules).',
      from: { path: '^src/plugin/' },
      to: { path: '^src/stores/' },
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
      comment: 'Rust does files and OS; the renderer, layers, helpers and plugins never touch Tauri.',
      from: { path: '^src/(layers|render|lib|plugin)/' },
      to: { path: '@tauri-apps/' },
    },
  ],
  options: {
    doNotFollow: { path: ['node_modules'] },
    exclude: { path: '^src/test/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
