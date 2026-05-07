import { expect, test } from "@playwright/test";
import {
  clickBootStart,
  clickCanvasAt,
  clickSceneIndexItem,
  collectConsoleErrors,
  gotoBoot,
  readDebugSnapshot,
  rectsOverlap,
  waitForSceneIndexReady,
} from "./pixi-test-helpers";

function centerOf(bounds: { x: number; y: number; width: number; height: number } | undefined): { x: number; y: number } {
  return {
    x: (bounds?.x ?? 0) + (bounds?.width ?? 0) / 2,
    y: (bounds?.y ?? 0) + (bounds?.height ?? 0) / 2,
  };
}

function expectLabelInsideArea(metrics: {
  labelArea: { x: number; y: number; width: number; height: number };
  labelBounds: { x: number; y: number; width: number; height: number };
  resolvedFontSize: number;
  labelOverflowed: boolean;
} | undefined): void {
  expect(metrics?.labelArea.width ?? 0).toBeGreaterThan(0);
  expect(metrics?.labelOverflowed).toBe(false);
  expect(metrics?.labelBounds.x ?? 0).toBeGreaterThanOrEqual((metrics?.labelArea.x ?? 0) - 0.5);
  expect(metrics?.labelBounds.y ?? 0).toBeGreaterThanOrEqual((metrics?.labelArea.y ?? 0) - 0.5);
  expect((metrics?.labelBounds.x ?? 0) + (metrics?.labelBounds.width ?? 0)).toBeLessThanOrEqual(
    (metrics?.labelArea.x ?? 0) + (metrics?.labelArea.width ?? 0) + 0.5,
  );
  expect((metrics?.labelBounds.y ?? 0) + (metrics?.labelBounds.height ?? 0)).toBeLessThanOrEqual(
    (metrics?.labelArea.y ?? 0) + (metrics?.labelArea.height ?? 0) + 0.5,
  );
  expect(metrics?.resolvedFontSize ?? 0).toBeGreaterThan(0);
  expect(metrics?.labelBounds.width ?? 0).toBeGreaterThan(0);
}

