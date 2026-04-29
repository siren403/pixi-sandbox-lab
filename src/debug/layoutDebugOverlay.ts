import type { Application, Container } from "pixi.js";

type LayoutDebugFilter = "all" | "world" | "ui";

type DebuggableContainer = Container & {
  _layout?: {
    style?: Record<string, unknown>;
  } | null;
  layout?: Record<string, unknown> | null;
};

declare global {
  interface Window {
    __pixiLayoutDebug?: {
      enabled: boolean;
      filter: LayoutDebugFilter;
      layoutNodes: number;
      debuggedNodes: number;
      layerLabels: string[];
    };
  }
}

export function installLayoutDebug(app: Application, root: Container): () => void {
  const panel = document.createElement("section");
  panel.dataset.testid = "layout-debug-panel";
  Object.assign(panel.style, {
    position: "fixed",
    right: "max(16px, env(safe-area-inset-right))",
    bottom: "max(16px, env(safe-area-inset-bottom))",
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

  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "8px",
  });

  const title = document.createElement("span");
  title.textContent = "Layout Debug";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.dataset.testid = "layout-debug-toggle";
  toggle.textContent = "Off";
  Object.assign(toggle.style, buttonStyle());

  header.append(title, toggle);

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

  const sceneButton = document.createElement("button");
  sceneButton.type = "button";
  sceneButton.dataset.testid = "layout-debug-scene";
  sceneButton.textContent = "Scene";
  Object.assign(sceneButton.style, {
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

  panel.append(header, filterRow, sceneButton, reloadButton, stats);

  let enabled = false;
  let filter: LayoutDebugFilter = "all";
  let destroyed = false;

  const syncState = () => {
    const layoutNodes = countLayoutNodes(root);
    const debuggedNodes = countDebuggedNodes(root);
    const layerLabels = root.children.map((child) => child.label ?? "");
    window.__pixiLayoutDebug = { enabled, filter, layoutNodes, debuggedNodes, layerLabels };

    toggle.textContent = enabled ? "On" : "Off";
    toggle.setAttribute("aria-pressed", String(enabled));
    setButtonActive(toggle, enabled);

    for (const [value, button] of filterButtons) {
      button.setAttribute("aria-pressed", String(value === filter));
      setButtonActive(button, value === filter);
    }

    stats.textContent = `nodes ${debuggedNodes}/${layoutNodes} | ${layerLabels.join(", ")}`;
  };

  const syncLayoutFlags = () => {
    applyDebugFlag(root, enabled, filter);
    syncState();
  };

  const setEnabled = async (next: boolean) => {
    enabled = next;
    syncLayoutFlags();
    await app.renderer.layout.enableDebug(enabled);
    app.renderer.layout.update(app.stage);
  };

  const onToggleClick = () => {
    void setEnabled(!enabled);
  };

  const onFilterClick = (next: LayoutDebugFilter) => {
    filter = next;
    syncLayoutFlags();
    app.renderer.layout.update(app.stage);
  };

  const onSceneClick = () => {
    window.dispatchEvent(new CustomEvent("pixi:scene-switch"));
  };

  const onReloadClick = () => {
    window.location.reload();
  };

  toggle.addEventListener("click", onToggleClick);
  sceneButton.addEventListener("click", onSceneClick);
  reloadButton.addEventListener("click", onReloadClick);
  for (const [value, button] of filterButtons) {
    button.addEventListener("click", () => onFilterClick(value));
  }
  document.body.appendChild(panel);
  syncState();

  app.ticker.add(syncLayoutFlags);

  return () => {
    if (destroyed) return;
    destroyed = true;
    app.ticker.remove(syncLayoutFlags);
    toggle.removeEventListener("click", onToggleClick);
    sceneButton.removeEventListener("click", onSceneClick);
    reloadButton.removeEventListener("click", onReloadClick);
    panel.remove();
    void app.renderer.layout.enableDebug(false);
    applyDebugFlag(root, false, "all");
    window.__pixiLayoutDebug = { enabled: false, filter, layoutNodes: 0, debuggedNodes: 0, layerLabels: [] };
  };
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
    minHeight: "36px",
    border: "1px solid rgba(238, 242, 246, 0.32)",
    borderRadius: "6px",
    background: "rgba(238, 242, 246, 0.08)",
    color: "#eef2f6",
    font: "600 12px Inter, system-ui, sans-serif",
    cursor: "pointer",
  };
}

function setButtonActive(button: HTMLButtonElement, active: boolean): void {
  button.style.background = active ? "rgba(76, 201, 240, 0.88)" : "rgba(238, 242, 246, 0.08)";
  button.style.color = active ? "#071018" : "#eef2f6";
}
