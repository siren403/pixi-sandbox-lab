import { Container, Graphics } from "pixi.js";
import type { SurfaceLayout } from "../../runtime/scene";
import { navigateToSceneIndex } from "../../runtime/navigation";
import { scene } from "../../runtime/scene";
import { tokenValue } from "../../runtime/surface";
import {
  containsBounds,
  createButton,
  type ButtonPrimitive,
  type UiBounds,
} from "../../ui/button";
import { createLabel } from "../../ui/label";
import {
  createAppShell,
  readAppShellFrameBounds,
  readAppShellButtonBounds,
  resolveAppShellHit,
  type AppShell,
  type AppShellButtonBounds,
  type AppShellSheet,
} from "../../ui/layouts/appShell";
import {
  attachFrame,
  collectLayoutViolations,
  readFrameBounds,
  readRenderBounds,
} from "../../ui/layoutFrames";
import { surfaceTheme } from "../../ui/tokens";
import {
  clearBalatroLiteDebugState,
  setBalatroLiteDebugState,
  type PixiBalatroLiteDebugState,
  type PixiSampleAppShellDebugState,
} from "../../debug/stateBridge";
import {
  canAdvanceRound,
  canPlayHand,
  createGame,
  dealNextRound,
  formatCardLabel,
  playSelectedHand,
  toggleCardSelection,
  type BalatroCard,
  type BalatroLiteGameState,
} from "./rules";

const defaultSeed = 24681357;

type RectState = UiBounds;

type SceneArgs = {
  seed?: number;
};

let game: BalatroLiteGameState = createGame(defaultSeed);
let removeScene: (() => void) | null = null;
let activeSheet: AppShellSheet = "none";
let layoutBoundsEnabled = false;
let cardHitTargets: Record<string, RectState> = {};
let cardRenderBounds: Record<string, RectState> = {};
let playHandButtonFrameBounds: RectState = { x: 0, y: 0, width: 0, height: 0 };
let playHandButtonBounds: RectState = { x: 0, y: 0, width: 0, height: 0 };
let nextRoundButtonFrameBounds: RectState = { x: 0, y: 0, width: 0, height: 0 };
let nextRoundButtonBounds: RectState = { x: 0, y: 0, width: 0, height: 0 };
let appShellButtons: AppShellButtonBounds = {
  activeSheet: "none",
  sheet: { x: 0, y: 0, width: 0, height: 0 },
  controls: { x: 0, y: 0, width: 0, height: 0 },
  actions: {},
};

export const balatroLiteScene = scene({
  name: "balatro-lite",

  load({ app, layers, layout, scene }) {
    game = createGame(scene.args<SceneArgs>()?.seed ?? defaultSeed);
    activeSheet = "none";
    renderScene({ app, layers, layout });
    removeScene = null;
  },

  resize({ app, layers, layout }) {
    renderScene({ app, layers, layout });
  },

  update(_dt, { input, layers, layout, app }) {
    const { keyboard, pointer } = input;
    const pointerPressed = pointer.wasPressed();
    if (pointerPressed) {
      const shellHit = resolveAppShellHit(appShellButtons, pointer.position());
      if (shellHit?.kind === "back") {
        navigateToSceneIndex();
        return;
      }
      if (shellHit?.kind === "controls") {
        activeSheet = activeSheet === "controls" ? "none" : "controls";
        renderScene({ app, layers, layout });
        return;
      }
      if (shellHit?.kind === "debug") {
        activeSheet = activeSheet === "debug" ? "none" : "debug";
        renderScene({ app, layers, layout });
        return;
      }
      if (shellHit?.kind === "close") {
        activeSheet = "none";
        renderScene({ app, layers, layout });
        return;
      }
      if (shellHit?.kind === "sheet") return;
      if (shellHit?.kind === "action") {
        if (shellHit.id === "scene-index") {
          navigateToSceneIndex();
          return;
        }
        if (shellHit.id === "layout-toggle") {
          layoutBoundsEnabled = !layoutBoundsEnabled;
          window.dispatchEvent(
            new CustomEvent("pixi:layout-debug-set", {
              detail: layoutBoundsEnabled ? { enabled: true, mode: "bounds", filter: "all" } : { enabled: false },
            }),
          );
          renderScene({ app, layers, layout });
          return;
        }
        if (shellHit.id === "reload") {
          window.location.reload();
          return;
        }
      }
    }

    if (pointerPressed) {
      const position = pointer.position();
      if (canPlayHand(game) && containsBounds(playHandButtonFrameBounds, position)) {
        game = playSelectedHand(game);
        renderScene({ app, layers, layout });
        return;
      }
      if (canAdvanceRound(game) && containsBounds(nextRoundButtonFrameBounds, position)) {
        game = dealNextRound(game);
        renderScene({ app, layers, layout });
        return;
      }
      const cardId = Object.entries(cardHitTargets).find(([, bounds]) => containsBounds(bounds, position))?.[0];
      if (cardId) {
        game = toggleCardSelection(game, cardId);
        renderScene({ app, layers, layout });
        return;
      }
    }

    if (keyboard.wasPressed("enter") && canPlayHand(game)) {
      game = playSelectedHand(game);
      renderScene({ app, layers, layout });
      return;
    }
    if ((keyboard.wasPressed(" ") || keyboard.wasPressed("n")) && canAdvanceRound(game)) {
      game = dealNextRound(game);
      renderScene({ app, layers, layout });
    }
  },

  unload({ layers }) {
    removeScene?.();
    removeScene = null;
    clearLayer(layers.ui);
    clearBalatroLiteDebugState();
  },
});

