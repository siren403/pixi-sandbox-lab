import { Container, Graphics, Text } from "pixi.js";
import type { SceneContext } from "./scene";

export const defaultMinimumLoadingMs = 500;

const transitionInMs = 360;
const transitionOutMs = 420;

export type TransitionController = {
  animateIn: () => Promise<void>;
  animateOut: () => Promise<void>;
  updateProgress: (progress: number) => void;
  panelCount: () => number;
  destroy: () => void;
};

export function createTransition(ctx: SceneContext): TransitionController {
  ctx.runtime.loading = true;
  ctx.runtime.loadingPhase = "in";
  ctx.runtime.loadingProgress = 0;
  ctx.runtime.loadingOverlayAlpha = 0;
  ctx.runtime.loadingOverlayMaxAlpha = 0;
  ctx.runtime.loadingOverlayShows += 1;

  const root = createTransitionRoot(ctx);
  ctx.layers.debug.addChild(root);
  syncTransitionState(ctx);

  let loopFrame = 0;
  const updateLoop = () => {
    const loop = root.getChildByLabel("loading-loop", true);
    const slashA = root.getChildByLabel("transition-slash-a", true);
    const slashB = root.getChildByLabel("transition-slash-b", true);
    if (loop) loop.rotation += 0.062;
    if (slashA) slashA.x += Math.sin(performance.now() / 140) * 1.6;
    if (slashB) slashB.x -= Math.cos(performance.now() / 160) * 1.3;
    loopFrame = requestAnimationFrame(updateLoop);
  };
  loopFrame = requestAnimationFrame(updateLoop);

  return {
    animateIn: () => animateTransition(ctx, root, "in", transitionInMs),
    animateOut: () => animateTransition(ctx, root, "out", transitionOutMs),
    updateProgress(progress) {
      ctx.runtime.loadingProgress = progress;
      updateLoadingProgress(ctx, root, progress);
      syncTransitionState(ctx);
    },
    panelCount() {
      return getTransitionPanels(root).length;
    },
    destroy() {
      cancelAnimationFrame(loopFrame);
      root.destroy({ children: true });
      ctx.runtime.transitionPanels = 0;
      syncTransitionState(ctx);
    },
  };
}

export function syncTransitionState(ctx: SceneContext): void {
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
    transitionPanels: countTransitionPanels(ctx),
    transitionPanelMaxCount: ctx.runtime.transitionPanelMaxCount,
  };
}

function createTransitionRoot(ctx: SceneContext): Container {
  const root = new Container({ label: "loading-overlay" });
  ctx.runtime.transitionPanels = 4;
  ctx.runtime.transitionPanelMaxCount = Math.max(ctx.runtime.transitionPanelMaxCount, 4);
  const width = ctx.layout.visibleWidth;
  const height = ctx.layout.visibleHeight;
  const diagonalSpan = Math.hypot(width, height);
  const panelWidth = diagonalSpan * 0.42;
  const panelHeight = diagonalSpan * 1.35;
  const centerY = height / 2;
  const angle = -0.22;

  const backdrop = new Graphics()
    .rect(0, 0, width, height)
    .fill({ color: 0x05070a, alpha: 0.54 });
  backdrop.label = "loading-backdrop";
  backdrop.alpha = 0;

  const panelColors = [0x0f172a, 0x111827, 0x164e63, 0x020617];
  panelColors.forEach((color, index) => {
    const panel = new Graphics()
      .rect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight)
      .fill({ color, alpha: 0.97 });
    panel.label = `transition-panel-${index}`;
    panel.rotation = angle;
    panel.position.set(-panelWidth - index * panelWidth * 0.45, centerY);
    panel.alpha = 0.98;
    root.addChild(panel);
  });

  const slashA = createSlash(width * 0.82, 7 / ctx.layout.scale, "#67e8f9");
  slashA.label = "transition-slash-a";
  slashA.rotation = angle;
  slashA.position.set(-width * 0.55, height * 0.32);

  const slashB = createSlash(width * 0.62, 5 / ctx.layout.scale, "#facc15");
  slashB.label = "transition-slash-b";
  slashB.rotation = angle;
  slashB.position.set(-width * 0.72, height * 0.67);

  const loopRadius = Math.max(28, 46 / ctx.layout.scale);
  const loop = new Graphics()
    .roundRect(-loopRadius / 2, -loopRadius / 2, loopRadius, loopRadius, loopRadius * 0.25)
    .stroke({ color: "#38bdf8", width: Math.max(3, 5 / ctx.layout.scale), alpha: 0.96 });
  loop.label = "loading-loop";
  loop.position.set(width / 2, height * 0.4);
  loop.rotation = Math.PI / 4;

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
  text.position.set(width / 2, height * 0.47);

  const trackWidth = Math.min(width * 0.54, 520 / ctx.layout.scale);
  const trackHeight = Math.max(10 / ctx.layout.scale, 18);
  const track = new Graphics()
    .roundRect(-trackWidth / 2, -trackHeight / 2, trackWidth, trackHeight, trackHeight / 2)
    .fill({ color: 0x334155, alpha: 0.9 });
  track.label = "loading-progress-track";
  track.position.set(width / 2, height * 0.54);

  const fill = new Graphics();
  fill.label = "loading-progress-fill";
  fill.position.set(width / 2 - trackWidth / 2, height * 0.54 - trackHeight / 2);

  root.addChild(backdrop, slashA, slashB, loop, text, track, fill);
  setUiAlpha(root, 0);
  return root;
}

