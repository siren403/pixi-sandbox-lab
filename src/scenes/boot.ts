import { Container, Graphics, Sprite, type Texture } from "pixi.js";
import demoOrbUrl from "../assets/demo-orb.svg";
import type { Pointer } from "../runtime/pointer";
import { screenValue, tokenValue } from "../runtime/surface";
import { surfaceTheme } from "../ui/tokens";
import type { SurfaceLayout } from "../runtime/scene";
import { scene } from "../runtime/scene";
import { createButton } from "../ui/button";
import { createLabel } from "../ui/label";
import { configureSafeAreaRow } from "../ui/layout";
import { createPanel } from "../ui/panel";
import {
  clearDemoDebugState,
  clearDesignSystemDebugState,
  setDemoDebugState,
  setDesignSystemDebugState,
} from "../debug/stateBridge";

const speed = 520;
const pointerFollowRate = 10;
const pointerSnapDistance = 3;
const worldWidth = 3600;
const worldHeight = 5200;
const worldItemCount = 96;
const minCameraZoom = 0.45;
const maxCameraZoom = 2.2;
const cameraDragThreshold = 12;

type DemoState = {
  playerX: number;
  playerY: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  worldWidth: number;
  worldHeight: number;
  worldItems: number;
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
  sections: number;
  labels: number;
  swatches: number;
  typeSamples: number;
  componentSamples: number;
  safeAreaSamples: number;
  buttonCenterDeltaY: number;
  layerLabels: string[];
  rendered: boolean;
};

let sceneSwitches = 0;
let removeDebugListeners: (() => void) | null = null;
const cameraByWorld = new WeakMap<Container, CameraState>();
const gestureByWorld = new WeakMap<Container, GestureState>();

type MotionPlayer = Graphics & {
  targetX?: number;
  targetY?: number;
  targetActive?: boolean;
};

type CameraState = {
  x: number;
  y: number;
  zoom: number;
};

type GestureState = {
  lastPrimary?: { x: number; y: number };
  lastPinchDistance?: number;
  lastPinchCenter?: { x: number; y: number };
  dragged: boolean;
};