function renderScene({
  app,
  layers,
  layout,
}: {
  app: { screen: { width: number; height: number }; renderer: { layout: { update: (container: Container) => void } } };
  layers: { ui: Container };
  layout: SurfaceLayout;
}): void {
  clearLayer(layers.ui);

  const root = new Container({ label: "balatro-lite-root" });
  const backdrop = new Graphics().rect(0, 0, layout.visibleWidth, layout.visibleHeight).fill("#0f1f19");
  backdrop.label = "balatro-lite-backdrop";

  const shell = createAppShell(layout, {
    title: "Balatro-lite v0",
    titleLabel: "balatro-lite-title",
    showBack: true,
    showDebug: true,
    activeSheet,
    sheetTitle: activeSheet === "debug" ? "Debug" : "Controls",
    sheetLines:
      activeSheet === "debug"
        ? ["Debug actions run inside the Pixi app shell.", layoutBoundsEnabled ? "Layout bounds are visible." : "Layout bounds are hidden."]
        : ["Select up to 5 cards.", "Play Hand scores the selected cards.", "Next Round redraws a seeded hand."],
    sheetActions:
      activeSheet === "debug"
        ? [
            { id: "scene-index", label: "Back to Samples" },
            { id: "layout-toggle", label: layoutBoundsEnabled ? "Hide Layout Bounds" : "Show Layout Bounds" },
            { id: "reload", label: "Reload" },
          ]
        : [],
  });

  const contentFrame = shell.frames.content;
  const board = new Container({ label: "balatro-lite-board" });
  attachFrame(board, {
    id: "balatro-lite-board",
    role: "board",
    frameBounds: rectAt(contentFrame, 0, 0, contentFrame.width, contentFrame.height),
  });

  const panel = new Graphics()
    .rect(0, 0, contentFrame.width, contentFrame.height)
    .fill({ color: 0x10261f, alpha: 0.96 });
  panel.label = "balatro-lite-panel";

  const padding = token(layout, 22);
  const gap = token(layout, 16);
  const contentWidth = contentFrame.width;
  const contentHeight = contentFrame.height;
  const compactStats = contentWidth < token(layout, 720);
  const statsColumns = compactStats ? 2 : 4;
  const statCellHeight = compactStats ? token(layout, 40) : token(layout, 34);
  const selectedLabelHeight = token(layout, 34);
  const statCellGap = gap;
  const statsRowCount = Math.ceil(4 / statsColumns);
  const statsGridHeight = statsRowCount * statCellHeight + Math.max(0, statsRowCount - 1) * statCellGap;
  const statsHeight = statsGridHeight + gap + selectedLabelHeight;
  const actionHeight = tokenValue(layout, surfaceTheme.components.buttonPrimary.height);
  const cardGap = token(layout, 14);
  const grid = resolveCardGrid({
    contentWidth,
    contentHeight,
    padding,
    gap,
    cardGap,
    statsHeight,
    actionHeight,
    cardCount: game.hand.length,
  });
  const availableWidth = Math.max(0, contentWidth - padding * 2);
  const gridX = padding + Math.max(0, (availableWidth - grid.gridWidth) / 2);
  const statsBlock = new Container({ label: "balatro-lite-stats" });
  statsBlock.position.set(padding, padding);
  attachFrame(statsBlock, {
    id: "balatro-lite-stats",
    role: "stats-block",
    frameBounds: rectAt(contentFrame, padding, padding, availableWidth, statsHeight),
  });

  const statItems = [
    { id: "round", text: `Round ${game.round}`, label: "balatro-lite-round-label", fontSize: surfaceTheme.typography.body },
    { id: "score", text: `Score ${game.cumulativeScore} / Last ${game.lastScore?.total ?? "-"}`, label: "balatro-lite-score-label", fontSize: surfaceTheme.typography.body },
    { id: "phase", text: `Phase ${game.phase}`, label: "balatro-lite-phase-label", fontSize: surfaceTheme.typography.caption },
    { id: "deck", text: `Deck ${game.deck.length}`, label: "balatro-lite-deck-label", fontSize: surfaceTheme.typography.caption },
  ] as const;
  const statCellWidth = compactStats ? Math.max(0, (availableWidth - statCellGap) / 2) : Math.max(0, (availableWidth - statCellGap * 3) / 4);

  for (const [index, item] of statItems.entries()) {
    const column = index % statsColumns;
    const row = Math.floor(index / statsColumns);
    const cellX = column * (statCellWidth + statCellGap);
    const cellY = row * (statCellHeight + statCellGap);
    const cell = new Container({ label: `balatro-lite-stat-${item.id}` });
    cell.position.set(cellX, cellY);
    attachFrame(cell, {
      id: `balatro-lite-stat-${item.id}`,
      role: "stat-cell",
      frameBounds: rectAt(contentFrame, padding + cellX, padding + cellY, statCellWidth, statCellHeight),
    });
    const label = createLabel({
      text: item.text,
      layout,
      fontSize: item.fontSize,
      color: surfaceTheme.color.text,
      label: item.label,
      autoFit: {
        maxWidth: statCellWidth,
        maxHeight: statCellHeight,
        minFontSize: Math.min(tokenValue(layout, surfaceTheme.typography.caption), 10 / layout.scale),
      },
    });
    label.position.set(0, 0);
    cell.addChild(label);
    statsBlock.addChild(cell);
  }

  const selectedLabel = createLabel({
    text: game.selectedCardIds.length > 0 ? `Selected ${game.selectedCardIds.length}/5` : "Select up to 5 cards",
    layout,
    fontSize: surfaceTheme.typography.caption,
    color: surfaceTheme.color.actionAccent,
    label: "balatro-lite-selected-label",
    autoFit: {
      maxWidth: availableWidth,
      maxHeight: selectedLabelHeight,
      minFontSize: Math.min(tokenValue(layout, surfaceTheme.typography.caption), 10 / layout.scale),
    },
  });
  selectedLabel.position.set(0, statsGridHeight + gap);
  attachFrame(selectedLabel, {
    id: "balatro-lite-selected-label",
    role: "selected-label",
    frameBounds: rectAt(contentFrame, padding, padding + statsGridHeight + gap, availableWidth, selectedLabelHeight),
  });
  statsBlock.addChild(selectedLabel);

  const handContainer = new Container({ label: "balatro-lite-hand" });
  const handY = padding + statsHeight + gap;
  handContainer.position.set(0, handY);
  attachFrame(handContainer, {
    id: "balatro-lite-hand",
    role: "hand",
    frameBounds: rectAt(contentFrame, 0, handY, contentWidth, grid.gridHeight),
  });

  const cards = game.hand.slice(0, 8).map((card, index) => createCardButton(card, layout, game, grid.cardWidth, grid.cardHeight));
  for (const [index, cardButton] of cards.entries()) {
    const column = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    const x = gridX + column * (grid.cardWidth + cardGap);
    const y = row * (grid.cardHeight + cardGap);
    cardButton.position.set(x, y);
    attachFrame(cardButton, {
      id: cardButton.label ?? `balatro-card:${index}`,
      role: "card",
      frameBounds: rectAt(contentFrame, x, handY + y, grid.cardWidth, grid.cardHeight),
    });
    handContainer.addChild(cardButton);
  }

  const emptyStateLabel =
    cards.length === 0
      ? createLabel({
          text: "No cards left in the deck.",
          layout,
          fontSize: surfaceTheme.typography.body,
          color: surfaceTheme.color.text,
          label: "balatro-lite-empty-state",
        })
      : null;
  if (emptyStateLabel) {
    emptyStateLabel.position.set(padding, handContainer.y + token(layout, 16));
    handContainer.addChild(emptyStateLabel);
  }

  const actionRow = new Container({ label: "balatro-lite-actions" });
  const actionY = handY + grid.gridHeight + gap;
  actionRow.position.set(padding, actionY);
  attachFrame(actionRow, {
    id: "balatro-lite-actions",
    role: "actions",
    frameBounds: rectAt(contentFrame, padding, actionY, availableWidth, actionHeight),
  });

  const actionButtonWidth = Math.max(0, Math.min((availableWidth - gap) / 2, token(layout, 280)));
  const playHandButton = createButton({
    text: canPlayHand(game) ? "Play Hand" : "Select Cards",
    width: actionButtonWidth,
    height: actionHeight,
    layout,
    fontSize: surfaceTheme.components.buttonPrimary.typography,
    fill: canPlayHand(game) ? 0x0f766e : 0x334155,
    stroke: canPlayHand(game) ? surfaceTheme.color.actionAccent : "#64748b",
    textColor: surfaceTheme.color.text,
  });
  playHandButton.label = "balatro-play-hand";
  playHandButton.layout = {
    width: actionButtonWidth,
    height: actionHeight,
  };
  playHandButton.position.set(0, 0);
  const nextRoundButton = createButton({
    text: canAdvanceRound(game) ? "Next Round" : "Waiting",
    width: actionButtonWidth,
    height: actionHeight,
    layout,
    fontSize: surfaceTheme.components.buttonPrimary.typography,
    fill: canAdvanceRound(game) ? 0x1d4ed8 : 0x334155,
    stroke: canAdvanceRound(game) ? surfaceTheme.color.actionAccent : "#64748b",
    textColor: surfaceTheme.color.text,
  });
  nextRoundButton.label = "balatro-next-round";
  nextRoundButton.layout = {
    width: actionButtonWidth,
    height: actionHeight,
  };
  nextRoundButton.position.set(actionButtonWidth + gap, 0);
  attachFrame(playHandButton, {
    id: "balatro-play-hand",
    role: "action-button",
    frameBounds: rectAt(contentFrame, actionRow.x + playHandButton.x, actionRow.y + playHandButton.y, actionButtonWidth, actionHeight),
  });
  attachFrame(nextRoundButton, {
    id: "balatro-next-round",
    role: "action-button",
    frameBounds: rectAt(
      contentFrame,
      actionRow.x + nextRoundButton.x,
      actionRow.y + nextRoundButton.y,
      actionButtonWidth,
      actionHeight,
    ),
  });
  actionRow.addChild(playHandButton, nextRoundButton);

  board.addChild(panel, statsBlock, handContainer, actionRow);
  shell.contentHost.addChild(board);
  root.addChild(backdrop, shell);
  layers.ui.addChild(root);
  app.renderer.layout.update(root);
  syncDebugState(layout, shell, cards, playHandButton, nextRoundButton, statsBlock, handContainer, actionRow, board, app.screen.width, app.screen.height);
}