function expectRectInside(
  bounds: { x: number; y: number; width: number; height: number } | undefined,
  frame: { x: number; y: number; width: number; height: number } | undefined,
): void {
  expect(bounds?.width ?? 0).toBeGreaterThan(0);
  expect(bounds?.height ?? 0).toBeGreaterThan(0);
  expect(bounds?.x ?? 0).toBeGreaterThanOrEqual((frame?.x ?? 0) - 0.5);
  expect(bounds?.y ?? 0).toBeGreaterThanOrEqual((frame?.y ?? 0) - 0.5);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual((frame?.x ?? 0) + (frame?.width ?? 0) + 0.5);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual((frame?.y ?? 0) + (frame?.height ?? 0) + 0.5);
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
  expect(Object.keys(initialSnapshot?.cardFrameBounds ?? {})).toHaveLength(8);
  expect(initialSnapshot?.playHandButtonFrameBounds.width ?? 0).toBeGreaterThan(0);
  expect(initialSnapshot?.nextRoundButtonFrameBounds.width ?? 0).toBeGreaterThan(0);
  expect(initialSnapshot?.appShell.sheetFrameBounds.width ?? 0).toBeGreaterThan(0);
  expect(initialSnapshot?.layout.contentFrameBounds.width ?? 0).toBeGreaterThan(0);
  expect(initialSnapshot?.layout.actionRowFrameBounds.width ?? 0).toBeGreaterThan(0);
  expect(initialSnapshot?.layout.layoutViolations.errors ?? []).toEqual([]);
  const scale = (initialSnapshot?.layout.viewportWidth ?? 0) / (initialSnapshot?.layout.visibleWidth ?? 1);
  const contentFrame = initialSnapshot?.layout.contentFrameBounds;
  const contentRender = initialSnapshot?.layout.contentRenderBounds;
  const actionRowFrame = initialSnapshot?.layout.actionRowFrameBounds;
  const handFrame = initialSnapshot?.layout.handFrameBounds;
  const statsFrame = initialSnapshot?.layout.statsFrameBounds;
  expectRectInside(contentRender, contentFrame);
  expectRectInside(actionRowFrame, contentFrame);
  expectRectInside(handFrame, contentFrame);
  expectRectInside(statsFrame, contentFrame);
  expectRectInside(initialSnapshot?.appShell.contentFrameBounds, contentFrame);
  expectRectInside(initialSnapshot?.appShell.topBarRenderBounds, initialSnapshot?.appShell.topBarFrameBounds);
  expectRectInside(initialSnapshot?.appShell.contentRenderBounds, initialSnapshot?.appShell.contentFrameBounds);
  expectRectInside(initialSnapshot?.appShell.bottomBarRenderBounds, initialSnapshot?.appShell.bottomBarFrameBounds);
  if ((initialSnapshot?.appShell.sheetFrameBounds.height ?? 0) > 0) {
    expectRectInside(initialSnapshot?.appShell.sheetRenderBounds, initialSnapshot?.appShell.sheetFrameBounds);
  } else {
    expect(initialSnapshot?.appShell.sheetRenderBounds.height ?? 0).toBe(0);
  }
  expectRectInside(initialSnapshot?.playHandButtonFrameBounds, actionRowFrame);
  expectRectInside(initialSnapshot?.nextRoundButtonFrameBounds, actionRowFrame);
  expect((initialSnapshot?.playHandButtonBounds.height ?? 0) * scale).toBeGreaterThanOrEqual(48);
  expect((initialSnapshot?.nextRoundButtonBounds.height ?? 0) * scale).toBeGreaterThanOrEqual(48);
  expectRectInside(initialSnapshot?.playHandButtonBounds, actionRowFrame);
  expectRectInside(initialSnapshot?.nextRoundButtonBounds, actionRowFrame);
  for (const bounds of Object.values(initialSnapshot?.cardFrameBounds ?? {})) {
    expectRectInside(bounds, contentFrame);
  }
  for (const bounds of Object.values(initialSnapshot?.cardRenderBounds ?? {})) {
    expectRectInside(bounds, contentFrame);
  }

  const cardBounds = Object.values(initialSnapshot?.cardFrameBounds ?? {});
  for (let i = 0; i < cardBounds.length; i += 1) {
    for (let j = i + 1; j < cardBounds.length; j += 1) {
      expect(rectsOverlap(cardBounds[i], cardBounds[j])).toBe(false);
    }
  }

  expectLabelInsideArea(initialSnapshot?.playHandButtonMetrics);
  expectLabelInsideArea(initialSnapshot?.nextRoundButtonMetrics);
  expect(rectsOverlap(initialSnapshot?.playHandButtonFrameBounds, initialSnapshot?.nextRoundButtonFrameBounds)).toBe(false);
  expectRectInside(initialSnapshot?.layout.boardFrameBounds, contentFrame);
  expectRectInside(initialSnapshot?.layout.boardRenderBounds, contentFrame);

  const firstCardBounds = initialSnapshot?.cardFrameBounds[initialSnapshot?.hand[0]?.id ?? ""];
  await clickCanvasAt(page, canvas, centerOf(firstCardBounds).x, centerOf(firstCardBounds).y, { designSpace: true });
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.selectedCardIds)).toHaveLength(1);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.canPlayHand)).toBe(true);

  const playButtonBounds = (await readDebugSnapshot(page))?.balatroLite?.playHandButtonFrameBounds;
  await clickCanvasAt(page, canvas, centerOf(playButtonBounds).x, centerOf(playButtonBounds).y, { designSpace: true });
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.phase)).toBe("result");
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.selectedCardIds)).toEqual([]);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.lastScore?.total ?? 0)).toBeGreaterThan(0);
  const lastScore = (await readDebugSnapshot(page))?.balatroLite?.lastScore;
  expect(lastScore?.baseChips).toBeGreaterThan(0);
  expect(lastScore?.mult).toBeGreaterThan(0);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.cumulativeScore ?? 0)).toBe(lastScore?.total);
  await expect.poll(() => readDebugSnapshot(page).then((snapshot) => snapshot?.balatroLite?.canNextRound)).toBe(true);
  const resultSnapshot = (await readDebugSnapshot(page))?.balatroLite;
  expectLabelInsideArea(resultSnapshot?.playHandButtonMetrics);
  expectLabelInsideArea(resultSnapshot?.nextRoundButtonMetrics);
  expect(rectsOverlap(resultSnapshot?.playHandButtonFrameBounds, resultSnapshot?.nextRoundButtonFrameBounds)).toBe(false);

  const nextRoundButtonBounds = (await readDebugSnapshot(page))?.balatroLite?.nextRoundButtonFrameBounds;
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
