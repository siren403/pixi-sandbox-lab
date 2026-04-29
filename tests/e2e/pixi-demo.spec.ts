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
      assetBounds: { x: number; y: number; width: number; height: number };
      layerLabels: string[];
      scene: string;
      sceneSwitches: number;
      assetReady: boolean;
      pointerDown: boolean;
      pointerX: number;
      pointerY: number;
      rendered: boolean;
    };
    __pixiIntroState?: {
      scene: "intro";
      promptBounds: { x: number; y: number; width: number; height: number };
      buttonBounds: { x: number; y: number; width: number; height: number };
      rendered: boolean;
    };
    __pixiDesignSystemState?: {
      scene: "design-system";
      swatches: number;
      typeSamples: number;
      componentSamples: number;
      buttonCenterDeltaY: number;
      layerLabels: string[];
      rendered: boolean;
    };
    __pixiLayoutDebug?: {
      enabled: boolean;
      filter: "all" | "world" | "ui";
      layoutNodes: number;
      debuggedNodes: number;
      layerLabels: string[];
      installedAt: number;
      panelConnected: boolean;
      restoreCount: number;
      visibilityState: DocumentVisibilityState;
    };
    __pixiRuntimeState?: {
      appMode: "interactive" | "transitioning" | "loading" | "destroyed";
      loading: boolean;
      loadingPhase: "idle" | "in" | "loading" | "out";
      sceneSwitches: number;
      sceneSwitchRequests: number;
      acceptedCommands: number;
      ignoredCommands: number;
      runningCommands: string[];
      loadingOverlayShows: number;
      loadingMinimumMs: number;
      lastLoadingDurationMs: number;
      loadingProgress: number;
      loadingOverlayAlpha: number;
      loadingOverlayMaxAlpha: number;
      transitionPanels: number;
      transitionPanelMaxCount: number;
      loadingOverlayVisible: boolean;
    };
  }
}