export const verticalSliceScene = scene({
  name: "vertical-slice",
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
    const camera = createCameraState(layout);
    const gesture: GestureState = { dragged: false };
    cameraByWorld.set(layers.world, camera);
    gestureByWorld.set(layers.world, gesture);

    const player = new Graphics()
      .roundRect(-playerSize / 2, -playerSize / 2, playerSize, playerSize, playerRadius)
      .fill(surfaceTheme.color.player)
      .stroke({ color: surfaceTheme.color.playerStroke, width: playerStroke });

    player.label = "player";
    player.position.set(worldWidth / 2, worldHeight / 2);
    const motionPlayer = player as MotionPlayer;
    motionPlayer.targetX = player.x;
    motionPlayer.targetY = player.y;
    motionPlayer.targetActive = false;

    const assetOrb = createAssetOrb(assets.get<Texture>(demoOrbUrl), layout, 0.74, 0.58);
    const inputTarget = createInputTarget(layout);
    const field = createExplorationField(layout);

    const marker = new Graphics()
      .circle(markerRadius, markerRadius, markerRadius)
      .fill(surfaceTheme.color.marker);
    marker.label = "marker";
    marker.layout = {
      width: markerRadius * 2,
      height: markerRadius * 2,
    };

    const title = createLabel({
      text: "PixiJS vertical slice",
      layout,
      fontSize: surfaceTheme.font.title,
      color: surfaceTheme.color.text,
      label: "title",
    });
    title.label = "title";
    title.layout = {
      height: titleFontSize * 1.25,
    };

    const spacer = new Container();
    spacer.label = "hud-spacer";
    spacer.layout = { flexGrow: 1 };

    hud.addChild(title, spacer, marker);
    layers.ui.addChild(hud);
    layers.world.addChild(field, assetOrb, inputTarget, player);
    centerCameraOn(camera, player.x, player.y, layout);
    applyCamera(layers.world, camera, layout);
    app.renderer.layout.update(layers.root);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        if (switchScene(alternateScene, "debug")) sceneSwitches += 1;
      },
      onDesignSystem: () => {
        if (switchScene(designSystemScene, "debug")) sceneSwitches += 1;
      },
    });

    syncDemoState("vertical-slice", player.x, player.y, layout, layers.root, undefined, assets.isReady(demoOrbUrl));
  },

  resize({ app, layers, layout }) {
    const player = layers.world.getChildByLabel("player") as Graphics | null;
    const hud = layers.ui.getChildByLabel("hud") as Container | null;
    const camera = readCamera(layers.world);
    if (!player) return;

    const playerPadding = tokenValue(layout, surfaceTheme.size.player) / 2;
    player.x = clamp(player.x, playerPadding, worldWidth - playerPadding);
    player.y = clamp(player.y, playerPadding, worldHeight - playerPadding);
    clampCamera(camera, layout);
    applyCamera(layers.world, camera, layout);

    if (hud) configureHudLayout(hud, layout);
    app.renderer.layout.update(layers.root);

    syncDemoState("vertical-slice", player.x, player.y, layout, layers.root, undefined, true);
  },

  update(dt, { layers, keyboard, pointer, layout, switchScene }) {
    const player = layers.world.getChildByLabel("player") as MotionPlayer | null;
    const inputTarget = layers.world.getChildByLabel("input-target") as Graphics | null;
    const camera = readCamera(layers.world);
    const gesture = readGesture(layers.world);
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
    updateCameraGesture(pointer, camera, gesture, layout);
    const pointerPressed = pointer.wasPressed();
    const pointerReleased = pointer.wasReleased();
    if (pointerReleased && !gesture.dragged && pointer.pointers().length === 0) {
      const position = screenToWorld(pointer.position(), camera);
      player.targetX = clamp(position.x, playerPadding, worldWidth - playerPadding);
      player.targetY = clamp(position.y, playerPadding, worldHeight - playerPadding);
      player.targetActive = true;
      if (inputTarget) {
        inputTarget.position.set(player.targetX, player.targetY);
        inputTarget.alpha = 0.9;
        inputTarget.scale.set(pointerPressed ? 1.28 : 1);
      }
    }
    if (pointerReleased && pointer.pointers().length === 0) {
      gesture.lastPrimary = undefined;
      gesture.lastPinchDistance = undefined;
      gesture.lastPinchCenter = undefined;
      gesture.dragged = false;
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

    player.x = clamp(player.x, playerPadding, worldWidth - playerPadding);
    player.y = clamp(player.y, playerPadding, worldHeight - playerPadding);
    if (!player.targetActive) {
      player.rotation = lerp(player.rotation, 0, 1 - Math.exp(-12 * dt));
    }
    updateInputTarget(inputTarget, dt);
    applyCamera(layers.world, camera, layout);

    syncDemoState("vertical-slice", player.x, player.y, layout, layers.root, pointer, true);
  },

  unload({ layers }) {
    removeDebugListeners?.();
    removeDebugListeners = null;
    clearSceneLayers(layers.world, layers.ui);
    clearDemoDebugState();
  },
});

export const alternateScene = scene({
  name: "alternate",
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

    const title = createLabel({
      text: "Alternate scene",
      layout,
      fontSize: surfaceTheme.font.title,
      color: surfaceTheme.color.text,
      label: "title",
    });
    title.label = "title";
    title.layout = {
      height: titleFontSize * 1.25,
    };

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
        if (switchScene(verticalSliceScene, "debug")) sceneSwitches += 1;
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
      if (switchScene(verticalSliceScene, "scene")) sceneSwitches += 1;
      return;
    }

    syncDemoState("alternate", player.x, player.y, layout, layers.root, pointer, true);
  },

  unload({ layers }) {
    removeDebugListeners?.();
    removeDebugListeners = null;
    clearSceneLayers(layers.world, layers.ui);
    clearDemoDebugState();
  },
});

