import { Container, Graphics, Text } from "pixi.js";
import { bootScene } from "./boot";
import type { SurfaceLayout } from "../runtime/scene";
import { scene } from "../runtime/scene";
import { surfaceTheme, tokenValue } from "../runtime/surface";

type IntroState = {
  scene: "intro";
  promptBounds: { x: number; y: number; width: number; height: number };
  rendered: boolean;
};

declare global {
  interface Window {
    __pixiIntroState?: IntroState;
  }
}

export const introScene = scene({
  load({ layers, layout }) {
    renderIntro(layers.ui, layout);
  },

  resize({ layers, layout }) {
    clearLayer(layers.ui);
    renderIntro(layers.ui, layout);
  },

  update(_dt, { keyboard, pointer, switchScene }) {
    const startByPointer = pointer.wasPressed();
    const startByKeyboard = keyboard.wasPressed("enter") || keyboard.wasPressed(" ");
    if (startByPointer || startByKeyboard) {
      switchScene(bootScene);
    }
  },

  unload({ layers }) {
    clearLayer(layers.ui);
    window.__pixiIntroState = undefined;
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

  root.addChild(backdrop, title, prompt);
  layer.addChild(root);
  syncIntroState(layout, root);
}

function syncIntroState(layout: SurfaceLayout, root: Container): void {
  const prompt = root.getChildByLabel("intro-prompt", true);
  const bounds = prompt?.getBounds();
  window.__pixiIntroState = {
    scene: "intro",
    promptBounds: bounds
      ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      : { x: 0, y: 0, width: 0, height: 0 },
    rendered: layout.visibleWidth > 0,
  };
}

function clearLayer(layer: Container): void {
  for (const child of layer.removeChildren()) {
    child.destroy({ children: true });
  }
}
