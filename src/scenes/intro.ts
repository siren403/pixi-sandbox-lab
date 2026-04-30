import { Container, Graphics } from "pixi.js";
import { designSystemScene, verticalSliceScene } from "./boot";
import type { SurfaceLayout } from "../runtime/scene";
import { scene } from "../runtime/scene";
import { surfaceTheme, tokenValue } from "../runtime/surface";
import { clearBootDebugState, setBootDebugState } from "../debug/stateBridge";
import { createButton } from "../ui/button";
import { createLabel } from "../ui/label";
import { configureSafeAreaColumn } from "../ui/layout";

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
let removeDebugListeners: (() => void) | null = null;

export const bootScene = scene({
  name: "boot",
  loading: { overlay: false, minimumMs: 0 },

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
      switchScene(verticalSliceScene, "intro");
    }
  },

  unload({ layers }) {
    removeDebugListeners?.();
    removeDebugListeners = null;
    clearLayer(layers.ui);
    clearBootDebugState();
  },
});

function renderIntro(app: { renderer: { layout: { update: (container: Container) => void } } }, layer: Container, layout: SurfaceLayout): void {
  const root = new Container({ label: "intro-root" });
  const backdrop = new Graphics()
    .rect(0, 0, layout.visibleWidth, layout.visibleHeight)
    .fill("#111827");
  backdrop.label = "intro-backdrop";

  const menu = new Container({ label: "intro-menu" });
  const gap = tokenValue(layout, { design: 36, minScreenPx: 18, maxScreenPx: 32 });
  configureSafeAreaColumn(menu, layout, {
    gap,
    alignItems: "center",
    justifyContent: "center",
  });

  const title = createLabel({
    text: "Pixi Sandbox",
    layout,
    fontSize: { design: 92, minScreenPx: 34, maxScreenPx: 60 },
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
  const buttonHeight = Math.max(86, 48 / layout.scale);
  const button = createButton({
    text: "Tap to start",
    width: buttonWidth,
    height: buttonHeight,
    layout,
    fontSize: { design: 54, minScreenPx: 24, maxScreenPx: 40 },
    fill: 0x0f766e,
    stroke: "#67e8f9",
    textColor: "#7dd3fc",
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

function clearLayer(layer: Container): void {
  for (const child of layer.removeChildren()) {
    child.destroy({ children: true });
  }
}
