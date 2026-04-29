import { Container, Graphics } from "pixi.js";
import {
  animateProgress,
  createLoopingMotion,
  pixiTo,
  pulseScaleLoop,
  rotateLoop,
  stopMotion,
  type MotionAnimation,
} from "./motion";
import type { SceneContext } from "./scene";

export const minimumLoadingMsRange = { min: 500, max: 1000 } as const;

const transitionInMs = 480;
const transitionOutMs = 540;

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

  const loopMotion = createLoadingLoopMotion(root);

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
      stopMotion(loopMotion);
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
    loadingMinimumMs: ctx.runtime.loadingMinimumMs,
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

  const loopRadius = Math.max(54, 92 / ctx.layout.scale);
  const loop = new Graphics()
    .arc(0, 0, loopRadius / 2, -Math.PI * 0.15, Math.PI * 1.28)
    .stroke({ color: "#38bdf8", width: Math.max(4, 7 / ctx.layout.scale), alpha: 0.96 });
  loop.label = "loading-loop";
  loop.position.set(width / 2, height * 0.43);

  const loopInner = new Graphics()
    .arc(0, 0, loopRadius / 3, Math.PI * 0.25, Math.PI * 1.7)
    .stroke({ color: "#facc15", width: Math.max(3, 5 / ctx.layout.scale), alpha: 0.9 });
  loopInner.label = "loading-loop-inner";
  loopInner.position.copyFrom(loop.position);

  const dotOrbitRadius = loopRadius * 0.34;
  const loopDot = new Container({ label: "loading-loop-dot" });
  const dot = new Graphics()
    .circle(dotOrbitRadius, 0, Math.max(4, 7 / ctx.layout.scale))
    .fill("#f8fafc");
  loopDot.addChild(dot);
  loopDot.position.copyFrom(loop.position);

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

  root.addChild(backdrop, slashA, slashB, loop, loopInner, loopDot, track, fill);
  setUiAlpha(root, 0);
  return root;
}

function createSlash(width: number, height: number, color: string): Graphics {
  return new Graphics()
    .roundRect(-width / 2, -height / 2, width, height, height / 2)
    .fill(color);
}

function createLoadingLoopMotion(root: Container): MotionAnimation[] {
  const loop = root.getChildByLabel("loading-loop", true);
  const loopInner = root.getChildByLabel("loading-loop-inner", true);
  const loopDot = root.getChildByLabel("loading-loop-dot", true);
  const slashA = root.getChildByLabel("transition-slash-a", true);
  const slashB = root.getChildByLabel("transition-slash-b", true);

  return createLoopingMotion([
    rotateLoop(loop, 360, 1.12),
    rotateLoop(loopInner, -360, 1.72),
    rotateLoop(loopDot, 360, 0.82),
    pulseScaleLoop(loop),
    pixiTo(loop, {
      pixi: { skewX: 5, skewY: -3 },
      duration: 0.68,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    }),
    pixiTo(loopInner, {
      pixi: { scaleX: 0.92, scaleY: 1.12, skewX: -7 },
      duration: 0.46,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    }),
    pixiTo(slashA, {
      pixi: { tint: "#e0f2fe", scaleX: 1.08 },
      duration: 0.52,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    }),
    pixiTo(slashB, {
      pixi: { tint: "#fde68a", scaleX: 0.92 },
      duration: 0.62,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    }),
  ]);
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

  return animateProgress({
    durationMs,
    onUpdate(raw) {
      const travel = direction === "in" ? easeOutCubic(raw) : easeInCubic(raw);
      const panelProgress = direction === "in"
        ? easeOutCubic(raw)
        : 1 - Math.min(1, easeInExpo(raw));
      const uiAlpha = direction === "in" ? smoothstep(raw) : 1 - smoothstep(raw);

      panels.forEach((panel, index) => {
        const targetX = width * (0.22 + index * 0.24);
        const offscreenLeft = -width * (0.86 + index * 0.16);
        const offscreenRight = width * (1.22 + index * 0.26);
        const sweepOffset = Math.sin((raw * 1.45 + index * 0.18) * Math.PI) * width * 0.05;
        const wobble = Math.sin((raw * 2.2 + index * 0.28) * Math.PI) * (20 + index * 6);
        panel.x = direction === "in"
          ? lerp(offscreenLeft, targetX, travel) + sweepOffset * (1 - raw)
          : lerp(targetX, offscreenRight, travel) + sweepOffset * raw;
        panel.y = ctx.layout.visibleHeight / 2 + wobble;
      });

      if (backdrop) backdrop.alpha = direction === "in" ? 0.54 * smoothstep(raw) : 0.54 * (1 - smoothstep(raw));
      const slashOffsetA = Math.sin(raw * Math.PI * 2.4) * width * 0.018;
      const slashOffsetB = Math.cos(raw * Math.PI * 2.1) * width * 0.014;
      if (slashA) slashA.x = direction === "in"
        ? lerp(-width * 0.62, width * 0.58, easeOutCubic(raw)) + slashOffsetA * (1 - raw)
        : lerp(width * 0.58, width * 1.34, easeInCubic(raw)) + slashOffsetA * raw;
      if (slashB) slashB.x = direction === "in"
        ? lerp(-width * 0.78, width * 0.42, easeOutCubic(raw)) + slashOffsetB * (1 - raw)
        : lerp(width * 0.42, width * 1.22, easeInCubic(raw)) + slashOffsetB * raw;

      setUiAlpha(root, uiAlpha);
      ctx.runtime.loadingOverlayAlpha = panelProgress;
      ctx.runtime.loadingOverlayMaxAlpha = Math.max(ctx.runtime.loadingOverlayMaxAlpha, panelProgress);
      syncTransitionState(ctx);
    },
  }).then(() => undefined);
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
  for (const label of ["loading-loop", "loading-loop-inner", "loading-loop-dot", "loading-progress-track", "loading-progress-fill"]) {
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

function easeOutCubic(value: number): number {
  const inverse = 1 - clamp01(value);
  return 1 - inverse * inverse * inverse;
}

function easeInCubic(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * clamped;
}
