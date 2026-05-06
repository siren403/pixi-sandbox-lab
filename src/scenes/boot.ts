import { Container, Graphics, Sprite, type Texture } from "pixi.js";
import demoOrbUrl from "../assets/demo-orb.svg";
import { screenValue, tokenValue } from "../runtime/surface";
import { surfaceTheme } from "../ui/tokens";
import type { Scene, SurfaceLayout } from "../runtime/scene";
import { scene } from "../runtime/scene";
import { navigateToSceneIndex } from "../runtime/navigation";
import { createWorld, type World } from "../runtime/world";
import type { WorldCamera } from "../runtime/worldCamera";
import { createButton } from "../ui/button";
import { createLabel } from "../ui/label";
import { configureSafeAreaRow } from "../ui/layout";
import { createAppShell, type AppShell, type AppShellSheet } from "../ui/layouts/appShell";
import { createPanel } from "../ui/panel";
import {
  clearDemoDebugState,
  clearDesignSystemDebugState,
  setDemoDebugState,
  setDesignSystemDebugState,
} from "../debug/stateBridge";
import { setDebugCommandHandler, type DebugCommandResult } from "../debug/commands";

const speed = 520;
const pointerFollowRate = 10;
const pointerSnapDistance = 3;
const demoWorldBounds = { width: 3600, height: 5200 };
const worldItemCount = 180;
const minCameraZoom = 0.32;
const maxCameraZoom = 2.2;
const cameraDragThreshold = 12;
type SampleSceneId = "vertical-slice" | "alternate" | "design-system";
type RectState = { x: number; y: number; width: number; height: number };
type SampleShellState = {
  sheet: AppShellSheet;
  buttons: {
    back?: RectState;
    controls?: RectState;
    debug?: RectState;
    close?: RectState;
    actions: Record<string, RectState>;
  };
};

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
const cameraByWorld = new WeakMap<Container, WorldCamera>();
const worldByLayer = new WeakMap<Container, World>();
const sampleShellState: Record<SampleSceneId, SampleShellState> = {
  "vertical-slice": { sheet: "none", buttons: { actions: {} } },
  alternate: { sheet: "none", buttons: { actions: {} } },
  "design-system": { sheet: "none", buttons: { actions: {} } },
};

type MotionPlayer = Graphics & {
  targetX?: number;
  targetY?: number;
  targetActive?: boolean;
};

