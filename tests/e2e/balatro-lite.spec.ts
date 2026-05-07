import { expect, test } from "@playwright/test";
import {
  clickBootStart,
  clickCanvasAt,
  clickSceneIndexItem,
  collectConsoleErrors,
  gotoBoot,
  readDebugSnapshot,
  waitForSceneIndexReady,
} from "./pixi-test-helpers";

function centerOf(bounds: { x: number; y: number; width: number; height: number } | undefined): { x: number; y: number } {
  return {
    x: (bounds?.x ?? 0) + (bounds?.width ?? 0) / 2,
    y: (bounds?.y ?? 0) + (bounds?.height ?? 0) / 2,
  };
}

test("renders the seeded Balatro-lite round and advances through play/next round", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);

  await clickBootStart(page, canvas);
  await waitForSceneIndexReady(page);
  await clickSceneIndexItem(page, canvas, "Balatro-lite");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.rendered)).toBe(true);

  const initialSnapshot = (await readDebugSnapshot(page))?.balatroLite;
  expect(initialSnapshot?.scene).toBe("balatro-lite");
  expect(initialSnapshot?.seed).toBe(24681357);
  expect(initialSnapshot?.round).toBe(1);
  expect(initialSnapshot?.phase).toBe("select");
  expect(initialSnapshot?.deckRemaining).toBe(44);
  expect(initialSnapshot?.hand).toHaveLength(8);
  expect(initialSnapshot?.selectedCardIds).toEqual([]);
  expect(initialSnapshot?.canPlayHand).toBe(false);
  expect(initialSnapshot?.canNextRound).toBe(false);
  expect(initialSnapshot?.lastScore).toBeUndefined();
  expect(initialSnapshot?.cumulativeScore).toBe(0);
  expect(Object.keys(initialSnapshot?.cardBounds ?? {})).toHaveLength(8);
  expect(initialSnapshot?.playHandButtonBounds.width ?? 0).toBeGreaterThan(0);
  expect(initialSnapshot?.nextRoundButtonBounds.width ?? 0).toBeGreaterThan(0);
  expect(initialSnapshot?.appShell.sheetBounds.width ?? 0).toBeGreaterThan(0);
  expect(initialSnapshot?.layout.contentBounds.width ?? 0).toBeGreaterThan(0);
  expect(initialSnapshot?.layout.actionRowBounds.width ?? 0).toBeGreaterThan(0);
  const scale = (initialSnapshot?.layout.viewportWidth ?? 0) / (initialSnapshot?.layout.visibleWidth ?? 1);
  const content = initialSnapshot?.layout.contentBounds;
  const actionRow = initialSnapshot?.layout.actionRowBounds;
  expect((initialSnapshot?.playHandButtonBounds.height ?? 0) * scale).toBeGreaterThanOrEqual(48);
  expect((initialSnapshot?.nextRoundButtonBounds.height ?? 0) * scale).toBeGreaterThanOrEqual(48);
  expect(actionRow?.y ?? 0).toBeGreaterThanOrEqual(content?.y ?? 0);
  expect((actionRow?.y ?? 0) + (actionRow?.height ?? 0)).toBeLessThanOrEqual((content?.y ?? 0) + (content?.height ?? 0));
  for (const bounds of Object.values(initialSnapshot?.cardBounds ?? {})) {
    expect(bounds.height * scale).toBeGreaterThanOrEqual(48);
  }

  const firstCardBounds = initialSnapshot?.cardBounds[initialSnapshot?.hand[0]?.id ?? ""];
  await clickCanvasAt(page, canvas, centerOf(firstCardBounds).x, centerOf(firstCardBounds).y, { designSpace: true });
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.selectedCardIds)).toHaveLength(1);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.canPlayHand)).toBe(true);

  const playButtonBounds = (await readDebugSnapshot(page))?.balatroLite?.playHandButtonBounds;
  await clickCanvasAt(page, canvas, centerOf(playButtonBounds).x, centerOf(playButtonBounds).y, { designSpace: true });
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.phase)).toBe("result");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.selectedCardIds)).toEqual([]);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.lastScore?.total ?? 0)).toBeGreaterThan(0);
  const lastScore = (await readDebugSnapshot(page))?.balatroLite?.lastScore;
  expect(lastScore?.baseChips).toBeGreaterThan(0);
  expect(lastScore?.mult).toBeGreaterThan(0);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.cumulativeScore ?? 0)).toBe(lastScore?.total);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.canNextRound)).toBe(true);

  const nextRoundButtonBounds = (await readDebugSnapshot(page))?.balatroLite?.nextRoundButtonBounds;
  await clickCanvasAt(page, canvas, centerOf(nextRoundButtonBounds).x, centerOf(nextRoundButtonBounds).y, { designSpace: true });
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.round)).toBe(2);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.phase)).toBe("select");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.hand)).toHaveLength(8);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.deckRemaining)).toBe(44);

  expect(consoleErrors).toEqual([]);
});

test("keeps the same initial hand for the fixed seed across reloads", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const canvas = await gotoBoot(page);

  await clickBootStart(page, canvas);
  await waitForSceneIndexReady(page);
  await clickSceneIndexItem(page, canvas, "Balatro-lite");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.rendered)).toBe(true);
  const initialHandIds = (await readDebugSnapshot(page))?.balatroLite?.hand.map((card) => card.id);

  await page.reload();
  const reloadedCanvas = await gotoBoot(page);
  await clickBootStart(page, reloadedCanvas);
  await waitForSceneIndexReady(page);
  await clickSceneIndexItem(page, reloadedCanvas, "Balatro-lite");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.rendered)).toBe(true);
  expect((await readDebugSnapshot(page))?.balatroLite?.hand.map((card) => card.id)).toEqual(initialHandIds);

  expect(consoleErrors).toEqual([]);
});
