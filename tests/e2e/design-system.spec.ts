import { expect, test } from "@playwright/test";
import { collectConsoleErrors, gotoBoot, openDebugPanel, startDemoFromBoot } from "./pixi-test-helpers";

test("renders design-system scene with inspectable layout contracts", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await startDemoFromBoot(page, canvas);
  await openDebugPanel(page);

  const currentScene = page.getByTestId("layout-debug-current-scene");
  const sceneSwitch = page.getByTestId("layout-debug-scene");
  const designSystem = page.getByTestId("layout-debug-design-system");
  await expect(currentScene).toContainText("vertical-slice");

  await designSystem.click();
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
  await expect(currentScene).toContainText("design-system");

  await sceneSwitch.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.demo?.scene)).toBe("vertical-slice");

  expect(consoleErrors).toEqual([]);
});
