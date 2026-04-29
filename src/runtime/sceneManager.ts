import { Container, Graphics, Text } from "pixi.js";
import type { Scene, SceneContext } from "./scene";

declare global {
  interface Window {
    __pixiRuntimeState?: {
      loading: boolean;
      loadingPhase: "idle" | "in" | "loading" | "out";
      sceneSwitches: number;
      loadingOverlayShows: number;
      lastLoadingDurationMs: number;
      loadingProgress: number;
      loadingOverlayAlpha: number;
      loadingOverlayMaxAlpha: number;
      loadingOverlayVisible: boolean;
    };
  }
}

const defaultMinimumLoadingMs = 500;
const loadingInMs = 220;
const loadingOutMs = 260;

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
    const minimumLoadingMs = loadingOptions.minimumMs ?? defaultMinimumLoadingMs;
    const loadingStartedAt = performance.now();
    const stopProgress = showOverlay ? startLoadingOverlay(ctx, loadingStartedAt, minimumLoadingMs) : () => {};
    const assets = typeof scene.assets === "function" ? scene.assets(ctx) : (scene.assets ?? []);
    try {
      if (showOverlay) {
        await animateLoadingOverlay(ctx, 1, loadingInMs);
        if (switchId !== this.switchId) return;
      }

      previous?.unload?.(ctx);
      this.current = null;

      if (showOverlay) {
        ctx.runtime.loadingPhase = "loading";
        syncLoadingDebugState(ctx);
      }

      await ctx.assets.load(assets);
      if (showOverlay) await waitForMinimumLoadingTime(loadingStartedAt, minimumLoadingMs);
      if (switchId !== this.switchId) return;

      this.current = scene;
      this.current.load?.(ctx);

      if (showOverlay) {
        stopProgress();
        ctx.runtime.loadingProgress = 1;
        updateLoadingProgress(ctx, 1);
        ctx.runtime.loadingPhase = "out";
        await animateLoadingOverlay(ctx, 0, loadingOutMs);
      }
    } finally {
      if (switchId === this.switchId) {
        stopProgress();
        if (showOverlay) {
          ctx.runtime.lastLoadingDurationMs = performance.now() - loadingStartedAt;
          ctx.runtime.loadingProgress = 1;
          ctx.runtime.loadingOverlayAlpha = 0;
          ctx.runtime.loadingPhase = "idle";
          ctx.runtime.loading = false;
          hideLoadingOverlay(ctx);
        }
      }
    }
  }

  update(dt: number, ctx: SceneContext): void {
    this.current?.update?.(dt, ctx);
  }

  resize(ctx: SceneContext): void {
    if (ctx.runtime.loading) {
      hideLoadingOverlay(ctx);
      showLoadingOverlay(ctx);
    }
    this.current?.resize?.(ctx);
  }

  destroy(ctx: SceneContext): void {
    this.switchId += 1;
    ctx.runtime.loading = false;
    ctx.runtime.loadingPhase = "idle";
    ctx.runtime.loadingOverlayAlpha = 0;
    hideLoadingOverlay(ctx);
    this.current?.unload?.(ctx);
    this.current = null;
  }
}

function waitForMinimumLoadingTime(startedAt: number, minimumMs: number): Promise<void> {
  const remaining = minimumMs - (performance.now() - startedAt);
  if (remaining <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    window.setTimeout(resolve, remaining);
  });
}

function startLoadingOverlay(ctx: SceneContext, startedAt: number, minimumMs: number): () => void {
  ctx.runtime.loading = true;
  ctx.runtime.loadingPhase = "in";
  ctx.runtime.loadingProgress = 0;
  ctx.runtime.loadingOverlayAlpha = 0;
  ctx.runtime.loadingOverlayMaxAlpha = 0;
  ctx.runtime.loadingOverlayShows += 1;
  showLoadingOverlay(ctx);

  let frame = 0;
  const update = () => {
    const progress = minimumMs <= 0 ? 1 : Math.min(0.96, (performance.now() - startedAt) / minimumMs);
    const loop = ctx.layers.debug.getChildByLabel("loading-loop", true);
    ctx.runtime.loadingProgress = progress;
    if (loop) loop.rotation += 0.055;
    updateLoadingProgress(ctx, progress);
    syncLoadingDebugState(ctx);
    frame = requestAnimationFrame(update);
  };
  frame = requestAnimationFrame(update);

  return () => cancelAnimationFrame(frame);
}

