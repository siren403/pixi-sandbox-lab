import { expect, type Page, test } from "@playwright/test";

declare global {
  interface Window {
    __pixiDemoState?: {
      playerX: number;
      playerY: number;
      canvasWidth: number;
      canvasHeight: number;
      viewportWidth: number;
      viewportHeight: number;
      visibleWidth: number;
      visibleHeight: number;
      rendered: boolean;
    };
  }
}

test("renders a PixiJS canvas and moves the player with keyboard input", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__pixiDemoState?.rendered))
    .toBe(true);

  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(Math.round(box?.x ?? -1)).toBe(0);
  expect(Math.round(box?.y ?? -1)).toBe(0);
  expect(Math.round(box?.width ?? 0)).toBe(viewport?.width);
  expect(Math.round(box?.height ?? 0)).toBe(viewport?.height);

  await expect.poll(() => hasVisibleCanvasPixels(page)).toBe(true);

  const before = await page.evaluate(() => window.__pixiDemoState);
  expect(before?.playerX).toBeGreaterThan(0);
  expect(before?.canvasWidth).toBe(viewport?.width);
  expect(before?.canvasHeight).toBe(viewport?.height);
  expect(before?.visibleWidth).toBeGreaterThanOrEqual(1080);
  expect(before?.visibleHeight).toBeGreaterThanOrEqual(1920);

  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowRight");

  const after = await page.evaluate(() => window.__pixiDemoState);
  expect(after?.playerX).toBeGreaterThan(before?.playerX ?? 0);
  expect(consoleErrors).toEqual([]);
});

async function hasVisibleCanvasPixels(page: Page): Promise<boolean> {
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
