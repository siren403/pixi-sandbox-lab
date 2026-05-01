import { expect, test } from "@playwright/test";
import { gotoBoot, openDebugPanel } from "./pixi-test-helpers";

test("reload button reloads the page and keeps the debug panel connected", async ({ page }) => {
  await gotoBoot(page);
  await openDebugPanel(page);
  const reloadButton = page.getByTestId("layout-debug-reload");

  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    reloadButton.click(),
  ]);

  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.boot?.rendered)).toBe(true);
  await expect(page.getByTestId("layout-debug-panel")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.panelConnected)).toBe(true);
});
