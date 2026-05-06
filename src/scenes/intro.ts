import { Container, Graphics } from "pixi.js";
import { designSystemScene, verticalSliceScene } from "./boot";
import type { SurfaceLayout } from "../runtime/scene";
import { scene } from "../runtime/scene";
import { setSceneIndexScene } from "../runtime/navigation";
import { tokenValue } from "../runtime/surface";
import { surfaceTheme } from "../ui/tokens";
import {
  clearBootDebugState,
  clearSceneIndexDebugState,
  setBootDebugState,
  setSceneIndexDebugState,
} from "../debug/stateBridge";
import { setDebugCommandHandler, type DebugCommandResult } from "../debug/commands";
import { createButton } from "../ui/button";
import { createLabel } from "../ui/label";
import { configureSafeAreaColumn } from "../ui/layout";
import {
  createAppShell,
  readAppShellButtonBounds,
  resolveAppShellHit,
  type AppShell,
  type AppShellButtonBounds,
  type AppShellSheet,
} from "../ui/layouts/appShell";

type BootState = {
  scene: "boot";
  promptBounds: { x: number; y: number; width: number; height: number };
  buttonBounds: { x: number; y: number; width: number; height: number };
  layoutPolicy: "safe-area-frame";
  layoutNodes: number;
  buttonCenterDeltaY: number;
  rendered: boolean;
};

let startButtonBounds = { x: 0, y: 0, width: 0, height: 0 };
let sceneIndexSheet: AppShellSheet = "none";
let layoutBoundsEnabled = false;
let sceneIndexItems: Array<{ id: string; label: string; bounds: { x: number; y: number; width: number; height: number } }> = [];
let sceneIndexButtons: AppShellButtonBounds = {
  controls: { x: 0, y: 0, width: 0, height: 0 },
  debug: { x: 0, y: 0, width: 0, height: 0 },
  actions: {},
};
let removeDebugListeners: (() => void) | null = null;

export const bootScene = scene({
  name: "boot",
  transition: { enabled: false, minimumMs: 0 },

  load({ app, layers, layout, switchScene }) {
    renderIntro(app, layers.ui, layout);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        switchScene(verticalSliceScene, "debug");
      },
      onDesignSystem: () => {
        switchScene(designSystemScene, "debug");
      },
    });
  },

  resize({ app, layers, layout }) {
    clearLayer(layers.ui);
    renderIntro(app, layers.ui, layout);
  },

  update(_dt, { keyboard, pointer, switchScene }) {
    const pointerPosition = pointer.position();
    const startByPointer = pointer.wasPressed() && containsPoint(startButtonBounds, pointerPosition.x, pointerPosition.y);
    const startByKeyboard = keyboard.wasPressed("enter") || keyboard.wasPressed(" ");
    if (startByPointer || startByKeyboard) {
      switchScene(sceneIndexScene, { source: "intro", args: { from: "boot" } });
    }
  },

  unload({ layers }) {
    removeDebugListeners?.();
    removeDebugListeners = null;
    clearLayer(layers.ui);
    clearBootDebugState();
  },
});

