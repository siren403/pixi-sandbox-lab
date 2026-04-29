import type { Application, Container } from "pixi.js";
import type { Keyboard } from "./keyboard";

export type SceneContext = {
  app: Application;
  stage: Container;
  keyboard: Keyboard;
};

export type Scene = {
  load?: (ctx: SceneContext) => void;
  update?: (dt: number, ctx: SceneContext) => void;
  unload?: (ctx: SceneContext) => void;
};

export function scene(definition: Scene): Scene {
  return definition;
}
