import { expect, test } from "@playwright/test";
import {
  collectConsoleErrors,
  expectCanvasFillsViewport,
  gotoBoot,
  rectsOverlap,
  startDemoFromBoot,
} from "./pixi-test-helpers";

test("renders vertical slice world and supports keyboard, pointer, pan, and zoom", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await expectCanvasFillsViewport(page, canvas);
  await startDemoFromBoot(page, canvas);

  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  const before = await page.evaluate(() => window.__pixiDebug?.demo);
  expect(before?.playerX).toBeGreaterThan(0);
  expect(before?.worldWidth).toBeGreaterThan(before?.visibleWidth ?? 0);
  expect(before?.worldHeight).toBeGreaterThan(before?.visibleHeight ?? 0);
  expect(before?.worldItems).toBeGreaterThanOrEqual(160);
  expect(before?.cameraZoom).toBeGreaterThan(0);
  expect(before?.canvasWidth).toBe(viewport?.width);
  expect(before?.canvasHeight).toBe(viewport?.height);
  expect(before?.visibleWidth).toBeGreaterThanOrEqual(1080);
  expect(before?.visibleHeight).toBeGreaterThanOrEqual(1920);
  expect(before?.playerScreenSize).toBeGreaterThanOrEqual(52);
  expect(before?.markerScreenRadius).toBeGreaterThanOrEqual(10);
  expect(before?.titleScreenFontSize).toBeGreaterThanOrEqual(22);
  expect(before?.titleBounds.width).toBeGreaterThan(0);
  expect(before?.markerBounds.width).toBeGreaterThan(0);
  expect(before?.assetReady).toBe(true);
  expect(before?.assetBounds.width).toBeGreaterThan(0);
  expect(before?.assetBounds.height).toBeGreaterThan(0);
  expect(rectsOverlap(before?.titleBounds, before?.markerBounds)).toBe(false);
  expect(before?.layerLabels).toEqual(["world-layer", "ui-layer", "debug-layer"]);
  expect(before?.scene).toBe("vertical-slice");
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.loading)).toBe(false);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayVisible)).toBe(false);

  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowRight");

  const after = await page.evaluate(() => window.__pixiDebug?.demo);
  expect(after?.playerX).toBeGreaterThan(before?.playerX ?? 0);

  const pointerTarget = {
    x: Math.floor((box?.width ?? 0) * 0.8),
    y: Math.floor((box?.height ?? 0) * 0.7),
  };
  await canvas.click({ position: pointerTarget });
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.demo?.playerX ?? 0))
    .toBeGreaterThan(after?.playerX ?? 0);

  const afterPointer = await page.evaluate(() => window.__pixiDebug?.demo);
  expect(afterPointer?.playerY).toBeGreaterThan(after?.playerY ?? 0);
  expect(afterPointer?.pointerX).toBeGreaterThan((afterPointer?.visibleWidth ?? 0) * 0.78);
  expect(afterPointer?.pointerX).toBeLessThan((afterPointer?.visibleWidth ?? 0) * 0.82);
  expect(afterPointer?.pointerY).toBeGreaterThan((afterPointer?.visibleHeight ?? 0) * 0.68);
  expect(afterPointer?.pointerY).toBeLessThan((afterPointer?.visibleHeight ?? 0) * 0.72);

  const cameraBeforeZoom = await page.evaluate(() => window.__pixiDebug?.demo);
  await page.mouse.wheel(0, -420);
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.demo?.cameraZoom ?? 0))
    .toBeGreaterThan(cameraBeforeZoom?.cameraZoom ?? 0);

  const cameraBeforePan = await page.evaluate(() => window.__pixiDebug?.demo);
  await page.mouse.move(Math.round((box?.width ?? 0) * 0.48), Math.round((box?.height ?? 0) * 0.52));
  await page.mouse.down();
  await page.mouse.move(Math.round((box?.width ?? 0) * 0.65), Math.round((box?.height ?? 0) * 0.62), { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.demo?.cameraX ?? 0))
    .toBeGreaterThan((cameraBeforePan?.cameraX ?? 0) + 20);

  expect(consoleErrors).toEqual([]);
});