export const sceneIndexScene = scene({
  name: "scene-index",
  transition: { enabled: true, minimumMs: 0 },

  load({ app, layers, layout, switchScene }) {
    sceneIndexSheet = "none";
    renderSceneIndex(app, layers.ui, layout);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        switchScene(verticalSliceScene, "debug");
      },
      onDesignSystem: () => {
        switchScene(designSystemScene, "debug");
      },
    });
  },

  resize({ app, layers, layout }) {
    clearLayer(layers.ui);
    renderSceneIndex(app, layers.ui, layout);
  },

  update(_dt, { app, layers, layout, pointer, keyboard, switchScene }) {
    const position = pointer.position();
    if (pointer.wasPressed()) {
      const item = sceneIndexItems.find((candidate) => containsPoint(candidate.bounds, position.x, position.y));
      if (item?.id === "vertical-slice") {
        switchScene(verticalSliceScene, { source: "scene", args: { from: "scene-index", selectedSample: "vertical-slice" } });
        return;
      }
      if (item?.id === "design-system") {
        switchScene(designSystemScene, { source: "scene", args: { from: "scene-index", selectedSample: "design-system" } });
        return;
      }
      const shellHit = resolveAppShellHit(sceneIndexButtons, position);
      if (shellHit?.kind === "controls") {
        sceneIndexSheet = sceneIndexSheet === "controls" ? "none" : "controls";
        clearLayer(layers.ui);
        renderSceneIndex(app, layers.ui, layout);
        return;
      }
      if (shellHit?.kind === "debug") {
        sceneIndexSheet = sceneIndexSheet === "debug" ? "none" : "debug";
        clearLayer(layers.ui);
        renderSceneIndex(app, layers.ui, layout);
        return;
      }
      if (shellHit?.kind === "close") {
        sceneIndexSheet = "none";
        clearLayer(layers.ui);
        renderSceneIndex(app, layers.ui, layout);
        return;
      }
      const action = shellHit?.kind === "action" ? shellHit.id : undefined;
      if (action === "scene-vertical") {
        switchScene(verticalSliceScene, "debug");
        return;
      }
      if (action === "scene-design") {
        switchScene(designSystemScene, "debug");
        return;
      }
      if (action === "layout-toggle") {
        layoutBoundsEnabled = !layoutBoundsEnabled;
        window.dispatchEvent(
          new CustomEvent("pixi:layout-debug-set", {
            detail: layoutBoundsEnabled ? { enabled: true, mode: "bounds", filter: "all" } : { enabled: false },
          }),
        );
        clearLayer(layers.ui);
        renderSceneIndex(app, layers.ui, layout);
        return;
      }
      if (action === "reload") {
        window.location.reload();
        return;
      }
    }
    if (keyboard.wasPressed("escape") && sceneIndexSheet !== "none") {
      sceneIndexSheet = "none";
      clearLayer(layers.ui);
      renderSceneIndex(app, layers.ui, layout);
    }
  },

  unload({ layers }) {
    removeDebugListeners?.();
    removeDebugListeners = null;
    clearLayer(layers.ui);
    clearSceneIndexDebugState();
  },
});

setSceneIndexScene(sceneIndexScene);

function renderIntro(app: { renderer: { layout: { update: (container: Container) => void } } }, layer: Container, layout: SurfaceLayout): void {
  const root = new Container({ label: "intro-root" });
  const backdrop = new Graphics()
    .rect(0, 0, layout.visibleWidth, layout.visibleHeight)
    .fill("#111827");
  backdrop.label = "intro-backdrop";

  const menu = new Container({ label: "intro-menu" });
  const gap = tokenValue(layout, surfaceTheme.spacing.md);
  configureSafeAreaColumn(menu, layout, {
    gap,
    alignItems: "center",
    justifyContent: "center",
  });

  const title = createLabel({
    text: "Pixi Sandbox",
    layout,
    fontSize: surfaceTheme.typography.display,
    color: surfaceTheme.color.text,
    weight: "700",
    label: "intro-title",
  });
  title.label = "intro-title";
  title.anchor.set(0.5);
  title.layout = {
    height: tokenValue(layout, { design: 112, minScreenPx: 42, maxScreenPx: 72 }),
  };

  const buttonWidth = Math.min(layout.visibleWidth * 0.58, 520 / layout.scale);
  const buttonHeight = tokenValue(layout, surfaceTheme.components.buttonPrimary.height);
  const button = createButton({
    text: "Tap to start",
    width: buttonWidth,
    height: buttonHeight,
    layout,
    fontSize: surfaceTheme.components.buttonPrimary.typography,
    fill: 0x0f766e,
    stroke: surfaceTheme.color.actionAccent,
    textColor: surfaceTheme.color.text,
  });
  button.label = "tap-start-button";
  button.labelText.label = "intro-prompt";
  button.layout = {
    width: buttonWidth,
    height: buttonHeight,
  };

  menu.addChild(title, button);
  root.addChild(backdrop, menu);
  layer.addChild(root);
  app.renderer.layout.update(root);
  syncIntroState(layout, root);
}