function createCardButton(
  card: BalatroCard,
  layout: SurfaceLayout,
  state: BalatroLiteGameState,
  width: number,
  height: number,
): ReturnType<typeof createButton> {
  const selected = state.selectedCardIds.includes(card.id);
  const button = createButton({
    text: formatCardLabel(card),
    width,
    height,
    layout,
    fontSize: surfaceTheme.typography.body,
    fill: selected ? 0x0f766e : 0x0f172a,
    stroke: selected ? surfaceTheme.color.actionAccent : "#334155",
    textColor: card.suit === "hearts" || card.suit === "diamonds" ? "#fecaca" : surfaceTheme.color.text,
  });
  button.label = `balatro-card:${card.id}`;
  button.layout = {
    width,
    height,
  };
  return button;
}

function syncDebugState(
  layout: SurfaceLayout,
  shell: AppShell,
  cardButtons: Array<ButtonPrimitive>,
  playHandButton: ButtonPrimitive,
  nextRoundButton: ButtonPrimitive,
  statsBlock: Container,
  handContainer: Container,
  actionRow: Container,
  board: Container,
  canvasWidth: number,
  canvasHeight: number,
): void {
  appShellButtons = readAppShellButtonBounds(layout, shell);
  const appShellFrames = readAppShellFrameBounds(layout, shell);
  const selectedCardIds = game.selectedCardIds.slice();
  const hand = game.hand.map((card) => ({
    id: card.id,
    rank: String(card.rank),
    suit: card.suit,
    label: formatCardLabel(card),
    selected: selectedCardIds.includes(card.id),
  }));

  cardHitTargets = Object.fromEntries(
    cardButtons.map((button) => [button.label?.slice("balatro-card:".length) ?? "", readFrameBounds(button)]),
  ) as Record<string, RectState>;
  cardRenderBounds = Object.fromEntries(
    cardButtons.map((button) => [button.label?.slice("balatro-card:".length) ?? "", readRenderBounds(layout, button)]),
  ) as Record<string, RectState>;
  playHandButtonFrameBounds = readFrameBounds(playHandButton);
  playHandButtonBounds = readRenderBounds(layout, playHandButton);
  nextRoundButtonFrameBounds = readFrameBounds(nextRoundButton);
  nextRoundButtonBounds = readRenderBounds(layout, nextRoundButton);

  const statGroupIds = [
    "balatro-lite-stat-round",
    "balatro-lite-stat-score",
    "balatro-lite-stat-phase",
    "balatro-lite-stat-deck",
    "balatro-lite-selected-label",
  ];
  const cardGroupIds = Object.keys(cardHitTargets).map((cardId) => `balatro-card:${cardId}`);
  const layoutViolations = collectLayoutViolations(layout, [
    shell.contentHost,
    board,
    statsBlock,
    ...(statsBlock.children as Array<Container>),
    handContainer,
    actionRow,
    ...cardButtons,
    playHandButton,
    nextRoundButton,
  ], {
    parentFrameBounds: shell.frames.content,
    overlapGroups: [
      { id: "stats", nodeIds: statGroupIds },
      { id: "actions", nodeIds: ["balatro-play-hand", "balatro-next-round"] },
      { id: "cards", nodeIds: cardGroupIds },
    ],
  });

  const debugState: PixiBalatroLiteDebugState = {
    scene: "balatro-lite",
    rendered: layout.visibleWidth > 0 && layout.visibleHeight > 0,
    seed: game.seed,
    round: game.round,
    phase: game.phase,
    deckRemaining: game.deck.length,
    hand,
    selectedCardIds,
    canPlayHand: canPlayHand(game),
    canNextRound: canAdvanceRound(game),
    lastScore: game.lastScore,
    cumulativeScore: game.cumulativeScore,
    cardFrameBounds: cardHitTargets,
    cardRenderBounds,
    cardBounds: cardRenderBounds,
    playHandButtonFrameBounds,
    playHandButtonBounds,
    nextRoundButtonFrameBounds,
    nextRoundButtonBounds,
    playHandButtonMetrics: playHandButton.metrics,
    nextRoundButtonMetrics: nextRoundButton.metrics,
    appShell: {
      activeSheet: appShellButtons.activeSheet,
      topBarFrameBounds: appShellFrames.topBarFrameBounds,
      topBarRenderBounds: appShellFrames.topBarRenderBounds,
      contentFrameBounds: appShellFrames.contentFrameBounds,
      contentRenderBounds: appShellFrames.contentRenderBounds,
      bottomBarFrameBounds: appShellFrames.bottomBarFrameBounds,
      bottomBarRenderBounds: appShellFrames.bottomBarRenderBounds,
      sheetFrameBounds: appShellFrames.sheetFrameBounds,
      sheetRenderBounds: appShellFrames.sheetRenderBounds,
      sheetBounds: appShellFrames.sheetFrameBounds,
      backButtonBounds: appShellButtons.back,
      controlsButtonBounds: appShellButtons.controls,
      debugButtonBounds: appShellButtons.debug,
      closeButtonBounds: appShellButtons.close,
      actionButtonBounds: appShellButtons.actions,
    } satisfies PixiSampleAppShellDebugState,
    layout: {
      canvasWidth,
      canvasHeight,
      viewportWidth: layout.viewportWidth,
      viewportHeight: layout.viewportHeight,
      visibleWidth: layout.visibleWidth,
      visibleHeight: layout.visibleHeight,
      contentFrameBounds: readFrameBounds(shell.contentHost),
      contentRenderBounds: readRenderBounds(layout, shell.contentHost),
      statsFrameBounds: readFrameBounds(statsBlock),
      statsRenderBounds: readRenderBounds(layout, statsBlock),
      handFrameBounds: readFrameBounds(handContainer),
      handRenderBounds: readRenderBounds(layout, handContainer),
      actionRowFrameBounds: readFrameBounds(actionRow),
      actionRowRenderBounds: readRenderBounds(layout, actionRow),
      boardFrameBounds: readFrameBounds(board),
      boardRenderBounds: readRenderBounds(layout, board),
      layoutViolations,
    },
  };

  setBalatroLiteDebugState(debugState);
}