export const verticalSliceScene = scene({
  name: "vertical-slice",
  assets: [demoOrbUrl],

  load({ assets, layers, layout, surface, switchScene }) {
    sampleShellState["vertical-slice"].sheet = "none";
    const playerSize = surface.token(surfaceTheme.size.player);
    const playerRadius = surface.token(surfaceTheme.radius.player);
    const playerStroke = surface.token(surfaceTheme.size.playerStroke);
    const markerRadius = surface.token(surfaceTheme.size.markerRadius);
    const world = createDemoWorld(layers.world);
    const camera = createDemoCamera(world, layout);
    worldByLayer.set(layers.world, world);
    cameraByWorld.set(layers.world, camera);

    const player = new Graphics()
      .roundRect(-playerSize / 2, -playerSize / 2, playerSize, playerSize, playerRadius)
      .fill(surfaceTheme.color.player)
      .stroke({ color: surfaceTheme.color.playerStroke, width: playerStroke });

    player.label = "player";
    player.position.set(world.center().x, world.center().y);
    const motionPlayer = player as MotionPlayer;
    motionPlayer.targetX = player.x;
    motionPlayer.targetY = player.y;
    motionPlayer.targetActive = false;

    const assetOrb = createAssetOrb(assets.get<Texture>(demoOrbUrl), layout, 0.74, 0.58);
    const inputTarget = createInputTarget(layout);
    const field = createExplorationField(layout);

    renderSampleShell(layers.ui, layout, {
      sceneId: "vertical-slice",
      title: "PixiJS vertical slice",
      titleLabel: "title",
      markerColor: surfaceTheme.color.marker,
      markerRadius,
    });
    layers.world.addChild(field, assetOrb, inputTarget, player);
    camera.centerOn(player.x, player.y, layout);
    camera.apply(layout);
    surface.updateLayout();
    syncRenderedSampleShell("vertical-slice", layers.ui, layout);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        if (switchScene(alternateScene, "debug")) sceneSwitches += 1;
      },
      onDesignSystem: () => {
        if (switchScene(designSystemScene, "debug")) sceneSwitches += 1;
      },
      onOpenScene: (sceneId) => {
        if (sceneId === "vertical-slice") return true;
        if (sceneId === "alternate") return switchSampleScene(() => switchScene(alternateScene, "debug"));
        if (sceneId === "design-system") return switchSampleScene(() => switchScene(designSystemScene, "debug"));
        return false;
      },
    });

    syncDemoState("vertical-slice", player.x, player.y, layout, layers.root, undefined, assets.isReady(demoOrbUrl));
  },

  resize({ layers, layout, surface }) {
    const player = layers.world.getChildByLabel("player") as Graphics | null;
    const world = readWorld(layers.world);
    const camera = readCamera(layers.world, layout);
    if (!player) return;

    const playerPadding = surface.token(surfaceTheme.size.player) / 2;
    world.clampObject(player, playerPadding);
    camera.clamp(layout);
    camera.apply(layout);

    rerenderSampleShell(layers.ui, layout, {
      sceneId: "vertical-slice",
      title: "PixiJS vertical slice",
      titleLabel: "title",
      markerColor: surfaceTheme.color.marker,
      markerRadius: tokenValue(layout, surfaceTheme.size.markerRadius),
    });
    surface.updateLayout();
    syncRenderedSampleShell("vertical-slice", layers.ui, layout);

    syncDemoState("vertical-slice", player.x, player.y, layout, layers.root, undefined, true);
  },

  update(dt, { layers, keyboard, pointer, layout, surface, switchScene }) {
    const player = layers.world.getChildByLabel("player") as MotionPlayer | null;
    const inputTarget = layers.world.getChildByLabel("input-target") as Graphics | null;
    const world = readWorld(layers.world);
    const camera = readCamera(layers.world, layout);
    if (!player) return;

    if (pointer.wasPressed() && handleSampleShellPointer("vertical-slice", layers.ui, layout, pointer.position(), switchScene, () => surface.updateLayout())) {
      return;
    }

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
    camera.updateGesture(pointer, layout);
    const pointerPressed = pointer.wasPressed();
    const pointerReleased = pointer.wasReleased();
    if (pointerReleased && !camera.hasDragged() && pointer.pointers().length === 0) {
      const position = camera.screenToWorld(pointer.position());
      const target = world.clampPoint(position, playerPadding);
      player.targetX = target.x;
      player.targetY = target.y;
      player.targetActive = true;
      if (inputTarget) {
        inputTarget.position.set(player.targetX, player.targetY);
        inputTarget.alpha = 0.9;
        inputTarget.scale.set(pointerPressed ? 1.28 : 1);
      }
    }
    if (pointerReleased && pointer.pointers().length === 0) {
      camera.resetGesture();
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

    world.clampObject(player, playerPadding);
    if (!player.targetActive) {
      player.rotation = lerp(player.rotation, 0, 1 - Math.exp(-12 * dt));
    }
    updateInputTarget(inputTarget, dt);
    camera.apply(layout);

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

  load({ assets, layers, layout, surface, switchScene }) {
    sampleShellState.alternate.sheet = "none";
    const markerRadius = tokenValue(layout, surfaceTheme.size.markerRadius) * 1.35;

    const playerSize = tokenValue(layout, surfaceTheme.size.player);
    const player = new Graphics()
      .circle(0, 0, playerSize / 2)
      .fill("#c77dff")
      .stroke({ color: "#f3c4fb", width: tokenValue(layout, surfaceTheme.size.playerStroke) });
    player.label = "player";
    player.position.set(layout.visibleWidth / 2, layout.visibleHeight / 2);

    const assetOrb = createAssetOrb(assets.get<Texture>(demoOrbUrl), layout, 0.28, 0.58);

    renderSampleShell(layers.ui, layout, {
      sceneId: "alternate",
      title: "Alternate scene",
      titleLabel: "title",
      markerColor: "#80ed99",
      markerRadius,
    });
    layers.world.addChild(assetOrb, player);
    surface.updateLayout();
    syncRenderedSampleShell("alternate", layers.ui, layout);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        if (switchScene(verticalSliceScene, "debug")) sceneSwitches += 1;
      },
      onDesignSystem: () => {
        if (switchScene(designSystemScene, "debug")) sceneSwitches += 1;
      },
      onOpenScene: (sceneId) => {
        if (sceneId === "vertical-slice") return switchSampleScene(() => switchScene(verticalSliceScene, "debug"));
        if (sceneId === "alternate") return true;
        if (sceneId === "design-system") return switchSampleScene(() => switchScene(designSystemScene, "debug"));
        return false;
      },
    });

    syncDemoState("alternate", player.x, player.y, layout, layers.root, undefined, assets.isReady(demoOrbUrl));
  },

  resize({ layers, layout, surface }) {
    const player = layers.world.getChildByLabel("player") as Graphics | null;
    if (!player) return;

    player.position.set(layout.visibleWidth / 2, layout.visibleHeight / 2);
    rerenderSampleShell(layers.ui, layout, {
      sceneId: "alternate",
      title: "Alternate scene",
      titleLabel: "title",
      markerColor: "#80ed99",
      markerRadius: tokenValue(layout, surfaceTheme.size.markerRadius) * 1.35,
    });
    surface.updateLayout();
    syncRenderedSampleShell("alternate", layers.ui, layout);

    syncDemoState("alternate", player.x, player.y, layout, layers.root, undefined, true);
  },

  update(_dt, { layers, keyboard, pointer, layout, surface, switchScene }) {
    const player = layers.world.getChildByLabel("player") as Graphics | null;
    if (!player) return;

    if (pointer.wasPressed() && handleSampleShellPointer("alternate", layers.ui, layout, pointer.position(), switchScene, () => surface.updateLayout())) {
      return;
    }

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
  transition: { enabled: true, minimumMs: 0 },

  load({ layers, layout, surface, switchScene }) {
    sampleShellState["design-system"].sheet = "none";
    renderDesignSystem(layers.ui, layout);
    renderSampleShell(layers.ui, layout, {
      sceneId: "design-system",
      title: "Design System",
    });
    surface.updateLayout();
    syncRenderedSampleShell("design-system", layers.ui, layout);
    removeDebugListeners = installDebugSceneListeners({
      onScene: () => {
        if (switchScene(verticalSliceScene, "debug")) sceneSwitches += 1;
      },
      onDesignSystem: () => undefined,
      onOpenScene: (sceneId) => {
        if (sceneId === "vertical-slice" || sceneId === "alternate") return switchSampleScene(() => switchScene(verticalSliceScene, "debug"));
        if (sceneId === "design-system") return true;
        return false;
      },
    });
    syncDesignSystemState(layout, layers.root);
  },

  resize({ layers, layout, surface }) {
    clearSceneLayers(layers.ui);
    renderDesignSystem(layers.ui, layout);
    renderSampleShell(layers.ui, layout, {
      sceneId: "design-system",
      title: "Design System",
    });
    surface.updateLayout();
    syncRenderedSampleShell("design-system", layers.ui, layout);
    syncDesignSystemState(layout, layers.root);
  },

  update(dt, { layers, keyboard, pointer, layout, surface, switchScene }) {
    if (pointer.wasPressed() && handleSampleShellPointer("design-system", layers.ui, layout, pointer.position(), switchScene, () => surface.updateLayout())) {
      return;
    }

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

function containsPoint(bounds: RectState, x: number, y: number): boolean {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

function toDesignBounds(
  layout: SurfaceLayout,
  bounds: { x: number; y: number; width: number; height: number } | undefined,
): RectState {
  if (!bounds) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: bounds.x / layout.scale,
    y: bounds.y / layout.scale,
    width: bounds.width / layout.scale,
    height: bounds.height / layout.scale,
  };
}

function createDemoWorld(layer: Container): World {
  return createWorld(layer, demoWorldBounds);
}

function readWorld(layer: Container): World {
  let world = worldByLayer.get(layer);
  if (!world) {
    world = createDemoWorld(layer);
    worldByLayer.set(layer, world);
  }
  return world;
}

function createDemoCamera(world: World, layout: SurfaceLayout): WorldCamera {
  return world.createCamera(
    layout,
    {
      minZoom: minCameraZoom,
      maxZoom: maxCameraZoom,
      dragThreshold: cameraDragThreshold,
      initialZoom: (nextLayout) => Math.max(minCameraZoom, Math.min(0.46, maxCameraZoom, nextLayout.visibleWidth / 2400)),
    },
  );
}

function readCamera(layer: Container, layout: SurfaceLayout): WorldCamera {
  let camera = cameraByWorld.get(layer);
  if (!camera) {
    camera = createDemoCamera(readWorld(layer), layout);
    cameraByWorld.set(layer, camera);
  }
  return camera;
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

function renderSampleShell(
  layer: Container,
  layout: SurfaceLayout,
  options: {
    sceneId: SampleSceneId;
    title: string;
    titleLabel?: string;
    markerColor?: string | number;
    markerRadius?: number;
  },
): AppShell {
  const state = sampleShellState[options.sceneId];
  const shell = createAppShell(layout, {
    title: options.title,
    titleLabel: options.titleLabel,
    showBack: true,
    activeSheet: state.sheet,
    sheetTitle: state.sheet === "debug" ? "Debug" : "Controls",
    sheetLines: sampleSheetLines(options.sceneId, state.sheet),
    sheetActions: state.sheet === "debug" ? sampleDebugActions(options.sceneId) : [],
  });
  shell.label = "app-shell";

  if (options.markerColor !== undefined && options.markerRadius !== undefined) {
    const marker = new Graphics()
      .circle(options.markerRadius, options.markerRadius, options.markerRadius)
      .fill(options.markerColor);
    marker.label = "marker";
    marker.layout = {
      width: options.markerRadius * 2,
      height: options.markerRadius * 2,
    };
    shell.topBarRight.addChild(marker);
  }

  layer.addChild(shell);
  syncSampleShellState(options.sceneId, layout, shell);
  return shell;
}

function rerenderSampleShell(
  layer: Container,
  layout: SurfaceLayout,
  options: {
    sceneId: SampleSceneId;
    title: string;
    titleLabel?: string;
    markerColor?: string | number;
    markerRadius?: number;
  },
): void {
  for (const child of layer.children.filter((candidate) => candidate.label === "app-shell")) {
    layer.removeChild(child);
    child.destroy({ children: true });
  }
  renderSampleShell(layer, layout, options);
}

function syncSampleShellState(sceneId: SampleSceneId, layout: SurfaceLayout, shell: AppShell): void {
  sampleShellState[sceneId].buttons = {
    back: shell.buttons.back ? toDesignBounds(layout, shell.buttons.back.getBounds()) : undefined,
    controls: toDesignBounds(layout, shell.buttons.controls.getBounds()),
    debug: toDesignBounds(layout, shell.buttons.debug.getBounds()),
    close: shell.buttons.closeSheet ? toDesignBounds(layout, shell.buttons.closeSheet.getBounds()) : undefined,
    actions: Object.fromEntries(
      Object.entries(shell.buttons.sheetActions).map(([id, button]) => [id, toDesignBounds(layout, button.getBounds())]),
    ),
  };
}

function syncRenderedSampleShell(sceneId: SampleSceneId, layer: Container, layout: SurfaceLayout): void {
  const shell = layer.getChildByLabel("app-shell") as AppShell | null;
  if (shell) syncSampleShellState(sceneId, layout, shell);
}

function handleSampleShellPointer(
  sceneId: SampleSceneId,
  layer: Container,
  layout: SurfaceLayout,
  position: { x: number; y: number },
  switchScene: (scene: Scene, source?: "scene" | "intro" | "debug") => boolean,
  updateLayout: () => void,
): boolean {
  const state = sampleShellState[sceneId];
  const buttons = state.buttons;
  if (buttons.back && containsPoint(buttons.back, position.x, position.y)) {
    return navigateToSceneIndex();
  }
  if (buttons.controls && containsPoint(buttons.controls, position.x, position.y)) {
    state.sheet = state.sheet === "controls" ? "none" : "controls";
    rerenderShellForScene(sceneId, layer, layout);
    updateLayout();
    syncRenderedSampleShell(sceneId, layer, layout);
    return true;
  }
  if (buttons.debug && containsPoint(buttons.debug, position.x, position.y)) {
    state.sheet = state.sheet === "debug" ? "none" : "debug";
    rerenderShellForScene(sceneId, layer, layout);
    updateLayout();
    syncRenderedSampleShell(sceneId, layer, layout);
    return true;
  }
  if (buttons.close && containsPoint(buttons.close, position.x, position.y)) {
    state.sheet = "none";
    rerenderShellForScene(sceneId, layer, layout);
    updateLayout();
    syncRenderedSampleShell(sceneId, layer, layout);
    return true;
  }

  const action = Object.entries(buttons.actions).find(([, bounds]) => containsPoint(bounds, position.x, position.y))?.[0];
  if (!action) return false;
  if (action === "scene-index") return navigateToSceneIndex();
  if (action === "scene-vertical") return switchScene(verticalSliceScene, "debug");
  if (action === "scene-design") return switchScene(designSystemScene, "debug");
  if (action === "layout-bounds") {
    window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { enabled: true, mode: "bounds", filter: "all" } }));
    return true;
  }
  if (action === "layout-off") {
    window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: { enabled: false } }));
    return true;
  }
  if (action === "reload") {
    window.location.reload();
    return true;
  }
  return false;
}

