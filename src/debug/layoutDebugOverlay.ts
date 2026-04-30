import { Graphics, type Application, type Container } from "pixi.js";
import { readCurrentDebugScene, setLayoutDebugState, type PixiLayoutDebugState } from "./stateBridge";

type LayoutDebugFilter = "all" | "world" | "ui";
type LayoutDebugMode = "layout" | "bounds";

type DebuggableContainer = Container & {
  _layout?: {
    style?: Record<string, unknown>;
  } | null;
  layout?: Record<string, unknown> | null;
};

type LayoutDebugStorage = {
  folded?: boolean;
  mode?: LayoutDebugMode;
  filter?: LayoutDebugFilter;
  x?: number;
  y?: number;
};

const storageKey = "prompt-ops:pixi-layout-debug";

export function installLayoutDebug(app: Application, root: Container): () => void {
  const stored = readStoredState();
  const semanticBounds = new Graphics();
  semanticBounds.label = "semantic-bounds-debug";
  const debugLayer = root.getChildByLabel("debug-layer") as Container | null;
  debugLayer?.addChild(semanticBounds);

  const panel = document.createElement("section");
  panel.dataset.testid = "layout-debug-panel";
  Object.assign(panel.style, {
    position: "fixed",
    zIndex: "20",
    minWidth: "188px",
    border: "1px solid rgba(238, 242, 246, 0.38)",
    borderRadius: "8px",
    background: "rgba(11, 18, 26, 0.84)",
    color: "#eef2f6",
    font: "600 12px Inter, system-ui, sans-serif",
    padding: "10px",
    touchAction: "manipulation",
    userSelect: "none",
  });
  if (stored.x !== undefined && stored.y !== undefined) {
    panel.style.left = `${stored.x}px`;
    panel.style.top = `${stored.y}px`;
  } else {
    panel.style.right = "max(16px, env(safe-area-inset-right))";
    panel.style.top = "max(16px, env(safe-area-inset-top))";
  }

  const header = document.createElement("div");
  header.dataset.testid = "layout-debug-header";
  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "8px",
    cursor: "move",
    touchAction: "none",
  });

  const titleWrap = document.createElement("div");
  Object.assign(titleWrap.style, {
    display: "grid",
    gap: "2px",
  });

  const title = document.createElement("span");
  title.textContent = "Layout Debug";

  const sceneName = document.createElement("span");
  sceneName.dataset.testid = "layout-debug-current-scene";
  Object.assign(sceneName.style, {
    color: "rgba(238, 242, 246, 0.68)",
    font: "500 11px Inter, system-ui, sans-serif",
  });

  titleWrap.append(title, sceneName);

  const headerControls = document.createElement("div");
  Object.assign(headerControls.style, {
    display: "flex",
    gap: "6px",
  });

  const foldButton = document.createElement("button");
  foldButton.type = "button";
  foldButton.dataset.testid = "layout-debug-fold";
  foldButton.textContent = "Fold";
  Object.assign(foldButton.style, buttonStyle());

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.dataset.testid = "layout-debug-toggle";
  toggle.textContent = "Off";
  Object.assign(toggle.style, buttonStyle());

  headerControls.append(foldButton, toggle);
  header.append(titleWrap, headerControls);

  const filterRow = document.createElement("div");
  filterRow.dataset.testid = "layout-debug-filters";
  Object.assign(filterRow.style, {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "6px",
    marginBottom: "8px",
  });

  const filterButtons = new Map<LayoutDebugFilter, HTMLButtonElement>();
  for (const value of ["all", "world", "ui"] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.testid = `layout-debug-filter-${value}`;
    button.textContent = value === "all" ? "All" : value[0].toUpperCase() + value.slice(1);
    Object.assign(button.style, buttonStyle());
    filterButtons.set(value, button);
    filterRow.appendChild(button);
  }

  const modeRow = document.createElement("div");
  modeRow.dataset.testid = "layout-debug-modes";
  Object.assign(modeRow.style, {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "6px",
    marginBottom: "8px",
  });

  const modeButtons = new Map<LayoutDebugMode, HTMLButtonElement>();
  for (const value of ["layout", "bounds"] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.testid = `layout-debug-mode-${value}`;
    button.textContent = value === "layout" ? "Layout" : "Bounds";
    Object.assign(button.style, buttonStyle());
    modeButtons.set(value, button);
    modeRow.appendChild(button);
  }

  const sceneButton = document.createElement("button");
  sceneButton.type = "button";
  sceneButton.dataset.testid = "layout-debug-scene";
  sceneButton.textContent = "Scene";
  Object.assign(sceneButton.style, {
    ...buttonStyle(),
    width: "100%",
    marginBottom: "6px",
  });

  const designSystemButton = document.createElement("button");
  designSystemButton.type = "button";
  designSystemButton.dataset.testid = "layout-debug-design-system";
  designSystemButton.textContent = "DS";
  Object.assign(designSystemButton.style, {
    ...buttonStyle(),
    width: "100%",
    marginBottom: "6px",
  });

  const reloadButton = document.createElement("button");
  reloadButton.type = "button";
  reloadButton.dataset.testid = "layout-debug-reload";
  reloadButton.textContent = "Reload";
  Object.assign(reloadButton.style, {
    ...buttonStyle(),
    width: "100%",
    marginBottom: "8px",
  });

  const stats = document.createElement("div");
  stats.dataset.testid = "layout-debug-stats";
  Object.assign(stats.style, {
    color: "rgba(238, 242, 246, 0.82)",
    fontWeight: "500",
    lineHeight: "1.45",
  });

  panel.append(header, modeRow, filterRow, sceneButton, designSystemButton, reloadButton, stats);

  let enabled = false;
  let mode: LayoutDebugMode = stored.mode ?? "layout";
  let filter: LayoutDebugFilter = stored.filter ?? "all";
  let folded = stored.folded ?? true;
  let destroyed = false;
  let restoreCount = 0;
  let mountedOnce = false;
  let drag:
    | {
      pointerId: number;
      startPointerX: number;
      startPointerY: number;
      startPanelX: number;
      startPanelY: number;
    }
    | null = null;
  const installedAt = performance.now();

  const ensurePanelConnected = () => {
    if (destroyed || panel.isConnected) return;
    document.body.appendChild(panel);
    if (mountedOnce) restoreCount += 1;
    mountedOnce = true;
    clampPanelToViewport();
  };

  const saveState = () => {
    const rect = panel.getBoundingClientRect();
    writeStoredState({
      folded,
      mode,
      filter,
      x: Math.round(rect.left),
      y: Math.round(rect.top),
    });
  };

  const syncState = () => {
    ensurePanelConnected();
    const layoutNodes = countLayoutNodes(root);
    const debuggedNodes = countDebuggedNodes(root);
    const semanticBoxes = countSemanticBoxes(root, filter);
    const layerLabels = root.children.map((child) => child.label ?? "");
    const currentScene = readCurrentDebugScene();
    const rect = panel.getBoundingClientRect();
    setLayoutDebugState({
      enabled,
      mode,
      filter,
      layoutNodes,
      debuggedNodes,
      semanticBoxes,
      layerLabels,
      installedAt,
      panelConnected: panel.isConnected,
      restoreCount,
      visibilityState: document.visibilityState,
      folded,
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      currentScene,
    });
    sceneName.textContent = `Scene: ${currentScene}`;

    toggle.textContent = enabled ? "On" : "Off";
    toggle.setAttribute("aria-pressed", String(enabled));
    setButtonActive(toggle, enabled);

    for (const [value, button] of filterButtons) {
      button.setAttribute("aria-pressed", String(value === filter));
      setButtonActive(button, value === filter);
    }
    for (const [value, button] of modeButtons) {
      button.setAttribute("aria-pressed", String(value === mode));
      setButtonActive(button, value === mode);
    }

    foldButton.textContent = folded ? "Open" : "Fold";
    foldButton.setAttribute("aria-expanded", String(!folded));
    setButtonActive(foldButton, folded);
    modeRow.style.display = folded ? "none" : "grid";
    filterRow.style.display = folded ? "none" : "grid";
    sceneButton.style.display = folded ? "none" : "inline-flex";
    designSystemButton.style.display = folded ? "none" : "inline-flex";
    reloadButton.style.display = folded ? "none" : "inline-flex";
    stats.style.display = folded ? "none" : "block";
    stats.textContent = `mode ${mode} | nodes ${debuggedNodes}/${layoutNodes} | boxes ${semanticBoxes} | ${layerLabels.join(", ")}`;
  };

  const syncLayoutFlags = () => {
    const layoutDebugEnabled = enabled && mode === "layout";
    applyDebugFlag(root, layoutDebugEnabled, filter);
    drawSemanticBounds(semanticBounds, root, enabled && mode === "bounds", filter);
    syncState();
  };

  const setEnabled = async (next: boolean) => {
    enabled = next;
    syncLayoutFlags();
    await app.renderer.layout.enableDebug(enabled && mode === "layout");
    app.renderer.layout.update(app.stage);
  };

  const onToggleClick = () => {
    void setEnabled(!enabled);
  };

  const onFoldClick = () => {
    folded = !folded;
    syncState();
    saveState();
  };

  const onFilterClick = (next: LayoutDebugFilter) => {
    filter = next;
    syncLayoutFlags();
    app.renderer.layout.update(app.stage);
    saveState();
  };

  const onModeClick = async (next: LayoutDebugMode) => {
    mode = next;
    syncLayoutFlags();
    await app.renderer.layout.enableDebug(enabled && mode === "layout");
    app.renderer.layout.update(app.stage);
    saveState();
  };

  const onSceneClick = () => {
    window.dispatchEvent(new CustomEvent("pixi:scene-switch"));
  };

  const onDesignSystemClick = () => {
    window.dispatchEvent(new CustomEvent("pixi:design-system"));
  };

  const onReloadClick = () => {
    window.location.reload();
  };

  const onHeaderPointerDown = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const rect = panel.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startPanelX: rect.left,
      startPanelY: rect.top,
    };
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = "";
    panel.style.bottom = "";
    header.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onHeaderPointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    setPanelPosition(
      drag.startPanelX + event.clientX - drag.startPointerX,
      drag.startPanelY + event.clientY - drag.startPointerY,
    );
    syncState();
  };

  const onHeaderPointerUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
    clampPanelToViewport();
    syncState();
    saveState();
  };

  const onResize = () => {
    clampPanelToViewport();
    syncState();
    saveState();
  };

  foldButton.addEventListener("click", onFoldClick);
  toggle.addEventListener("click", onToggleClick);
  sceneButton.addEventListener("click", onSceneClick);
  designSystemButton.addEventListener("click", onDesignSystemClick);
  reloadButton.addEventListener("click", onReloadClick);
  header.addEventListener("pointerdown", onHeaderPointerDown);
  header.addEventListener("pointermove", onHeaderPointerMove);
  header.addEventListener("pointerup", onHeaderPointerUp);
  header.addEventListener("pointercancel", onHeaderPointerUp);
  for (const [value, button] of filterButtons) {
    button.addEventListener("click", () => onFilterClick(value));
  }
  for (const [value, button] of modeButtons) {
    button.addEventListener("click", () => {
      void onModeClick(value);
    });
  }
  ensurePanelConnected();
  syncState();

  const onPageShow = () => syncState();
  const onVisibilityChange = () => syncState();
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibilityChange);
  app.ticker.add(syncLayoutFlags);

  return () => {
    if (destroyed) return;
    destroyed = true;
    app.ticker.remove(syncLayoutFlags);
    foldButton.removeEventListener("click", onFoldClick);
    toggle.removeEventListener("click", onToggleClick);
    sceneButton.removeEventListener("click", onSceneClick);
    designSystemButton.removeEventListener("click", onDesignSystemClick);
    reloadButton.removeEventListener("click", onReloadClick);
    header.removeEventListener("pointerdown", onHeaderPointerDown);
    header.removeEventListener("pointermove", onHeaderPointerMove);
    header.removeEventListener("pointerup", onHeaderPointerUp);
    header.removeEventListener("pointercancel", onHeaderPointerUp);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    panel.remove();
    void app.renderer.layout.enableDebug(false);
    applyDebugFlag(root, false, "all");
    semanticBounds.destroy();
    setLayoutDebugState({
      enabled: false,
      mode,
      filter,
      layoutNodes: 0,
      debuggedNodes: 0,
      semanticBoxes: 0,
      layerLabels: [],
      installedAt,
      panelConnected: false,
      restoreCount,
      visibilityState: document.visibilityState,
      folded,
      x: Math.round(panel.getBoundingClientRect().left),
      y: Math.round(panel.getBoundingClientRect().top),
      currentScene: readCurrentDebugScene(),
    });
  };

  function setPanelPosition(x: number, y: number): void {
    const rect = panel.getBoundingClientRect();
    const padding = 8;
    const maxX = Math.max(padding, window.innerWidth - rect.width - padding);
    const maxY = Math.max(padding, window.innerHeight - rect.height - padding);
    panel.style.left = `${Math.round(Math.max(padding, Math.min(maxX, x)))}px`;
    panel.style.top = `${Math.round(Math.max(padding, Math.min(maxY, y)))}px`;
    panel.style.right = "";
    panel.style.bottom = "";
  }

  function clampPanelToViewport(): void {
    const rect = panel.getBoundingClientRect();
    if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return;
    setPanelPosition(rect.left, rect.top);
  }
}

