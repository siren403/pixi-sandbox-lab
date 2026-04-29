import type { SurfaceLayout } from "./scene";

export type Pointer = {
  isDown: () => boolean;
  wasPressed: () => boolean;
  wasReleased: () => boolean;
  position: () => { x: number; y: number };
  destroy: () => void;
};

export function createPointer(target: HTMLElement, getLayout: () => SurfaceLayout): Pointer {
  let activePointerId: number | null = null;
  let down = false;
  let pressed = false;
  let released = false;
  let x = 0;
  let y = 0;

  const updatePosition = (event: PointerEvent) => {
    const rect = target.getBoundingClientRect();
    const scale = getLayout().scale || 1;
    x = (event.clientX - rect.left) / scale;
    y = (event.clientY - rect.top) / scale;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (activePointerId !== null && activePointerId !== event.pointerId) return;

    event.preventDefault();
    activePointerId = event.pointerId;
    down = true;
    pressed = true;
    updatePosition(event);
    target.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;

    event.preventDefault();
    updatePosition(event);
  };

  const endPointer = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;

    event.preventDefault();
    updatePosition(event);
    activePointerId = null;
    down = false;
    released = true;
    target.releasePointerCapture?.(event.pointerId);
  };

  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", endPointer);
  target.addEventListener("pointercancel", endPointer);

  return {
    isDown() {
      return down;
    },
    wasPressed() {
      const result = pressed;
      pressed = false;
      return result;
    },
    wasReleased() {
      const result = released;
      released = false;
      return result;
    },
    position() {
      return { x, y };
    },
    destroy() {
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", endPointer);
      target.removeEventListener("pointercancel", endPointer);
      activePointerId = null;
      down = false;
      pressed = false;
      released = false;
    },
  };
}
