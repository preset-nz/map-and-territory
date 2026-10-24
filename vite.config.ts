import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [tailwindcss(), react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // @preset.nz packages ship unbuilt TypeScript. Pin the shared runtime to
    // this app's copy, so a second React never reaches the window.
    dedupe: [
      'react',
      'react-dom',
      '@tauri-apps/api',
      '@preset.nz/ux-kit',
      '@preset.nz/app-kit',
      '@preset.nz/facets',
      '@preset.nz/pom',
    ],
  },

  // The render worker code-splits (plugin bootstrap), which needs ES output.
  worker: { format: 'es' },

  // Keep Vite from obscuring Rust errors; Tauri expects a fixed port.
  clearScreen: false,
  server: {
    port: 1480,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1481 } : undefined,
    // The linked packages (ux-kit's fonts live in packages/node_modules) are outside this
    // project's root. Goes when the app is back on registry versions.
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), path.resolve(__dirname, '../../packages')],
    },
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});
