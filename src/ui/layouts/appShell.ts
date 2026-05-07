import { Container, Graphics } from "pixi.js";
import type { SurfaceLayout } from "../../runtime/scene";
import { pixiTo } from "../../runtime/motion";
import { tokenValue } from "../../runtime/surface";
import { containsBounds, createButton, readButtonBounds, type ButtonPrimitive, type UiBounds } from "../button";
import { createBlockingPanel } from "../blockingPanel";
import { createBottomSheetHandle } from "../bottomSheetHandle";
import { createLabel } from "../label";
import { surfaceTheme } from "../tokens";

export type AppShellSheet = "none" | "controls" | "debug";

export type AppShell = Container & {
  topBar: Container;
  topBarLeft: Container;
  topBarCenter: Container;
  topBarRight: Container;
  contentHost: Container;
  bottomBar: Container;
  bottomSheetHost: Container;
  buttons: {
    back?: ButtonPrimitive;
    controls: ButtonPrimitive;
    debug?: ButtonPrimitive;
    closeSheet?: ButtonPrimitive;
    sheetActions: Record<string, ButtonPrimitive>;
  };
  frames: {
    topBar: RectFrame;
    content: RectFrame;
    bottomBar: RectFrame;
    sheet: RectFrame;
  };
  activeSheet: AppShellSheet;
};

export type RectFrame = UiBounds;

export type AppShellButtonBounds = {
  activeSheet: AppShellSheet;
  sheet: RectFrame;
  back?: RectFrame;
  controls: RectFrame;
  debug?: RectFrame;
  close?: RectFrame;
  actions: Record<string, RectFrame>;
};

export type AppShellHit =
  | { kind: "back" }
  | { kind: "controls" }
  | { kind: "debug" }
  | { kind: "close" }
  | { kind: "sheet" }
  | { kind: "action"; id: string };

type AppShellOptions = {
  title: string;
  titleLabel?: string;
  showBack?: boolean;
  showDebug?: boolean;
  activeSheet?: AppShellSheet;
  sheetTitle?: string;
  sheetLines?: string[];
  sheetActions?: Array<{ id: string; label: string }>;
};

export function createAppShell(
  layout: SurfaceLayout,
  options: AppShellOptions,
): AppShell {
  const safeFrame = getScaffoldFrame(layout);
  const gap = tokenValue(layout, surfaceTheme.spacing.sm);
  const showDebug = options.showDebug ?? true;
  const activeSheet = options.activeSheet ?? "none";
  const visibleSheet = showDebug || activeSheet !== "debug" ? activeSheet : "none";
  const topBarHeight = tokenValue(layout, { design: 96, minScreenPx: 52 });
  const bottomBarHeight = tokenValue(layout, { design: 104, minScreenPx: 56 });
  const sheetHeight =
    visibleSheet === "none" ? 0 : Math.min(safeFrame.height * 0.68, tokenValue(layout, { design: 1080, minScreenPx: 420 }));
  const topBarFrame = {
    x: safeFrame.x,
    y: safeFrame.y,
    width: safeFrame.width,
    height: topBarHeight,
  };
  const bottomBarFrame = {
    x: safeFrame.x,
    y: safeFrame.y + safeFrame.height - bottomBarHeight,
    width: safeFrame.width,
    height: bottomBarHeight,
  };
  const sheetFrame = {
    x: safeFrame.x,
    y: safeFrame.y + safeFrame.height - sheetHeight,
    width: safeFrame.width,
    height: sheetHeight,
  };
  const contentFrame = {
    x: safeFrame.x,
    y: topBarFrame.y + topBarFrame.height + gap,
    width: safeFrame.width,
    height: Math.max(0, bottomBarFrame.y - (topBarFrame.y + topBarFrame.height) - gap * 2),
  };
  const shell = new Container({ label: "app-shell" }) as AppShell;
  shell.activeSheet = visibleSheet;
  shell.frames = {
    topBar: topBarFrame,
    content: contentFrame,
    bottomBar: bottomBarFrame,
    sheet: sheetFrame,
  };

  const buttons: AppShell["buttons"] = {
    controls: createShellButton("Controls", layout),
    debug: showDebug ? createShellButton("Debug", layout) : undefined,
    sheetActions: {},
  };

  const topBar = createTopBar(layout, topBarFrame, options, buttons);

  const contentHost = new Container({ label: "content-host" });
  contentHost.position.set(contentFrame.x, contentFrame.y);
  contentHost.layout = {
    width: contentFrame.width,
    height: contentFrame.height,
    flexDirection: "column",
    gap,
  };

  const bottomBar = createBottomBar(layout, bottomBarFrame, buttons);

  const bottomSheetHost = createBottomSheetHost(layout, sheetFrame, {
    ...options,
    activeSheet: visibleSheet,
  });
  if (bottomSheetHost.closeButton) buttons.closeSheet = bottomSheetHost.closeButton;
  buttons.sheetActions = bottomSheetHost.actions;

  shell.topBar = topBar;
  shell.topBarLeft = topBar.getChildByLabel("top-bar-left") as Container;
  shell.topBarCenter = topBar.getChildByLabel("top-bar-center") as Container;
  shell.topBarRight = topBar.getChildByLabel("top-bar-right") as Container;
  shell.contentHost = contentHost;
  shell.bottomBar = bottomBar;
  shell.bottomSheetHost = bottomSheetHost.host;
  shell.buttons = buttons;
  shell.addChild(topBar, contentHost, bottomBar, bottomSheetHost.host);
  return shell;
}

