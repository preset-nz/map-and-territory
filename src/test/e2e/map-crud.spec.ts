import { test, expect } from "@playwright/test";

test("Map CRUD MVP: add, rename, delete", async ({ page }) => {
  await page.goto("/");
  // Ensure a campaign exists
  await page
    .getByRole("button", { name: /new campaign/i })
    .or(page.getByRole("button", { name: "New" }))
    .first()
    .click();

  // Add a map via toolbar button (scene group)
  await page
    .getByRole("button", { name: /new map/i })
    .or(page.getByRole("button", { name: "New Map" }))
    .first()
    .click();

  // Sidebar lists the new map with generated name (Map 01)
  await expect(page.getByText("Map 01")).toBeVisible();

  // Select the map and edit title/description in properties
  await page.getByText("Map 01").click();
  const mapTitle = page.getByRole("textbox", { name: "Map Title" });
  await expect(mapTitle).toBeVisible();
  await mapTitle.fill("World Map 1");
  await expect(page.getByText("World Map 1")).toBeVisible();

  const mapDesc = page.getByRole("textbox", { name: "Map Description" });
  await mapDesc.fill("Test description");
  await expect(mapDesc).toHaveValue("Test description");

  // Delete via sidebar button (confirm dialog)

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Map" }).click();
  await expect(page.getByText("World Map 1")).toHaveCount(0);
});
