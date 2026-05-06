import { expect, test } from "@playwright/test";
import { collectConsoleErrors, gotoBoot, startDemoFromBoot } from "./pixi-test-helpers";

test("keeps legacy DOM debug panel hidden while preserving debug state", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await startDemoFromBoot(page, canvas);

  const layoutDebugPanel = page.getByTestId("layout-debug-panel");
  await expect(layoutDebugPanel).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.currentScene)).toBe("vertical-slice");
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.panelConnected)).toBe(true);
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.installedAt ?? 0)).toBeGreaterThan(0);

  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.boot?.rendered)).toBe(true);
  await expect(layoutDebugPanel).toBeHidden();
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.panelConnected)).toBe(true);

  expect(consoleErrors).toEqual([]);
});

test("guards duplicate debug scene switch commands", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await startDemoFromBoot(page, canvas);

  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.currentScene)).toBe("vertical-slice");

  const runtimeSwitches = await page.evaluate(() => window.__pixiDebug?.runtime?.sceneSwitches ?? 0);
  const loadingOverlayShows = await page.evaluate(() => window.__pixiDebug?.runtime?.loadingOverlayShows ?? 0);
  const sceneSwitchRequests = await page.evaluate(() => window.__pixiDebug?.runtime?.sceneSwitchRequests ?? 0);
  const acceptedCommands = await page.evaluate(() => window.__pixiDebug?.runtime?.acceptedCommands ?? 0);
  const ignoredCommands = await page.evaluate(() => window.__pixiDebug?.runtime?.ignoredCommands ?? 0);

  await page.evaluate(() => {
    for (let index = 0; index < 5; index += 1) {
      window.dispatchEvent(new CustomEvent("pixi:scene-switch"));
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
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.currentScene)).toBe("alternate");
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

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:scene-switch")));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.demo?.scene)).toBe("vertical-slice");
  expect(await page.evaluate(() => window.__pixiDebug?.demo?.sceneSwitches)).toBe(2);

  expect(consoleErrors).toEqual([]);
});

test("shows layout and semantic bounds debug information by filter", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await startDemoFromBoot(page, canvas);

  await expect(page.getByTestId("layout-debug-panel")).toBeHidden();
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.layoutNodes)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.mode)).toBe("layout");
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("all");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { enabled: true } })));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.enabled)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.debuggedNodes)).toBeGreaterThan(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "ui" } })));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("ui");
  const uiDebuggedNodes = await page.evaluate(() => window.__pixiDebug?.layout?.debuggedNodes ?? 0);
  expect(uiDebuggedNodes).toBeGreaterThan(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "world" } })));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("world");
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.debuggedNodes ?? 0)).toBeLessThan(uiDebuggedNodes);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "all" } })));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("all");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { mode: "bounds" } })));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.mode)).toBe("bounds");
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.semanticBoxes ?? 0)).toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.layout?.semanticLabels ?? []))
    .toEqual(expect.arrayContaining(["title", "player", "marker"]));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.debuggedNodes ?? -1)).toBe(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "ui" } })));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("ui");
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.layout?.semanticLabels ?? []))
    .toEqual(expect.arrayContaining(["app-shell", "title", "marker"]));
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.semanticLabels ?? [])).not.toContain("player");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "world" } })));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("world");
  await expect
    .poll(() => page.evaluate(() => window.__pixiDebug?.layout?.semanticLabels ?? []))
    .toEqual(expect.arrayContaining(["player"]));
  expect(await page.evaluate(() => window.__pixiDebug?.layout?.semanticLabels ?? [])).not.toContain("title");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "all" } })));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.filter)).toBe("all");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { mode: "layout" } })));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.mode)).toBe("layout");
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.debuggedNodes ?? 0)).toBeGreaterThan(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { enabled: false } })));
  await expect.poll(() => page.evaluate(() => window.__pixiDebug?.layout?.enabled)).toBe(false);

  expect(consoleErrors).toEqual([]);
});
