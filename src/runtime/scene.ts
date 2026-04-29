import type { Application, Container } from "pixi.js";
import type { Keyboard } from "./keyboard";

export type SurfaceLayout = {
  referenceWidth: number;
  referenceHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  visibleWidth: number;
  visibleHeight: number;
  referenceX: number;
  referenceY: number;
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

export type SurfaceLayers = {
  root: Container;
  world: Container;
  ui: Container;
  debug: Container;
};

export type SceneContext = {
  app: Application;
  stage: Container;
  layers: SurfaceLayers;
  keyboard: Keyboard;
  layout: SurfaceLayout;
};

export type Scene = {
  load?: (ctx: SceneContext) => void;
  update?: (dt: number, ctx: SceneContext) => void;
  resize?: (ctx: SceneContext) => void;
  unload?: (ctx: SceneContext) => void;
};

export function scene(definition: Scene): Scene {
  return definition;
}
