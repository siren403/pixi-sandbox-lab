import type { Application, Container } from "pixi.js";
import type { AssetList, AssetRuntime } from "./assets";
import type { AppMode, CommandSource } from "./commandRuntime";
import type { Keyboard } from "./keyboard";
import type { Pointer } from "./pointer";
import type { RuntimeReadyCriteria, RuntimeReadySnapshot } from "./readiness";
import type { SurfaceContext } from "./surface";

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

export type RuntimeInternalState = {
  appMode: AppMode;
  activeScene: string;
  sceneLifecycle: "none" | "unloading" | "loading-assets" | "loading-scene" | "render-pending" | "ready" | "failed";
  transitionLifecycle: "idle" | "in" | "loading" | "out";
  sceneReady: boolean;
  transitionIdle: boolean;
  commandIdle: boolean;
  interactiveReady: boolean;
  readinessRevision: number;
  loading: boolean;
  loadingPhase: "idle" | "in" | "loading" | "out";
  sceneSwitches: number;
  sceneSwitchRequests: number;
  acceptedCommands: number;
  ignoredCommands: number;
  runningCommands: string[];
  loadingOverlayShows: number;
  loadingMinimumMs: number;
  lastLoadingDurationMs: number;
  loadingProgress: number;
  loadingOverlayAlpha: number;
  loadingOverlayMaxAlpha: number;
  transitionPanels: number;
  transitionPanelMaxCount: number;
};

export type RuntimeApi = {
  scene: {
    open: (scene: Scene, source?: CommandSource) => boolean;
    whenReady: (criteria: RuntimeReadyCriteria) => Promise<RuntimeReadySnapshot>;
  };
};

export type SceneContext = {
  app: Application;
  stage: Container;
  layers: SurfaceLayers;
  assets: AssetRuntime;
  keyboard: Keyboard;
  pointer: Pointer;
  layout: SurfaceLayout;
  surface: SurfaceContext;
  runtime: RuntimeApi;
  switchScene: (scene: Scene, source?: CommandSource) => boolean;
};

export type RuntimeContext = SceneContext & {
  runtimeState: RuntimeInternalState;
};

export type Scene = {
  name: string;
  assets?: AssetList | ((ctx: SceneContext) => AssetList);
  transition?: {
    enabled?: boolean;
    minimumMs?: number;
  };
  loading?: {
    /** @deprecated Use transition.enabled. */
    overlay?: boolean;
    /** @deprecated Use transition.minimumMs. */
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
