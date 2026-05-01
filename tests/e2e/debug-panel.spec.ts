import { expect, test } from "@playwright/test";
import { collectConsoleErrors, gotoBoot, openDebugPanel, startDemoFromBoot } from "./pixi-test-helpers";

test("persists debug panel position across reload", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await startDemoFromBoot(page, canvas);

  const layoutDebugPanel = page.getByTestId("layout-debug-panel");
  const layoutDebugFold = page.getByTestId("layout-debug-fold");
  const layoutDebugHeader = page.getByTestId("layout-debug-header");
  const layoutDebugCurrentScene = page.getByTestId("layout-debug-current-scene");
  const sceneSwitch = page.getByTestId("layout-debug-scene");

  await expect(layoutDebugPanel).toBeVisible();
  await expect(layoutDebugFold).toHaveAttribute("aria-expanded", "false");
  await expect(sceneSwitch).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.folded)).toBe(true);
  await expect(layoutDebugCurrentScene).toContainText("vertical-slice");

  await openDebugPanel(page);
  await expect(sceneSwitch).toBeVisible();
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
  await startDemoFromBoot(page, canvas);
  await expect(layoutDebugFold).toHaveAttribute("aria-expanded", "true");
  const panelAfterReload = await layoutDebugPanel.boundingBox();
  expect(Math.abs((panelAfterReload?.x ?? 0) - (panelAfterDrag?.x ?? 0))).toBeLessThanOrEqual(2);
  expect(Math.abs((panelAfterReload?.y ?? 0) - (panelAfterDrag?.y ?? 0))).toBeLessThanOrEqual(2);

  expect(consoleErrors).toEqual([]);
});

test("guards duplicate debug scene switch commands", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await startDemoFromBoot(page, canvas);
  await openDebugPanel(page);

  const layoutDebugCurrentScene = page.getByTestId("layout-debug-current-scene");
  const sceneSwitch = page.getByTestId("layout-debug-scene");
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

  expect(consoleErrors).toEqual([]);
});

test("shows layout and semantic bounds debug information by filter", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await startDemoFromBoot(page, canvas);
  await openDebugPanel(page);

  const layoutDebug = page.getByTestId("layout-debug-toggle");
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
