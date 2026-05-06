import type { RuntimeInternalState } from "./scene";

export type RuntimeReadyCriteria = {
  scene?: string;
  interactive?: boolean;
  sceneReady?: boolean;
  transitionIdle?: boolean;
  commandIdle?: boolean;
  timeoutMs?: number;
};

export type RuntimeReadySnapshot = Pick<
  RuntimeInternalState,
  | "activeScene"
  | "sceneLifecycle"
  | "transitionLifecycle"
  | "sceneReady"
  | "transitionIdle"
  | "commandIdle"
  | "interactiveReady"
  | "appMode"
  | "readinessRevision"
>;

type RuntimeWaiter = {
  criteria: RuntimeReadyCriteria;
  resolve: (snapshot: RuntimeReadySnapshot) => void;
  reject: (error: Error) => void;
  timeout: number;
};

const waitersByRuntime = new WeakMap<RuntimeInternalState, Set<RuntimeWaiter>>();

export function syncRuntimeReadiness(runtime: RuntimeInternalState): RuntimeReadySnapshot {
  runtime.sceneReady = runtime.sceneLifecycle === "ready";
  runtime.transitionIdle = runtime.transitionLifecycle === "idle" && runtime.loadingPhase === "idle" && !runtime.loading;
  runtime.commandIdle = runtime.runningCommands.length === 0;
  runtime.interactiveReady =
    runtime.sceneReady && runtime.transitionIdle && runtime.commandIdle && runtime.appMode === "interactive";
  runtime.readinessRevision += 1;
  const snapshot = readRuntimeReadySnapshot(runtime);
  notifyRuntimeWaiters(runtime, snapshot);
  return snapshot;
}

export function waitForRuntimeReady(
  runtime: RuntimeInternalState,
  criteria: RuntimeReadyCriteria,
): Promise<RuntimeReadySnapshot> {
  const snapshot = readRuntimeReadySnapshot(runtime);
  if (matchesReadyCriteria(snapshot, criteria)) return Promise.resolve(snapshot);

  const timeoutMs = criteria.timeoutMs ?? 15000;
  return new Promise((resolve, reject) => {
    const waiters = readRuntimeWaiters(runtime);
    const waiter: RuntimeWaiter = {
      criteria,
      resolve,
      reject,
      timeout: window.setTimeout(() => {
        waiters.delete(waiter);
        reject(new Error(`Timed out waiting for runtime readiness: ${JSON.stringify(criteria)}`));
      }, timeoutMs),
    };
    waiters.add(waiter);
  });
}

export function readRuntimeReadySnapshot(runtime: RuntimeInternalState): RuntimeReadySnapshot {
  return {
    activeScene: runtime.activeScene,
    sceneLifecycle: runtime.sceneLifecycle,
    transitionLifecycle: runtime.transitionLifecycle,
    sceneReady: runtime.sceneReady,
    transitionIdle: runtime.transitionIdle,
    commandIdle: runtime.commandIdle,
    interactiveReady: runtime.interactiveReady,
    appMode: runtime.appMode,
    readinessRevision: runtime.readinessRevision,
  };
}

function notifyRuntimeWaiters(runtime: RuntimeInternalState, snapshot: RuntimeReadySnapshot): void {
  const waiters = waitersByRuntime.get(runtime);
  if (!waiters) return;

  for (const waiter of Array.from(waiters)) {
    if (!matchesReadyCriteria(snapshot, waiter.criteria)) continue;
    window.clearTimeout(waiter.timeout);
    waiters.delete(waiter);
    waiter.resolve(snapshot);
  }
}

function matchesReadyCriteria(snapshot: RuntimeReadySnapshot, criteria: RuntimeReadyCriteria): boolean {
  if (criteria.scene !== undefined && snapshot.activeScene !== criteria.scene) return false;
  if (criteria.interactive === true && !snapshot.interactiveReady) return false;
  if (criteria.sceneReady === true && !snapshot.sceneReady) return false;
  if (criteria.transitionIdle === true && !snapshot.transitionIdle) return false;
  if (criteria.commandIdle === true && !snapshot.commandIdle) return false;
  return true;
}

function readRuntimeWaiters(runtime: RuntimeInternalState): Set<RuntimeWaiter> {
  const existing = waitersByRuntime.get(runtime);
  if (existing) return existing;

  const waiters = new Set<RuntimeWaiter>();
  waitersByRuntime.set(runtime, waiters);
  return waiters;
}
