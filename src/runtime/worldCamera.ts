import type { Container } from "pixi.js";
import type { Pointer } from "./pointer";
import type { SurfaceLayout } from "./scene";

export type WorldCameraState = {
  x: number;
  y: number;
  zoom: number;
};

export type WorldCameraOptions = {
  world: Container;
  width: number;
  height: number;
  minZoom?: number;
  maxZoom?: number;
  dragThreshold?: number;
  initialZoom?: number | ((layout: SurfaceLayout) => number);
};

export type WorldCamera = {
  readonly world: Container;
  readonly width: number;
  readonly height: number;
  readonly state: WorldCameraState;
  apply: (layout: SurfaceLayout) => void;
  centerOn: (worldX: number, worldY: number, layout: SurfaceLayout) => void;
  clamp: (layout: SurfaceLayout) => void;
  updateGesture: (pointer: Pointer, layout: SurfaceLayout) => void;
  screenToWorld: (point: { x: number; y: number }) => { x: number; y: number };
  hasDragged: () => boolean;
  resetGesture: () => void;
};

type GestureState = {
  lastPrimary?: { x: number; y: number };
  lastPinchDistance?: number;
  lastPinchCenter?: { x: number; y: number };
  dragged: boolean;
};

const defaultMinZoom = 0.25;
const defaultMaxZoom = 4;
const defaultDragThreshold = 12;

export function createWorldCamera(options: WorldCameraOptions, layout: SurfaceLayout): WorldCamera {
  const minZoom = options.minZoom ?? defaultMinZoom;
  const maxZoom = options.maxZoom ?? defaultMaxZoom;
  const dragThreshold = options.dragThreshold ?? defaultDragThreshold;
  const initialZoom =
    typeof options.initialZoom === "function"
      ? options.initialZoom(layout)
      : (options.initialZoom ?? 1);
  const state = {
    x: 0,
    y: 0,
    zoom: clamp(initialZoom, minZoom, maxZoom),
  };
  const gesture: GestureState = { dragged: false };

  const camera: WorldCamera = {
    world: options.world,
    width: options.width,
    height: options.height,
    state,
    apply(nextLayout) {
      clampCamera(state, options.width, options.height, minZoom, maxZoom, nextLayout);
      options.world.position.set(state.x, state.y);
      options.world.scale.set(state.zoom);
    },
    centerOn(worldX, worldY, nextLayout) {
      state.x = nextLayout.visibleWidth / 2 - worldX * state.zoom;
      state.y = nextLayout.visibleHeight / 2 - worldY * state.zoom;
      camera.clamp(nextLayout);
    },
    clamp(nextLayout) {
      clampCamera(state, options.width, options.height, minZoom, maxZoom, nextLayout);
    },
    updateGesture(pointer, nextLayout) {
      updateGesture(pointer, camera, gesture, {
        width: options.width,
        height: options.height,
        minZoom,
        maxZoom,
        dragThreshold,
        layout: nextLayout,
      });
    },
    screenToWorld(point) {
      return {
        x: (point.x - state.x) / state.zoom,
        y: (point.y - state.y) / state.zoom,
      };
    },
    hasDragged() {
      return gesture.dragged;
    },
    resetGesture() {
      gesture.lastPrimary = undefined;
      gesture.lastPinchDistance = undefined;
      gesture.lastPinchCenter = undefined;
      gesture.dragged = false;
    },
  };

  return camera;
}

function updateGesture(
  pointer: Pointer,
  camera: WorldCamera,
  gesture: GestureState,
  options: {
    width: number;
    height: number;
    minZoom: number;
    maxZoom: number;
    dragThreshold: number;
    layout: SurfaceLayout;
  },
): void {
  const wheel = pointer.wheelDelta();
  const pointers = pointer.pointers();
  if (wheel !== 0) {
    zoomCameraAt(camera, 1 - wheel * 0.0012, pointer.position(), options);
    gesture.dragged = true;
  }

  if (pointers.length >= 2) {
    const [first, second] = pointers;
    const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    if (gesture.lastPinchDistance !== undefined && gesture.lastPinchCenter !== undefined) {
      camera.state.x += center.x - gesture.lastPinchCenter.x;
      camera.state.y += center.y - gesture.lastPinchCenter.y;
      zoomCameraAt(camera, distance / gesture.lastPinchDistance, center, options);
      gesture.dragged = true;
    }
    gesture.lastPinchDistance = distance;
    gesture.lastPinchCenter = center;
    gesture.lastPrimary = undefined;
    return;
  }

  gesture.lastPinchDistance = undefined;
  gesture.lastPinchCenter = undefined;

  if (pointers.length === 1) {
    const current = pointers[0];
    if (gesture.lastPrimary) {
      const dx = current.x - gesture.lastPrimary.x;
      const dy = current.y - gesture.lastPrimary.y;
      if (gesture.dragged || Math.hypot(dx, dy) >= options.dragThreshold) {
        camera.state.x += dx;
        camera.state.y += dy;
        gesture.dragged = true;
      }
    }
    gesture.lastPrimary = current;
  } else {
    gesture.lastPrimary = undefined;
  }
  camera.clamp(options.layout);
}

function zoomCameraAt(
  camera: WorldCamera,
  rawFactor: number,
  screenPoint: { x: number; y: number },
  options: {
    width: number;
    height: number;
    minZoom: number;
    maxZoom: number;
    layout: SurfaceLayout;
  },
): void {
  const before = camera.screenToWorld(screenPoint);
  camera.state.zoom = clamp(camera.state.zoom * rawFactor, options.minZoom, options.maxZoom);
  camera.state.x = screenPoint.x - before.x * camera.state.zoom;
  camera.state.y = screenPoint.y - before.y * camera.state.zoom;
  clampCamera(camera.state, options.width, options.height, options.minZoom, options.maxZoom, options.layout);
}

function clampCamera(
  state: WorldCameraState,
  worldWidth: number,
  worldHeight: number,
  minZoom: number,
  maxZoom: number,
  layout: SurfaceLayout,
): void {
  state.zoom = clamp(state.zoom, minZoom, maxZoom);
  state.x = clampCameraAxis(state.x, layout.visibleWidth, worldWidth * state.zoom);
  state.y = clampCameraAxis(state.y, layout.visibleHeight, worldHeight * state.zoom);
}

function clampCameraAxis(offset: number, visible: number, scaledWorld: number): number {
  if (scaledWorld <= visible) return (visible - scaledWorld) / 2;
  return clamp(offset, visible - scaledWorld, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
