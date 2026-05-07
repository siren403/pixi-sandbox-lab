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

export type PointerDevice = Pointer & {
  preUpdate: () => void;
  postUpdate: () => void;
  clearAll: () => void;
};

type PointerSnapshot = {
  down: boolean;
  pressed: boolean;
  released: boolean;
  x: number;
  y: number;
  wheel: number;
  pointers: Array<{ id: number; x: number; y: number }>;
};

type PointerRawState = {
  down: boolean;
  pressed: boolean;
  released: boolean;
  x: number;
  y: number;
  wheel: number;
  activePointerId: number | null;
  activePointers: Map<number, { x: number; y: number }>;
};

const emptyPointerSnapshot = (): PointerSnapshot => ({
  down: false,
  pressed: false,
  released: false,
  x: 0,
  y: 0,
  wheel: 0,
  pointers: [],
});

const emptyPointerRawState = (): PointerRawState => ({
  down: false,
  pressed: false,
  released: false,
  x: 0,
  y: 0,
  wheel: 0,
  activePointerId: null,
  activePointers: new Map(),
});

export function createPointer(target: HTMLElement, getLayout: () => SurfaceLayout): PointerDevice {
  const raw = emptyPointerRawState();
  const snapshot = emptyPointerSnapshot();

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
    raw.x = position.x;
    raw.y = position.y;
    raw.activePointers.set(event.pointerId, position);
  };

  const onPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    raw.activePointerId ??= event.pointerId;
    raw.down = true;
    raw.pressed = true;
    updatePosition(event);
    target.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!raw.activePointers.has(event.pointerId)) return;

    event.preventDefault();
    updatePosition(event);
  };

  const endPointer = (event: PointerEvent) => {
    if (!raw.activePointers.has(event.pointerId)) return;

    event.preventDefault();
    updatePosition(event);
    raw.activePointers.delete(event.pointerId);
    if (raw.activePointerId === event.pointerId) {
      raw.activePointerId = raw.activePointers.keys().next().value ?? null;
      const next = raw.activePointerId === null ? null : raw.activePointers.get(raw.activePointerId);
      if (next) {
        raw.x = next.x;
        raw.y = next.y;
      }
    }
    raw.down = raw.activePointers.size > 0;
    raw.released = true;
    target.releasePointerCapture?.(event.pointerId);
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    raw.wheel += event.deltaY;
  };

  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", endPointer);
  target.addEventListener("pointercancel", endPointer);
  target.addEventListener("wheel", onWheel, { passive: false });

  const preUpdate = () => {
    snapshot.down = raw.down;
    snapshot.pressed = raw.pressed;
    snapshot.released = raw.released;
    snapshot.x = raw.x;
    snapshot.y = raw.y;
    snapshot.wheel = raw.wheel;
    snapshot.pointers = Array.from(raw.activePointers, ([id, position]) => ({ id, ...position }));
    raw.pressed = false;
    raw.released = false;
    raw.wheel = 0;
  };

  const postUpdate = () => {
    snapshot.pressed = false;
    snapshot.released = false;
    snapshot.wheel = 0;
  };

  const clearAll = () => {
    raw.down = false;
    raw.pressed = false;
    raw.released = false;
    raw.x = 0;
    raw.y = 0;
    raw.wheel = 0;
    raw.activePointerId = null;
    raw.activePointers.clear();
    snapshot.down = false;
    snapshot.pressed = false;
    snapshot.released = false;
    snapshot.x = 0;
    snapshot.y = 0;
    snapshot.wheel = 0;
    snapshot.pointers = [];
  };

  return {
    isDown() {
      return snapshot.down;
    },
    wasPressed() {
      return snapshot.pressed;
    },
    wasReleased() {
      return snapshot.released;
    },
    position() {
      return { x: snapshot.x, y: snapshot.y };
    },
    pointers() {
      return snapshot.pointers.map((pointer) => ({ ...pointer }));
    },
    wheelDelta() {
      return snapshot.wheel;
    },
    preUpdate() {
      preUpdate();
    },
    postUpdate() {
      postUpdate();
    },
    clearAll() {
      clearAll();
    },
    destroy() {
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", endPointer);
      target.removeEventListener("pointercancel", endPointer);
      target.removeEventListener("wheel", onWheel);
      clearAll();
    },
  };
}
