import { test, expect } from "@playwright/test";

test("New Campaign creates empty project and allows spaces in name", async ({
  page,
}) => {
  await page.goto("/");

  // Click New Campaign button in toolbar (unique accessible name)
  await page.getByRole("button", { name: "New Campaign" }).click();

  // Header shows generated campaign name (Campaign 01)
  await expect(page.getByRole("banner")).toContainText("Campaign 01");

  // Properties panel should show Campaign properties
  const nameInput = page.getByRole("textbox", { name: "Campaign Name" });
  await expect(nameInput).toBeVisible();

  // Type a name with spaces
  await nameInput.fill("My First Campaign");

  // Header updates
  await expect(page.getByRole("banner")).toContainText("My First Campaign");

  // Description textarea accepts text
  const desc = page.getByRole("textbox", { name: "Campaign Description" });
  await desc.fill("Some long description with spaces.");
  await expect(desc).toHaveValue("Some long description with spaces.");
});
