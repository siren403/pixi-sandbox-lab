import { expect, type Locator, type Page } from "@playwright/test";
import type { PixiDebugState, PixiDebugWindow } from "../../src/debug/stateBridge";
import type { DebugCommand, DebugCommandResult } from "../../src/debug/commands";
import type { RuntimeReadyCriteria, RuntimeReadySnapshot } from "../../src/runtime/readiness";

declare global {
  interface Window {
    __pixiDebug?: PixiDebugWindow;
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
  await waitForRuntimeReady(page, { scene: "boot", interactive: true });
  expect((await readDebugSnapshot(page))?.boot?.rendered).toBe(true);
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
  const bootLoadingShows = (await readDebugSnapshot(page))?.runtime?.loadingOverlayShows ?? 0;
  await clickBootStart(page, canvas);
  await waitForSceneIndexReady(page);
  await clickSceneIndexItem(page, canvas, "Vertical Slice");
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.runtime?.loadingOverlayShows ?? 0))
    .toBeGreaterThan(bootLoadingShows);
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.demo?.rendered), { timeout: 15000 })
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
  const bounds = (await readDebugSnapshot(page))?.boot?.buttonBounds;
  expect(bounds).toBeDefined();
  await clickCanvasAt(page, canvas, (bounds?.x ?? 0) + (bounds?.width ?? 0) / 2, (bounds?.y ?? 0) + (bounds?.height ?? 0) / 2);
}

export async function clickSceneIndexItem(page: Page, canvas: Locator, label: string): Promise<void> {
  await waitForSceneIndexReady(page);
  const item = (await readDebugSnapshot(page))?.sceneIndex?.items.find((candidate) => candidate.label === label);
  expect(item).toBeDefined();
  await clickCanvasAt(
    page,
    canvas,
    (item?.bounds.x ?? 0) + (item?.bounds.width ?? 0) / 2,
    (item?.bounds.y ?? 0) + (item?.bounds.height ?? 0) / 2,
    { designSpace: true },
  );
}

export async function waitForSceneIndexReady(page: Page): Promise<void> {
  await waitForRuntimeReady(page, { scene: "scene-index", interactive: true });
  expect((await readDebugSnapshot(page))?.sceneIndex?.rendered).toBe(true);
}

export async function readDebugSnapshot(page: Page): Promise<PixiDebugState | undefined> {
  return page.evaluate(() => window.__pixiDebug?.getSnapshot?.() ?? window.__pixiDebug);
}

export async function waitForRuntimeReady(
  page: Page,
  criteria: RuntimeReadyCriteria,
): Promise<RuntimeReadySnapshot | undefined> {
  await page.waitForFunction(() => typeof window.__pixiDebug?.whenReady === "function");
  return page.evaluate((nextCriteria) => window.__pixiDebug?.whenReady(nextCriteria), criteria);
}

export async function dispatchDebugCommand(page: Page, command: DebugCommand): Promise<DebugCommandResult | undefined> {
  return page.evaluate((nextCommand) => window.__pixiDebug?.dispatch?.(nextCommand), command);
}

export async function clickCanvasAt(
  page: Page,
  canvas: Locator,
  x: number,
  y: number,
  options: { designSpace?: boolean } = {},
): Promise<void> {
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  const scale = Math.min((viewport?.width ?? 1080) / 1080, (viewport?.height ?? 1920) / 1920);
  const needsDesignScale = options.designSpace === true || x > (box?.width ?? 0) || y > (box?.height ?? 0);
  expect(box).not.toBeNull();
  await page.mouse.click(
    Math.round((box?.x ?? 0) + x * (needsDesignScale ? scale : 1)),
    Math.round((box?.y ?? 0) + y * (needsDesignScale ? scale : 1)),
  );
}

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number } | undefined,
  b: { x: number; y: number; width: number; height: number } | undefined,
): boolean {
  if (!a || !b) return true;
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
