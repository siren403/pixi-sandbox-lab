import { gsap } from "gsap/gsap-core";

export type MotionAnimation = ReturnType<typeof gsap.to>;

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
    rotation,
    duration,
    ease: "none",
    repeat: -1,
  });
}

export function pulseScaleLoop(target: { scale?: { x: number; y: number } } | null): MotionAnimation | null {
  if (!target?.scale) return null;
  return gsap.to(target.scale, {
    x: 1.06,
    y: 1.06,
    duration: 0.42,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
  });
}

export function stopMotion(animations: MotionAnimation[]): void {
  animations.forEach((animation) => animation.kill());
}
