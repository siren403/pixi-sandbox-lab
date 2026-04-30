import type { Scene, SceneContext } from "./scene";
import { createTransition, minimumLoadingMsRange, syncTransitionState } from "./transition";

export class SceneManager {
  private current: Scene | null = null;
  private switchId = 0;

  async start(scene: Scene, ctx: SceneContext): Promise<void> {
    await this.switch(scene, ctx);
  }

  async switch(scene: Scene, ctx: SceneContext): Promise<void> {
    const switchId = ++this.switchId;
    const previous = this.current;
    ctx.runtime.sceneSwitches += 1;

    const loadingOptions = scene.loading ?? {};
    const showOverlay = loadingOptions.overlay !== false;
    const minimumLoadingMs = loadingOptions.minimumMs ?? sampleMinimumLoadingMs();
    ctx.runtime.loadingMinimumMs = showOverlay ? minimumLoadingMs : 0;
    const loadingStartedAt = performance.now();
    const transition = showOverlay ? createTransition(ctx) : null;
    const assets = typeof scene.assets === "function" ? scene.assets(ctx) : (scene.assets ?? []);

    try {
      if (transition) {
        await transition.animateIn();
        if (switchId !== this.switchId) return;
      }

      previous?.unload?.(ctx);
      this.current = null;

      if (transition) {
        ctx.runtime.loadingPhase = "loading";
        ctx.runtime.appMode = "loading";
        syncTransitionState(ctx);
      }

      const progressFrame = transition ? startProgressLoop(ctx, transition, loadingStartedAt, minimumLoadingMs) : () => {};
      await ctx.assets.load(assets);
      if (transition) await waitForMinimumLoadingTime(loadingStartedAt, minimumLoadingMs);
      progressFrame();
      if (switchId !== this.switchId) return;

      this.current = scene;
      this.current.load?.(ctx);

      if (transition) {
        transition.updateProgress(1);
        ctx.runtime.loadingPhase = "out";
        ctx.runtime.appMode = "transitioning";
        syncTransitionState(ctx);
        await transition.animateOut();
      }
    } finally {
      if (switchId === this.switchId) {
        if (transition) {
          ctx.runtime.lastLoadingDurationMs = performance.now() - loadingStartedAt;
          ctx.runtime.loadingProgress = 1;
          ctx.runtime.loadingOverlayAlpha = 0;
          ctx.runtime.loadingPhase = "idle";
          ctx.runtime.loading = false;
          transition.destroy();
        }
      }
    }
  }

  update(dt: number, ctx: SceneContext): void {
    this.current?.update?.(dt, ctx);
  }

  resize(ctx: SceneContext): void {
    this.current?.resize?.(ctx);
  }

  destroy(ctx: SceneContext): void {
    this.switchId += 1;
    ctx.runtime.loading = false;
    ctx.runtime.appMode = "destroyed";
    ctx.runtime.loadingPhase = "idle";
    ctx.runtime.loadingOverlayAlpha = 0;
    this.current?.unload?.(ctx);
    this.current = null;
  }
}

function startProgressLoop(
  ctx: SceneContext,
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

function sampleMinimumLoadingMs(): number {
  const { min, max } = minimumLoadingMsRange;
  return min + Math.random() * (max - min);
}
