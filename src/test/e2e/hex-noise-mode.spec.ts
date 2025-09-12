import { test, expect } from "@playwright/test";

async function ensureScenePanelOpen(page: import("@playwright/test").Page) {
  const panel = page.getByTestId("scene-panel-scroll");
  if (!(await panel.isVisible())) {
    await page.getByRole("button", { name: "Toggle Scene Panel" }).click();
    await expect(panel).toBeVisible();
  }
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.clear();
  });
});

test.describe("Hex Noise — Mode Switching", () => {
  test("shape → paint changes visual output", async ({ page }) => {
    await page.goto("/");

    // Create campaign + map and ensure panels visible
    await page.getByRole("button", { name: "New Campaign" }).click();
    await page.getByRole("button", { name: "New Map" }).click();
    await ensureScenePanelOpen(page);
    await expect(page.getByTestId("properties-panel")).toBeVisible();

    // Insert a Hex Noise layer and select it
    await page.getByRole("button", { name: "Hex Noise", exact: true }).click();
    await page.getByText("Hex Noise 01", { exact: true }).click();

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(100);
    const before = await canvas.screenshot();

    // Change Mode → Paint (Terrain)
    const modeButton = page.getByLabel("Mode");
    await modeButton.click();
    await page.getByRole("menuitem", { name: "Paint (Terrain)" }).click();

    // Pick a distinct Terrain color to amplify visual difference
    const terrainButton = page
      .getByTestId("properties-panel")
      .getByLabel("Terrain", { exact: true });
    await terrainButton.click();
    await page.getByRole("menuitem", { name: "Ash Thickets" }).click();

    await page.waitForTimeout(500);
    const after = await canvas.screenshot();
    expect(after.equals(before)).toBeFalsy();
  });
});