function renderSceneIndex(app: { renderer: { layout: { update: (container: Container) => void } } }, layer: Container, layout: SurfaceLayout): void {
  const root = new Container({ label: "scene-index-root" });
  const backdrop = new Graphics()
    .rect(0, 0, layout.visibleWidth, layout.visibleHeight)
    .fill(surfaceTheme.color.primary);
  backdrop.label = "scene-index-backdrop";

  const shell = createAppShell(layout, {
    title: "Samples",
    activeSheet: sceneIndexSheet,
    sheetTitle: sceneIndexSheet === "debug" ? "Debug" : "Controls",
    sheetLines:
      sceneIndexSheet === "debug"
        ? ["Debug tools run inside the app shell.", layoutBoundsEnabled ? "Layout bounds are visible." : "Layout bounds are hidden."]
        : ["Select a sample from the list.", "Scene-specific controls will appear here."],
    sheetActions:
      sceneIndexSheet === "debug"
        ? [
            { id: "scene-vertical", label: "Open Vertical Slice" },
            { id: "scene-design", label: "Open Design System" },
            { id: "layout-toggle", label: layoutBoundsEnabled ? "Hide Layout Bounds" : "Show Layout Bounds" },
            { id: "reload", label: "Reload" },
          ]
        : [],
  });

  const list = new Container({ label: "scene-index-list" });
  list.layout = {
    width: shell.frames.content.width,
    height: shell.frames.content.height,
    flexDirection: "column",
    gap: tokenValue(layout, surfaceTheme.spacing.sm),
  };

  for (const sample of sceneSamples) {
    const item = createButton({
      text: sample.label,
      width: shell.frames.content.width,
      height: tokenValue(layout, { design: 104, minScreenPx: 54 }),
      layout,
      fontSize: surfaceTheme.typography.body,
      fill: sample.enabled ? 0x0f766e : 0x334155,
      stroke: sample.enabled ? surfaceTheme.color.actionAccent : "#64748b",
      textColor: surfaceTheme.color.text,
    });
    item.label = `scene-index-item:${sample.id}`;
    item.layout = {
      width: shell.frames.content.width,
      height: tokenValue(layout, { design: 104, minScreenPx: 54 }),
    };
    list.addChild(item);
  }

  shell.contentHost.addChild(list);
  root.addChild(backdrop, shell);
  layer.addChild(root);
  app.renderer.layout.update(root);
  syncSceneIndexState(layout, root, shell);
}

function syncIntroState(layout: SurfaceLayout, root: Container): void {
  const prompt = root.getChildByLabel("intro-prompt", true);
  const button = root.getChildByLabel("tap-start-button", true);
  const promptBounds = prompt?.getBounds();
  const buttonBounds = button?.getBounds();
  startButtonBounds = buttonBounds
    ? {
        x: buttonBounds.x / layout.scale,
        y: buttonBounds.y / layout.scale,
        width: buttonBounds.width / layout.scale,
        height: buttonBounds.height / layout.scale,
      }
    : { x: 0, y: 0, width: 0, height: 0 };
  setBootDebugState({
    scene: "boot",
    promptBounds: promptBounds
      ? { x: promptBounds.x, y: promptBounds.y, width: promptBounds.width, height: promptBounds.height }
      : { x: 0, y: 0, width: 0, height: 0 },
    buttonBounds: buttonBounds
      ? { x: buttonBounds.x, y: buttonBounds.y, width: buttonBounds.width, height: buttonBounds.height }
      : { x: 0, y: 0, width: 0, height: 0 },
    layoutPolicy: "safe-area-frame",
    layoutNodes: countLayoutNodes(root),
    buttonCenterDeltaY: measureCenterDeltaY(button, prompt),
    rendered: layout.visibleWidth > 0,
  });
}

