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
    // Force fallback renderer for deterministic canvas screenshots in CI
    try {
      const proto = HTMLCanvasElement.prototype as unknown as Record<
        string,
        unknown
      >;
      delete proto.transferControlToOffscreen;
      const win = window as unknown as { OffscreenCanvas?: unknown };
      win.OffscreenCanvas = undefined;
    } catch {}
  });
});

test.describe("Invalidation → Redraw", () => {
  test("Changing Hex Grid size invalidates and redraws the canvas", async ({
    page,
  }) => {
    await page.goto("/");

    // Create campaign + map
    await page.getByRole("button", { name: "New Campaign" }).click();
    await page.getByRole("button", { name: "New Map" }).click();

    // Ensure scene panel and properties panel are visible
    await ensureScenePanelOpen(page);
    const props = page.getByTestId("properties-panel");
    await expect(props).toBeVisible();

    // Select the Hex Grid layer
    await page.getByText("Hex Grid", { exact: true }).first().click();

    // Snapshot the current canvas image
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(100); // allow initial draw
    const before = await canvas.screenshot();

    // Locate the Hex Size slider input and change value significantly
    const sizeLabel = page.getByText("Hex Size", { exact: true });
    const slider = sizeLabel
      .locator("xpath=..")
      .locator('input[type="range"]')
      .first();
    // Increase size to make visible difference
    await slider.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = String(64);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Also increase line width and change color to amplify visual delta
    const lwLabel = page.getByText("Line Width", { exact: true });
    const lwSlider = lwLabel
      .locator("xpath=..")
      .locator('input[type="range"]')
      .first();
    await lwSlider.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = String(4);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const colorHex = page.getByRole("textbox", { name: "Line Color hex" });
    await colorHex.fill("#ff0000");

    // Wait a moment for redraw
    await page.waitForTimeout(250);
    const after = await canvas.screenshot();

    // Buffers should differ
    expect(after.equals(before)).toBeFalsy();
  });
});
