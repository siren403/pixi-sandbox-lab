type RectState = { x: number; y: number; width: number; height: number };

export type PixiBootDebugState = {
  scene: "boot";
  promptBounds: RectState;
  buttonBounds: RectState;
  rendered: boolean;
};

export type PixiDemoDebugState = {
  playerX: number;
  playerY: number;
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
  rendered: boolean;
};

export type PixiDesignSystemDebugState = {
  scene: "design-system";
  sections: number;
  labels: number;
  swatches: number;
  typeSamples: number;
  componentSamples: number;
  buttonCenterDeltaY: number;
  layerLabels: string[];
  rendered: boolean;
};

export type PixiRuntimeDebugState = {
  appMode: "interactive" | "transitioning" | "loading" | "destroyed";
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
  activeScene?: string;
  scene?: PixiBootDebugState | PixiDemoDebugState | PixiDesignSystemDebugState;
  boot?: PixiBootDebugState;
  demo?: PixiDemoDebugState;
  designSystem?: PixiDesignSystemDebugState;
  runtime?: PixiRuntimeDebugState;
  layout?: PixiLayoutDebugState;
};

declare global {
  interface Window {
    __pixiDebug?: PixiDebugState;
  }
}

const debugEnabled = import.meta.env.VITE_DEMO_DEBUG !== "false";

export function setBootDebugState(state: PixiBootDebugState): void {
  if (!debugEnabled) return;
  const debug = ensureDebugState();
  debug.boot = state;
  debug.scene = state;
}

export function clearBootDebugState(): void {
  if (!debugEnabled) return;
  const debug = ensureDebugState();
  debug.boot = undefined;
  if (debug.scene?.scene === "boot") debug.scene = undefined;
}

export function setDemoDebugState(state: PixiDemoDebugState): void {
  if (!debugEnabled) return;
  const debug = ensureDebugState();
  debug.demo = state;
  debug.scene = state;
}

export function clearDemoDebugState(): void {
  if (!debugEnabled) return;
  const debug = ensureDebugState();
  debug.demo = undefined;
  if (debug.scene && debug.scene.scene !== "boot" && debug.scene.scene !== "design-system") debug.scene = undefined;
}

export function setDesignSystemDebugState(state: PixiDesignSystemDebugState): void {
  if (!debugEnabled) return;
  const debug = ensureDebugState();
  debug.designSystem = state;
  debug.scene = state;
}

export function clearDesignSystemDebugState(): void {
  if (!debugEnabled) return;
  const debug = ensureDebugState();
  debug.designSystem = undefined;
  if (debug.scene?.scene === "design-system") debug.scene = undefined;
}

export function setRuntimeDebugState(state: PixiRuntimeDebugState): void {
  if (!debugEnabled) return;
  ensureDebugState().runtime = state;
}

export function setLayoutDebugState(state: PixiLayoutDebugState): void {
  if (!debugEnabled) return;
  ensureDebugState().layout = state;
}

export function setActiveDebugScene(scene: string): void {
  if (!debugEnabled) return;
  ensureDebugState().activeScene = scene;
}

export function readCurrentDebugScene(): string {
  return window.__pixiDebug?.scene?.scene ?? window.__pixiDebug?.activeScene ?? "unknown";
}

function ensureDebugState(): PixiDebugState {
  window.__pixiDebug ??= {};
  return window.__pixiDebug;
}
