import "@pixi/layout";
import { Application, Container } from "pixi.js";
import { createAssetRuntime } from "./assets";
import { createCommandRuntime } from "./commandRuntime";
import { createKeyboard } from "./keyboard";
import { createPointer } from "./pointer";
import { waitForRuntimeReady } from "./readiness";
import { setSceneNavigator } from "./navigation";
import type { RuntimeApi, RuntimeContext, Scene, SurfaceLayers, SurfaceLayout } from "./scene";
import { createSceneMetadata, resolveSceneOpenOptions } from "./scene";
import { SceneManager } from "./sceneManager";
import { createSurfaceContext } from "./surface";
import { syncTransitionState } from "./transition";
import { setDebugReadyHandler } from "../debug/stateBridge";

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
  const assets = createAssetRuntime();
  const runtimeState = {
    appMode: "interactive" as const,
    activeScene: "none",
    sceneLifecycle: "none" as const,
    transitionLifecycle: "idle" as const,
    sceneReady: false,
    transitionIdle: true,
    commandIdle: true,
    interactiveReady: false,
    readinessRevision: 0,
    loading: false,
    loadingPhase: "idle" as const,
    sceneSwitches: 0,
    sceneSwitchRequests: 0,
    acceptedCommands: 0,
    ignoredCommands: 0,
    runningCommands: [],
    loadingOverlayShows: 0,
    loadingMinimumMs: 0,
    lastLoadingDurationMs: 0,
    loadingProgress: 0,
    loadingOverlayAlpha: 0,
    loadingOverlayMaxAlpha: 0,
    transitionPanels: 0,
    transitionPanelMaxCount: 0,
  };
  const layout = createSurfaceLayout(options.width, options.height, app.screen.width, app.screen.height);
  const sceneMetadata = createSceneMetadata();
  const surface = createSurfaceContext(layout, (container = layers.root) => {
    app.renderer.layout.update(container);
  });
  const pointer = createPointer(app.canvas, () => layout);
  const sceneManager = new SceneManager();
  const commands = createCommandRuntime({
    runtimeState,
    onChange: () => syncTransitionState(ctx),
  });
  const runtime: RuntimeApi = {
    scene: {
      open: (scene, openOptions) => ctx.switchScene(scene, openOptions),
      whenReady: (criteria) => waitForRuntimeReady(runtimeState, criteria),
    },
  };
  const ctx: RuntimeContext = {
    app,
    stage,
    layers,
    assets,
    keyboard,
    pointer,
    layout,
    surface,
    scene: sceneMetadata.metadata,
    runtime,
    runtimeState,
    setSceneMetadata: sceneMetadata.setActiveScene,
    switchScene: (scene, openOptions) => {
      const resolvedOptions = resolveSceneOpenOptions(openOptions);
      return commands.requestSceneSwitch(scene, resolvedOptions.source, () => sceneManager.switch(scene, ctx, resolvedOptions));
    },
  };
  setSceneNavigator(ctx.switchScene);
  const restoreDebugReadyHandler = setDebugReadyHandler((criteria) => runtime.scene.whenReady(criteria));
  updateSurfaceLayout(ctx, options.width, options.height);
  const destroyLayoutDebug = await maybeInstallLayoutDebug(app, layers.root);
  await sceneManager.start(options.boot, ctx);
  syncTransitionState(ctx);

  const onResize = () => {
    updateSurfaceLayout(ctx, options.width, options.height);
    sceneManager.resize(ctx);
  };
  app.renderer.on("resize", onResize);

  app.ticker.add((ticker) => {
    sceneManager.update(ticker.deltaMS / 1000, ctx);
  });

  const recoverSurface = () => {
    if (destroyed) return;
    if (!app.canvas.isConnected) parent.replaceChildren(app.canvas);
    app.ticker.start();
    updateSurfaceLayout(ctx, options.width, options.height);
    sceneManager.resize(ctx);
    app.renderer.layout.update(layers.root);
    app.render();
  };

  const onPageHide = (event: PageTransitionEvent) => {
    if (event.persisted) return;
    destroyGame();
  };
  const onPageShow = () => recoverSurface();
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") recoverSurface();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
  };
  const onContextRestored = () => recoverSurface();
  let destroyed = false;
  const destroyGame = () => {
    if (destroyed) return;
    destroyed = true;
    app.renderer.off("resize", onResize);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    app.canvas.removeEventListener("webglcontextlost", onContextLost);
    app.canvas.removeEventListener("webglcontextrestored", onContextRestored);
    destroyLayoutDebug();
    restoreDebugReadyHandler();
    commands.destroy();
    sceneManager.destroy(ctx);
    keyboard.destroy();
    pointer.destroy();
    app.destroy();
  };

  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", onVisibilityChange);
  app.canvas.addEventListener("webglcontextlost", onContextLost);
  app.canvas.addEventListener("webglcontextrestored", onContextRestored);

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
  ctx: RuntimeContext,
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