export function readAppShellButtonBounds(layout: SurfaceLayout, shell: AppShell): AppShellButtonBounds {
  return {
    activeSheet: shell.activeSheet,
    sheet: shell.frames.sheet,
    back: shell.buttons.back ? readButtonBounds(layout, shell.buttons.back) : undefined,
    controls: readButtonBounds(layout, shell.buttons.controls),
    debug: shell.buttons.debug ? readButtonBounds(layout, shell.buttons.debug) : undefined,
    close: shell.buttons.closeSheet ? readButtonBounds(layout, shell.buttons.closeSheet) : undefined,
    actions: Object.fromEntries(
      Object.entries(shell.buttons.sheetActions).map(([id, button]) => [id, readButtonBounds(layout, button)]),
    ),
  };
}

export function resolveAppShellHit(bounds: AppShellButtonBounds, position: { x: number; y: number }): AppShellHit | undefined {
  const action = Object.entries(bounds.actions).find(([, actionBounds]) => containsBounds(actionBounds, position))?.[0];
  if (action) return { kind: "action", id: action };
  if (bounds.close && containsBounds(bounds.close, position)) return { kind: "close" };
  if (bounds.activeSheet !== "none" && containsBounds(bounds.sheet, position)) return { kind: "sheet" };
  if (bounds.back && containsBounds(bounds.back, position)) return { kind: "back" };
  if (containsBounds(bounds.controls, position)) return { kind: "controls" };
  if (bounds.debug && containsBounds(bounds.debug, position)) return { kind: "debug" };
  return undefined;
}

function getScaffoldFrame(layout: SurfaceLayout): RectFrame {
  return {
    x: layout.safeArea.left,
    y: layout.safeArea.top,
    width: layout.visibleWidth - layout.safeArea.left - layout.safeArea.right,
    height: layout.visibleHeight - layout.safeArea.top - layout.safeArea.bottom,
  };
}

