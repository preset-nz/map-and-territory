import { test, expect } from "@playwright/test";

async function ensureScenePanelOpen(page: import("@playwright/test").Page) {
  const panel = page.locator('[data-testid="scene-panel-scroll"]');
  if (!(await panel.isVisible())) {
    await page.getByRole("button", { name: "Toggle Scene Panel" }).click();
    await expect(panel).toBeVisible();
  }
}

test.beforeEach(async ({ context }) => {
  // Avoid persistence influencing tests
  await context.addInitScript(() => localStorage.clear());
});

test.describe("Layering Model — Toolbar + Insertion", () => {
  test("Hex Noise button disabled without active map; enabled after creating map", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "New Campaign" }).waitFor();

    // Hex Noise disabled initially (no active map)
    const hexNoiseBtn = page.getByRole("button", { name: "Hex Noise" });
    await expect(hexNoiseBtn).toBeDisabled();

    // Create campaign and map
    await page.getByRole("button", { name: "New Campaign" }).click();
    await page.getByRole("button", { name: "New Map" }).click();

    // Now Hex Noise button should be enabled
    await expect(hexNoiseBtn).toBeEnabled();
  });

  test("Selecting grid then adding inserts below grid (before top anchor)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "New Campaign" }).waitFor();

    // Ensure scene panel is open deterministically
    await ensureScenePanelOpen(page);

    // New campaign/map
    await page.getByRole("button", { name: "New Campaign" }).click();
    await page.getByRole("button", { name: "New Map" }).click();

    // Select the grid layer in the scene panel
    const panel = page.locator('[data-testid="scene-panel-scroll"]');
    await expect(panel).toBeVisible();
    await page.getByText("Hex Grid", { exact: true }).click();

    // Click Hex Noise to insert
    await page.getByRole("button", { name: "Hex Noise" }).click();

    // Assert UI ordering: grid appears before (above) noise in the list
    const text = await panel.textContent();
    expect(text).toMatch(/Hex Grid[\s\S]*Hex Noise/);
  });
});
