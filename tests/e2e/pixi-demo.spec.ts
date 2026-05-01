import { expect, type Locator, type Page, test } from "@playwright/test";
import type { PixiDebugState } from "../../src/debug/stateBridge";

declare global {
  interface Window {
    __pixiDebug?: PixiDebugState;
  }
}

test("renders the PixiJS demo with assets and input", async ({
  page,
}) => {
  test.setTimeout(100000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.boot?.rendered))
    .toBe(true);

  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(Math.round(box?.x ?? -1)).toBe(0);
  expect(Math.round(box?.y ?? -1)).toBe(0);
  expect(Math.round(box?.width ?? 0)).toBe(viewport?.width);
  expect(Math.round(box?.height ?? 0)).toBe(viewport?.height);

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

  const initialFold = page.getByTestId("layout-debug-fold");
  const initialDesignSystem = page.getByTestId("layout-debug-design-system");
  const initialSceneSwitch = page.getByTestId("layout-debug-scene");
  const initialCurrentScene = page.getByTestId("layout-debug-current-scene");
  await expect(initialCurrentScene).toContainText("boot");
  await initialFold.click();
  await expect(initialDesignSystem).toBeVisible();
  await initialDesignSystem.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.designSystem?.rendered)).toBe(true);
  await expect(initialCurrentScene).toContainText("design-system");
  await initialSceneSwitch.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.demo?.scene)).toBe("vertical-slice");
  await initialFold.click();
  await expect(initialFold).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.boot?.rendered)).toBe(true);

  const bootLoadingShows = await page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayShows ?? 0);
  await clickBootStart(page, canvas);
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayShows ?? 0))
    .toBeGreaterThan(bootLoadingShows);
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.demo?.rendered))
    .toBe(true);
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.boot)).toBeUndefined();
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.runtime?.lastLoadingDurationMs ?? 0))
    .toBeGreaterThanOrEqual(490);
  const loadingDuration = await page.evaluate(() => window.__pixiDebug?.runtime?.lastLoadingDurationMs ?? 0);
  const loadingMinimumMs = await page.evaluate(() => window.__pixiDebug?.runtime?.loadingMinimumMs ?? 0);
  expect(loadingMinimumMs).toBeGreaterThanOrEqual(500);
  expect(loadingMinimumMs).toBeLessThanOrEqual(1000);
  expect(loadingDuration).toBeGreaterThanOrEqual(490);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.loadingProgress ?? 0)).toBe(1);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayMaxAlpha ?? 0)).toBeGreaterThan(0.95);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.transitionPanelMaxCount ?? 0)).toBeGreaterThanOrEqual(4);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.transitionPanels ?? 0)).toBe(0);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.loadingPhase)).toBe("idle");
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayAlpha ?? -1)).toBe(0);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.appMode)).toBe("interactive");
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.acceptedCommands ?? 0)).toBe(1);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.runningCommands ?? [])).toEqual([]);

  const before = await page.evaluate(() => window.__pixiDebug?.demo);
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

  const layoutDebugPanel = page.getByTestId("layout-debug-panel");
  const layoutDebug = page.getByTestId("layout-debug-toggle");
  const layoutDebugFold = page.getByTestId("layout-debug-fold");
  const layoutDebugHeader = page.getByTestId("layout-debug-header");
  const layoutDebugCurrentScene = page.getByTestId("layout-debug-current-scene");
  const sceneSwitch = page.getByTestId("layout-debug-scene");
  const designSystem = page.getByTestId("layout-debug-design-system");
  await expect(layoutDebugPanel).toBeVisible();
  await expect(layoutDebugFold).toHaveAttribute("aria-expanded", "false");
  await expect(sceneSwitch).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.folded)).toBe(true);
  await expect(layoutDebugCurrentScene).toContainText("vertical-slice");
  await layoutDebugFold.click();
  await expect(layoutDebugFold).toHaveAttribute("aria-expanded", "true");
  await expect(sceneSwitch).toBeVisible();
  await expect(designSystem).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.folded)).toBe(false);
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.panelConnected)).toBe(true);
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.installedAt ?? 0)).toBeGreaterThan(0);
  const panelBeforeDrag = await layoutDebugPanel.boundingBox();
  expect(panelBeforeDrag).not.toBeNull();
  await layoutDebugHeader.dragTo(canvas, {
    sourcePosition: { x: 24, y: 16 },
    targetPosition: { x: 120, y: 120 },
  });
  const panelAfterDrag = await layoutDebugPanel.boundingBox();
  expect(panelAfterDrag).not.toBeNull();
  expect(Math.abs((panelAfterDrag?.x ?? 0) - (panelBeforeDrag?.x ?? 0))).toBeGreaterThan(20);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.boot?.rendered)).toBe(true);
  await clickBootStart(page, canvas);
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.demo?.rendered), { timeout: 15000 })
    .toBe(true);
  await expect(layoutDebugFold).toHaveAttribute("aria-expanded", "true");
  const panelAfterReload = await layoutDebugPanel.boundingBox();
  expect(Math.abs((panelAfterReload?.x ?? 0) - (panelAfterDrag?.x ?? 0))).toBeLessThanOrEqual(2);
  expect(Math.abs((panelAfterReload?.y ?? 0) - (panelAfterDrag?.y ?? 0))).toBeLessThanOrEqual(2);
  await expect(layoutDebugCurrentScene).toContainText("vertical-slice");
  const runtimeSwitches = await page.evaluate(() => window.__pixiDebug?.runtime?.sceneSwitches ?? 0);
  const loadingOverlayShows = await page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayShows ?? 0);
  const sceneSwitchRequests = await page.evaluate(() => window.__pixiDebug?.runtime?.sceneSwitchRequests ?? 0);
  const acceptedCommands = await page.evaluate(() => window.__pixiDebug?.runtime?.acceptedCommands ?? 0);
  const ignoredCommands = await page.evaluate(() => window.__pixiDebug?.runtime?.ignoredCommands ?? 0);

  await sceneSwitch.evaluate((button) => {
    for (let index = 0; index < 5; index += 1) {
      (button as HTMLButtonElement).click();
    }
  });
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.runtime?.sceneSwitches ?? 0))
    .toBeGreaterThan(runtimeSwitches);
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.activeScene)).toBe("alternate");
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayShows ?? 0))
    .toBeGreaterThan(loadingOverlayShows);
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.demo?.scene)).toBe("alternate");
  await expect(layoutDebugCurrentScene).toContainText("alternate");
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.runtime?.loading)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayVisible)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.runtime?.appMode)).toBe("interactive");
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.sceneSwitchRequests ?? 0)).toBe(sceneSwitchRequests + 5);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.acceptedCommands ?? 0)).toBe(acceptedCommands + 1);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.ignoredCommands ?? 0)).toBeGreaterThanOrEqual(ignoredCommands + 4);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayShows ?? 0)).toBe(loadingOverlayShows + 1);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.transitionPanels ?? 0)).toBe(0);
  expect(await page.evaluate(() => window.__pixiDebug?.runtime?.runningCommands ?? [])).toEqual([]);
  const alternate = await page.evaluate(() => window.__pixiDebug?.demo);
  expect(alternate?.sceneSwitches).toBe(1);
  expect(alternate?.titleBounds.width).toBeGreaterThan(0);
  expect(alternate?.markerBounds.width).toBeGreaterThan(0);
  expect(alternate?.assetReady).toBe(true);
  expect(alternate?.assetBounds.width).toBeGreaterThan(0);

  await sceneSwitch.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.demo?.scene)).toBe("vertical-slice");
  expect(await page.evaluate(() => window.__pixiDebug?.demo?.sceneSwitches)).toBe(2);

  await designSystem.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.designSystem?.rendered)).toBe(true);
  const designSystemState = await page.evaluate(() => window.__pixiDebug?.designSystem);
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
    .poll(() => page.evaluate(() => window.__pixiDebug?.layout?.layoutNodes ?? 0))
    .toBeGreaterThanOrEqual(16);
  await expect(layoutDebugCurrentScene).toContainText("design-system");

  await sceneSwitch.click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.demo?.scene)).toBe("vertical-slice");

  await expect(layoutDebug).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("layout-debug-stats")).toContainText("world-layer");
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.layoutNodes)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.mode)).toBe("layout");
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("all");

  await layoutDebug.click();
  await expect(layoutDebug).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.enabled)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.debuggedNodes)).toBeGreaterThan(0);

  await page.getByTestId("layout-debug-filter-ui").click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("ui");
  const uiDebuggedNodes = await page.evaluate(() => window.__pixiDebug?.layout?.debuggedNodes ?? 0);
  expect(uiDebuggedNodes).toBeGreaterThan(0);

  await page.getByTestId("layout-debug-filter-world").click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("world");
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.debuggedNodes ?? 0)).toBeLessThan(uiDebuggedNodes);

  await page.getByTestId("layout-debug-filter-all").click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("all");

  await page.getByTestId("layout-debug-mode-bounds").click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.mode)).toBe("bounds");
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.semanticBoxes ?? 0)).toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.layout?.semanticLabels ?? []))
    .toEqual(expect.arrayContaining(["title", "player", "marker"]));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.debuggedNodes ?? -1)).toBe(0);

  await page.getByTestId("layout-debug-filter-ui").click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("ui");
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.layout?.semanticLabels ?? []))
    .toEqual(expect.arrayContaining(["hud", "title", "marker"]));
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.semanticLabels ?? [])).not.toContain("player");

  await page.getByTestId("layout-debug-filter-world").click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("world");
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.layout?.semanticLabels ?? []))
    .toEqual(expect.arrayContaining(["player"]));
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.semanticLabels ?? [])).not.toContain("title");

  await page.getByTestId("layout-debug-filter-all").click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("all");

  await page.getByTestId("layout-debug-mode-layout").click();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.mode)).toBe("layout");
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.debuggedNodes ?? 0)).toBeGreaterThan(0);

  await layoutDebug.click();
  await expect(layoutDebug).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.enabled)).toBe(false);

  expect(consoleErrors).toEqual([]);
});

test("reload button reloads the page", async ({ page }) => {
  await page.goto("/");

  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.boot?.rendered)).toBe(true);
  await page.getByTestId("layout-debug-fold").click();
  const reloadButton = page.getByTestId("layout-debug-reload");

  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    reloadButton.click(),
  ]);

  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.boot?.rendered)).toBe(true);
  await expect(page.getByTestId("layout-debug-panel")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.panelConnected)).toBe(true);
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

async function clickBootStart(page: Page, canvas: Locator): Promise<void> {
  const bounds = await page.evaluate(() => window.__pixiDebug?.boot?.buttonBounds);
  expect(bounds).toBeDefined();
  await canvas.click({
    position: {
      x: Math.round((bounds?.x ?? 0) + (bounds?.width ?? 0) / 2),
      y: Math.round((bounds?.y ?? 0) + (bounds?.height ?? 0) / 2),
    },
  });
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number } | undefined,
  b: { x: number; y: number; width: number; height: number } | undefined,
): boolean {
  if (!a || !b) return true;
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
