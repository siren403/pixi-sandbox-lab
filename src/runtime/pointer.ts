import type { SurfaceLayout } from "./scene";

export type Pointer = {
  isDown: () => boolean;
  wasPressed: () => boolean;
  wasReleased: () => boolean;
  position: () => { x: number; y: number };
  pointers: () => Array<{ id: number; x: number; y: number }>;
  wheelDelta: () => number;
  destroy: () => void;
};

export function createPointer(target: HTMLElement, getLayout: () => SurfaceLayout): Pointer {
  let activePointerId: number | null = null;
  const activePointers = new Map<number, { x: number; y: number }>();
  let down = false;
  let pressed = false;
  let released = false;
  let x = 0;
  let y = 0;
  let wheel = 0;

  const readPosition = (event: PointerEvent) => {
    const rect = target.getBoundingClientRect();
    const scale = getLayout().scale || 1;
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  };

  const updatePosition = (event: PointerEvent) => {
    const position = readPosition(event);
    x = position.x;
    y = position.y;
    activePointers.set(event.pointerId, position);
  };

  const onPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    activePointerId ??= event.pointerId;
    down = true;
    pressed = true;
    updatePosition(event);
    target.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!activePointers.has(event.pointerId)) return;

    event.preventDefault();
    updatePosition(event);
  };

  const endPointer = (event: PointerEvent) => {
    if (!activePointers.has(event.pointerId)) return;

    event.preventDefault();
    updatePosition(event);
    activePointers.delete(event.pointerId);
    if (activePointerId === event.pointerId) {
      activePointerId = activePointers.keys().next().value ?? null;
      const next = activePointerId === null ? null : activePointers.get(activePointerId);
      if (next) {
        x = next.x;
        y = next.y;
      }
    }
    down = activePointers.size > 0;
    released = true;
    target.releasePointerCapture?.(event.pointerId);
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    wheel += event.deltaY;
  };

  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", endPointer);
  target.addEventListener("pointercancel", endPointer);
  target.addEventListener("wheel", onWheel, { passive: false });

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
    pointers() {
      return Array.from(activePointers, ([id, position]) => ({ id, ...position }));
    },
    wheelDelta() {
      const result = wheel;
      wheel = 0;
      return result;
    },
    destroy() {
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", endPointer);
      target.removeEventListener("pointercancel", endPointer);
      target.removeEventListener("wheel", onWheel);
      activePointerId = null;
      activePointers.clear();
      down = false;
      pressed = false;
      released = false;
      wheel = 0;
    },
  };
}
