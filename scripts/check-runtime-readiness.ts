import { strict as assert } from "node:assert";
import {
  matchesRuntimeReadyCriteria,
  readRuntimeReadySnapshot,
  syncRuntimeReadiness,
  type RuntimeReadySnapshot,
} from "../src/runtime/readiness";
import type { RuntimeInternalState } from "../src/runtime/scene";

const readySnapshot: RuntimeReadySnapshot = {
  activeScene: "scene-index",
  sceneLifecycle: "ready",
  transitionLifecycle: "idle",
  sceneReady: true,
  transitionIdle: true,
  commandIdle: true,
  interactiveReady: true,
  appMode: "interactive",
  readinessRevision: 4,
};

assert.equal(matchesRuntimeReadyCriteria(readySnapshot, { scene: "scene-index" }), true);
assert.equal(matchesRuntimeReadyCriteria(readySnapshot, { scene: "vertical-slice" }), false);
assert.equal(matchesRuntimeReadyCriteria(readySnapshot, { interactive: true }), true);
assert.equal(matchesRuntimeReadyCriteria({ ...readySnapshot, interactiveReady: false }, { interactive: true }), false);
assert.equal(matchesRuntimeReadyCriteria({ ...readySnapshot, sceneReady: false }, { sceneReady: true }), false);
assert.equal(matchesRuntimeReadyCriteria({ ...readySnapshot, transitionIdle: false }, { transitionIdle: true }), false);
assert.equal(matchesRuntimeReadyCriteria({ ...readySnapshot, commandIdle: false }, { commandIdle: true }), false);

const runtime = createRuntimeState({
  sceneLifecycle: "loading-scene",
  transitionLifecycle: "loading",
  loadingPhase: "loading",
  loading: true,
  runningCommands: ["scene.open"],
});

let snapshot = syncRuntimeReadiness(runtime);
assert.equal(snapshot.sceneReady, false);
assert.equal(snapshot.transitionIdle, false);
assert.equal(snapshot.commandIdle, false);
assert.equal(snapshot.interactiveReady, false);

runtime.sceneLifecycle = "ready";
runtime.transitionLifecycle = "idle";
runtime.loadingPhase = "idle";
runtime.loading = false;
runtime.runningCommands = [];
snapshot = syncRuntimeReadiness(runtime);

assert.deepEqual(readRuntimeReadySnapshot(runtime), snapshot);
assert.equal(snapshot.sceneReady, true);
assert.equal(snapshot.transitionIdle, true);
assert.equal(snapshot.commandIdle, true);
assert.equal(snapshot.interactiveReady, true);
assert.equal(matchesRuntimeReadyCriteria(snapshot, { scene: "scene-index", interactive: true }), true);

console.log("runtime readiness contract ok");

function createRuntimeState(overrides: Partial<RuntimeInternalState>): RuntimeInternalState {
  return {
    appMode: "interactive",
    activeScene: "scene-index",
    sceneLifecycle: "none",
    transitionLifecycle: "idle",
    sceneReady: false,
    transitionIdle: true,
    commandIdle: true,
    interactiveReady: false,
    readinessRevision: 0,
    loading: false,
    loadingPhase: "idle",
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
    ...overrides,
  };
}
