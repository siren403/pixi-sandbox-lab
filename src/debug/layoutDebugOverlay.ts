import type { Application, Container } from "pixi.js";

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
      layoutNodes: number;
    };
  }
}

export function installLayoutDebug(app: Application, root: Container): () => void {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.testid = "layout-debug-toggle";
  button.textContent = "Layout";
  Object.assign(button.style, {
    position: "fixed",
    right: "max(16px, env(safe-area-inset-right))",
    bottom: "max(16px, env(safe-area-inset-bottom))",
    zIndex: "20",
    minWidth: "88px",
    minHeight: "44px",
    border: "1px solid rgba(238, 242, 246, 0.38)",
    borderRadius: "8px",
    background: "rgba(11, 18, 26, 0.84)",
    color: "#eef2f6",
    font: "600 14px Inter, system-ui, sans-serif",
    cursor: "pointer",
    touchAction: "manipulation",
  });

  let enabled = false;
  let destroyed = false;

  const syncState = () => {
    window.__pixiLayoutDebug = { enabled, layoutNodes: countLayoutNodes(root) };
    button.setAttribute("aria-pressed", String(enabled));
    button.style.background = enabled ? "rgba(76, 201, 240, 0.88)" : "rgba(11, 18, 26, 0.84)";
    button.style.color = enabled ? "#071018" : "#eef2f6";
  };

  const syncLayoutFlags = () => {
    applyDebugFlag(root, enabled);
  };

  const setEnabled = async (next: boolean) => {
    enabled = next;
    syncState();
    syncLayoutFlags();
    await app.renderer.layout.enableDebug(enabled);
    app.renderer.layout.update(app.stage);
  };

  const onClick = () => {
    void setEnabled(!enabled);
  };

  button.addEventListener("click", onClick);
  document.body.appendChild(button);
  syncState();

  app.ticker.add(syncLayoutFlags);

  return () => {
    if (destroyed) return;
    destroyed = true;
    app.ticker.remove(syncLayoutFlags);
    button.removeEventListener("click", onClick);
    button.remove();
    void app.renderer.layout.enableDebug(false);
    applyDebugFlag(root, false);
    window.__pixiLayoutDebug = { enabled: false, layoutNodes: 0 };
  };
}

function applyDebugFlag(container: Container, enabled: boolean): void {
  for (const child of container.children) {
    const target = child as DebuggableContainer;
    const style = target._layout?.style;
    if (style && style.debug !== enabled) {
      target.layout = {
        ...style,
        debug: enabled,
        debugHeat: false,
      };
    }

    if ("children" in target) {
      applyDebugFlag(target, enabled);
    }
  }
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
