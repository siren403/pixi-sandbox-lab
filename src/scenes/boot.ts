import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import demoOrbUrl from "../assets/demo-orb.svg";
import { screenValue, surfaceTheme, tokenValue } from "../runtime/surface";
import type { SurfaceLayout } from "../runtime/scene";
import { scene } from "../runtime/scene";

const speed = 520;
const pointerFollowRate = 10;
const pointerSnapDistance = 3;

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
  assetBounds: { x: number; y: number; width: number; height: number };
  layerLabels: string[];
  scene: string;
  sceneSwitches: number;
  assetReady: boolean;
  pointerDown: boolean;
  pointerX: number;
  pointerY: number;
  rendered: boolean;
};

type DesignSystemState = {
  scene: "design-system";
  swatches: number;
  typeSamples: number;
  componentSamples: number;
  layerLabels: string[];
  rendered: boolean;
};

declare global {
  interface Window {
    __pixiDemoState?: DemoState;
    __pixiDesignSystemState?: DesignSystemState;
  }
}

let sceneSwitches = 0;
let removeDebugListeners: (() => void) | null = null;

type MotionPlayer = Graphics & {
  targetX?: number;
  targetY?: number;
  targetActive?: boolean;
};

export const bootScene = scene({
  assets: [demoOrbUrl],

  load({ app, assets, layers, layout, switchScene }) {
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
    const motionPlayer = player as MotionPlayer;
    motionPlayer.targetX = player.x;
    motionPlayer.targetY = player.y;
    motionPlayer.targetActive = false;

    const assetOrb = createAssetOrb(assets.get<Texture>(demoOrbUrl), layout, 0.74, 0.58);
    const inputTarget = createInputTarget(layout);

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
    layers.world.addChild(assetOrb, inputTarget, player);
    app.renderer.layout.update(layers.root);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        if (switchScene(alternateScene, "debug")) sceneSwitches += 1;
      },
      onDesignSystem: () => {
        if (switchScene(designSystemScene, "debug")) sceneSwitches += 1;
      },
    });

    syncDemoState("boot", player.x, player.y, layout, layers.root, undefined, assets.isReady(demoOrbUrl));
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

    syncDemoState("boot", player.x, player.y, layout, layers.root, undefined, true);
  },

  update(dt, { layers, keyboard, pointer, layout, switchScene }) {
    const player = layers.world.getChildByLabel("player") as MotionPlayer | null;
    const inputTarget = layers.world.getChildByLabel("input-target") as Graphics | null;
    if (!player) return;

    if (keyboard.wasPressed("x")) {
      if (switchScene(alternateScene, "scene")) sceneSwitches += 1;
      return;
    }

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
      player.targetX = player.x;
      player.targetY = player.y;
      player.targetActive = false;
      if (inputTarget) inputTarget.alpha = Math.max(0, inputTarget.alpha - dt * 4);
    }

    const playerPadding = tokenValue(layout, surfaceTheme.size.player) / 2;
    const pointerActive = pointer.isDown();
    const pointerPressed = pointer.wasPressed();
    const pointerReleased = pointer.wasReleased();
    if (pointerActive || pointerPressed || pointerReleased) {
      const position = pointer.position();
      player.targetX = clamp(position.x, playerPadding, layout.visibleWidth - playerPadding);
      player.targetY = clamp(position.y, playerPadding, layout.visibleHeight - playerPadding);
      player.targetActive = true;
      if (inputTarget) {
        inputTarget.position.set(player.targetX, player.targetY);
        inputTarget.alpha = 0.9;
        inputTarget.scale.set(pointerPressed ? 1.28 : 1);
      }
    }

    if (player.targetActive && player.targetX !== undefined && player.targetY !== undefined) {
      const follow = 1 - Math.exp(-pointerFollowRate * dt);
      player.x = lerp(player.x, player.targetX, follow);
      player.y = lerp(player.y, player.targetY, follow);
      player.rotation = lerp(player.rotation, clamp((player.targetX - player.x) * 0.0012, -0.12, 0.12), follow);

      const distance = Math.hypot(player.targetX - player.x, player.targetY - player.y);
      if (distance <= pointerSnapDistance) {
        player.position.set(player.targetX, player.targetY);
        player.rotation = 0;
        player.targetActive = false;
      }
    }

    player.x = clamp(player.x, playerPadding, layout.visibleWidth - playerPadding);
    player.y = clamp(player.y, playerPadding, layout.visibleHeight - playerPadding);
    if (!player.targetActive) {
      player.rotation = lerp(player.rotation, 0, 1 - Math.exp(-12 * dt));
    }
    updateInputTarget(inputTarget, dt);

    syncDemoState("boot", player.x, player.y, layout, layers.root, pointer, true);
  },

  unload({ layers }) {
    removeDebugListeners?.();
    removeDebugListeners = null;
    clearSceneLayers(layers.world, layers.ui);
    window.__pixiDemoState = undefined;
  },
});

