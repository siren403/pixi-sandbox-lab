import { Container, Graphics, Text } from "pixi.js";
import { scene } from "../runtime/scene";

const speed = 260;

type DemoState = {
  playerX: number;
  playerY: number;
  rendered: boolean;
};

declare global {
  interface Window {
    __pixiDemoState?: DemoState;
  }
}

export const bootScene = scene({
  load({ stage, app }) {
    const world = new Container();

    const player = new Graphics()
      .roundRect(-24, -24, 48, 48, 8)
      .fill("#f7c948")
      .stroke({ color: "#fef3c7", width: 3 });

    player.label = "player";
    player.position.set(app.screen.width / 2, app.screen.height / 2);

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
    title.position.set(24, 22);

    world.addChild(marker, player, title);
    stage.addChild(world);

    window.__pixiDemoState = {
      playerX: player.x,
      playerY: player.y,
      rendered: true,
    };
  },

  update(dt, { stage, app, keyboard }) {
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

    player.x = Math.max(32, Math.min(app.screen.width - 32, player.x));
    player.y = Math.max(32, Math.min(app.screen.height - 32, player.y));

    if (window.__pixiDemoState) {
      window.__pixiDemoState.playerX = player.x;
      window.__pixiDemoState.playerY = player.y;
      window.__pixiDemoState.rendered = true;
    }
  },
});
