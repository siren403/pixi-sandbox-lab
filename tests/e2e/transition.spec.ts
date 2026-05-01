import { expect, test } from "@playwright/test";
import { collectConsoleErrors, gotoBoot, startDemoFromBoot } from "./pixi-test-helpers";

test("runs boot-to-world loading transition with command state", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);

  await startDemoFromBoot(page, canvas);
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

  expect(consoleErrors).toEqual([]);
});
