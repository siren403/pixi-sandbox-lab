import type { Application, Container } from "pixi.js";
import type { AssetList, AssetRuntime } from "./assets";
import type { AppMode, CommandSource } from "./commandRuntime";
import type { InputApi } from "./input";
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
    open: (scene: Scene, options?: SceneOpenOptions) => boolean;
    whenReady: (criteria: RuntimeReadyCriteria) => Promise<RuntimeReadySnapshot>;
  };
};

export type SceneOpenOptions =
  | CommandSource
  | {
      source?: CommandSource;
      args?: unknown;
    };

export type ResolvedSceneOpenOptions = {
  source: CommandSource;
  args: unknown;
};

export type SceneMetadata = {
  name: string;
  source: CommandSource;
  args: <T = unknown>() => T | undefined;
};

export type SceneMetadataController = {
  metadata: SceneMetadata;
  setActiveScene: (scene: { name: string; source: CommandSource; args: unknown }) => void;
};

export type SceneContext = {
  app: Application;
  stage: Container;
  layers: SurfaceLayers;
  assets: AssetRuntime;
  input: InputApi;
  keyboard: Keyboard;
  pointer: Pointer;
  layout: SurfaceLayout;
  surface: SurfaceContext;
  scene: SceneMetadata;
  runtime: RuntimeApi;
  switchScene: (scene: Scene, options?: SceneOpenOptions) => boolean;
};

export type RuntimeContext = SceneContext & {
  runtimeState: RuntimeInternalState;
  setSceneMetadata: SceneMetadataController["setActiveScene"];
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

export function resolveSceneOpenOptions(options: SceneOpenOptions | undefined): ResolvedSceneOpenOptions {
  if (typeof options === "string") return { source: options, args: undefined };
  return {
    source: options?.source ?? "scene",
    args: options?.args,
  };
}

export function createSceneMetadata(): SceneMetadataController {
  let rawArgs: unknown;
  const metadata: SceneMetadata = {
    name: "none",
    source: "scene",
    args: <T = unknown>() => rawArgs as T | undefined,
  };

  return {
    metadata,
    setActiveScene(scene) {
      metadata.name = scene.name;
      metadata.source = scene.source;
      rawArgs = scene.args;
    },
  };
}