function rerenderShellForScene(sceneId: SampleSceneId, layer: Container, layout: SurfaceLayout): void {
  if (sceneId === "vertical-slice") {
    rerenderSampleShell(layer, layout, {
      sceneId,
      title: "PixiJS vertical slice",
      titleLabel: "title",
      markerColor: surfaceTheme.color.marker,
      markerRadius: tokenValue(layout, surfaceTheme.size.markerRadius),
    });
    return;
  }
  if (sceneId === "alternate") {
    rerenderSampleShell(layer, layout, {
      sceneId,
      title: "Alternate scene",
      titleLabel: "title",
      markerColor: "#80ed99",
      markerRadius: tokenValue(layout, surfaceTheme.size.markerRadius) * 1.35,
    });
    return;
  }
  rerenderSampleShell(layer, layout, {
    sceneId,
    title: "Design System",
  });
}

function sampleSheetLines(sceneId: SampleSceneId, sheet: AppShellSheet): string[] {
  if (sheet === "none") return [];
  if (sheet === "controls") {
    if (sceneId === "vertical-slice") return ["Drag or pinch the world.", "Tap empty space to move the player."];
    if (sceneId === "alternate") return ["Press X to return to the vertical slice."];
    return ["Inspect tokens, primitives, layout rows, and motion samples."];
  }
  return ["Debug actions are part of the Pixi app shell.", "The DOM debug panel is kept hidden for E2E state only."];
}

