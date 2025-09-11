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
    // Bind dev server to loopback explicitly to satisfy sandbox (attempt via env)
    // Expose an e2e flag to allow deterministic canvas fallback when OffscreenCanvas is disabled in tests
    command: `pnpm dev`,
    env: {
      HOST: "127.0.0.1",
      HOSTNAME: "127.0.0.1",
      PORT: String(PORT),
    },
    url: BASE_URL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
