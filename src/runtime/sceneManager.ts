import type { Scene, SceneContext } from "./scene";

export class SceneManager {
  private current: Scene | null = null;

  start(scene: Scene, ctx: SceneContext): void {
    this.switch(scene, ctx);
  }

  switch(scene: Scene, ctx: SceneContext): void {
    this.current?.unload?.(ctx);
    this.current = scene;
    this.current.load?.(ctx);
  }

  update(dt: number, ctx: SceneContext): void {
    this.current?.update?.(dt, ctx);
  }

  resize(ctx: SceneContext): void {
    this.current?.resize?.(ctx);
  }

  destroy(ctx: SceneContext): void {
    this.current?.unload?.(ctx);
    this.current = null;
  }
}
