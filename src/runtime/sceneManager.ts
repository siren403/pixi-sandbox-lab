import type { Scene, SceneContext } from "./scene";

export class SceneManager {
  private current: Scene | null = null;
  private switchId = 0;

  async start(scene: Scene, ctx: SceneContext): Promise<void> {
    await this.switch(scene, ctx);
  }

  async switch(scene: Scene, ctx: SceneContext): Promise<void> {
    const switchId = ++this.switchId;
    this.current?.unload?.(ctx);
    this.current = null;

    const assets = typeof scene.assets === "function" ? scene.assets(ctx) : (scene.assets ?? []);
    await ctx.assets.load(assets);
    if (switchId !== this.switchId) return;

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
    this.switchId += 1;
    this.current?.unload?.(ctx);
    this.current = null;
  }
}
