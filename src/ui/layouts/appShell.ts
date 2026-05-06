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
  const sheetHeight = options.activeSheet === "none" ? 0 : Math.min(safeFrame.height * 0.42, tokenValue(layout, { design: 620, minScreenPx: 260 }));
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
    topBar.addChild(buttons.back);
  }
  topBar.addChild(title);

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
    justifyContent: "flex-end",
    gap,
  };
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
  host.position.set(frame.x, frame.y + frame.height);
  host.pivot.y = frame.height;
  host.layout = {
    width: frame.width,
    height: frame.height,
    flexDirection: "column",
    gap: tokenValue(layout, surfaceTheme.spacing.xs),
  };
  if ((options.activeSheet ?? "none") === "none") return { host, actions: {} };

  const background = new Graphics()
    .roundRect(0, 0, frame.width, frame.height, tokenValue(layout, surfaceTheme.rounded.md))
    .fill({ color: 0x0b1220, alpha: 0.96 })
    .stroke({ color: surfaceTheme.color.actionAccent, width: Math.max(1, 2 / layout.scale), alpha: 0.5 });
  background.label = "bottom-sheet-background";

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
  const headerHeight = tokenValue(layout, { design: 86, minScreenPx: 52 });
  header.layout = {
    width: frame.width,
    height: headerHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokenValue(layout, surfaceTheme.spacing.sm),
  };
  header.addChild(title, closeButton);

  const body = new Container({ label: "bottom-sheet-body" });
  body.layout = {
    width: frame.width,
    height: Math.max(0, frame.height - headerHeight),
    flexDirection: "column",
    gap: tokenValue(layout, surfaceTheme.spacing.xs),
  };

  for (const action of options.sheetActions ?? []) {
    const button = createShellButton(action.label, layout);
    button.label = `bottom-sheet-action:${action.id}`;
    body.addChild(button);
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
    label.layout = {
      height: tokenValue(layout, { design: 40, minScreenPx: 24 }),
    };
    body.addChild(label);
  }

  host.addChild(background, header, body);
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