function readStoredState(): LayoutDebugStorage {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LayoutDebugStorage;
    return {
      folded: typeof parsed.folded === "boolean" ? parsed.folded : undefined,
      mode: parsed.mode === "layout" || parsed.mode === "bounds" ? parsed.mode : undefined,
      filter: parsed.filter === "all" || parsed.filter === "world" || parsed.filter === "ui" ? parsed.filter : undefined,
      x: typeof parsed.x === "number" ? parsed.x : undefined,
      y: typeof parsed.y === "number" ? parsed.y : undefined,
    };
  } catch {
    return {};
  }
}

function writeStoredState(state: LayoutDebugStorage): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private or restricted contexts.
  }
}

function drawSemanticBounds(
  graphics: Graphics,
  root: Container,
  enabled: boolean,
  filter: LayoutDebugFilter,
): void {
  graphics.clear();
  if (!enabled) return;

  let index = 0;
  visitSemanticTargets(root, filter, (container) => {
    const bounds = container.getBounds();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const topLeft = graphics.toLocal({ x: bounds.x, y: bounds.y });
    const bottomRight = graphics.toLocal({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
    const width = bottomRight.x - topLeft.x;
    const height = bottomRight.y - topLeft.y;
    if (width <= 0 || height <= 0) return;

    graphics
      .rect(topLeft.x, topLeft.y, width, height)
      .stroke({ color: semanticColor(index), width: 2, alpha: 0.94 });
    index += 1;
  });
}

function countSemanticBoxes(root: Container, filter: LayoutDebugFilter): number {
  let count = 0;
  visitSemanticTargets(root, filter, (container) => {
    const bounds = container.getBounds();
    if (bounds.width > 0 && bounds.height > 0) count += 1;
  });
  return count;
}

function visitSemanticTargets(
  container: Container,
  filter: LayoutDebugFilter,
  visitor: (container: Container) => void,
): void {
  for (const child of container.children) {
    if (child.label !== "semantic-bounds-debug" && matchesFilter(child, filter) && shouldDrawSemanticBounds(child)) {
      visitor(child);
    }

    if ("children" in child) {
      visitSemanticTargets(child, filter, visitor);
    }
  }
}

function shouldDrawSemanticBounds(container: Container): boolean {
  const label = container.label ?? "";
  return (
    label === "hud" ||
    label === "title" ||
    label === "marker" ||
    label === "player" ||
    label === "asset-orb" ||
    label === "input-target" ||
    label === "intro-title" ||
    label === "intro-prompt" ||
    label === "tap-start-button" ||
    label === "design-system-root" ||
    label.startsWith("ds-") ||
    (container as DebuggableContainer)._layout !== undefined
  );
}

function semanticColor(index: number): number {
  const colors = [0x38bdf8, 0xfacc15, 0xfb7185, 0x80ed99, 0xc77dff, 0xf97316];
  return colors[index % colors.length];
}

function applyDebugFlag(container: Container, enabled: boolean, filter: LayoutDebugFilter): void {
  for (const child of container.children) {
    const target = child as DebuggableContainer;
    const style = target._layout?.style;
    const debug = enabled && matchesFilter(target, filter);
    if (style && style.debug !== debug) {
      target.layout = {
        ...style,
        debug,
        debugHeat: false,
      };
    }

    if ("children" in target) {
      applyDebugFlag(target, enabled, filter);
    }
  }
}

function matchesFilter(container: Container, filter: LayoutDebugFilter): boolean {
  if (filter === "all") return true;
  const layerLabel = `${filter}-layer`;
  let current: Container | null = container;

  while (current) {
    if (current.label === layerLabel) return true;
    current = current.parent;
  }

  return false;
}

function countLayoutNodes(container: Container): number {
  let count = 0;

  for (const child of container.children) {
    const target = child as DebuggableContainer;
    if (target._layout) count += 1;

    if ("children" in target) {
      count += countLayoutNodes(target);
    }
  }

  return count;
}

function countDebuggedNodes(container: Container): number {
  let count = 0;

  for (const child of container.children) {
    const target = child as DebuggableContainer;
    if (target._layout?.style?.debug === true) count += 1;

    if ("children" in target) {
      count += countDebuggedNodes(target);
    }
  }

  return count;
}

function buttonStyle(): Partial<CSSStyleDeclaration> {
  return {
    alignItems: "center",
    minHeight: "36px",
    border: "1px solid rgba(238, 242, 246, 0.32)",
    borderRadius: "6px",
    background: "rgba(238, 242, 246, 0.08)",
    color: "#eef2f6",
    display: "inline-flex",
    font: "600 12px Inter, system-ui, sans-serif",
    justifyContent: "center",
    lineHeight: "1",
    cursor: "pointer",
  };
}

function setButtonActive(button: HTMLButtonElement, active: boolean): void {
  button.style.background = active ? "rgba(76, 201, 240, 0.88)" : "rgba(238, 242, 246, 0.08)";
  button.style.color = active ? "#071018" : "#eef2f6";
}
