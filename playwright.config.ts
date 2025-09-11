import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./src/test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Bind dev server to loopback explicitly to satisfy sandbox
    // Expose an e2e flag to allow deterministic canvas fallback when OffscreenCanvas is disabled in tests
    command: `HOSTNAME=127.0.0.1 PORT=${PORT} NEXT_PUBLIC_E2E=1 pnpm dev`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
