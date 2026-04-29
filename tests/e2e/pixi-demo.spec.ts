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
      playerScreenSize: number;
      markerScreenRadius: number;
      titleScreenFontSize: number;
      titleBounds: { x: number; y: number; width: number; height: number };
      markerBounds: { x: number; y: number; width: number; height: number };
      layerLabels: string[];
      scene: string;
      sceneSwitches: number;
      rendered: boolean;
    };
    __pixiLayoutDebug?: {
      enabled: boolean;
      filter: "all" | "world" | "ui";
      layoutNodes: number;
      debuggedNodes: number;
      layerLabels: string[];
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
  expect(before?.playerScreenSize).toBeGreaterThanOrEqual(52);
  expect(before?.markerScreenRadius).toBeGreaterThanOrEqual(10);
  expect(before?.titleScreenFontSize).toBeGreaterThanOrEqual(22);
  expect(before?.titleBounds.width).toBeGreaterThan(0);
  expect(before?.markerBounds.width).toBeGreaterThan(0);
  expect(rectsOverlap(before?.titleBounds, before?.markerBounds)).toBe(false);
  expect(before?.layerLabels).toEqual(["world-layer", "ui-layer", "debug-layer"]);
  expect(before?.scene).toBe("boot");

  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowRight");

  const after = await page.evaluate(() => window.__pixiDemoState);
  expect(after?.playerX).toBeGreaterThan(before?.playerX ?? 0);

  const layoutDebugPanel = page.getByTestId("layout-debug-panel");
  const layoutDebug = page.getByTestId("layout-debug-toggle");
  const sceneSwitch = page.getByTestId("layout-debug-scene");
  await expect(layoutDebugPanel).toBeVisible();
  await expect(sceneSwitch).toBeVisible();

  await sceneSwitch.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDemoState?.scene)).toBe("alternate");
  const alternate = await page.evaluate(() => window.__pixiDemoState);
  expect(alternate?.sceneSwitches).toBe(1);
  expect(alternate?.titleBounds.width).toBeGreaterThan(0);
  expect(alternate?.markerBounds.width).toBeGreaterThan(0);

  await sceneSwitch.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDemoState?.scene)).toBe("boot");
  expect(await page.evaluate(() => window.__pixiDemoState?.sceneSwitches)).toBe(2);

  await expect(layoutDebug).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("layout-debug-stats")).toContainText("world-layer");
  expect(await page.evaluate(() => window.__pixiLayoutDebug?.layoutNodes)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__pixiLayoutDebug?.filter)).toBe("all");

  await layoutDebug.click();
  await expect(layoutDebug).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => window.__pixiLayoutDebug?.enabled)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__pixiLayoutDebug?.debuggedNodes)).toBeGreaterThan(0);

  await page.getByTestId("layout-debug-filter-ui").click();
  await expect.poll(() => page.evaluate(() => window.__pixiLayoutDebug?.filter)).toBe("ui");
  const uiDebuggedNodes = await page.evaluate(() => window.__pixiLayoutDebug?.debuggedNodes ?? 0);
  expect(uiDebuggedNodes).toBeGreaterThan(0);

  await page.getByTestId("layout-debug-filter-world").click();
  await expect.poll(() => page.evaluate(() => window.__pixiLayoutDebug?.filter)).toBe("world");
  expect(await page.evaluate(() => window.__pixiLayoutDebug?.debuggedNodes ?? 0)).toBeLessThan(uiDebuggedNodes);

  await page.getByTestId("layout-debug-filter-all").click();
  await expect.poll(() => page.evaluate(() => window.__pixiLayoutDebug?.filter)).toBe("all");

  await layoutDebug.click();
  await expect(layoutDebug).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => page.evaluate(() => window.__pixiLayoutDebug?.enabled)).toBe(false);

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

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number } | undefined,
  b: { x: number; y: number; width: number; height: number } | undefined,
): boolean {
  if (!a || !b) return true;
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
