import { Container, Graphics, Text } from "pixi.js";
import { anchorPoint, screenValue, surfaceTheme, tokenValue } from "../runtime/surface";
import type { SurfaceLayout } from "../runtime/scene";
import { scene } from "../runtime/scene";

const speed = 520;

type DemoState = {
  playerX: number;
  playerY: number;
  canvasWidth: number;
  canvasHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  visibleWidth: number;
  visibleHeight: number;
  playerScreenSize: number;
  markerScreenRadius: number;
  titleScreenFontSize: number;
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
    const playerSize = tokenValue(layout, surfaceTheme.size.player);
    const playerRadius = tokenValue(layout, surfaceTheme.radius.player);
    const playerStroke = tokenValue(layout, surfaceTheme.size.playerStroke);
    const markerRadius = tokenValue(layout, surfaceTheme.size.markerRadius);
    const markerPosition = anchorPoint(layout, "top-left", surfaceTheme.spacing.markerInset);
    const titlePosition = anchorPoint(layout, "top-left");
    const titleFontSize = tokenValue(layout, surfaceTheme.font.title);

    const player = new Graphics()
      .roundRect(-playerSize / 2, -playerSize / 2, playerSize, playerSize, playerRadius)
      .fill(surfaceTheme.color.player)
      .stroke({ color: surfaceTheme.color.playerStroke, width: playerStroke });

    player.label = "player";
    player.position.copyFrom(anchorPoint(layout, "center"));

    const marker = new Graphics()
      .circle(0, 0, markerRadius)
      .fill(surfaceTheme.color.marker);
    marker.label = "marker";
    marker.position.set(markerPosition.x, markerPosition.y);

    const title = new Text({
      text: "PixiJS vertical slice",
      style: {
        fill: surfaceTheme.color.text,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: titleFontSize,
        fontWeight: "600",
      },
    });
    title.label = "title";
    title.position.set(titlePosition.x, titlePosition.y);

    world.addChild(marker, player, title);
    stage.addChild(world);

    syncDemoState(player.x, player.y, layout);
  },

  resize({ stage, layout }) {
    const world = stage.children[0] as Container | undefined;
    const player = world?.getChildByLabel("player") as Graphics | null;
    const marker = world?.getChildByLabel("marker") as Graphics | null;
    const title = world?.getChildByLabel("title") as Text | null;
    if (!player) return;

    const playerPadding = tokenValue(layout, surfaceTheme.size.player) / 2;
    player.x = clamp(player.x, playerPadding, layout.visibleWidth - playerPadding);
    player.y = clamp(player.y, playerPadding, layout.visibleHeight - playerPadding);

    const markerPosition = anchorPoint(layout, "top-left", surfaceTheme.spacing.markerInset);
    marker?.position.set(markerPosition.x, markerPosition.y);

    const titlePosition = anchorPoint(layout, "top-left");
    title?.position.set(titlePosition.x, titlePosition.y);

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

    const playerPadding = tokenValue(layout, surfaceTheme.size.player) / 2;
    player.x = clamp(player.x, playerPadding, layout.visibleWidth - playerPadding);
    player.y = clamp(player.y, playerPadding, layout.visibleHeight - playerPadding);

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
    playerScreenSize: screenValue(layout, surfaceTheme.size.player),
    markerScreenRadius: screenValue(layout, surfaceTheme.size.markerRadius),
    titleScreenFontSize: screenValue(layout, surfaceTheme.font.title),
    rendered: true,
  };
}
