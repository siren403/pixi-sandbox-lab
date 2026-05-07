import { expect, test } from "@playwright/test";
import {
  clickBootStart,
  clickCanvasAt,
  collectConsoleErrors,
  dispatchDebugCommand,
  gotoBoot,
  readDebugSnapshot,
  waitForSceneIndexReady,
} from "./pixi-test-helpers";

test("renders design-system scene with inspectable layout contracts", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await clickBootStart(page, canvas);
  await waitForSceneIndexReady(page);
  await dispatchDebugCommand(page, { type: "scene.open", sceneId: "design-system" });
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.designSystem?.rendered), { timeout: 15000 }).toBe(true);
  const designSystemState = (await readDebugSnapshot(page))?.designSystem;
  expect(designSystemState?.scene).toBe("design-system");
  expect(designSystemState?.sections).toBeGreaterThanOrEqual(3);
  expect(designSystemState?.labels).toBeGreaterThanOrEqual(3);
  expect(designSystemState?.swatches).toBeGreaterThanOrEqual(6);
  expect(designSystemState?.typeSamples).toBeGreaterThanOrEqual(3);
  expect(designSystemState?.componentSamples).toBeGreaterThanOrEqual(4);
  expect(designSystemState?.safeAreaSamples).toBeGreaterThanOrEqual(2);
  expect(designSystemState?.buttonScreenHeight).toBeGreaterThanOrEqual(48);
  expect(designSystemState?.inputTargetScreenSize).toBeGreaterThanOrEqual(44);
  expect(designSystemState?.markerScreenSize).toBeGreaterThanOrEqual(20);
  expect(designSystemState?.bottomSheetHandleScreenHeight).toBeGreaterThanOrEqual(48);
  expect(designSystemState?.bottomSheetHandleHitBounds.height).toBeGreaterThanOrEqual(48);
  expect(designSystemState?.blockingPanelBlockerBounds.width).toBeGreaterThan(0);
  expect(designSystemState?.blockingPanelBlockerBounds.height).toBeGreaterThan(0);
  expect(designSystemState?.blockingPanelContentButtonBounds.height).toBeGreaterThanOrEqual(48);
  expect(designSystemState?.buttonCenterDeltaY).toBeLessThanOrEqual(1.5);
  expect(designSystemState?.layerLabels).toEqual(["world-layer", "ui-layer", "debug-layer"]);
  const initialSections = designSystemState?.sections ?? 0;
  const initialBlockingPanelPresses = designSystemState?.blockingPanelButtonPresses ?? 0;
  await clickCanvasAt(
    page,
    canvas,
    (designSystemState?.blockingPanelContentButtonBounds.x ?? 0) + (designSystemState?.blockingPanelContentButtonBounds.width ?? 0) / 2,
    (designSystemState?.blockingPanelContentButtonBounds.y ?? 0) + (designSystemState?.blockingPanelContentButtonBounds.height ?? 0) / 2,
  );
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.designSystem?.blockingPanelButtonPresses ?? 0), { timeout: 15000 })
    .toBe(initialBlockingPanelPresses + 1);
  const blockingPanelPressesAfterButton = (await readDebugSnapshot(page))?.designSystem?.blockingPanelButtonPresses ?? 0;
  const blockerBounds = (await readDebugSnapshot(page))?.designSystem?.blockingPanelBlockerBounds;
  await clickCanvasAt(page, canvas, (blockerBounds?.x ?? 0) + (blockerBounds?.width ?? 0) - 8, (blockerBounds?.y ?? 0) + (blockerBounds?.height ?? 0) - 8);
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.designSystem?.blockingPanelButtonPresses ?? 0), { timeout: 15000 })
    .toBe(blockingPanelPressesAfterButton);
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.layoutNodes ?? 0))
    .toBeGreaterThanOrEqual(16);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.currentScene), { timeout: 15000 }).toBe("design-system");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.runtime?.appMode), { timeout: 15000 }).toBe("interactive");

  const debugButtonBounds = (await readDebugSnapshot(page))?.designSystem?.appShell?.debugButtonBounds;
  expect(debugButtonBounds).toBeDefined();
  await clickCanvasAt(
    page,
    canvas,
    (debugButtonBounds?.x ?? 0) + (debugButtonBounds?.width ?? 0) / 2,
    (debugButtonBounds?.y ?? 0) + (debugButtonBounds?.height ?? 0) / 2,
    { designSpace: true },
  );
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.designSystem?.appShell?.activeSheet), { timeout: 15000 }).toBe("debug");
  await clickCanvasAt(
    page,
    canvas,
    (debugButtonBounds?.x ?? 0) + (debugButtonBounds?.width ?? 0) / 2,
    (debugButtonBounds?.y ?? 0) + (debugButtonBounds?.height ?? 0) / 2,
    { designSpace: true },
  );
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.designSystem?.appShell?.activeSheet), { timeout: 15000 })
    .toBe("debug");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.designSystem?.sections), { timeout: 15000 }).toBe(initialSections);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.layoutNodes ?? 0)).toBeGreaterThanOrEqual(16);
  const layoutToggleBounds = (await readDebugSnapshot(page))?.designSystem?.appShell?.actionButtonBounds["layout-toggle"];
  expect(layoutToggleBounds).toBeDefined();
  await clickCanvasAt(
    page,
    canvas,
    (layoutToggleBounds?.x ?? 0) + (layoutToggleBounds?.width ?? 0) / 2,
    (layoutToggleBounds?.y ?? 0) + (layoutToggleBounds?.height ?? 0) / 2,
    { designSpace: true },
  );
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.enabled), { timeout: 15000 }).toBe(true);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.mode), { timeout: 15000 }).toBe("bounds");

  expect(consoleErrors).toEqual([]);
});
