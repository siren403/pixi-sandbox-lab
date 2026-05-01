import { expect, type Locator, type Page } from "@playwright/test";
import type { PixiDebugState } from "../../src/debug/stateBridge";

declare global {
  interface Window {
    __pixiDebug?: PixiDebugState;
  }
}

export function collectConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return consoleErrors;
}

export async function gotoBoot(page: Page): Promise<Locator> {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.boot?.rendered)).toBe(true);
  return canvas;
}

export async function expectCanvasFillsViewport(page: Page, canvas: Locator): Promise<void> {
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(Math.round(box?.x ?? -1)).toBe(0);
  expect(Math.round(box?.y ?? -1)).toBe(0);
  expect(Math.round(box?.width ?? 0)).toBe(viewport?.width);
  expect(Math.round(box?.height ?? 0)).toBe(viewport?.height);
}

export async function startDemoFromBoot(page: Page, canvas: Locator): Promise<void> {
  const bootLoadingShows = await page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayShows ?? 0);
  await clickBootStart(page, canvas);
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayShows ?? 0))
    .toBeGreaterThan(bootLoadingShows);
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.demo?.rendered), { timeout: 15000 })
    .toBe(true);
}

export async function openDebugPanel(page: Page): Promise<void> {
  const fold = page.getByTestId("layout-debug-fold");
  await expect(fold).toBeVisible();
  if ((await fold.getAttribute("aria-expanded")) !== "true") {
    await fold.click();
  }
  await expect(fold).toHaveAttribute("aria-expanded", "true");
}

export async function hasVisibleCanvasPixels(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const gl =
      canvas?.getContext("webgl2", { preserveDrawingBuffer: true }) ??
      canvas?.getContext("webgl", { preserveDrawingBuffer: true });

    if (!canvas || !gl) return false;

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const pixels = new Uint8Array(4);
    const samplePoints = [
      [Math.floor(width / 2), Math.floor(height / 2)],
      [72, height - 72],
      [32, height - 32],
    ];

    return samplePoints.some(([x, y]) => {
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels[0] > 0 || pixels[1] > 0 || pixels[2] > 0;
    });
  });
}

export async function clickBootStart(page: Page, canvas: Locator): Promise<void> {
  const bounds = await page.evaluate(() => window.__pixiDebug?.boot?.buttonBounds);
  expect(bounds).toBeDefined();
  await canvas.click({
    position: {
      x: Math.round((bounds?.x ?? 0) + (bounds?.width ?? 0) / 2),
      y: Math.round((bounds?.y ?? 0) + (bounds?.height ?? 0) / 2),
    },
  });
}

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number } | undefined,
  b: { x: number; y: number; width: number; height: number } | undefined,
): boolean {
  if (!a || !b) return true;
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
