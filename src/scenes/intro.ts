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
import { createButton } from "../ui/button";
import { createLabel } from "../ui/label";
import { configureSafeAreaColumn } from "../ui/layout";
import { createAppShell, type AppShell, type AppShellSheet } from "../ui/layouts/appShell";

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
let sceneIndexItems: Array<{ id: string; label: string; bounds: { x: number; y: number; width: number; height: number } }> = [];
let sceneIndexButtons: {
  controls?: { x: number; y: number; width: number; height: number };
  debug?: { x: number; y: number; width: number; height: number };
  close?: { x: number; y: number; width: number; height: number };
  actions: Record<string, { x: number; y: number; width: number; height: number }>;
} = { actions: {} };
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
      switchScene(sceneIndexScene, "intro");
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
        switchScene(verticalSliceScene, "scene");
        return;
      }
      if (item?.id === "design-system") {
        switchScene(designSystemScene, "scene");
        return;
      }
      if (sceneIndexButtons.controls && containsPoint(sceneIndexButtons.controls, position.x, position.y)) {
        sceneIndexSheet = sceneIndexSheet === "controls" ? "none" : "controls";
        clearLayer(layers.ui);
        renderSceneIndex(app, layers.ui, layout);
        return;
      }
      if (sceneIndexButtons.debug && containsPoint(sceneIndexButtons.debug, position.x, position.y)) {
        sceneIndexSheet = sceneIndexSheet === "debug" ? "none" : "debug";
        clearLayer(layers.ui);
        renderSceneIndex(app, layers.ui, layout);
        return;
      }
      if (sceneIndexButtons.close && containsPoint(sceneIndexButtons.close, position.x, position.y)) {
        sceneIndexSheet = "none";
        clearLayer(layers.ui);
        renderSceneIndex(app, layers.ui, layout);
        return;
      }
      const action = Object.entries(sceneIndexButtons.actions).find(([, bounds]) => containsPoint(bounds, position.x, position.y))?.[0];
      if (action === "scene-vertical") {
        switchScene(verticalSliceScene, "debug");
        return;
      }
      if (action === "scene-design") {
        switchScene(designSystemScene, "debug");
        return;
      }
      if (action === "layout-bounds") {
        window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { enabled: true, mode: "bounds", filter: "all" } }));
        return;
      }
      if (action === "layout-off") {
        window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { enabled: false } }));
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
        ? ["Debug tools run inside the app shell.", "Layout inspector state is still backed by the dev overlay."]
        : ["Select a sample from the list.", "Scene-specific controls will appear here."],
    sheetActions:
      sceneIndexSheet === "debug"
        ? [
            { id: "scene-vertical", label: "Open Vertical Slice" },
            { id: "scene-design", label: "Open Design System" },
            { id: "layout-bounds", label: "Layout Bounds" },
            { id: "layout-off", label: "Layout Off" },
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
  sceneIndexButtons = {
    controls: toDesignBounds(layout, shell.buttons.controls.getBounds()),
    debug: toDesignBounds(layout, shell.buttons.debug.getBounds()),
    close: shell.buttons.closeSheet ? toDesignBounds(layout, shell.buttons.closeSheet.getBounds()) : undefined,
    actions: Object.fromEntries(
      Object.entries(shell.buttons.sheetActions).map(([id, button]) => [id, toDesignBounds(layout, button.getBounds())]),
    ),
  };
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
  window.addEventListener("pixi:scene-switch", sceneListener);
  window.addEventListener("pixi:design-system", designSystemListener);
  return () => {
    window.removeEventListener("pixi:scene-switch", sceneListener);
    window.removeEventListener("pixi:design-system", designSystemListener);
  };
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
