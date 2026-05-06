import { expect, test } from "@playwright/test";
import { clickBootStart, clickSceneIndexItem, collectConsoleErrors, gotoBoot } from "./pixi-test-helpers";

test("renders design-system scene with inspectable layout contracts", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await clickBootStart(page, canvas);
  await clickSceneIndexItem(page, canvas, "Design System");
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.designSystem?.rendered)).toBe(true);
  const designSystemState = await page.evaluate(() => window.__pixiDebug?.designSystem);
  expect(designSystemState?.scene).toBe("design-system");
  expect(designSystemState?.sections).toBeGreaterThanOrEqual(3);
  expect(designSystemState?.labels).toBeGreaterThanOrEqual(3);
  expect(designSystemState?.swatches).toBeGreaterThanOrEqual(6);
  expect(designSystemState?.typeSamples).toBeGreaterThanOrEqual(3);
  expect(designSystemState?.componentSamples).toBeGreaterThanOrEqual(2);
  expect(designSystemState?.safeAreaSamples).toBeGreaterThanOrEqual(2);
  expect(designSystemState?.buttonScreenHeight).toBeGreaterThanOrEqual(48);
  expect(designSystemState?.inputTargetScreenSize).toBeGreaterThanOrEqual(44);
  expect(designSystemState?.markerScreenSize).toBeGreaterThanOrEqual(20);
  expect(designSystemState?.buttonCenterDeltaY).toBeLessThanOrEqual(1.5);
  expect(designSystemState?.layerLabels).toEqual(["world-layer", "ui-layer", "debug-layer"]);
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.layout?.layoutNodes ?? 0))
    .toBeGreaterThanOrEqual(16);
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.currentScene)).toBe("design-system");
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.runtime?.appMode)).toBe("interactive");

  expect(consoleErrors).toEqual([]);
});