export const alternateScene = scene({
  assets: () => [demoOrbUrl],

  load({ app, assets, layers, layout, switchScene }) {
    const markerRadius = tokenValue(layout, surfaceTheme.size.markerRadius) * 1.35;
    const titleFontSize = tokenValue(layout, surfaceTheme.font.title);

    const hud = new Container();
    hud.label = "hud";
    configureHudLayout(hud, layout);

    const marker = new Graphics()
      .circle(markerRadius, markerRadius, markerRadius)
      .fill("#80ed99");
    marker.label = "marker";
    marker.layout = {
      width: markerRadius * 2,
      height: markerRadius * 2,
    };

    const title = new Text({
      text: "Alternate scene",
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

    const playerSize = tokenValue(layout, surfaceTheme.size.player);
    const player = new Graphics()
      .circle(0, 0, playerSize / 2)
      .fill("#c77dff")
      .stroke({ color: "#f3c4fb", width: tokenValue(layout, surfaceTheme.size.playerStroke) });
    player.label = "player";
    player.position.set(layout.visibleWidth / 2, layout.visibleHeight / 2);

    const assetOrb = createAssetOrb(assets.get<Texture>(demoOrbUrl), layout, 0.28, 0.58);

    hud.addChild(title, spacer, marker);
    layers.ui.addChild(hud);
    layers.world.addChild(assetOrb, player);
    app.renderer.layout.update(layers.root);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        if (switchScene(bootScene, "debug")) sceneSwitches += 1;
      },
      onDesignSystem: () => {
        if (switchScene(designSystemScene, "debug")) sceneSwitches += 1;
      },
    });

    syncDemoState("alternate", player.x, player.y, layout, layers.root, undefined, assets.isReady(demoOrbUrl));
  },

  resize({ app, layers, layout }) {
    const player = layers.world.getChildByLabel("player") as Graphics | null;
    const hud = layers.ui.getChildByLabel("hud") as Container | null;
    if (!player) return;

    player.position.set(layout.visibleWidth / 2, layout.visibleHeight / 2);
    if (hud) configureHudLayout(hud, layout);
    app.renderer.layout.update(layers.root);

    syncDemoState("alternate", player.x, player.y, layout, layers.root, undefined, true);
  },

  update(_dt, { layers, keyboard, pointer, layout, switchScene }) {
    const player = layers.world.getChildByLabel("player") as Graphics | null;
    if (!player) return;

    if (keyboard.wasPressed("x")) {
      if (switchScene(bootScene, "scene")) sceneSwitches += 1;
      return;
    }

    syncDemoState("alternate", player.x, player.y, layout, layers.root, pointer, true);
  },

  unload({ layers }) {
    removeDebugListeners?.();
    removeDebugListeners = null;
    clearSceneLayers(layers.world, layers.ui);
    window.__pixiDemoState = undefined;
  },
});

export const designSystemScene = scene({
  loading: { minimumMs: 0 },

  load({ app, layers, layout, switchScene }) {
    renderDesignSystem(layers.ui, layout);
    app.renderer.layout.update(layers.root);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        if (switchScene(bootScene, "debug")) sceneSwitches += 1;
      },
      onDesignSystem: () => undefined,
    });
    syncDesignSystemState(layout, layers.root);
  },

  resize({ app, layers, layout }) {
    clearSceneLayers(layers.ui);
    renderDesignSystem(layers.ui, layout);
    app.renderer.layout.update(layers.root);
    syncDesignSystemState(layout, layers.root);
  },

  update(dt, { layers, keyboard, layout, switchScene }) {
    if (keyboard.wasPressed("x")) {
      if (switchScene(bootScene, "scene")) sceneSwitches += 1;
      return;
    }

    const motion = layers.ui.getChildByLabel("ds-motion-ring", true) as Graphics | null;
    if (motion) {
      motion.rotation += dt * 1.8;
      motion.alpha = 0.62 + Math.sin(performance.now() * 0.006) * 0.18;
    }
    syncDesignSystemState(layout, layers.root);
  },

  unload({ layers }) {
    removeDebugListeners?.();
    removeDebugListeners = null;
    clearSceneLayers(layers.world, layers.ui);
    window.__pixiDesignSystemState = undefined;
  },
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
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