function createTopBar(
  layout: SurfaceLayout,
  frame: RectFrame,
  options: AppShellOptions,
  buttons: AppShell["buttons"],
): Container {
  const gap = tokenValue(layout, surfaceTheme.spacing.sm);
  const slotWidth = tokenValue(layout, { design: 188, minScreenPx: 96 });
  const bar = new Container({ label: "top-bar" });
  bar.position.set(frame.x, frame.y);
  bar.layout = {
    width: frame.width,
    height: frame.height,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap,
  };

  const background = new Graphics()
    .rect(0, 0, frame.width, frame.height)
    .fill({ color: 0x0b1220, alpha: 1 })
    .stroke({ color: surfaceTheme.color.actionAccent, width: Math.max(1, 2 / layout.scale), alpha: 0.24 });
  background.label = "top-bar-background";

  const left = new Container({ label: "top-bar-left" });
  left.layout = {
    width: slotWidth,
    height: frame.height,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  };
  if (options.showBack) {
    buttons.back = createShellButton("Back", layout);
    left.addChild(buttons.back);
  }

  const center = new Container({ label: "top-bar-center" });
  center.layout = {
    height: frame.height,
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  };
  const title = createLabel({
    text: options.title,
    layout,
    fontSize: surfaceTheme.typography.title,
    color: surfaceTheme.color.text,
    label: options.titleLabel ?? "top-bar-title",
  });
  title.layout = {
    height: frame.height,
  };
  center.addChild(title);

  const right = new Container({ label: "top-bar-right" });
  right.layout = {
    width: slotWidth,
    height: frame.height,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  };

  bar.addChild(background, left, center, right);
  return bar;
}

function createBottomBar(layout: SurfaceLayout, frame: RectFrame, buttons: AppShell["buttons"]): Container {
  const gap = tokenValue(layout, surfaceTheme.spacing.sm);
  const sidePadding = tokenValue(layout, surfaceTheme.spacing.sm);
  const bar = new Container({ label: "bottom-bar" });
  bar.position.set(frame.x, frame.y);
  bar.layout = {
    width: frame.width,
    height: frame.height,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap,
  };
  const background = new Graphics()
    .rect(0, 0, frame.width, frame.height)
    .fill({ color: 0x0b1220, alpha: 1 })
    .stroke({ color: surfaceTheme.color.actionAccent, width: Math.max(1, 2 / layout.scale), alpha: 0.24 });
  background.label = "bottom-bar-background";

  const left = new Container({ label: "bottom-bar-left" });
  left.layout = {
    width: (frame.width - sidePadding * 2 - gap) / 2,
    height: frame.height,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  };
  const right = new Container({ label: "bottom-bar-right" });
  right.layout = {
    width: (frame.width - sidePadding * 2 - gap) / 2,
    height: frame.height,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  };

  left.addChild(buttons.controls);
  if (buttons.debug) right.addChild(buttons.debug);
  bar.addChild(background, left, right);
  return bar;
}

