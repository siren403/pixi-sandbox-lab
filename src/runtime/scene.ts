import type { Application, Container } from "pixi.js";
import type { AssetList, AssetRuntime } from "./assets";
import type { Keyboard } from "./keyboard";
import type { Pointer } from "./pointer";

export type SurfaceLayout = {
  referenceWidth: number;
  referenceHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  visibleWidth: number;
  visibleHeight: number;
  referenceX: number;
  referenceY: number;
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

export type SurfaceLayers = {
  root: Container;
  world: Container;
  ui: Container;
  debug: Container;
};

export type RuntimeState = {
  loading: boolean;
  loadingPhase: "idle" | "in" | "loading" | "out";
  sceneSwitches: number;
  loadingOverlayShows: number;
  lastLoadingDurationMs: number;
  loadingProgress: number;
  loadingOverlayAlpha: number;
  loadingOverlayMaxAlpha: number;
  transitionPanels: number;
  transitionPanelMaxCount: number;
};

export type SceneContext = {
  app: Application;
  stage: Container;
  layers: SurfaceLayers;
  assets: AssetRuntime;
  keyboard: Keyboard;
  pointer: Pointer;
  layout: SurfaceLayout;
  runtime: RuntimeState;
  switchScene: (scene: Scene) => void;
};

export type Scene = {
  assets?: AssetList | ((ctx: SceneContext) => AssetList);
  loading?: {
    overlay?: boolean;
    minimumMs?: number;
  };
  load?: (ctx: SceneContext) => void;
  update?: (dt: number, ctx: SceneContext) => void;
  resize?: (ctx: SceneContext) => void;
  unload?: (ctx: SceneContext) => void;
};

export function scene(definition: Scene): Scene {
  return definition;
}