function createSlash(width: number, height: number, color: string): Graphics {
  return new Graphics()
    .roundRect(-width / 2, -height / 2, width, height, height / 2)
    .fill(color);
}

function animateTransition(
  ctx: SceneContext,
  root: Container,
  direction: "in" | "out",
  durationMs: number,
): Promise<void> {
  const width = ctx.layout.visibleWidth;
  const panels = getTransitionPanels(root);
  const backdrop = root.getChildByLabel("loading-backdrop", true);
  const slashA = root.getChildByLabel("transition-slash-a", true);
  const slashB = root.getChildByLabel("transition-slash-b", true);
  const start = performance.now();

  return new Promise((resolve) => {
    const step = () => {
      const raw = durationMs <= 0 ? 1 : Math.min(1, (performance.now() - start) / durationMs);
      const eased = easeOutExpo(raw);
      const panelProgress = direction === "in" ? eased : 1 - easeInExpo(raw);
      const uiAlpha = direction === "in" ? smoothstep(raw) : 1 - smoothstep(raw);

      panels.forEach((panel, index) => {
        const targetX = width * (0.22 + index * 0.24);
        const offscreenLeft = -width * (0.86 + index * 0.16);
        const offscreenRight = width * (1.24 + index * 0.18);
        panel.x = direction === "in"
          ? lerp(offscreenLeft, targetX, clamp01(panelProgress * (1.18 - index * 0.06)))
          : lerp(targetX, offscreenRight, clamp01(easeInExpo(raw) * (1.16 - index * 0.05)));
      });

      if (backdrop) backdrop.alpha = direction === "in" ? 0.54 * smoothstep(raw) : 0.54 * (1 - smoothstep(raw));
      if (slashA) slashA.x = direction === "in" ? lerp(-width * 0.55, width * 0.55, eased) : lerp(width * 0.55, width * 1.32, easeInExpo(raw));
      if (slashB) slashB.x = direction === "in" ? lerp(-width * 0.72, width * 0.42, eased) : lerp(width * 0.42, width * 1.18, easeInExpo(raw));

      setUiAlpha(root, uiAlpha);
      ctx.runtime.loadingOverlayAlpha = panelProgress;
      ctx.runtime.loadingOverlayMaxAlpha = Math.max(ctx.runtime.loadingOverlayMaxAlpha, panelProgress);
      syncTransitionState(ctx);

      if (raw >= 1) {
        resolve();
        return;
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

function updateLoadingProgress(ctx: SceneContext, root: Container, progress: number): void {
  const fill = root.getChildByLabel("loading-progress-fill", true) as Graphics | null;
  if (!fill) return;

  const width = Math.min(ctx.layout.visibleWidth * 0.54, 520 / ctx.layout.scale);
  const height = Math.max(10 / ctx.layout.scale, 18);
  fill.clear();
  fill
    .roundRect(0, 0, width * progress, height, height / 2)
    .fill("#38bdf8");
}

function setUiAlpha(root: Container, alpha: number): void {
  for (const label of ["loading-loop", "loading-text", "loading-progress-track", "loading-progress-fill"]) {
    const child = root.getChildByLabel(label, true);
    if (child) child.alpha = alpha;
  }
}

function getTransitionPanels(root: Container): Container[] {
  return root.children.filter((child) => child.label?.startsWith("transition-panel-")) as Container[];
}

function countTransitionPanels(ctx: SceneContext): number {
  const root = ctx.layers.debug.getChildByLabel("loading-overlay");
  return root instanceof Container ? getTransitionPanels(root).length : 0;
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function easeOutExpo(value: number): number {
  return value >= 1 ? 1 : 1 - Math.pow(2, -10 * value);
}

function easeInExpo(value: number): number {
  return value <= 0 ? 0 : Math.pow(2, 10 * value - 10);
}
