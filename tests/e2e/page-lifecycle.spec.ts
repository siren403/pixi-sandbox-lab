import { expect, test } from "@playwright/test";
import { collectConsoleErrors, gotoBoot, hasVisibleCanvasPixels, readDebugSnapshot } from "./pixi-test-helpers";

test("keeps Pixi surface alive across browser page lifecycle restoration", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);

  await page.evaluate(() => {
    window.dispatchEvent(new Event("beforeunload"));
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });

  await expect(canvas).toBeVisible();
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.boot?.rendered)).toBe(true);
  await expect.poll(() => hasVisibleCanvasPixels(page)).toBe(true);
  expect(consoleErrors).toEqual([]);
});
