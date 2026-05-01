import { expect, test } from "@playwright/test";
import {
  collectConsoleErrors,
  expectCanvasFillsViewport,
  gotoBoot,
  hasVisibleCanvasPixels,
  openDebugPanel,
} from "./pixi-test-helpers";

test("renders boot, fills the viewport, and can navigate from debug panel", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);

  await expectCanvasFillsViewport(page, canvas);
  await expect.poll(() => hasVisibleCanvasPixels(page)).toBe(true);

  const boot = await page.evaluate(() => window.__pixiDebug?.boot);
  expect(boot?.scene).toBe("boot");
  expect(boot?.promptBounds.width).toBeGreaterThan(0);
  expect(boot?.buttonBounds.width).toBeGreaterThan(boot?.promptBounds.width ?? 0);
  expect(boot?.buttonBounds.height).toBeGreaterThanOrEqual(48);
  expect(boot?.layoutPolicy).toBe("safe-area-frame");
  expect(boot?.layoutNodes).toBeGreaterThanOrEqual(3);
  expect(boot?.buttonCenterDeltaY).toBeLessThanOrEqual(1.5);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayShows ?? 0)).toBe(0);

  const currentScene = page.getByTestId("layout-debug-current-scene");
  await expect(currentScene).toContainText("boot");

  await openDebugPanel(page);
  const sceneSwitch = page.getByTestId("layout-debug-scene");
  const designSystem = page.getByTestId("layout-debug-design-system");
  await expect(sceneSwitch).toContainText("World");
  await expect(designSystem).toBeVisible();

  await designSystem.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.designSystem?.rendered)).toBe(true);
  await expect(currentScene).toContainText("design-system");

  await sceneSwitch.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.demo?.scene)).toBe("vertical-slice");

  expect(consoleErrors).toEqual([]);
});
