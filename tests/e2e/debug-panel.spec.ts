import { expect, test } from "@playwright/test";
import { collectConsoleErrors, gotoBoot, readDebugSnapshot, startDemoFromBoot } from "./pixi-test-helpers";

test("keeps legacy DOM debug panel hidden while preserving debug state", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await startDemoFromBoot(page, canvas);

  const layoutDebugPanel = page.getByTestId("layout-debug-panel");
  await expect(layoutDebugPanel).toBeHidden();
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.currentScene)).toBe("vertical-slice");
  expect((await readDebugSnapshot(page))?.layout?.panelConnected).toBe(true);
  expect((await readDebugSnapshot(page))?.layout?.installedAt ?? 0).toBeGreaterThan(0);

  await page.reload();
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.boot?.rendered)).toBe(true);
  await expect(layoutDebugPanel).toBeHidden();
  expect((await readDebugSnapshot(page))?.layout?.panelConnected).toBe(true);

  expect(consoleErrors).toEqual([]);
});

test("guards duplicate debug scene switch commands", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await startDemoFromBoot(page, canvas);

  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.currentScene)).toBe("vertical-slice");

  const runtimeBefore = (await readDebugSnapshot(page))?.runtime;
  const runtimeSwitches = runtimeBefore?.sceneSwitches ?? 0;
  const loadingOverlayShows = runtimeBefore?.loadingOverlayShows ?? 0;
  const sceneSwitchRequests = runtimeBefore?.sceneSwitchRequests ?? 0;
  const acceptedCommands = runtimeBefore?.acceptedCommands ?? 0;
  const ignoredCommands = runtimeBefore?.ignoredCommands ?? 0;

  await page.evaluate(() => {
    for (let index = 0; index < 5; index += 1) {
      window.dispatchEvent(new CustomEvent("pixi:scene-switch"));
    }
  });
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.runtime?.sceneSwitches ?? 0))
    .toBeGreaterThan(runtimeSwitches);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.activeScene)).toBe("alternate");
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.runtime?.loadingOverlayShows ?? 0))
    .toBeGreaterThan(loadingOverlayShows);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.demo?.scene)).toBe("alternate");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.currentScene)).toBe("alternate");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.runtime?.loading)).toBe(false);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.runtime?.loadingOverlayVisible)).toBe(false);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.runtime?.appMode)).toBe("interactive");
  const runtimeAfterSwitch = (await readDebugSnapshot(page))?.runtime;
  expect(runtimeAfterSwitch?.sceneSwitchRequests ?? 0).toBe(sceneSwitchRequests + 5);
  expect(runtimeAfterSwitch?.acceptedCommands ?? 0).toBe(acceptedCommands + 1);
  expect(runtimeAfterSwitch?.ignoredCommands ?? 0).toBeGreaterThanOrEqual(ignoredCommands + 4);
  expect(runtimeAfterSwitch?.loadingOverlayShows ?? 0).toBe(loadingOverlayShows + 1);
  expect(runtimeAfterSwitch?.transitionPanels ?? 0).toBe(0);
  expect(runtimeAfterSwitch?.runningCommands ?? []).toEqual([]);

  const alternate = (await readDebugSnapshot(page))?.demo;
  expect(alternate?.sceneSwitches).toBe(1);
  expect(alternate?.titleBounds.width).toBeGreaterThan(0);
  expect(alternate?.markerBounds.width).toBeGreaterThan(0);
  expect(alternate?.assetReady).toBe(true);
  expect(alternate?.assetBounds.width).toBeGreaterThan(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:scene-switch")));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.demo?.scene)).toBe("vertical-slice");
  expect((await readDebugSnapshot(page))?.demo?.sceneSwitches).toBe(2);

  expect(consoleErrors).toEqual([]);
});

test("shows layout and semantic bounds debug information by filter", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);
  await startDemoFromBoot(page, canvas);

  await expect(page.getByTestId("layout-debug-panel")).toBeHidden();
  expect((await readDebugSnapshot(page))?.layout?.layoutNodes).toBeGreaterThan(0);
  expect((await readDebugSnapshot(page))?.layout?.mode).toBe("layout");
  expect((await readDebugSnapshot(page))?.layout?.filter).toBe("all");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { enabled: true } })));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.enabled)).toBe(true);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.debuggedNodes)).toBeGreaterThan(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "ui" } })));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.filter)).toBe("ui");
  const uiDebuggedNodes = (await readDebugSnapshot(page))?.layout?.debuggedNodes ?? 0;
  expect(uiDebuggedNodes).toBeGreaterThan(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "world" } })));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.filter)).toBe("world");
  expect((await readDebugSnapshot(page))?.layout?.debuggedNodes ?? 0).toBeLessThan(uiDebuggedNodes);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "all" } })));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.filter)).toBe("all");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { mode: "bounds" } })));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.mode)).toBe("bounds");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.semanticBoxes ?? 0)).toBeGreaterThan(0);
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.semanticLabels ?? []))
    .toEqual(expect.arrayContaining(["title", "player", "marker"]));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.debuggedNodes ?? -1)).toBe(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "ui" } })));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.filter)).toBe("ui");
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.semanticLabels ?? []))
    .toEqual(expect.arrayContaining(["app-shell", "title", "marker"]));
  expect((await readDebugSnapshot(page))?.layout?.semanticLabels ?? []).not.toContain("player");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "world" } })));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.filter)).toBe("world");
  await expect
    .poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.semanticLabels ?? []))
    .toEqual(expect.arrayContaining(["player"]));
  expect((await readDebugSnapshot(page))?.layout?.semanticLabels ?? []).not.toContain("title");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { filter: "all" } })));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.filter)).toBe("all");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { mode: "layout" } })));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.mode)).toBe("layout");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.debuggedNodes ?? 0)).toBeGreaterThan(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { enabled: false } })));
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.layout?.enabled)).toBe(false);

  expect(consoleErrors).toEqual([]);
});
