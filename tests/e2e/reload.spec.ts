import { expect, test } from "@playwright/test";
import { dispatchDebugCommand, gotoBoot } from "./pixi-test-helpers";

test("debug reload command reloads the page while DOM debug panel stays hidden", async ({ page }) => {
  await gotoBoot(page);

  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    dispatchDebugCommand(page, { type: "app.reload" }),
  ]);

  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => window.__pixiDebug?.boot?.rendered);
      } catch {
        return false;
      }
    })
    .toBe(true);
  await expect(page.getByTestId("layout-debug-panel")).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.panelConnected)).toBe(true);
});