test("renders the PixiJS demo with assets and input", async ({
  page,
}) => {
  test.setTimeout(45000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__pixiIntroState?.rendered))
    .toBe(true);

  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(Math.round(box?.x ?? -1)).toBe(0);
  expect(Math.round(box?.y ?? -1)).toBe(0);
  expect(Math.round(box?.width ?? 0)).toBe(viewport?.width);
  expect(Math.round(box?.height ?? 0)).toBe(viewport?.height);

  await expect.poll(() => hasVisibleCanvasPixels(page)).toBe(true);
  const intro = await page.evaluate(() => window.__pixiIntroState);
  expect(intro?.scene).toBe("intro");
  expect(intro?.promptBounds.width).toBeGreaterThan(0);
  expect(intro?.buttonBounds.width).toBeGreaterThan(intro?.promptBounds.width ?? 0);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.loadingOverlayShows ?? 0)).toBe(0);

  const bootLoadingShows = await page.evaluate(() => window.__pixiRuntimeState?.loadingOverlayShows ?? 0);
  await canvas.click({ position: { x: Math.floor((box?.width ?? 0) / 2), y: Math.floor((box?.height ?? 0) * 0.56) } });
  await expect
    .poll(() => page.evaluate(() => window.__pixiRuntimeState?.loadingOverlayShows ?? 0))
    .toBeGreaterThan(bootLoadingShows);
  await expect
    .poll(() => page.evaluate(() => window.__pixiDemoState?.rendered))
    .toBe(true);
  await expect.poll(() => page.evaluate(() => window.__pixiIntroState)).toBeUndefined();
  await expect
    .poll(() => page.evaluate(() => window.__pixiRuntimeState?.lastLoadingDurationMs ?? 0))
    .toBeGreaterThanOrEqual(490);
  const loadingDuration = await page.evaluate(() => window.__pixiRuntimeState?.lastLoadingDurationMs ?? 0);
  const loadingMinimumMs = await page.evaluate(() => window.__pixiRuntimeState?.loadingMinimumMs ?? 0);
  expect(loadingMinimumMs).toBeGreaterThanOrEqual(500);
  expect(loadingMinimumMs).toBeLessThanOrEqual(1000);
  expect(loadingDuration).toBeGreaterThanOrEqual(490);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.loadingProgress ?? 0)).toBe(1);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.loadingOverlayMaxAlpha ?? 0)).toBeGreaterThan(0.95);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.transitionPanelMaxCount ?? 0)).toBeGreaterThanOrEqual(4);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.transitionPanels ?? 0)).toBe(0);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.loadingPhase)).toBe("idle");
  expect(await page.evaluate(() => window.__pixiRuntimeState?.loadingOverlayAlpha ?? -1)).toBe(0);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.appMode)).toBe("interactive");
  expect(await page.evaluate(() => window.__pixiRuntimeState?.acceptedCommands ?? 0)).toBe(1);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.runningCommands ?? [])).toEqual([]);

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
  expect(before?.assetReady).toBe(true);
  expect(before?.assetBounds.width).toBeGreaterThan(0);
  expect(before?.assetBounds.height).toBeGreaterThan(0);
  expect(rectsOverlap(before?.titleBounds, before?.markerBounds)).toBe(false);
  expect(before?.layerLabels).toEqual(["world-layer", "ui-layer", "debug-layer"]);
  expect(before?.scene).toBe("boot");
  expect(await page.evaluate(() => window.__pixiRuntimeState?.loading)).toBe(false);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.loadingOverlayVisible)).toBe(false);

  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowRight");

  const after = await page.evaluate(() => window.__pixiDemoState);
  expect(after?.playerX).toBeGreaterThan(before?.playerX ?? 0);

  const pointerTarget = {
    x: Math.floor((box?.width ?? 0) * 0.8),
    y: Math.floor((box?.height ?? 0) * 0.7),
  };
  await canvas.click({ position: pointerTarget });
  await expect
    .poll(() => page.evaluate(() => window.__pixiDemoState?.playerX ?? 0))
    .toBeGreaterThan(after?.playerX ?? 0);

  const afterPointer = await page.evaluate(() => window.__pixiDemoState);
  expect(afterPointer?.playerY).toBeGreaterThan(after?.playerY ?? 0);
  expect(afterPointer?.pointerX).toBeGreaterThan((afterPointer?.visibleWidth ?? 0) * 0.78);
  expect(afterPointer?.pointerX).toBeLessThan((afterPointer?.visibleWidth ?? 0) * 0.82);
  expect(afterPointer?.pointerY).toBeGreaterThan((afterPointer?.visibleHeight ?? 0) * 0.68);
  expect(afterPointer?.pointerY).toBeLessThan((afterPointer?.visibleHeight ?? 0) * 0.72);

  const layoutDebugPanel = page.getByTestId("layout-debug-panel");
  const layoutDebug = page.getByTestId("layout-debug-toggle");
  const sceneSwitch = page.getByTestId("layout-debug-scene");
  const designSystem = page.getByTestId("layout-debug-design-system");
  await expect(layoutDebugPanel).toBeVisible();
  await expect(sceneSwitch).toBeVisible();
  await expect(designSystem).toBeVisible();
  expect(await page.evaluate(() => window.__pixiLayoutDebug?.panelConnected)).toBe(true);
  expect(await page.evaluate(() => window.__pixiLayoutDebug?.installedAt ?? 0)).toBeGreaterThan(0);
  const runtimeSwitches = await page.evaluate(() => window.__pixiRuntimeState?.sceneSwitches ?? 0);
  const loadingOverlayShows = await page.evaluate(() => window.__pixiRuntimeState?.loadingOverlayShows ?? 0);
  const sceneSwitchRequests = await page.evaluate(() => window.__pixiRuntimeState?.sceneSwitchRequests ?? 0);
  const acceptedCommands = await page.evaluate(() => window.__pixiRuntimeState?.acceptedCommands ?? 0);
  const ignoredCommands = await page.evaluate(() => window.__pixiRuntimeState?.ignoredCommands ?? 0);

  await sceneSwitch.evaluate((button) => {
    for (let index = 0; index < 5; index += 1) {
      (button as HTMLButtonElement).click();
    }
  });
  await expect
    .poll(() => page.evaluate(() => window.__pixiRuntimeState?.sceneSwitches ?? 0))
    .toBeGreaterThan(runtimeSwitches);
  await expect
    .poll(() => page.evaluate(() => window.__pixiRuntimeState?.loadingOverlayShows ?? 0))
    .toBeGreaterThan(loadingOverlayShows);
  await expect.poll(() => page.evaluate(() => window.__pixiDemoState?.scene)).toBe("alternate");
  await expect.poll(() => page.evaluate(() => window.__pixiRuntimeState?.loading)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__pixiRuntimeState?.loadingOverlayVisible)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__pixiRuntimeState?.appMode)).toBe("interactive");
  expect(await page.evaluate(() => window.__pixiRuntimeState?.sceneSwitchRequests ?? 0)).toBe(sceneSwitchRequests + 5);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.acceptedCommands ?? 0)).toBe(acceptedCommands + 1);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.ignoredCommands ?? 0)).toBeGreaterThanOrEqual(ignoredCommands + 4);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.loadingOverlayShows ?? 0)).toBe(loadingOverlayShows + 1);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.transitionPanels ?? 0)).toBe(0);
  expect(await page.evaluate(() => window.__pixiRuntimeState?.runningCommands ?? [])).toEqual([]);
  const alternate = await page.evaluate(() => window.__pixiDemoState);
  expect(alternate?.sceneSwitches).toBe(1);
  expect(alternate?.titleBounds.width).toBeGreaterThan(0);
  expect(alternate?.markerBounds.width).toBeGreaterThan(0);
  expect(alternate?.assetReady).toBe(true);
  expect(alternate?.assetBounds.width).toBeGreaterThan(0);

  await sceneSwitch.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDemoState?.scene)).toBe("boot");
  expect(await page.evaluate(() => window.__pixiDemoState?.sceneSwitches)).toBe(2);

  await designSystem.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDesignSystemState?.rendered)).toBe(true);
  const designSystemState = await page.evaluate(() => window.__pixiDesignSystemState);
  expect(designSystemState?.scene).toBe("design-system");
  expect(designSystemState?.swatches).toBeGreaterThanOrEqual(6);
  expect(designSystemState?.typeSamples).toBeGreaterThanOrEqual(3);
  expect(designSystemState?.componentSamples).toBeGreaterThanOrEqual(2);
  expect(designSystemState?.buttonCenterDeltaY).toBeLessThanOrEqual(1.5);
  expect(designSystemState?.layerLabels).toEqual(["world-layer", "ui-layer", "debug-layer"]);

  await sceneSwitch.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDemoState?.scene)).toBe("boot");

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

test("reload button reloads the page", async ({ page }) => {
  await page.goto("/");

  await expect.poll(() => page.evaluate(() => window.__pixiIntroState?.rendered)).toBe(true);
  const reloadButton = page.getByTestId("layout-debug-reload");

  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    reloadButton.click(),
  ]);

  await expect.poll(() => page.evaluate(() => window.__pixiIntroState?.rendered)).toBe(true);
  await expect(page.getByTestId("layout-debug-panel")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pixiLayoutDebug?.panelConnected)).toBe(true);
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