export const designSystemScene = scene({
  name: "design-system",
  loading: { minimumMs: 0 },

  load({ app, layers, layout, switchScene }) {
    renderDesignSystem(layers.ui, layout);
    app.renderer.layout.update(layers.root);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        if (switchScene(verticalSliceScene, "debug")) sceneSwitches += 1;
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
      if (switchScene(verticalSliceScene, "scene")) sceneSwitches += 1;
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
    clearDesignSystemDebugState();
  },
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function createCameraState(layout: SurfaceLayout): CameraState {
  return {
    x: 0,
    y: 0,
    zoom: Math.max(minCameraZoom, Math.min(0.72, maxCameraZoom, layout.visibleWidth / 1500)),
  };
}

function readCamera(world: Container): CameraState {
  let camera = cameraByWorld.get(world);
  if (!camera) {
    camera = { x: 0, y: 0, zoom: 1 };
    cameraByWorld.set(world, camera);
  }
  return camera;
}

function readGesture(world: Container): GestureState {
  let gesture = gestureByWorld.get(world);
  if (!gesture) {
    gesture = { dragged: false };
    gestureByWorld.set(world, gesture);
  }
  return gesture;
}

function centerCameraOn(camera: CameraState, worldX: number, worldY: number, layout: SurfaceLayout): void {
  camera.x = layout.visibleWidth / 2 - worldX * camera.zoom;
  camera.y = layout.visibleHeight / 2 - worldY * camera.zoom;
  clampCamera(camera, layout);
}

function applyCamera(world: Container, camera: CameraState, layout: SurfaceLayout): void {
  clampCamera(camera, layout);
  world.position.set(camera.x, camera.y);
  world.scale.set(camera.zoom);
}

function clampCamera(camera: CameraState, layout: SurfaceLayout): void {
  camera.zoom = clamp(camera.zoom, minCameraZoom, maxCameraZoom);
  camera.x = clampCameraAxis(camera.x, layout.visibleWidth, worldWidth * camera.zoom);
  camera.y = clampCameraAxis(camera.y, layout.visibleHeight, worldHeight * camera.zoom);
}

function clampCameraAxis(offset: number, visible: number, scaledWorld: number): number {
  if (scaledWorld <= visible) return (visible - scaledWorld) / 2;
  return clamp(offset, visible - scaledWorld, 0);
}

function updateCameraGesture(pointer: Pointer, camera: CameraState, gesture: GestureState, layout: SurfaceLayout): void {
  const wheel = pointer.wheelDelta();
  const pointers = pointer.pointers();
  if (wheel !== 0) {
    zoomCameraAt(camera, 1 - wheel * 0.0012, pointer.position(), layout);
    gesture.dragged = true;
  }

  if (pointers.length >= 2) {
    const [first, second] = pointers;
    const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    if (gesture.lastPinchDistance !== undefined && gesture.lastPinchCenter !== undefined) {
      camera.x += center.x - gesture.lastPinchCenter.x;
      camera.y += center.y - gesture.lastPinchCenter.y;
      zoomCameraAt(camera, distance / gesture.lastPinchDistance, center, layout);
      gesture.dragged = true;
    }
    gesture.lastPinchDistance = distance;
    gesture.lastPinchCenter = center;
    gesture.lastPrimary = undefined;
    return;
  }

  gesture.lastPinchDistance = undefined;
  gesture.lastPinchCenter = undefined;

  if (pointers.length === 1) {
    const current = pointers[0];
    if (gesture.lastPrimary) {
      const dx = current.x - gesture.lastPrimary.x;
      const dy = current.y - gesture.lastPrimary.y;
      if (gesture.dragged || Math.hypot(dx, dy) >= cameraDragThreshold) {
        camera.x += dx;
        camera.y += dy;
        gesture.dragged = true;
      }
    }
    gesture.lastPrimary = current;
  } else {
    gesture.lastPrimary = undefined;
  }
  clampCamera(camera, layout);
}

function zoomCameraAt(camera: CameraState, rawFactor: number, screenPoint: { x: number; y: number }, layout: SurfaceLayout): void {
  const before = screenToWorld(screenPoint, camera);
  camera.zoom = clamp(camera.zoom * rawFactor, minCameraZoom, maxCameraZoom);
  camera.x = screenPoint.x - before.x * camera.zoom;
  camera.y = screenPoint.y - before.y * camera.zoom;
  clampCamera(camera, layout);
}

function screenToWorld(point: { x: number; y: number }, camera: CameraState): { x: number; y: number } {
  return {
    x: (point.x - camera.x) / camera.zoom,
    y: (point.y - camera.y) / camera.zoom,
  };
}

function configureHudLayout(hud: Container, layout: SurfaceLayout): void {
  const hudHeight = tokenValue(layout, surfaceTheme.font.title) * 1.25;
  configureSafeAreaRow(hud, layout, {
    label: "hud",
    height: hudHeight,
    justifyContent: "space-between",
    alignItems: "center",
  });
  hud.label = "hud";
}

function createAssetOrb(texture: Texture, layout: SurfaceLayout, xRatio: number, yRatio: number): Sprite {
  const orb = new Sprite(texture);
  const size = tokenValue(layout, surfaceTheme.size.player) * 0.9;
  orb.label = "asset-orb";
  orb.anchor.set(0.5);
  orb.position.set(worldWidth * xRatio, worldHeight * yRatio);
  orb.width = size;
  orb.height = size;
  return orb;
}

function createExplorationField(layout: SurfaceLayout): Container {
  const field = new Container({ label: "world-field" });
  const grid = new Graphics();
  grid.label = "world-grid";
  const gridStep = 360;
  for (let x = 0; x <= worldWidth; x += gridStep) {
    grid.moveTo(x, 0).lineTo(x, worldHeight);
  }
  for (let y = 0; y <= worldHeight; y += gridStep) {
    grid.moveTo(0, y).lineTo(worldWidth, y);
  }
  grid.stroke({ color: 0x334155, width: Math.max(1, 2 / layout.scale), alpha: 0.42 });
  field.addChild(grid);

  const itemSize = tokenValue(layout, surfaceTheme.components.marker.size);
  for (let index = 0; index < worldItemCount; index += 1) {
    const x = 180 + ((index * 263) % (worldWidth - 360));
    const y = 220 + ((index * 421) % (worldHeight - 440));
    const hue = index % 3;
    const item = new Graphics()
      .roundRect(-itemSize / 2, -itemSize / 2, itemSize, itemSize, tokenValue(layout, surfaceTheme.rounded.sm))
      .fill(hue === 0 ? surfaceTheme.color.marker : hue === 1 ? surfaceTheme.color.motion : surfaceTheme.color.warning)
      .stroke({ color: surfaceTheme.color.text, width: Math.max(1, 2 / layout.scale), alpha: 0.32 });
    item.label = "world-item";
    item.position.set(x, y);
    field.addChild(item);
  }

  return field;
}

function createInputTarget(layout: SurfaceLayout): Graphics {
  const radius = tokenValue(layout, surfaceTheme.components.inputTarget.size) / 2;
  const stroke = tokenValue(layout, surfaceTheme.components.actionHighlight.size);
  const target = new Graphics()
    .circle(0, 0, radius)
    .stroke({ color: surfaceTheme.color.motion, width: stroke, alpha: 0.84 })
    .moveTo(-radius * 1.35, 0)
    .lineTo(-radius * 0.72, 0)
    .moveTo(radius * 0.72, 0)
    .lineTo(radius * 1.35, 0)
    .moveTo(0, -radius * 1.35)
    .lineTo(0, -radius * 0.72)
    .moveTo(0, radius * 0.72)
    .lineTo(0, radius * 1.35)
    .stroke({ color: surfaceTheme.color.warning, width: Math.max(1, stroke * 0.55), alpha: 0.78 });
  target.label = "input-target";
  target.alpha = 0;
  return target;
}

function renderDesignSystem(layer: Container, layout: SurfaceLayout): void {
  const margin = tokenValue(layout, surfaceTheme.spacing.screen);
  const panelWidth = Math.min(layout.visibleWidth - margin * 2, 900 / layout.scale);
  const startX = layout.referenceX + layout.safeArea.left + margin;
  const sectionGap = margin * 0.42;
  const sectionLabelHeight = tokenValue(layout, { design: 42, minScreenPx: 24, maxScreenPx: 34 });
  const root = createPanel({
    layout,
    label: "design-system-root",
    width: panelWidth,
    direction: "column",
    alignItems: "flex-start",
    gap: margin * 0.55,
  });
  root.position.set(startX, layout.referenceY + layout.safeArea.top + margin);

  const title = createLabel({
    text: "Design System",
    layout,
    fontSize: { design: 68, minScreenPx: 28, maxScreenPx: 48 },
    color: surfaceTheme.color.text,
    label: "ds-title",
  });
  title.label = "ds-title";
  title.layout = {
    height: tokenValue(layout, { design: 84, minScreenPx: 42, maxScreenPx: 62 }),
  };
  root.addChild(title);

  const safeAreaSection = createPanel({
    layout,
    label: "ds-section",
    direction: "column",
    alignItems: "flex-start",
    gap: sectionGap,
  });
  const safeAreaLabel = createLabel({
    text: "Safe-area controls",
    layout,
    fontSize: { design: 34, minScreenPx: 18, maxScreenPx: 26 },
    color: "#bfdbfe",
    label: "ds-section-label",
  });
  safeAreaLabel.layout = {
    height: sectionLabelHeight,
  };
  const safeControlHeight = tokenValue(layout, { design: 82, minScreenPx: 46, maxScreenPx: 62 });
  const safeControlWidth = Math.min(panelWidth * 0.42, 340 / layout.scale);
  const safeAreaRow = createPanel({
    layout,
    label: "ds-safe-area-row",
    width: safeControlWidth * 2 + margin * 0.5,
    height: safeControlHeight,
    direction: "row",
    alignItems: "center",
    gap: margin * 0.5,
  });
  const topControl = createButton({
    text: "Top",
    width: safeControlWidth,
    height: safeControlHeight,
    layout,
    fontSize: { design: 30, minScreenPx: 16, maxScreenPx: 24 },
    textColor: surfaceTheme.color.text,
  });
  topControl.label = "ds-safe-area-control";
  topControl.layout = {
    width: safeControlWidth,
    height: safeControlHeight,
  };
  const bottomControl = createButton({
    text: "Bottom",
    width: safeControlWidth,
    height: safeControlHeight,
    layout,
    fontSize: { design: 30, minScreenPx: 16, maxScreenPx: 24 },
    fill: 0x1d4ed8,
    stroke: "#93c5fd",
    textColor: surfaceTheme.color.text,
  });
  bottomControl.label = "ds-safe-area-control";
  bottomControl.layout = {
    width: safeControlWidth,
    height: safeControlHeight,
  };
  safeAreaRow.addChild(topControl, bottomControl);
  safeAreaSection.addChild(safeAreaLabel, safeAreaRow);
  root.addChild(safeAreaSection);

  const colorSection = createPanel({
    layout,
    label: "ds-section",
    direction: "column",
    alignItems: "flex-start",
    gap: sectionGap,
  });
  const tokenLabel = createLabel({
    text: "Color tokens",
    layout,
    fontSize: { design: 34, minScreenPx: 18, maxScreenPx: 26 },
    color: "#bfdbfe",
    label: "ds-section-label",
  });
  tokenLabel.layout = {
    height: sectionLabelHeight,
  };
  colorSection.addChild(tokenLabel);

  const swatches = [
    surfaceTheme.color.player,
    surfaceTheme.color.playerStroke,
    surfaceTheme.color.marker,
    surfaceTheme.color.text,
    surfaceTheme.color.motion,
    surfaceTheme.color.warning,
  ];
  const swatchSize = tokenValue(layout, { design: 104, minScreenPx: 44, maxScreenPx: 70 });
  const swatchGap = margin * 0.42;
  const swatchRowWidth = swatches.length * swatchSize + (swatches.length - 1) * swatchGap;
  const swatchRow = createPanel({
    layout,
    label: "ds-swatch-row",
    width: swatchRowWidth,
    height: swatchSize,
    direction: "row",
    alignItems: "center",
    gap: swatchGap,
  });
  swatches.forEach((color) => {
    const swatch = new Graphics()
      .roundRect(0, 0, swatchSize, swatchSize, 8 / layout.scale)
      .fill(color)
      .stroke({ color: "#e5e7eb", width: Math.max(1, 2 / layout.scale), alpha: 0.6 });
    swatch.label = "ds-swatch";
    swatch.layout = {
      width: swatchSize,
      height: swatchSize,
    };
    swatchRow.addChild(swatch);
  });
  colorSection.addChild(swatchRow);
  root.addChild(colorSection);

  const typeSection = createPanel({
    layout,
    label: "ds-section",
    direction: "column",
    alignItems: "flex-start",
    gap: sectionGap,
  });
  const typeLabel = createLabel({
    text: "Typography",
    layout,
    fontSize: { design: 34, minScreenPx: 18, maxScreenPx: 26 },
    color: "#bfdbfe",
    label: "ds-section-label",
  });
  typeLabel.layout = { height: sectionLabelHeight };
  typeSection.addChild(typeLabel);
  const typeSamples = [
    ["Title", surfaceTheme.font.title],
    ["Body", { design: 34, minScreenPx: 18, maxScreenPx: 26 }],
    ["Caption", { design: 24, minScreenPx: 14, maxScreenPx: 18 }],
  ] as const;
  const typeColumn = createPanel({
    layout,
    label: "ds-type-column",
    width: Math.min(panelWidth, 420 / layout.scale),
    direction: "column",
    gap: margin * 0.28,
  });
  typeSamples.forEach(([text, size], index) => {
    const sample = createLabel({
      text,
      layout,
      fontSize: size,
      color: index === 0 ? surfaceTheme.color.text : "#cbd5e1",
      label: "ds-type-sample",
    });
    sample.layout = {
      height: tokenValue(layout, { design: 48, minScreenPx: 26, maxScreenPx: 38 }),
    };
    typeColumn.addChild(sample);
  });
  typeSection.addChild(typeColumn);
  root.addChild(typeSection);

  const buttonWidth = panelWidth * 0.38;
  const buttonHeight = tokenValue(layout, surfaceTheme.components.buttonPrimary.height);
  const markerRadius = tokenValue(layout, surfaceTheme.size.markerRadius);
  const motionSize = tokenValue(layout, surfaceTheme.components.inputTarget.size);
  const componentGap = margin;
  const componentSection = createPanel({
    layout,
    label: "ds-section",
    direction: "column",
    alignItems: "flex-start",
    gap: sectionGap,
  });
  const componentLabel = createLabel({
    text: "Components",
    layout,
    fontSize: { design: 34, minScreenPx: 18, maxScreenPx: 26 },
    color: "#bfdbfe",
    label: "ds-section-label",
  });
  componentLabel.layout = { height: sectionLabelHeight };
  componentSection.addChild(componentLabel);
  const componentRow = createPanel({
    layout,
    label: "ds-component-row",
    width: buttonWidth + markerRadius * 2 + motionSize + componentGap * 2,
    height: tokenValue(layout, { design: 112, minScreenPx: 58, maxScreenPx: 78 }),
    direction: "row",
    alignItems: "center",
    gap: componentGap,
  });
  const button = createButton({
    text: "Button",
    width: buttonWidth,
    height: buttonHeight,
    layout,
    fontSize: surfaceTheme.components.buttonPrimary.typography,
    textColor: surfaceTheme.color.text,
  });
  button.label = "ds-component-sample";
  button.layout = {
    width: buttonWidth,
    height: buttonHeight,
  };

  const marker = new Graphics().circle(0, 0, markerRadius).fill(surfaceTheme.color.marker);
  marker.label = "ds-component-sample";
  marker.layout = {
    width: markerRadius * 2,
    height: markerRadius * 2,
  };

  const motion = createInputTarget(layout);
  motion.label = "ds-motion-ring";
  motion.alpha = 0.78;
  motion.layout = {
    width: motionSize,
    height: motionSize,
  };

  componentRow.addChild(button, marker, motion);
  componentSection.addChild(componentRow);
  root.addChild(componentSection);
  layer.addChild(root);
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
  const worldLayer = stage.getChildByLabel("world-layer") as Container | null;
  const camera = worldLayer ? readCamera(worldLayer) : { x: 0, y: 0, zoom: 1 };
  const pointerPosition = pointer?.position() ?? { x: 0, y: 0 };
  setDemoDebugState({
    playerX,
    playerY,
    cameraX: camera.x,
    cameraY: camera.y,
    cameraZoom: camera.zoom,
    worldWidth,
    worldHeight,
    worldItems: countChildrenByLabel(stage, "world-item"),
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
  });
}

function syncDesignSystemState(layout: SurfaceLayout, stage: Container): void {
  setDesignSystemDebugState({
    scene: "design-system",
    sections: countChildrenByLabel(stage, "ds-section"),
    labels: countChildrenByLabel(stage, "ds-section-label"),
    swatches: countChildrenByLabel(stage, "ds-swatch"),
    typeSamples: countChildrenByLabel(stage, "ds-type-sample"),
    componentSamples: countChildrenByLabel(stage, "ds-component-sample"),
    safeAreaSamples: countChildrenByLabel(stage, "ds-safe-area-control"),
    buttonScreenHeight: screenValue(layout, surfaceTheme.components.buttonPrimary.height),
    inputTargetScreenSize: screenValue(layout, surfaceTheme.components.inputTarget.size),
    markerScreenSize: screenValue(layout, surfaceTheme.components.marker.size),
    buttonCenterDeltaY: measureButtonCenterDeltaY(stage),
    layerLabels: stage.children.map((child) => child.label ?? ""),
    rendered: layout.visibleWidth > 0,
  });
}

function measureButtonCenterDeltaY(stage: Container): number {
  const button = stage.getChildByLabel("ds-component-sample", true);
  const label = button?.getChildByLabel("button-label", true);
  const buttonBounds = button?.getBounds();
  const labelBounds = label?.getBounds();
  if (!buttonBounds || !labelBounds) return Number.POSITIVE_INFINITY;
  return Math.abs((buttonBounds.y + buttonBounds.height / 2) - (labelBounds.y + labelBounds.height / 2));
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
    layer.position.set(0, 0);
    layer.scale.set(1);
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
