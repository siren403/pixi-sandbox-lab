import { expect, test } from "@playwright/test";
import {
  collectConsoleErrors,
  clickBootStart,
  clickCanvasAt,
  expectCanvasFillsViewport,
  gotoBoot,
  hasVisibleCanvasPixels,
  openDebugPanel,
  readDebugSnapshot,
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
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.runtime?.appMode)).toBe("interactive");
  await expect(currentScene).toContainText("design-system");

  await sceneSwitch.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.demo?.scene)).toBe("vertical-slice");

  expect(consoleErrors).toEqual([]);
});

test("opens scene index with app shell and bottom sheet controls", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);

  await clickBootStart(page, canvas);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.sceneIndex?.rendered)).toBe(true);

  let sceneIndex = (await readDebugSnapshot(page))?.sceneIndex;
  expect(sceneIndex?.items.map((item) => item.label)).toContain("Vertical Slice");
  expect(sceneIndex?.items.map((item) => item.label)).toContain("Design System");
  expect(sceneIndex?.layoutNodes).toBeGreaterThanOrEqual(8);
  expect(sceneIndex?.appShell.topBarBounds.height).toBeGreaterThan(0);
  expect(sceneIndex?.appShell.contentBounds.height).toBeGreaterThan(0);
  expect(sceneIndex?.appShell.bottomBarBounds.height).toBeGreaterThan(0);
  expect(sceneIndex?.appShell.activeSheet).toBe("none");

  const debugBounds = (await readDebugSnapshot(page))?.sceneIndex?.appShell.bottomBarBounds;
  expect(debugBounds?.height).toBeGreaterThanOrEqual(48);

  const latestSceneIndex = (await readDebugSnapshot(page))?.sceneIndex;
  const debugItem = latestSceneIndex?.items.find((item) => item.label === "Design System");
  expect(debugItem?.bounds.height).toBeGreaterThanOrEqual(48);

  const debugButtonBounds = sceneIndex?.appShell.debugButtonBounds;
  expect(debugButtonBounds).toBeDefined();
  await clickCanvasAt(
    page,
    canvas,
    (debugButtonBounds?.x ?? 0) + (debugButtonBounds?.width ?? 0) / 2,
    (debugButtonBounds?.y ?? 0) + (debugButtonBounds?.height ?? 0) / 2,
    { designSpace: true },
  );
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.sceneIndex?.appShell.activeSheet)).toBe("debug");
  sceneIndex = (await readDebugSnapshot(page))?.sceneIndex;
  expect(sceneIndex?.appShell.sheetBounds.height).toBeGreaterThan(0);

  expect(consoleErrors).toEqual([]);
});