function syncSceneIndexState(layout: SurfaceLayout, root: Container, shell: AppShell): void {
  sceneIndexItems = sceneSamples.map((sample) => {
    const node = root.getChildByLabel(`scene-index-item:${sample.id}`, true);
    return {
      id: sample.id,
      label: sample.label,
      bounds: toDesignBounds(layout, node?.getBounds()),
    };
  });
  sceneIndexButtons = readAppShellButtonBounds(layout, shell);
  setSceneIndexDebugState({
    scene: "scene-index",
    rendered: true,
    items: sceneIndexItems,
    appShell: {
      topBarBounds: shell.frames.topBar,
      contentBounds: shell.frames.content,
      bottomBarBounds: shell.frames.bottomBar,
      sheetBounds: shell.frames.sheet,
      controlsButtonBounds: sceneIndexButtons.controls ?? { x: 0, y: 0, width: 0, height: 0 },
      debugButtonBounds: sceneIndexButtons.debug ?? { x: 0, y: 0, width: 0, height: 0 },
      closeButtonBounds: sceneIndexButtons.close,
      activeSheet: sceneIndexSheet,
    },
    layoutNodes: countLayoutNodes(root),
  });
}

const sceneSamples = [
  { id: "vertical-slice", label: "Vertical Slice", enabled: true },
  { id: "design-system", label: "Design System", enabled: true },
  { id: "camera-sample", label: "Camera Sample - planned", enabled: false },
  { id: "layout-sample", label: "Layout Sample - planned", enabled: false },
  { id: "motion-sample", label: "Motion Sample - planned", enabled: false },
] as const;

function measureCenterDeltaY(
  button: Container | null,
  label: Container | null,
): number {
  const buttonBounds = button?.getBounds();
  const labelBounds = label?.getBounds();
  if (!buttonBounds || !labelBounds) return Number.POSITIVE_INFINITY;
  return Math.abs((buttonBounds.y + buttonBounds.height / 2) - (labelBounds.y + labelBounds.height / 2));
}

function countLayoutNodes(container: Container): number {
  let count = container.layout ? 1 : 0;
  for (const child of container.children) {
    if (child instanceof Container) count += countLayoutNodes(child);
  }
  return count;
}

function installDebugSceneListeners(handlers: { onScene: () => void; onDesignSystem: () => void }): () => void {
  const sceneListener = () => handlers.onScene();
  const designSystemListener = () => handlers.onDesignSystem();
  const restoreDebugCommandHandler = setDebugCommandHandler((command) => {
    if (command.type === "app.reload") {
      window.location.reload();
      return acceptedCommand(command.type);
    }
    if (command.type === "scene.open") {
      if (!["vertical-slice", "design-system"].includes(command.sceneId)) {
        return ignoredCommand(command.type, `Unsupported scene id: ${command.sceneId}`);
      }
      if (command.sceneId === "vertical-slice") {
        handlers.onScene();
        return acceptedCommand(command.type);
      }
      if (command.sceneId === "design-system") {
        handlers.onDesignSystem();
        return acceptedCommand(command.type);
      }
      return ignoredCommand(command.type, `Unsupported scene id: ${command.sceneId}`);
    }
    if (command.type === "layout.set") {
      window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: command }));
      return acceptedCommand(command.type);
    }
    return unsupportedCommand(command.type);
  });
  window.addEventListener("pixi:scene-switch", sceneListener);
  window.addEventListener("pixi:design-system", designSystemListener);
  return () => {
    restoreDebugCommandHandler();
    window.removeEventListener("pixi:scene-switch", sceneListener);
    window.removeEventListener("pixi:design-system", designSystemListener);
  };
}

function acceptedCommand(type: DebugCommandResult["type"]): DebugCommandResult {
  return { accepted: true, status: "accepted", type };
}

function ignoredCommand(type: DebugCommandResult["type"], reason: string): DebugCommandResult {
  return { accepted: false, status: "ignored", type, reason };
}

function unsupportedCommand(type: DebugCommandResult["type"]): DebugCommandResult {
  return { accepted: false, status: "unsupported", type, reason: "Command is not supported in this scene." };
}

function containsPoint(bounds: { x: number; y: number; width: number; height: number }, x: number, y: number): boolean {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

function toDesignBounds(
  layout: SurfaceLayout,
  bounds: { x: number; y: number; width: number; height: number } | undefined,
): { x: number; y: number; width: number; height: number } {
  if (!bounds) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: bounds.x / layout.scale,
    y: bounds.y / layout.scale,
    width: bounds.width / layout.scale,
    height: bounds.height / layout.scale,
  };
}

function clearLayer(layer: Container): void {
  for (const child of layer.removeChildren()) {
    child.destroy({ children: true });
  }
}