function createAssetOrb(texture: Texture, layout: SurfaceLayout, xRatio: number, yRatio: number): Sprite {
  const orb = new Sprite(texture);
  const size = tokenValue(layout, surfaceTheme.size.player) * 0.9;
  orb.label = "asset-orb";
  orb.anchor.set(0.5);
  orb.position.set(layout.visibleWidth * xRatio, layout.visibleHeight * yRatio);
  orb.width = size;
  orb.height = size;
  return orb;
}

function createInputTarget(layout: SurfaceLayout): Graphics {
  const radius = tokenValue(layout, surfaceTheme.size.player) * 0.58;
  const stroke = Math.max(3, tokenValue(layout, surfaceTheme.size.playerStroke) * 0.75);
  const target = new Graphics()
    .circle(0, 0, radius)
    .stroke({ color: "#38bdf8", width: stroke, alpha: 0.84 })
    .moveTo(-radius * 1.35, 0)
    .lineTo(-radius * 0.72, 0)
    .moveTo(radius * 0.72, 0)
    .lineTo(radius * 1.35, 0)
    .moveTo(0, -radius * 1.35)
    .lineTo(0, -radius * 0.72)
    .moveTo(0, radius * 0.72)
    .lineTo(0, radius * 1.35)
    .stroke({ color: "#facc15", width: stroke * 0.55, alpha: 0.78 });
  target.label = "input-target";
  target.alpha = 0;
  return target;
}

function renderDesignSystem(layer: Container, layout: SurfaceLayout): void {
  const root = new Container({ label: "design-system-root" });
  const margin = tokenValue(layout, surfaceTheme.spacing.screen);
  const panelWidth = Math.min(layout.visibleWidth - margin * 2, 900 / layout.scale);
  const startX = layout.referenceX + layout.safeArea.left + margin;
  let y = layout.referenceY + layout.safeArea.top + margin;

  const title = createLabel("Design System", layout, { design: 68, minScreenPx: 28, maxScreenPx: 48 }, surfaceTheme.color.text);
  title.label = "ds-title";
  title.position.set(startX, y);
  root.addChild(title);
  y += tokenValue(layout, { design: 96, minScreenPx: 46, maxScreenPx: 72 });

  const tokenLabel = createLabel("Color tokens", layout, { design: 34, minScreenPx: 18, maxScreenPx: 26 }, "#bfdbfe");
  tokenLabel.label = "ds-token-label";
  tokenLabel.position.set(startX, y);
  root.addChild(tokenLabel);
  y += tokenValue(layout, { design: 56, minScreenPx: 30, maxScreenPx: 42 });

  const swatches = [
    surfaceTheme.color.player,
    surfaceTheme.color.playerStroke,
    surfaceTheme.color.marker,
    surfaceTheme.color.text,
    "#38bdf8",
    "#facc15",
  ];
  const swatchSize = tokenValue(layout, { design: 104, minScreenPx: 44, maxScreenPx: 70 });
  swatches.forEach((color, index) => {
    const swatch = new Graphics()
      .roundRect(0, 0, swatchSize, swatchSize, 8 / layout.scale)
      .fill(color)
      .stroke({ color: "#e5e7eb", width: Math.max(1, 2 / layout.scale), alpha: 0.6 });
    swatch.label = "ds-swatch";
    swatch.position.set(startX + index * (swatchSize + margin * 0.42), y);
    root.addChild(swatch);
  });
  y += swatchSize + margin;

  const typeSamples = [
    ["Title", surfaceTheme.font.title],
    ["Body", { design: 34, minScreenPx: 18, maxScreenPx: 26 }],
    ["Caption", { design: 24, minScreenPx: 14, maxScreenPx: 18 }],
  ] as const;
  typeSamples.forEach(([text, size], index) => {
    const sample = createLabel(text, layout, size, index === 0 ? surfaceTheme.color.text : "#cbd5e1");
    sample.label = "ds-type-sample";
    sample.position.set(startX, y);
    root.addChild(sample);
    y += tokenValue(layout, { design: 60, minScreenPx: 30, maxScreenPx: 44 });
  });

  const componentY = y + margin * 0.4;
  const buttonWidth = panelWidth * 0.38;
  const buttonHeight = tokenValue(layout, { design: 92, minScreenPx: 48, maxScreenPx: 64 });
  const button = new Graphics()
    .roundRect(0, 0, buttonWidth, buttonHeight, 8 / layout.scale)
    .fill({ color: 0x0f766e, alpha: 0.94 })
    .stroke({ color: "#67e8f9", width: Math.max(2, 3 / layout.scale) });
  button.label = "ds-component-sample";
  button.position.set(startX, componentY);
  const buttonLabel = createLabel("Button", layout, { design: 34, minScreenPx: 18, maxScreenPx: 26 }, surfaceTheme.color.text);
  buttonLabel.anchor.set(0.5);
  buttonLabel.position.set(button.x + buttonWidth / 2, button.y + buttonHeight / 2);

  const markerRadius = tokenValue(layout, surfaceTheme.size.markerRadius);
  const marker = new Graphics().circle(0, 0, markerRadius).fill(surfaceTheme.color.marker);
  marker.label = "ds-component-sample";
  marker.position.set(startX + panelWidth * 0.55, componentY + buttonHeight / 2);

  const motion = createInputTarget(layout);
  motion.label = "ds-motion-ring";
  motion.alpha = 0.78;
  motion.position.set(startX + panelWidth * 0.76, componentY + buttonHeight / 2);

  root.addChild(button, buttonLabel, marker, motion);
  layer.addChild(root);
}

