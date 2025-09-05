/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Only include our unit/integration tests under src/test/**/*.test.ts
    include: ["src/test/**/*.test.ts"],
    // Exclude Playwright E2E specs from Vitest collection to avoid runner conflicts
    exclude: ["src/test/e2e/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.test.*",
        "**/*.spec.*",
        "**/*.stories.*",
        ".next/**",
        "playwright-report/**",
        "test-results/**",
        "public/**",
        "scripts/**",
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
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