function createBottomSheetHost(
  layout: SurfaceLayout,
  frame: RectFrame,
  options: {
    activeSheet?: AppShellSheet;
    sheetTitle?: string;
    sheetLines?: string[];
    sheetActions?: Array<{ id: string; label: string }>;
  },
): { host: Container; closeButton?: ButtonPrimitive; actions: Record<string, ButtonPrimitive> } {
  const host = new Container({ label: "bottom-sheet-host" });
  host.position.set(frame.x, frame.y);
  if ((options.activeSheet ?? "none") === "none") return { host, actions: {} };

  const sidePadding = tokenValue(layout, surfaceTheme.spacing.sm);
  const sectionGap = tokenValue(layout, surfaceTheme.spacing.xs);
  const bottomSheetPanel = createBlockingPanel(
    { x: 0, y: 0, width: frame.width, height: frame.height },
    {
      label: "bottom-sheet-panel",
      fillColor: 0x0b1220,
      fillAlpha: 1,
      strokeColor: surfaceTheme.color.actionAccent,
      strokeWidth: Math.max(1, 2 / layout.scale),
      strokeAlpha: 0.5,
      radius: tokenValue(layout, { design: 32, minScreenPx: 18 }),
    },
  );
  bottomSheetPanel.alpha = 0.88;

  const bottomSheetHandle = createBottomSheetHandle(layout, frame.width);
  const handleRowHeight = bottomSheetHandle.hitHeight;
  const handleRow = new Container({ label: "bottom-sheet-handle-row" });
  handleRow.position.set(0, tokenValue(layout, surfaceTheme.spacing.xs));
  handleRow.layout = {
    width: frame.width,
    height: handleRowHeight,
  };
  handleRow.addChild(bottomSheetHandle);

  const title = createLabel({
    text: options.sheetTitle ?? "Controls",
    layout,
    fontSize: surfaceTheme.typography.body,
    color: surfaceTheme.color.text,
    label: "bottom-sheet-title",
  });
  title.layout = {
    height: tokenValue(layout, { design: 58, minScreenPx: 32 }),
  };

  const closeButton = createShellButton("Close", layout);
  closeButton.label = "bottom-sheet-close";

  const header = new Container({ label: "bottom-sheet-header" });
  const headerHeight = tokenValue(layout, { design: 96, minScreenPx: 54 });
  header.position.set(sidePadding, handleRow.y + handleRowHeight);
  header.layout = {
    width: frame.width - sidePadding * 2,
    height: headerHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokenValue(layout, surfaceTheme.spacing.sm),
  };
  header.addChild(title, closeButton);

  const body = new Container({ label: "bottom-sheet-body" });
  body.position.set(sidePadding, header.y + headerHeight + sectionGap);

  let cursorY = 0;
  const contentWidth = frame.width - sidePadding * 2;
  for (const action of options.sheetActions ?? []) {
    const button = createSheetActionButton(action.label, layout, contentWidth);
    button.label = `bottom-sheet-action:${action.id}`;
    button.position.set(0, cursorY);
    body.addChild(button);
    cursorY += button.height + sectionGap;
  }

  for (const line of options.sheetLines ?? []) {
    const label = createLabel({
      text: line,
      layout,
      fontSize: surfaceTheme.typography.caption,
      color: surfaceTheme.color.text,
      weight: "500",
      label: "bottom-sheet-line",
    });
    const lineHeight = tokenValue(layout, { design: 40, minScreenPx: 24 });
    label.position.set(0, cursorY);
    label.layout = {
      width: contentWidth,
      height: lineHeight,
    };
    body.addChild(label);
    cursorY += lineHeight + tokenValue(layout, surfaceTheme.spacing.xs);
  }

  bottomSheetPanel.content.addChild(handleRow, header, body);
  host.addChild(bottomSheetPanel);
  pixiTo(bottomSheetPanel, {
    pixi: { alpha: 1 },
    duration: 0.16,
    ease: "sine.out",
  });
  const actions: Record<string, ButtonPrimitive> = {};
  for (const child of body.children) {
    if (child.label?.startsWith("bottom-sheet-action:")) {
      actions[child.label.slice("bottom-sheet-action:".length)] = child as ButtonPrimitive;
    }
  }
  return { host, closeButton, actions };
}

function createShellButton(text: string, layout: SurfaceLayout): ButtonPrimitive {
  const height = tokenValue(layout, { design: 72, minScreenPx: 48 });
  const width = Math.max(tokenValue(layout, { design: 188, minScreenPx: 96 }), text.length * tokenValue(layout, { design: 22, minScreenPx: 12 }));
  const button = createButton({
    text,
    width,
    height,
    layout,
    fontSize: surfaceTheme.typography.caption,
    fill: 0x0f766e,
    stroke: surfaceTheme.color.actionAccent,
    textColor: surfaceTheme.color.text,
  });
  button.layout = {
    width,
    height,
  };
  return button;
}


function createSheetActionButton(text: string, layout: SurfaceLayout, width: number): ButtonPrimitive {
  const height = tokenValue(layout, { design: 64, minScreenPx: 42 });
  const button = createButton({
    text,
    width,
    height,
    layout,
    fontSize: surfaceTheme.typography.caption,
    fill: 0x0f766e,
    stroke: surfaceTheme.color.actionAccent,
    textColor: surfaceTheme.color.text,
  });
  button.layout = {
    width,
    height,
  };
  return button;
}
