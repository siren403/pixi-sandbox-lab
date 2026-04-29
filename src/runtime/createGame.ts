import "@pixi/layout";
import { Application, Container } from "pixi.js";
import { createKeyboard } from "./keyboard";
import type { Scene, SceneContext, SurfaceLayers, SurfaceLayout } from "./scene";

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
    resizeTo: window,
  });

  parent.replaceChildren(app.canvas);

  const stage = new Container({ label: "stage" });
  const layers = createSurfaceLayers();
  stage.addChild(layers.root);
  app.stage.addChild(stage);

  const keyboard = createKeyboard();
  const layout = createSurfaceLayout(options.width, options.height, app.screen.width, app.screen.height);
  const ctx: SceneContext = { app, stage, layers, keyboard, layout };
  updateSurfaceLayout(ctx, options.width, options.height);
  options.boot.load?.(ctx);
  const destroyLayoutDebug = await maybeInstallLayoutDebug(app, layers.root);

  const onResize = () => {
    updateSurfaceLayout(ctx, options.width, options.height);
    options.boot.resize?.(ctx);
  };
  app.renderer.on("resize", onResize);

  app.ticker.add((ticker) => {
    options.boot.update?.(ticker.deltaMS / 1000, ctx);
  });

  window.addEventListener("beforeunload", () => {
    app.renderer.off("resize", onResize);
    destroyLayoutDebug();
    options.boot.unload?.(ctx);
    keyboard.destroy();
    app.destroy();
  });

  return app;
}

function createSurfaceLayers(): SurfaceLayers {
  const root = new Container({ label: "surface-root" });
  const world = new Container({ label: "world-layer" });
  const ui = new Container({ label: "ui-layer" });
  const debug = new Container({ label: "debug-layer" });

  root.addChild(world, ui, debug);
  return { root, world, ui, debug };
}

async function maybeInstallLayoutDebug(app: Application, stage: Container): Promise<() => void> {
  if (import.meta.env.VITE_DEMO_DEBUG === "false") {
    return () => {};
  }

  const { installLayoutDebug } = await import("../debug/layoutDebugOverlay");
  return installLayoutDebug(app, stage);
}

function createSurfaceLayout(
  referenceWidth: number,
  referenceHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): SurfaceLayout {
  return {
    referenceWidth,
    referenceHeight,
    viewportWidth,
    viewportHeight,
    scale: 1,
    visibleWidth: viewportWidth,
    visibleHeight: viewportHeight,
    referenceX: 0,
    referenceY: 0,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

function updateSurfaceLayout(
  ctx: SceneContext,
  referenceWidth: number,
  referenceHeight: number,
): void {
  const viewportWidth = ctx.app.screen.width;
  const viewportHeight = ctx.app.screen.height;
  const scale = Math.min(viewportWidth / referenceWidth, viewportHeight / referenceHeight);
  const visibleWidth = viewportWidth / scale;
  const visibleHeight = viewportHeight / scale;

  ctx.layout.referenceWidth = referenceWidth;
  ctx.layout.referenceHeight = referenceHeight;
  ctx.layout.viewportWidth = viewportWidth;
  ctx.layout.viewportHeight = viewportHeight;
  ctx.layout.scale = scale;
  ctx.layout.visibleWidth = visibleWidth;
  ctx.layout.visibleHeight = visibleHeight;
  ctx.layout.referenceX = (visibleWidth - referenceWidth) / 2;
  ctx.layout.referenceY = (visibleHeight - referenceHeight) / 2;
  ctx.layout.safeArea = readSafeArea(scale);

  ctx.layers.root.scale.set(scale);
}

function readSafeArea(scale: number): SurfaceLayout["safeArea"] {
  const style = getComputedStyle(document.documentElement);
  return {
    top: readCssPx(style, "--safe-area-inset-top") / scale,
    right: readCssPx(style, "--safe-area-inset-right") / scale,
    bottom: readCssPx(style, "--safe-area-inset-bottom") / scale,
    left: readCssPx(style, "--safe-area-inset-left") / scale,
  };
}

function readCssPx(style: CSSStyleDeclaration, name: string): number {
  const value = style.getPropertyValue(name).trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveParent(parent: string | HTMLElement): HTMLElement {
  if (typeof parent !== "string") return parent;

  const element = document.querySelector<HTMLElement>(parent);
  if (!element) {
    throw new Error(`Game parent not found: ${parent}`);
  }
  return element;
}
