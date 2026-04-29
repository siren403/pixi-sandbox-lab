import { Container, Graphics, Text } from "pixi.js";
import type { SurfaceLayout } from "../runtime/scene";
import { scene } from "../runtime/scene";

const speed = 260;

type DemoState = {
  playerX: number;
  playerY: number;
  canvasWidth: number;
  canvasHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  visibleWidth: number;
  visibleHeight: number;
  rendered: boolean;
};

declare global {
  interface Window {
    __pixiDemoState?: DemoState;
  }
}

export const bootScene = scene({
  load({ stage, layout }) {
    const world = new Container();

    const player = new Graphics()
      .roundRect(-24, -24, 48, 48, 8)
      .fill("#f7c948")
      .stroke({ color: "#fef3c7", width: 3 });

    player.label = "player";
    player.position.set(layout.visibleWidth / 2, layout.visibleHeight / 2);

    const marker = new Graphics()
      .circle(0, 0, 7)
      .fill("#4cc9f0");
    marker.position.set(72, 72);

    const title = new Text({
      text: "PixiJS vertical slice",
      style: {
        fill: "#eef2f6",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 22,
        fontWeight: "600",
      },
    });
    title.position.set(layout.referenceX + layout.safeArea.left + 36, layout.referenceY + layout.safeArea.top + 36);

    world.addChild(marker, player, title);
    stage.addChild(world);

    syncDemoState(player.x, player.y, layout);
  },

  resize({ stage, layout }) {
    const world = stage.children[0] as Container | undefined;
    const player = world?.getChildByLabel("player") as Graphics | null;
    if (!player) return;

    player.x = clamp(player.x, 32, layout.visibleWidth - 32);
    player.y = clamp(player.y, 32, layout.visibleHeight - 32);
    syncDemoState(player.x, player.y, layout);
  },

  update(dt, { stage, keyboard, layout }) {
    const world = stage.children[0] as Container | undefined;
    const player = world?.getChildByLabel("player") as Graphics | null;
    if (!player) return;

    let dx = 0;
    let dy = 0;

    if (keyboard.isDown("arrowleft") || keyboard.isDown("a")) dx -= 1;
    if (keyboard.isDown("arrowright") || keyboard.isDown("d")) dx += 1;
    if (keyboard.isDown("arrowup") || keyboard.isDown("w")) dy -= 1;
    if (keyboard.isDown("arrowdown") || keyboard.isDown("s")) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      player.x += (dx / length) * speed * dt;
      player.y += (dy / length) * speed * dt;
    }

    player.x = clamp(player.x, 32, layout.visibleWidth - 32);
    player.y = clamp(player.y, 32, layout.visibleHeight - 32);

    syncDemoState(player.x, player.y, layout);
  },
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function syncDemoState(playerX: number, playerY: number, layout: SurfaceLayout): void {
  window.__pixiDemoState = {
    playerX,
    playerY,
    canvasWidth: Math.round(layout.viewportWidth),
    canvasHeight: Math.round(layout.viewportHeight),
    viewportWidth: Math.round(window.innerWidth),
    viewportHeight: Math.round(window.innerHeight),
    visibleWidth: layout.visibleWidth,
    visibleHeight: layout.visibleHeight,
    rendered: true,
  };
}
