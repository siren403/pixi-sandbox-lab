import { Container, Graphics, Text } from "pixi.js";
import type { Scene, SceneContext } from "./scene";

declare global {
  interface Window {
    __pixiRuntimeState?: {
      loading: boolean;
      sceneSwitches: number;
      loadingOverlayShows: number;
      lastLoadingDurationMs: number;
      loadingOverlayVisible: boolean;
    };
  }
}

const minimumLoadingMs = 500;

export class SceneManager {
  private current: Scene | null = null;
  private switchId = 0;

  async start(scene: Scene, ctx: SceneContext): Promise<void> {
    await this.switch(scene, ctx);
  }

  async switch(scene: Scene, ctx: SceneContext): Promise<void> {
    const switchId = ++this.switchId;
    this.current?.unload?.(ctx);
    this.current = null;
    ctx.runtime.loading = true;
    ctx.runtime.sceneSwitches += 1;
    ctx.runtime.loadingOverlayShows += 1;
    showLoadingOverlay(ctx);

    const loadingStartedAt = performance.now();
    const assets = typeof scene.assets === "function" ? scene.assets(ctx) : (scene.assets ?? []);
    try {
      await waitForLoadingFrame();
      await ctx.assets.load(assets);
      await waitForMinimumLoadingTime(loadingStartedAt, minimumLoadingMs);
      if (switchId !== this.switchId) return;

      this.current = scene;
      this.current.load?.(ctx);
    } finally {
      if (switchId === this.switchId) {
        ctx.runtime.lastLoadingDurationMs = performance.now() - loadingStartedAt;
        ctx.runtime.loading = false;
        hideLoadingOverlay(ctx);
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
    hideLoadingOverlay(ctx);
    this.current?.unload?.(ctx);
    this.current = null;
  }
}

function waitForLoadingFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function waitForMinimumLoadingTime(startedAt: number, minimumMs: number): Promise<void> {
  const remaining = minimumMs - (performance.now() - startedAt);
  if (remaining <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    window.setTimeout(resolve, remaining);
  });
}

function showLoadingOverlay(ctx: SceneContext): void {
  let overlay = ctx.layers.debug.getChildByLabel("loading-overlay");
  if (!overlay) {
    const group = new Container({ label: "loading-overlay" });
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
    text.position.set(ctx.layout.visibleWidth / 2, ctx.layout.visibleHeight / 2);

    group.addChild(backdrop, text);
    ctx.layers.debug.addChild(group);
    overlay = group;
  }

  overlay.visible = true;
  syncLoadingDebugState(ctx);
}

function hideLoadingOverlay(ctx: SceneContext): void {
  const overlay = ctx.layers.debug.getChildByLabel("loading-overlay");
  overlay?.destroy({ children: true });
  syncLoadingDebugState(ctx);
}

function syncLoadingDebugState(ctx: SceneContext): void {
  window.__pixiRuntimeState = {
    loading: ctx.runtime.loading,
    sceneSwitches: ctx.runtime.sceneSwitches,
    loadingOverlayShows: ctx.runtime.loadingOverlayShows,
    lastLoadingDurationMs: ctx.runtime.lastLoadingDurationMs,
    loadingOverlayVisible: ctx.layers.debug.getChildByLabel("loading-overlay")?.visible === true,
  };
}