function resolveCardGrid({
  contentWidth,
  contentHeight,
  padding,
  gap,
  cardGap,
  statsHeight,
  actionHeight,
  cardCount,
}: {
  contentWidth: number;
  contentHeight: number;
  padding: number;
  gap: number;
  cardGap: number;
  statsHeight: number;
  actionHeight: number;
  cardCount: number;
}): { columns: number; rows: number; cardWidth: number; cardHeight: number; gridWidth: number; gridHeight: number } {
  const availableWidth = Math.max(0, contentWidth - padding * 2);
  const availableHeight = Math.max(0, contentHeight - padding * 2);
  const aspect = 1.42;
  const candidates = cardCount >= 8 ? [4, 2] : [Math.min(4, Math.max(1, cardCount))];

  for (const columns of candidates) {
    const rows = Math.ceil(cardCount / columns);
    const widthLimit = (availableWidth - cardGap * (columns - 1)) / columns;
    const heightLimit = (availableHeight - statsHeight - actionHeight - gap * 2 - cardGap * (rows - 1)) / rows;
    const cardWidth = Math.min(widthLimit, heightLimit / aspect);
    if (!(cardWidth > 0)) continue;

    const cardHeight = cardWidth * aspect;
    const gridWidth = cardWidth * columns + cardGap * (columns - 1);
    const gridHeight = cardHeight * rows + cardGap * (rows - 1);
    const totalHeight = statsHeight + gap + gridHeight + gap + actionHeight;
    if (gridWidth > availableWidth || totalHeight > availableHeight) continue;
    return { columns, rows, cardWidth, cardHeight, gridWidth, gridHeight };
  }

  const columns = candidates[0] ?? 4;
  const rows = Math.ceil(cardCount / columns);
  const widthLimit = (availableWidth - cardGap * (columns - 1)) / columns;
  const heightLimit = (availableHeight - statsHeight - actionHeight - gap * 2 - cardGap * (rows - 1)) / rows;
  const cardWidth = Math.max(0, Math.min(widthLimit, heightLimit / aspect));
  const cardHeight = cardWidth * aspect;
  return {
    columns,
    rows,
    cardWidth,
    cardHeight,
    gridWidth: cardWidth * columns + cardGap * (columns - 1),
    gridHeight: cardHeight * rows + cardGap * (rows - 1),
  };
}

function rectAt(base: RectState, x: number, y: number, width: number, height: number): RectState {
  return {
    x: base.x + x,
    y: base.y + y,
    width,
    height,
  };
}

function token(layout: SurfaceLayout, design: number): number {
  return tokenValue(layout, { design });
}

function clearLayer(layer: Container): void {
  for (const child of layer.removeChildren()) {
    child.destroy({ children: true });
  }
}
