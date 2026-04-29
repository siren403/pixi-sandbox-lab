import { Application, Container } from "pixi.js";
import { createKeyboard } from "./keyboard";
import type { Scene, SceneContext } from "./scene";

export type GameOptions = {
  parent: string | HTMLElement;
  width: number;
  height: number;
  background: string;
  boot: Scene;
};

export async function createGame(options: GameOptions): Promise<Application> {
  const parent = resolveParent(options.parent);
  const app = new Application();

  await app.init({
    width: options.width,
    height: options.height,
    background: options.background,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preserveDrawingBuffer: true,
  });

  parent.replaceChildren(app.canvas);

  const stage = new Container();
  app.stage.addChild(stage);

  const keyboard = createKeyboard();
  const ctx: SceneContext = { app, stage, keyboard };
  options.boot.load?.(ctx);

  app.ticker.add((ticker) => {
    options.boot.update?.(ticker.deltaMS / 1000, ctx);
  });

  window.addEventListener("beforeunload", () => {
    options.boot.unload?.(ctx);
    keyboard.destroy();
    app.destroy();
  });

  return app;
}

function resolveParent(parent: string | HTMLElement): HTMLElement {
  if (typeof parent !== "string") return parent;

  const element = document.querySelector<HTMLElement>(parent);
  if (!element) {
    throw new Error(`Game parent not found: ${parent}`);
  }
  return element;
}
