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
    exclude: [
      'node_modules/**',
      'dist/**',
      // 2025 canvas-viewport tests, broken against the retired stores; deleted with canvas-viewport.tsx (epic 16 story 10, triage #1).
      'src/test/components/canvas-viewport.palette.test.tsx',
      'src/test/components/freeform-paint-erase.integration.test.tsx',
    ],
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
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    // @preset.nz/pom is linked by path and has its own dev copy of React; tests use the app's.
    dedupe: ['react', 'react-dom', '@tauri-apps/api'],
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
