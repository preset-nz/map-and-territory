import { test, expect } from "@playwright/test";

async function ensureScenePanelOpen(page: import("@playwright/test").Page) {
  const panel = page.getByTestId("scene-panel-scroll");
  if (!(await panel.isVisible())) {
    await page.getByRole("button", { name: "Toggle Scene Panel" }).click();
    await expect(panel).toBeVisible();
  }
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.clear());
});

test("Layer numbering and rename in Properties panel", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Campaign" }).click();
  await page.getByRole("button", { name: "New Map" }).click();
  await ensureScenePanelOpen(page);

  // Insert two Hex Noise layers via toolbar
  const addBtn = page.getByRole("button", { name: "Hex Noise", exact: true });
  await addBtn.click();
  await addBtn.click();

  const panel = page.getByTestId("scene-panel-scroll");
  await expect(panel).toContainText("Hex Noise 01");
  await expect(panel).toContainText("Hex Noise 02");

  // Select the latest noise layer and rename via Properties
  await page.getByText("Hex Noise 02", { exact: true }).click();
  const nameInput = page.getByRole("textbox", { name: "Layer Name" });
  await expect(nameInput).toBeVisible();
  await nameInput.fill("Noise Alps");
  await expect(panel).toContainText("Noise Alps");

  // Duplicate and verify Copy suffix
  const row = page
    .getByText("Noise Alps", { exact: true })
    .locator("..")
    .locator("..");
  await row.getByRole("button", { name: "Duplicate Layer" }).click();
  await expect(panel).toContainText("Noise Alps Copy");

  // Add another Hex Noise; numbering reuses 02 (since numeric 02 was renamed)
  await addBtn.click();
  await expect(panel).toContainText("Hex Noise 02");
});
