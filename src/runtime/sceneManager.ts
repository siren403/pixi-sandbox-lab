import type { Scene, SceneContext } from "./scene";

export class SceneManager {
  private current: Scene | null = null;

  constructor(private readonly ctx: SceneContext) {}

  start(scene: Scene): void {
    this.switch(scene);
  }

  switch(scene: Scene): void {
    this.current?.unload?.(this.ctx);
    this.current = scene;
    this.current.load?.(this.ctx);
  }

  update(dt: number): void {
    this.current?.update?.(dt, this.ctx);
  }

  resize(): void {
    this.current?.resize?.(this.ctx);
  }

  destroy(): void {
    this.current?.unload?.(this.ctx);
    this.current = null;
  }
}
