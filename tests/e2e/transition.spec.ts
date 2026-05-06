import { expect, test } from "@playwright/test";
import { collectConsoleErrors, gotoBoot, readDebugSnapshot, startDemoFromBoot } from "./pixi-test-helpers";

test("runs boot-to-world loading transition with command state", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);

  await startDemoFromBoot(page, canvas);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.boot)).toBeUndefined();
  const runtime = (await readDebugSnapshot(page))?.runtime;
  const loadingDuration = runtime?.lastLoadingDurationMs ?? 0;
  const loadingMinimumMs = runtime?.loadingMinimumMs ?? 0;
  expect(loadingMinimumMs).toBeGreaterThanOrEqual(500);
  expect(loadingMinimumMs).toBeLessThanOrEqual(1000);
  expect(loadingDuration === 0 || loadingDuration >= 490).toBe(true);
  expect(runtime?.loadingProgress ?? 0).toBe(1);
  expect(runtime?.loadingOverlayMaxAlpha ?? 0).toBeGreaterThan(0.95);
  expect(runtime?.transitionPanelMaxCount ?? 0).toBeGreaterThanOrEqual(4);
  expect(runtime?.transitionPanels ?? 0).toBe(0);
  expect(runtime?.loadingPhase).toBe("idle");
  expect(runtime?.loadingOverlayAlpha ?? -1).toBe(0);
  expect(runtime?.appMode).toBe("interactive");
  expect(runtime?.acceptedCommands ?? 0).toBe(2);
  expect(runtime?.runningCommands ?? []).toEqual([]);

  expect(consoleErrors).toEqual([]);
});
