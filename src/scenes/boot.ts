import { Container, Graphics, Text } from "pixi.js";
import { screenValue, surfaceTheme, tokenValue } from "../runtime/surface";
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
  titleBounds: { x: number; y: number; width: number; height: number };
  markerBounds: { x: number; y: number; width: number; height: number };
  layerLabels: string[];
  rendered: boolean;
};

declare global {
  interface Window {
    __pixiDemoState?: DemoState;
  }
}

export const bootScene = scene({
  load({ app, layers, layout }) {
    const playerSize = tokenValue(layout, surfaceTheme.size.player);
    const playerRadius = tokenValue(layout, surfaceTheme.radius.player);
    const playerStroke = tokenValue(layout, surfaceTheme.size.playerStroke);
    const markerRadius = tokenValue(layout, surfaceTheme.size.markerRadius);
    const titleFontSize = tokenValue(layout, surfaceTheme.font.title);

    const hud = new Container();
    hud.label = "hud";
    configureHudLayout(hud, layout);

    const player = new Graphics()
      .roundRect(-playerSize / 2, -playerSize / 2, playerSize, playerSize, playerRadius)
      .fill(surfaceTheme.color.player)
      .stroke({ color: surfaceTheme.color.playerStroke, width: playerStroke });

    player.label = "player";
    player.position.set(layout.visibleWidth / 2, layout.visibleHeight / 2);

    const marker = new Graphics()
      .circle(markerRadius, markerRadius, markerRadius)
      .fill(surfaceTheme.color.marker);
    marker.label = "marker";
    marker.layout = {
      width: markerRadius * 2,
      height: markerRadius * 2,
    };

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
    title.layout = true;

    const spacer = new Container();
    spacer.label = "hud-spacer";
    spacer.layout = { flexGrow: 1 };

    hud.addChild(title, spacer, marker);
    layers.ui.addChild(hud);
    layers.world.addChild(player);
    app.renderer.layout.update(layers.root);

    syncDemoState(player.x, player.y, layout, layers.root);
  },

  resize({ app, layers, layout }) {
    const player = layers.world.getChildByLabel("player") as Graphics | null;
    const hud = layers.ui.getChildByLabel("hud") as Container | null;
    if (!player) return;

    const playerPadding = tokenValue(layout, surfaceTheme.size.player) / 2;
    player.x = clamp(player.x, playerPadding, layout.visibleWidth - playerPadding);
    player.y = clamp(player.y, playerPadding, layout.visibleHeight - playerPadding);

    if (hud) configureHudLayout(hud, layout);
    app.renderer.layout.update(layers.root);

    syncDemoState(player.x, player.y, layout, layers.root);
  },

  update(dt, { layers, keyboard, layout }) {
    const player = layers.world.getChildByLabel("player") as Graphics | null;
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

    syncDemoState(player.x, player.y, layout, layers.root);
  },
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function configureHudLayout(hud: Container, layout: SurfaceLayout): void {
  const margin = tokenValue(layout, surfaceTheme.spacing.screen);
  const hudHeight = tokenValue(layout, surfaceTheme.font.title) * 1.25;
  hud.position.set(layout.referenceX + layout.safeArea.left + margin, layout.referenceY + layout.safeArea.top + margin);
  hud.layout = {
    width: layout.referenceWidth - layout.safeArea.left - layout.safeArea.right - margin * 2,
    height: hudHeight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: margin,
  };
}

function syncDemoState(playerX: number, playerY: number, layout: SurfaceLayout, stage: Container): void {
  const title = getPixiBounds(stage, "title");
  const marker = getPixiBounds(stage, "marker");
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
    titleBounds: title,
    markerBounds: marker,
    layerLabels: stage.children.map((child) => child.label ?? ""),
    rendered: true,
  };
}

function getPixiBounds(stage: Container, label: string): { x: number; y: number; width: number; height: number } {
  const child = stage.getChildByLabel(label, true);
  const bounds = child?.getBounds();
  return bounds
    ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    : { x: 0, y: 0, width: 0, height: 0 };
}
