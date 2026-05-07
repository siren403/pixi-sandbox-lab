import { dispatchDebugCommand, type DebugCommand, type DebugCommandResult } from "./commands";
import { createDebugStore } from "./store";
import type { RuntimeReadyCriteria, RuntimeReadySnapshot } from "../runtime/readiness";

type RectState = { x: number; y: number; width: number; height: number };

export type PixiSampleAppShellDebugState = {
  activeSheet: "none" | "controls" | "debug";
  sheetBounds: RectState;
  backButtonBounds?: RectState;
  controlsButtonBounds?: RectState;
  debugButtonBounds?: RectState;
  closeButtonBounds?: RectState;
  actionButtonBounds: Record<string, RectState>;
};

export type PixiBootDebugState = {
  scene: "boot";
  promptBounds: RectState;
  buttonBounds: RectState;
  layoutPolicy: "safe-area-frame";
  layoutNodes: number;
  buttonCenterDeltaY: number;
  rendered: boolean;
};

export type PixiDemoDebugState = {
  playerX: number;
  playerY: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  worldWidth: number;
  worldHeight: number;
  worldItems: number;
  canvasWidth: number;
  canvasHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  visibleWidth: number;
  visibleHeight: number;
  playerScreenSize: number;
  markerScreenRadius: number;
  titleScreenFontSize: number;
  titleBounds: RectState;
  markerBounds: RectState;
  assetBounds: RectState;
  layerLabels: string[];
  scene: string;
  sceneSwitches: number;
  assetReady: boolean;
  pointerDown: boolean;
  pointerX: number;
  pointerY: number;
  appShell?: PixiSampleAppShellDebugState;
  rendered: boolean;
};

export type PixiDesignSystemDebugState = {
  scene: "design-system";
  sections: number;
  labels: number;
  swatches: number;
  typeSamples: number;
  componentSamples: number;
  safeAreaSamples: number;
  buttonScreenHeight: number;
  inputTargetScreenSize: number;
  markerScreenSize: number;
  buttonCenterDeltaY: number;
  layerLabels: string[];
  appShell?: PixiSampleAppShellDebugState;
  rendered: boolean;
};

export type PixiSceneIndexDebugState = {
  scene: "scene-index";
  rendered: boolean;
  items: Array<{
    id: string;
    label: string;
    bounds: RectState;
  }>;
  appShell: {
    topBarBounds: RectState;
    contentBounds: RectState;
    bottomBarBounds: RectState;
    sheetBounds: RectState;
    controlsButtonBounds: RectState;
    debugButtonBounds: RectState;
    closeButtonBounds?: RectState;
    activeSheet: "none" | "controls" | "debug";
  };
  layoutNodes: number;
};

export type PixiRuntimeDebugState = {
  appMode: "interactive" | "transitioning" | "loading" | "destroyed";
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
  loadingOverlayVisible: boolean;
};

export type PixiLayoutDebugState = {
  enabled: boolean;
  mode: "layout" | "bounds";
  filter: "all" | "world" | "ui";
  layoutNodes: number;
  debuggedNodes: number;
  semanticBoxes: number;
  semanticLabels: string[];
  layerLabels: string[];
  installedAt: number;
  panelConnected: boolean;
  restoreCount: number;
  visibilityState: DocumentVisibilityState;
  folded: boolean;
  x: number;
  y: number;
  currentScene: string;
};

export type PixiDebugState = {
  schemaVersion: 1;
  revision: number;
  lastCommand?: DebugCommandResult;
  activeScene?: string;
  scene?: PixiBootDebugState | PixiDemoDebugState | PixiDesignSystemDebugState;
  boot?: PixiBootDebugState;
  sceneIndex?: PixiSceneIndexDebugState;
  demo?: PixiDemoDebugState;
  designSystem?: PixiDesignSystemDebugState;
  runtime?: PixiRuntimeDebugState;
  layout?: PixiLayoutDebugState;
};

export type PixiDebugWindow = PixiDebugState & {
  version: 1;
  getSnapshot: () => PixiDebugState;
  dispatch: (command: DebugCommand) => DebugCommandResult | Promise<DebugCommandResult>;
  whenReady: (criteria: RuntimeReadyCriteria) => Promise<RuntimeReadySnapshot>;
};

declare global {
  interface Window {
    __pixiDebug?: PixiDebugWindow;
  }
}

const debugEnabled = import.meta.env.VITE_DEMO_DEBUG !== "false";
const debugStore = createDebugStore<PixiDebugState>({
  schemaVersion: 1,
  revision: 0,
});
let readyHandler: (criteria: RuntimeReadyCriteria) => Promise<RuntimeReadySnapshot> = () =>
  Promise.reject(new Error("Runtime readiness handler is not installed."));

