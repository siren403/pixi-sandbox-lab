import { Container, Graphics } from "pixi.js";
import type { SurfaceLayout } from "../../runtime/scene";
import { tokenValue } from "../../runtime/surface";
import { createButton, type ButtonPrimitive } from "../button";
import { createLabel } from "../label";
import { getSafeAreaFrame } from "../layout";
import { surfaceTheme } from "../tokens";

export type AppShellSheet = "none" | "controls" | "debug";

export type AppShell = Container & {
  topBar: Container;
  contentHost: Container;
  bottomBar: Container;
  bottomSheetHost: Container;
  buttons: {
    back?: ButtonPrimitive;
    controls: ButtonPrimitive;
    debug: ButtonPrimitive;
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

export type RectFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function createAppShell(
  layout: SurfaceLayout,
  options: {
    title: string;
    titleLabel?: string;
    showBack?: boolean;
    activeSheet?: AppShellSheet;
    sheetTitle?: string;
    sheetLines?: string[];
    sheetActions?: Array<{ id: string; label: string }>;
  },
): AppShell {
  const safeFrame = getSafeAreaFrame(layout);
  const gap = tokenValue(layout, surfaceTheme.spacing.sm);
  const topBarHeight = tokenValue(layout, { design: 96, minScreenPx: 52 });
  const bottomBarHeight = tokenValue(layout, { design: 104, minScreenPx: 56 });
  const sheetHeight =
    options.activeSheet === "none" ? 0 : Math.min(safeFrame.height * 0.68, tokenValue(layout, { design: 1080, minScreenPx: 420 }));
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
  shell.activeSheet = options.activeSheet ?? "none";
  shell.frames = {
    topBar: topBarFrame,
    content: contentFrame,
    bottomBar: bottomBarFrame,
    sheet: sheetFrame,
  };

  const topBar = new Container({ label: "top-bar" });
  topBar.position.set(topBarFrame.x, topBarFrame.y);
  topBar.layout = {
    width: topBarFrame.width,
    height: topBarFrame.height,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap,
  };
  const topBarBackground = new Graphics()
    .roundRect(0, 0, topBarFrame.width, topBarFrame.height, tokenValue(layout, surfaceTheme.rounded.md))
    .fill({ color: 0x0b1220, alpha: 0.78 })
    .stroke({ color: surfaceTheme.color.actionAccent, width: Math.max(1, 2 / layout.scale), alpha: 0.24 });
  topBarBackground.label = "top-bar-background";

  const title = createLabel({
    text: options.title,
    layout,
    fontSize: surfaceTheme.typography.title,
    color: surfaceTheme.color.text,
    label: options.titleLabel ?? "top-bar-title",
  });
  title.layout = {
    height: topBarHeight,
    flexGrow: 1,
  };

  const buttons: AppShell["buttons"] = {
    controls: createShellButton("Controls", layout),
    debug: createShellButton("Debug", layout),
    sheetActions: {},
  };

  if (options.showBack) {
    buttons.back = createShellButton("Back", layout);
    buttons.back.layout = {
      width: buttons.back.width,
      height: buttons.back.height,
    };
    topBar.addChild(buttons.back);
  }
  const trailingSpacer = new Container({ label: "top-bar-spacer" });
  trailingSpacer.layout = {
    width: buttons.back?.width ?? tokenValue(layout, { design: 188, minScreenPx: 96 }),
    height: topBarHeight,
  };
  topBar.addChild(title, trailingSpacer);

  const contentHost = new Container({ label: "content-host" });
  contentHost.position.set(contentFrame.x, contentFrame.y);
  contentHost.layout = {
    width: contentFrame.width,
    height: contentFrame.height,
    flexDirection: "column",
    gap,
  };

  const bottomBar = new Container({ label: "bottom-bar" });
  bottomBar.position.set(bottomBarFrame.x, bottomBarFrame.y);
  bottomBar.layout = {
    width: bottomBarFrame.width,
    height: bottomBarFrame.height,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap,
  };
  const bottomBarBackground = new Graphics()
    .roundRect(0, 0, bottomBarFrame.width, bottomBarFrame.height, tokenValue(layout, surfaceTheme.rounded.md))
    .fill({ color: 0x0b1220, alpha: 0.86 })
    .stroke({ color: surfaceTheme.color.actionAccent, width: Math.max(1, 2 / layout.scale), alpha: 0.24 });
  bottomBarBackground.label = "bottom-bar-background";
  bottomBar.addChild(buttons.controls, buttons.debug);

  const bottomSheetHost = createBottomSheetHost(layout, sheetFrame, options);
  if (bottomSheetHost.closeButton) buttons.closeSheet = bottomSheetHost.closeButton;
  buttons.sheetActions = bottomSheetHost.actions;

  shell.topBar = topBar;
  shell.contentHost = contentHost;
  shell.bottomBar = bottomBar;
  shell.bottomSheetHost = bottomSheetHost.host;
  shell.buttons = buttons;
  shell.addChild(topBar, contentHost, bottomBar, bottomSheetHost.host);
  topBar.addChildAt(topBarBackground, 0);
  bottomBar.addChildAt(bottomBarBackground, 0);
  return shell;
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
  const background = new Graphics()
    .roundRect(0, 0, frame.width, frame.height, tokenValue(layout, surfaceTheme.rounded.md))
    .fill({ color: 0x0b1220, alpha: 0.96 })
    .stroke({ color: surfaceTheme.color.actionAccent, width: Math.max(1, 2 / layout.scale), alpha: 0.5 });
  background.label = "bottom-sheet-background";

  const handleRowHeight = tokenValue(layout, { design: 44, minScreenPx: 22 });
  const handleRow = new Container({ label: "bottom-sheet-handle-row" });
  handleRow.position.set(0, tokenValue(layout, surfaceTheme.spacing.xs));
  const handleWidth = tokenValue(layout, { design: 92, minScreenPx: 48 });
  const handleHeight = tokenValue(layout, { design: 10, minScreenPx: 6 });
  const handle = new Graphics()
    .roundRect(0, 0, handleWidth, handleHeight, handleHeight / 2)
    .fill({ color: 0xe2e8f0, alpha: 0.42 });
  handle.label = "bottom-sheet-handle";
  handle.position.set((frame.width - handleWidth) / 2, (handleRowHeight - handleHeight) / 2);
  handleRow.addChild(handle);

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

  host.addChild(background, handleRow, header, body);
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
