import { expect, test } from "@playwright/test";
import {
  collectConsoleErrors,
  clickBootStart,
  clickSceneIndexItem,
  clickCanvasAt,
  expectCanvasFillsViewport,
  gotoBoot,
  hasVisibleCanvasPixels,
  readDebugSnapshot,
  waitForSceneIndexReady,
} from "./pixi-test-helpers";

test("renders boot, fills the viewport, and navigates through the scene index", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);

  await expectCanvasFillsViewport(page, canvas);
  await expect.poll(() => hasVisibleCanvasPixels(page)).toBe(true);

  const boot = (await readDebugSnapshot(page))?.boot;
  expect(boot?.scene).toBe("boot");
  expect(boot?.promptBounds.width).toBeGreaterThan(0);
  expect(boot?.buttonBounds.width).toBeGreaterThan(boot?.promptBounds.width ?? 0);
  expect(boot?.buttonBounds.height).toBeGreaterThanOrEqual(48);
  expect(boot?.layoutPolicy).toBe("safe-area-frame");
  expect(boot?.layoutNodes).toBeGreaterThanOrEqual(3);
  expect(boot?.buttonCenterDeltaY).toBeLessThanOrEqual(1.5);
  expect((await readDebugSnapshot(page))?.runtime?.loadingOverlayShows ?? 0).toBe(0);

  expect(await page.getByTestId("layout-debug-panel").isVisible()).toBe(false);
  expect((await readDebugSnapshot(page))?.layout?.currentScene).toBe("boot");

  await clickBootStart(page, canvas);
  await waitForSceneIndexReady(page);
  await clickSceneIndexItem(page, canvas, "Design System");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.designSystem?.rendered), { timeout: 15000 }).toBe(true);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.runtime?.appMode), { timeout: 15000 }).toBe("interactive");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.currentScene), { timeout: 15000 }).toBe("design-system");

  expect(consoleErrors).toEqual([]);
});

test("opens scene index with app shell and bottom sheet controls", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);

  await clickBootStart(page, canvas);
  await waitForSceneIndexReady(page);

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
