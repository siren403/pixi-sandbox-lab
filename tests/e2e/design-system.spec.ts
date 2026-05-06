import { expect, test } from "@playwright/test";
import { clickBootStart, collectConsoleErrors, gotoBoot, readDebugSnapshot, waitForSceneIndexReady } from "./pixi-test-helpers";

test("renders design-system scene with inspectable layout contracts", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await clickBootStart(page, canvas);
  await waitForSceneIndexReady(page);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:design-system")));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.designSystem?.rendered), { timeout: 15000 }).toBe(true);
  const designSystemState = (await readDebugSnapshot(page))?.designSystem;
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
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.layoutNodes ?? 0))
    .toBeGreaterThanOrEqual(16);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.currentScene), { timeout: 15000 }).toBe("design-system");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.runtime?.appMode), { timeout: 15000 }).toBe("interactive");

  expect(consoleErrors).toEqual([]);
});
