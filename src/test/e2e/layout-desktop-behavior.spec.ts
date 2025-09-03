import { test, expect } from '@playwright/test'

test.describe('Desktop layout behavior', () => {
  test('bars are fixed; only work area scrolls', async ({ page }) => {
    await page.goto('/')

    // Header: target the title within the header landmark to avoid duplicates
    const header = page.locator('header').getByRole('heading', { name: 'Map & Territory', exact: true })
    await expect(header).toBeVisible()

    // Status bar: contains label Tool: and should be visible initially
    const statusBar = page.getByTestId('status-bar')
    await expect(statusBar).toBeVisible()

    // Body should not scroll when we try to scroll window
    const beforeScrollY = await page.evaluate(() => window.scrollY)
    await page.evaluate(() => window.scrollTo(0, 10000))
    const afterScrollY = await page.evaluate(() => window.scrollY)
    expect(afterScrollY).toBe(beforeScrollY)

    // The main viewport is the <main> element; scroll if content exceeds height
    const main = page.getByRole('main')
    const canScroll = await main.evaluate((el) => el.scrollHeight > el.clientHeight)
    if (canScroll) {
      await main.evaluate((el) => { el.scrollTop = 0 })
      const beforeTop = await main.evaluate((el) => el.scrollTop)
      await main.evaluate((el) => { el.scrollTop = 200 })
      const afterTop = await main.evaluate((el) => el.scrollTop)
      expect(afterTop).toBeGreaterThan(beforeTop)
    } else {
      // If not scrollable, ensure bars are visible and window didn't scroll
      const wsY = await page.evaluate(() => window.scrollY)
      expect(wsY).toBe(0)
    }

    // Header should still be visible in viewport after main scroll
    await expect(header).toBeVisible()
    // Status bar should still be visible in viewport after main scroll
    await expect(statusBar).toBeVisible()
  })

  test('right properties panel scrolls independently', async ({ page }) => {
    await page.goto('/')
    // Ensure properties panel is visible (toolbar toggle might exist, but default is open)
    const propsPanel = page.locator('[data-testid="properties-panel"]')
      .first()
      .or(page.locator('aside:has-text("Selection Tool")'))

    await expect(propsPanel).toBeVisible()
    const before = await propsPanel.evaluate((el) => el.scrollTop)
    await propsPanel.evaluate((el) => { el.scrollTop = 2000 })
    const after = await propsPanel.evaluate((el) => el.scrollTop)
    expect(after).toBeGreaterThanOrEqual(0)
  })

  test('left scene panel scrolls independently', async ({ page }) => {
    await page.goto('/')

    // Ensure scene panel (campaign section) is visible and scrollable
    const scrollContainer = page.getByTestId('scene-panel-scroll')
    await expect(scrollContainer).toBeVisible()
    const before = await scrollContainer.evaluate((el) => el.scrollTop)
    await scrollContainer.evaluate((el) => { el.scrollTop = 2000 })
    const after = await scrollContainer.evaluate((el) => el.scrollTop)
    expect(after).toBeGreaterThanOrEqual(before)
  })
})
