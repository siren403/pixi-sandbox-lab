import type {} from "gsap";
import { BlurFilter, type Container } from "pixi.js";
import * as PIXI from "pixi.js";
import { gsap } from "gsap/gsap-core";
import { PixiPlugin } from "gsap/PixiPlugin";

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

export type MotionAnimation = ReturnType<typeof gsap.to>;
export type MotionSet = {
  animations: MotionAnimation[];
  cleanup: () => void;
};
type MotionTarget = object | null;
type MotionVars = Omit<gsap.TweenVars, "pixi"> & {
  pixi?: PixiPlugin.Vars;
};
type FilterTarget = Container & {
  filters?: Container["filters"];
};

type ProgressAnimationOptions = {
  durationMs: number;
  ease?: string;
  onUpdate: (progress: number) => void;
};

export function animateProgress({
  durationMs,
  ease = "none",
  onUpdate,
}: ProgressAnimationOptions): Promise<MotionAnimation> {
  const state = { progress: 0 };

  return new Promise((resolve) => {
    const tween = gsap.to(state, {
      progress: 1,
      duration: Math.max(0, durationMs) / 1000,
      ease,
      onUpdate: () => onUpdate(state.progress),
      onComplete: () => {
        onUpdate(1);
        resolve(tween);
      },
    });
  });
}

export function createLoopingMotion(targets: Array<MotionAnimation | null>): MotionAnimation[] {
  return targets.filter((target): target is MotionAnimation => target !== null);
}

export function rotateLoop(target: object | null, rotation: number, duration: number): MotionAnimation | null {
  if (!target) return null;
  return gsap.to(target, {
    pixi: { rotation },
    duration,
    ease: "none",
    repeat: -1,
  });
}

export function pulseScaleLoop(target: { scale?: { x: number; y: number } } | null): MotionAnimation | null {
  if (!target) return null;
  return gsap.to(target, {
    pixi: { scaleX: 1.06, scaleY: 1.06 },
    duration: 0.42,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
  });
}

export function pixiTo(target: MotionTarget, vars: MotionVars): MotionAnimation | null {
  if (!target) return null;
  return gsap.to(target, vars);
}

export function createBlurPulse(target: FilterTarget | null, blurStrength: number): MotionSet | null {
  if (!target) return null;

  const previousFilters = target.filters;
  const blur = new BlurFilter({ strength: 0, quality: 2, kernelSize: 5 });
  target.filters = previousFilters ? [...previousFilters, blur] : [blur];

  const animation = gsap.to(blur, {
    strength: blurStrength,
    duration: 0.58,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
  });

  return {
    animations: [animation],
    cleanup: () => {
      animation.kill();
      target.filters = previousFilters ? [...previousFilters] : undefined;
      blur.destroy?.();
    },
  };
}

export function stopMotion(animations: MotionAnimation[]): void {
  animations.forEach((animation) => animation.kill());
}
