import type { Container } from "pixi.js";
import type { SurfaceLayout } from "./scene";
import { createWorldCamera, type WorldCamera, type WorldCameraOptions } from "./worldCamera";

export type WorldBounds = {
  width: number;
  height: number;
};

export type WorldPoint = {
  x: number;
  y: number;
};

export type World = {
  readonly layer: Container;
  readonly bounds: WorldBounds;
  center: () => WorldPoint;
  clampPoint: (point: WorldPoint, padding?: number) => WorldPoint;
  clampObject: <T extends WorldPoint>(object: T, padding?: number) => T;
  createCamera: (
    layout: SurfaceLayout,
    options?: Omit<WorldCameraOptions, "world" | "width" | "height">,
  ) => WorldCamera;
};

export function createWorld(layer: Container, bounds: WorldBounds): World {
  return {
    layer,
    bounds,
    center() {
      return {
        x: bounds.width / 2,
        y: bounds.height / 2,
      };
    },
    clampPoint(point, padding = 0) {
      return {
        x: clamp(point.x, padding, bounds.width - padding),
        y: clamp(point.y, padding, bounds.height - padding),
      };
    },
    clampObject(object, padding = 0) {
      const point = this.clampPoint(object, padding);
      object.x = point.x;
      object.y = point.y;
      return object;
    },
    createCamera(layout, options = {}) {
      return createWorldCamera(
        {
          ...options,
          world: layer,
          width: bounds.width,
          height: bounds.height,
        },
        layout,
      );
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
