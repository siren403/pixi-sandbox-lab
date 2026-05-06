import type { RuntimeContext, Scene } from "./scene";
import { createTransition, minimumLoadingMsRange, syncTransitionState } from "./transition";
import { setActiveDebugScene } from "../debug/stateBridge";

export class SceneManager {
  private current: Scene | null = null;
  private switchId = 0;

  async start(scene: Scene, ctx: RuntimeContext): Promise<void> {
    await this.switch(scene, ctx);
  }

  async switch(scene: Scene, ctx: RuntimeContext): Promise<void> {
    const switchId = ++this.switchId;
    const previous = this.current;
    ctx.runtimeState.sceneSwitches += 1;
    ctx.runtimeState.activeScene = scene.name;
    ctx.runtimeState.sceneLifecycle = "unloading";
    setActiveDebugScene(scene.name);
    syncTransitionState(ctx);

    const transitionOptions = resolveTransitionOptions(scene);
    const minimumLoadingMs = transitionOptions.minimumMs ?? sampleMinimumLoadingMs();
    ctx.runtimeState.loadingMinimumMs = transitionOptions.enabled ? minimumLoadingMs : 0;
    const loadingStartedAt = performance.now();
    const transition = transitionOptions.enabled ? createTransition(ctx) : null;
    const assets = typeof scene.assets === "function" ? scene.assets(ctx) : (scene.assets ?? []);

    try {
      if (transition) {
        await transition.animateIn();
        if (switchId !== this.switchId) return;
      }

      previous?.unload?.(ctx);
      this.current = null;
      ctx.runtimeState.sceneLifecycle = "loading-assets";
      syncTransitionState(ctx);

      if (transition) {
        ctx.runtimeState.loadingPhase = "loading";
        ctx.runtimeState.transitionLifecycle = "loading";
        ctx.runtimeState.appMode = "loading";
        syncTransitionState(ctx);
      }

      const progressFrame = transition ? startProgressLoop(ctx, transition, loadingStartedAt, minimumLoadingMs) : () => {};
      await ctx.assets.load(assets);
      if (transition) await waitForMinimumLoadingTime(loadingStartedAt, minimumLoadingMs);
      progressFrame();
      if (switchId !== this.switchId) return;

      this.current = scene;
      setActiveDebugScene(scene.name);
      ctx.runtimeState.sceneLifecycle = "loading-scene";
      syncTransitionState(ctx);
      this.current.load?.(ctx);
      ctx.runtimeState.sceneLifecycle = "render-pending";
      syncTransitionState(ctx);

      if (transition) {
        transition.updateProgress(1);
        ctx.runtimeState.loadingPhase = "out";
        ctx.runtimeState.transitionLifecycle = "out";
        ctx.runtimeState.appMode = "transitioning";
        syncTransitionState(ctx);
        await transition.animateOut();
      }
    } finally {
      if (switchId === this.switchId) {
        if (transition) {
          ctx.runtimeState.lastLoadingDurationMs = performance.now() - loadingStartedAt;
          ctx.runtimeState.loadingProgress = 1;
          ctx.runtimeState.loadingOverlayAlpha = 0;
          ctx.runtimeState.loadingPhase = "idle";
          ctx.runtimeState.transitionLifecycle = "idle";
          ctx.runtimeState.loading = false;
          transition.destroy();
        }
        if (this.current === scene && ctx.runtimeState.sceneLifecycle === "render-pending") {
          await waitForRenderFrame();
          ctx.runtimeState.sceneLifecycle = "ready";
        }
        syncTransitionState(ctx);
      }
    }
  }

  update(dt: number, ctx: RuntimeContext): void {
    this.current?.update?.(dt, ctx);
  }

  resize(ctx: RuntimeContext): void {
    this.current?.resize?.(ctx);
  }

  destroy(ctx: RuntimeContext): void {
    this.switchId += 1;
    ctx.runtimeState.loading = false;
    ctx.runtimeState.appMode = "destroyed";
    ctx.runtimeState.activeScene = "destroyed";
    ctx.runtimeState.sceneLifecycle = "none";
    ctx.runtimeState.transitionLifecycle = "idle";
    ctx.runtimeState.loadingPhase = "idle";
    ctx.runtimeState.loadingOverlayAlpha = 0;
    setActiveDebugScene("destroyed");
    this.current?.unload?.(ctx);
    this.current = null;
  }
}

function resolveTransitionOptions(scene: Scene): { enabled: boolean; minimumMs?: number } {
  if (scene.transition) {
    return {
      enabled: scene.transition.enabled !== false,
      minimumMs: scene.transition.minimumMs,
    };
  }

  return {
    enabled: scene.loading?.overlay !== false,
    minimumMs: scene.loading?.minimumMs,
  };
}

function startProgressLoop(
  ctx: RuntimeContext,
  transition: { updateProgress: (progress: number) => void },
  startedAt: number,
  minimumMs: number,
): () => void {
  let frame = 0;
  const update = () => {
    const progress = minimumMs <= 0 ? 1 : Math.min(0.96, (performance.now() - startedAt) / minimumMs);
    transition.updateProgress(progress);
    frame = requestAnimationFrame(update);
  };
  frame = requestAnimationFrame(update);

  return () => cancelAnimationFrame(frame);
}

function waitForMinimumLoadingTime(startedAt: number, minimumMs: number): Promise<void> {
  const remaining = minimumMs - (performance.now() - startedAt);
  if (remaining <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    window.setTimeout(resolve, remaining);
  });
}

function waitForRenderFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function sampleMinimumLoadingMs(): number {
  const { min, max } = minimumLoadingMsRange;
  return min + Math.random() * (max - min);
}