function animateLoadingOverlay(ctx: SceneContext, targetAlpha: number, durationMs: number): Promise<void> {
  const overlay = ctx.layers.debug.getChildByLabel("loading-overlay");
  if (!overlay) return Promise.resolve();

  const startAlpha = overlay.alpha;
  const startedAt = performance.now();

  return new Promise((resolve) => {
    const step = () => {
      const progress = durationMs <= 0 ? 1 : Math.min(1, (performance.now() - startedAt) / durationMs);
      const eased = easeInOutCubic(progress);
      const alpha = startAlpha + (targetAlpha - startAlpha) * eased;
      overlay.alpha = alpha;
      ctx.runtime.loadingOverlayAlpha = alpha;
      ctx.runtime.loadingOverlayMaxAlpha = Math.max(ctx.runtime.loadingOverlayMaxAlpha, alpha);
      syncLoadingDebugState(ctx);

      if (progress >= 1) {
        resolve();
        return;
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function showLoadingOverlay(ctx: SceneContext): void {
  let overlay = ctx.layers.debug.getChildByLabel("loading-overlay");
  if (!overlay) {
    const group = new Container({ label: "loading-overlay" });
    group.alpha = ctx.runtime.loadingOverlayAlpha;
    const backdrop = new Graphics()
      .rect(0, 0, ctx.layout.visibleWidth, ctx.layout.visibleHeight)
      .fill({ color: 0x05070a, alpha: 0.74 });
    backdrop.label = "loading-backdrop";

    const text = new Text({
      text: "Loading",
      style: {
        fill: "#f8fafc",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: Math.max(28, 44 / ctx.layout.scale),
        fontWeight: "600",
      },
    });
    text.label = "loading-text";
    text.anchor.set(0.5);
    text.position.set(ctx.layout.visibleWidth / 2, ctx.layout.visibleHeight * 0.47);

    const loopRadius = Math.max(26, 42 / ctx.layout.scale);
    const loop = new Graphics()
      .roundRect(-loopRadius / 2, -loopRadius / 2, loopRadius, loopRadius, loopRadius * 0.26)
      .stroke({ color: "#38bdf8", width: Math.max(3, 5 / ctx.layout.scale), alpha: 0.95 });
    loop.label = "loading-loop";
    loop.position.set(ctx.layout.visibleWidth / 2, ctx.layout.visibleHeight * 0.4);
    loop.rotation = Math.PI / 4;

    const trackWidth = Math.min(ctx.layout.visibleWidth * 0.54, 520 / ctx.layout.scale);
    const trackHeight = Math.max(10 / ctx.layout.scale, 18);
    const track = new Graphics()
      .roundRect(-trackWidth / 2, -trackHeight / 2, trackWidth, trackHeight, trackHeight / 2)
      .fill({ color: 0x334155, alpha: 0.92 });
    track.label = "loading-progress-track";
    track.position.set(ctx.layout.visibleWidth / 2, ctx.layout.visibleHeight * 0.54);

    const fill = new Graphics();
    fill.label = "loading-progress-fill";
    fill.position.set(ctx.layout.visibleWidth / 2 - trackWidth / 2, ctx.layout.visibleHeight * 0.54 - trackHeight / 2);

    group.addChild(backdrop, loop, text, track, fill);
    ctx.layers.debug.addChild(group);
    overlay = group;
  }

  overlay.visible = true;
  updateLoadingProgress(ctx, ctx.runtime.loadingProgress);
  syncLoadingDebugState(ctx);
}

function updateLoadingProgress(ctx: SceneContext, progress: number): void {
  const fill = ctx.layers.debug.getChildByLabel("loading-progress-fill", true) as Graphics | null;
  if (!fill) return;

  const width = Math.min(ctx.layout.visibleWidth * 0.54, 520 / ctx.layout.scale);
  const height = Math.max(10 / ctx.layout.scale, 18);
  fill.clear();
  fill
    .roundRect(0, 0, width * progress, height, height / 2)
    .fill("#38bdf8");
}

function hideLoadingOverlay(ctx: SceneContext): void {
  const overlay = ctx.layers.debug.getChildByLabel("loading-overlay");
  overlay?.destroy({ children: true });
  syncLoadingDebugState(ctx);
}

function syncLoadingDebugState(ctx: SceneContext): void {
  window.__pixiRuntimeState = {
    loading: ctx.runtime.loading,
    loadingPhase: ctx.runtime.loadingPhase,
    sceneSwitches: ctx.runtime.sceneSwitches,
    loadingOverlayShows: ctx.runtime.loadingOverlayShows,
    lastLoadingDurationMs: ctx.runtime.lastLoadingDurationMs,
    loadingProgress: ctx.runtime.loadingProgress,
    loadingOverlayAlpha: ctx.runtime.loadingOverlayAlpha,
    loadingOverlayMaxAlpha: ctx.runtime.loadingOverlayMaxAlpha,
    loadingOverlayVisible: ctx.layers.debug.getChildByLabel("loading-overlay")?.visible === true,
  };
}
