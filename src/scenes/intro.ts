import { Container, Graphics, Text } from "pixi.js";
import { designSystemScene, verticalSliceScene } from "./boot";
import type { SurfaceLayout } from "../runtime/scene";
import { scene } from "../runtime/scene";
import { surfaceTheme, tokenValue } from "../runtime/surface";
import { clearBootDebugState, setBootDebugState } from "../debug/stateBridge";

type BootState = {
  scene: "boot";
  promptBounds: { x: number; y: number; width: number; height: number };
  buttonBounds: { x: number; y: number; width: number; height: number };
  rendered: boolean;
};

let startButtonBounds = { x: 0, y: 0, width: 0, height: 0 };
let removeDebugListeners: (() => void) | null = null;

export const bootScene = scene({
  name: "boot",
  loading: { overlay: false, minimumMs: 0 },

  load({ layers, layout, switchScene }) {
    renderIntro(layers.ui, layout);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        switchScene(verticalSliceScene, "debug");
      },
      onDesignSystem: () => {
        switchScene(designSystemScene, "debug");
      },
    });
  },

  resize({ layers, layout }) {
    clearLayer(layers.ui);
    renderIntro(layers.ui, layout);
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

function renderIntro(layer: Container, layout: SurfaceLayout): void {
  const root = new Container({ label: "intro-root" });
  const backdrop = new Graphics()
    .rect(0, 0, layout.visibleWidth, layout.visibleHeight)
    .fill("#111827");
  backdrop.label = "intro-backdrop";

  const title = new Text({
    text: "Pixi Sandbox",
    style: {
      fill: surfaceTheme.color.text,
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: tokenValue(layout, { design: 92, minScreenPx: 34, maxScreenPx: 60 }),
      fontWeight: "700",
    },
  });
  title.label = "intro-title";
  title.anchor.set(0.5);
  title.position.set(layout.visibleWidth / 2, layout.visibleHeight * 0.42);

  const prompt = new Text({
    text: "Tap to start",
    style: {
      fill: "#7dd3fc",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: tokenValue(layout, { design: 54, minScreenPx: 24, maxScreenPx: 40 }),
      fontWeight: "600",
    },
  });
  prompt.label = "intro-prompt";
  prompt.anchor.set(0.5);
  prompt.position.set(layout.visibleWidth / 2, layout.visibleHeight * 0.55);

  const buttonWidth = Math.min(layout.visibleWidth * 0.58, 520 / layout.scale);
  const buttonHeight = Math.max(86, 48 / layout.scale);
  const button = new Graphics()
    .roundRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonHeight / 2)
    .fill({ color: 0x0f766e, alpha: 0.94 })
    .stroke({ color: "#67e8f9", width: Math.max(2, 3 / layout.scale) });
  button.label = "tap-start-button";
  button.position.set(layout.visibleWidth / 2, layout.visibleHeight * 0.55);
  startButtonBounds = {
    x: button.position.x - buttonWidth / 2,
    y: button.position.y - buttonHeight / 2,
    width: buttonWidth,
    height: buttonHeight,
  };

  root.addChild(backdrop, title, button, prompt);
  layer.addChild(root);
  syncIntroState(layout, root);
}

function syncIntroState(layout: SurfaceLayout, root: Container): void {
  const prompt = root.getChildByLabel("intro-prompt", true);
  const bounds = prompt?.getBounds();
  setBootDebugState({
    scene: "boot",
    promptBounds: bounds
      ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      : { x: 0, y: 0, width: 0, height: 0 },
    buttonBounds: startButtonBounds,
    rendered: layout.visibleWidth > 0,
  });
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