function createLabel(
  text: string,
  layout: SurfaceLayout,
  size: { design: number; minScreenPx?: number; maxScreenPx?: number },
  color: string,
): Text {
  return new Text({
    text,
    style: {
      fill: color,
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: tokenValue(layout, size),
      fontWeight: "600",
    },
  });
}

function updateInputTarget(target: Graphics | null, dt: number): void {
  if (!target || target.alpha <= 0) return;
  target.rotation += dt * 2.2;
  target.scale.set(lerp(target.scale.x, 1, 1 - Math.exp(-12 * dt)));
  target.alpha = Math.max(0, target.alpha - dt * 1.5);
}

function syncDemoState(
  sceneName: string,
  playerX: number,
  playerY: number,
  layout: SurfaceLayout,
  stage: Container,
  pointer?: { isDown: () => boolean; position: () => { x: number; y: number } },
  assetReady = false,
): void {
  const title = getPixiBounds(stage, "title");
  const marker = getPixiBounds(stage, "marker");
  const asset = getPixiBounds(stage, "asset-orb");
  const pointerPosition = pointer?.position() ?? { x: 0, y: 0 };
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
    assetBounds: asset,
    layerLabels: stage.children.map((child) => child.label ?? ""),
    scene: sceneName,
    sceneSwitches,
    assetReady,
    pointerDown: pointer?.isDown() ?? false,
    pointerX: pointerPosition.x,
    pointerY: pointerPosition.y,
    rendered: true,
  };
}

function syncDesignSystemState(layout: SurfaceLayout, stage: Container): void {
  window.__pixiDesignSystemState = {
    scene: "design-system",
    swatches: countChildrenByLabel(stage, "ds-swatch"),
    typeSamples: countChildrenByLabel(stage, "ds-type-sample"),
    componentSamples: countChildrenByLabel(stage, "ds-component-sample"),
    layerLabels: stage.children.map((child) => child.label ?? ""),
    rendered: layout.visibleWidth > 0,
  };
}

function countChildrenByLabel(container: Container, label: string): number {
  let count = 0;
  for (const child of container.children) {
    if (child.label === label) count += 1;
    if (child instanceof Container) count += countChildrenByLabel(child, label);
  }
  return count;
}

function getPixiBounds(stage: Container, label: string): { x: number; y: number; width: number; height: number } {
  const child = stage.getChildByLabel(label, true);
  const bounds = child?.getBounds();
  return bounds
    ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    : { x: 0, y: 0, width: 0, height: 0 };
}

function clearSceneLayers(...layers: Container[]): void {
  for (const layer of layers) {
    for (const child of layer.removeChildren()) {
      child.destroy({ children: true });
    }
  }
}

function installDebugSceneListeners(handlers: { onScene: () => void; onDesignSystem: () => void }): () => void {
  const sceneListener = () => handlers.onScene();
  const designSystemListener = () => handlers.onDesignSystem();
  window.addEventListener("pixi:scene-switch", sceneListener);
  window.addEventListener("pixi:design-system", designSystemListener);
  return () => {
    window.removeEventListener("pixi:scene-switch", sceneListener);
    window.removeEventListener("pixi:design-system", designSystemListener);
  };
}