export function setDebugReadyHandler(
  nextHandler: (criteria: RuntimeReadyCriteria) => Promise<RuntimeReadySnapshot>,
): () => void {
  const previous = readyHandler;
  readyHandler = nextHandler;
  return () => {
    readyHandler = previous;
  };
}

export function setBootDebugState(state: PixiBootDebugState): void {
  if (!debugEnabled) return;
  patchDebugState({
    boot: state,
    scene: state,
  });
}

export function clearBootDebugState(): void {
  if (!debugEnabled) return;
  const snapshot = debugStore.getSnapshot();
  patchDebugState({
    boot: undefined,
    scene: snapshot.scene?.scene === "boot" ? undefined : snapshot.scene,
  });
}

export function setDemoDebugState(state: PixiDemoDebugState): void {
  if (!debugEnabled) return;
  patchDebugState({
    demo: state,
    scene: state,
  });
}

export function clearDemoDebugState(): void {
  if (!debugEnabled) return;
  const snapshot = debugStore.getSnapshot();
  const scene = snapshot.scene?.scene !== "boot" && snapshot.scene?.scene !== "design-system" ? undefined : snapshot.scene;
  patchDebugState({
    demo: undefined,
    scene,
  });
}

export function setDesignSystemDebugState(state: PixiDesignSystemDebugState): void {
  if (!debugEnabled) return;
  patchDebugState({
    designSystem: state,
    scene: state,
  });
}

export function setSceneIndexDebugState(state: PixiSceneIndexDebugState): void {
  if (!debugEnabled) return;
  patchDebugState({
    sceneIndex: state,
    activeScene: state.scene,
  });
}

export function clearSceneIndexDebugState(): void {
  if (!debugEnabled) return;
  patchDebugState({ sceneIndex: undefined });
}

export function clearDesignSystemDebugState(): void {
  if (!debugEnabled) return;
  const snapshot = debugStore.getSnapshot();
  patchDebugState({
    designSystem: undefined,
    scene: snapshot.scene?.scene === "design-system" ? undefined : snapshot.scene,
  });
}

export function setRuntimeDebugState(state: PixiRuntimeDebugState): void {
  if (!debugEnabled) return;
  patchDebugState({ runtime: state });
}

export function setLayoutDebugState(state: PixiLayoutDebugState): void {
  if (!debugEnabled) return;
  patchDebugState({ layout: state });
}

export function setActiveDebugScene(scene: string): void {
  if (!debugEnabled) return;
  patchDebugState({ activeScene: scene });
}

export function readCurrentDebugScene(): string {
  const snapshot = debugStore.getSnapshot();
  return snapshot.scene?.scene ?? snapshot.activeScene ?? "unknown";
}

export function getDebugSnapshot(): PixiDebugState {
  return debugStore.getSnapshot();
}

export function subscribeDebugState(listener: (snapshot: PixiDebugState) => void): () => void {
  return debugStore.subscribe(listener);
}

function ensureDebugState(): PixiDebugWindow {
  if (!window.__pixiDebug) {
    window.__pixiDebug = createDebugWindow();
  }
  return window.__pixiDebug;
}

function patchDebugState(patch: Partial<PixiDebugState>): PixiDebugWindow {
  const debug = ensureDebugState();
  const nextRevision = debugStore.getSnapshot().revision + 1;
  const snapshot = debugStore.patch({
    ...patch,
    revision: nextRevision,
  });
  syncDebugWindow(debug, snapshot);
  return debug;
}

function createDebugWindow(): PixiDebugWindow {
  const debug = {
    version: 1,
    getSnapshot: () => getDebugSnapshot(),
    dispatch: async (command: DebugCommand) => {
      const result = await dispatchDebugCommand(command);
      patchDebugState({ lastCommand: result });
      return result;
    },
    whenReady: (criteria: RuntimeReadyCriteria) => readyHandler(criteria),
  } as PixiDebugWindow;
  syncDebugWindow(debug, debugStore.getSnapshot());
  return debug;
}

function syncDebugWindow(debug: PixiDebugWindow, snapshot: PixiDebugState): void {
  Object.assign(debug, snapshot, {
    version: 1,
    getSnapshot: () => getDebugSnapshot(),
    dispatch: async (command: DebugCommand) => {
      const result = await dispatchDebugCommand(command);
      patchDebugState({ lastCommand: result });
      return result;
    },
    whenReady: (criteria: RuntimeReadyCriteria) => readyHandler(criteria),
  });
}