function sampleDebugActions(sceneId: SampleSceneId): Array<{ id: string; label: string }> {
  const actions = [
    { id: "scene-index", label: "Back to Samples" },
    { id: "layout-bounds", label: "Layout Bounds" },
    { id: "layout-off", label: "Layout Off" },
    { id: "reload", label: "Reload" },
  ];
  if (sceneId !== "vertical-slice") actions.splice(1, 0, { id: "scene-vertical", label: "Open Vertical Slice" });
  if (sceneId !== "design-system") actions.splice(1, 0, { id: "scene-design", label: "Open Design System" });
  return actions;
}

function createAssetOrb(texture: Texture, layout: SurfaceLayout, xRatio: number, yRatio: number): Sprite {
  const orb = new Sprite(texture);
  const size = tokenValue(layout, surfaceTheme.size.player) * 0.9;
  orb.label = "asset-orb";
  orb.anchor.set(0.5);
  orb.position.set(demoWorldBounds.width * xRatio, demoWorldBounds.height * yRatio);
  orb.width = size;
  orb.height = size;
  return orb;
}

function createExplorationField(layout: SurfaceLayout): Container {
  const field = new Container({ label: "world-field" });
  const grid = new Graphics();
  grid.label = "world-grid";
  const gridStep = 360;
  for (let x = 0; x <= demoWorldBounds.width; x += gridStep) {
    grid.moveTo(x, 0).lineTo(x, demoWorldBounds.height);
  }
  for (let y = 0; y <= demoWorldBounds.height; y += gridStep) {
    grid.moveTo(0, y).lineTo(demoWorldBounds.width, y);
  }
  grid.stroke({ color: 0x334155, width: Math.max(1, 2 / layout.scale), alpha: 0.42 });
  field.addChild(grid);

  const itemSize = tokenValue(layout, surfaceTheme.components.marker.size) * 1.8;
  const items = new Graphics();
  items.label = "world-items";
  for (let index = 0; index < worldItemCount; index += 1) {
    const column = index % 13;
    const row = Math.floor(index / 13);
    const jitterX = ((index * 37) % 120) - 60;
    const jitterY = ((index * 53) % 150) - 75;
    const x = 180 + column * 270 + jitterX;
    const y = 240 + row * 240 + jitterY;
    const hue = index % 3;
    items
      .roundRect(x - itemSize / 2, y - itemSize / 2, itemSize, itemSize, tokenValue(layout, surfaceTheme.rounded.sm))
      .fill(hue === 0 ? surfaceTheme.color.marker : hue === 1 ? surfaceTheme.color.motion : surfaceTheme.color.warning)
      .stroke({ color: surfaceTheme.color.text, width: Math.max(1, 2 / layout.scale), alpha: 0.32 });
  }
  field.addChild(items);

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
  const camera = worldLayer ? (cameraByWorld.get(worldLayer)?.state ?? { x: 0, y: 0, zoom: 1 }) : { x: 0, y: 0, zoom: 1 };
  const pointerPosition = pointer?.position() ?? { x: 0, y: 0 };
  setDemoDebugState({
    playerX,
    playerY,
    cameraX: camera.x,
    cameraY: camera.y,
    cameraZoom: camera.zoom,
    worldWidth: demoWorldBounds.width,
    worldHeight: demoWorldBounds.height,
    worldItems: worldItemCount,
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

function installDebugSceneListeners(handlers: {
  onScene: () => void;
  onDesignSystem: () => void;
  onOpenScene?: (sceneId: string) => boolean;
}): () => void {
  const sceneListener = () => handlers.onScene();
  const designSystemListener = () => handlers.onDesignSystem();
  const restoreDebugCommandHandler = setDebugCommandHandler((command) => {
    if (command.type === "app.reload") {
      window.location.reload();
      return acceptedCommand(command.type);
    }
    if (command.type === "scene.open") {
      if (!["vertical-slice", "alternate", "design-system"].includes(command.sceneId)) {
        return ignoredCommand(command.type, `Unsupported scene id: ${command.sceneId}`);
      }
      if (handlers.onOpenScene?.(command.sceneId)) {
        return acceptedCommand(command.type);
      }
      return ignoredCommand(command.type, "Scene switch was ignored by the runtime.");
    }
    if (command.type === "layout.set") {
      window.dispatchEvent(new CustomEvent("pixi:layout-debug-set", { detail: command }));
      return acceptedCommand(command.type);
    }
    return unsupportedCommand(command.type);
  });
  window.addEventListener("pixi:scene-switch", sceneListener);
  window.addEventListener("pixi:design-system", designSystemListener);
  return () => {
    restoreDebugCommandHandler();
    window.removeEventListener("pixi:scene-switch", sceneListener);
    window.removeEventListener("pixi:design-system", designSystemListener);
  };
}

function switchSampleScene(request: () => boolean): boolean {
  const accepted = request();
  if (accepted) sceneSwitches += 1;
  return accepted;
}

function acceptedCommand(type: DebugCommandResult["type"]): DebugCommandResult {
  return { accepted: true, status: "accepted", type };
}

function ignoredCommand(type: DebugCommandResult["type"], reason: string): DebugCommandResult {
  return { accepted: false, status: "ignored", type, reason };
}

function unsupportedCommand(type: DebugCommandResult["type"]): DebugCommandResult {
  return { accepted: false, status: "unsupported", type, reason: "Command is not supported in this scene." };
}
