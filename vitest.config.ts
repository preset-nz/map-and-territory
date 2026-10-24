/// <reference types="vitest" />

import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Unit and integration tests, .ts and .tsx
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
        'public/**',
        'scripts/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    pool: 'threads',
    // ux-kit, facets and app-kit are linked from packages/ (package.json), whose dependencies
    // live in that monorepo's own node_modules with their own React. Left alone a test loads two
    // Reacts. Vite processes those (`inline`) so `dedupe` applies; the CommonJS
    // `use-sync-external-store` shim base-ui imports can't be processed, so it is aliased to
    // this app's copy. Goes when the app is back on registry versions.
    alias: {
      'use-sync-external-store': resolve(__dirname, 'node_modules/use-sync-external-store'),
    },
    server: { deps: { inline: [/\/packages\/node_modules\//] } },
  },
  resolve: {
    // @preset.nz/pom is linked by path and has its own dev copy of React; tests use the app's.
    dedupe: ['react', 'react-dom', '@tauri-apps/api'],
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
