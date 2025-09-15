import { test, expect } from "@playwright/test";

test("homepage loads correctly", async ({ page }) => {
  await page.goto("/");

  // Wait for the page to load
  await expect(page).toHaveTitle(/Map & Territory/i);

  // Check that the main content is visible
  await expect(page.locator("main")).toBeVisible();
});
