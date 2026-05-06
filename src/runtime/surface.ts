import type { Container } from "pixi.js";
import type { SurfaceLayout } from "./scene";

export type DesignToken = {
  design: number;
  minScreenPx?: number;
  maxScreenPx?: number;
};

export type SurfaceFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SurfacePoint = {
  x: number;
  y: number;
};

export type SurfaceAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type SurfaceContext = {
  readonly layout: SurfaceLayout;
  token: (token: DesignToken) => number;
  screen: (token: DesignToken) => number;
  safeFrame: (margin?: number) => SurfaceFrame;
  center: (frame?: SurfaceFrame) => SurfacePoint;
  anchor: (anchor: SurfaceAnchor, frame?: SurfaceFrame) => SurfacePoint;
  updateLayout: (container?: Container) => void;
};

export function createSurfaceContext(
  layout: SurfaceLayout,
  updateLayout: (container?: Container) => void,
): SurfaceContext {
  return {
    layout,
    token(token) {
      return tokenValue(layout, token);
    },
    screen(token) {
      return screenValue(layout, token);
    },
    safeFrame(margin = 0) {
      return getSafeFrame(layout, margin);
    },
    center(frame) {
      return frameCenter(frame ?? getVisibleFrame(layout));
    },
    anchor(anchor, frame) {
      return frameAnchor(anchor, frame ?? getVisibleFrame(layout));
    },
    updateLayout,
  };
}

export function tokenValue(layout: SurfaceLayout, token: DesignToken): number {
  const min = token.minScreenPx === undefined ? -Infinity : token.minScreenPx / layout.scale;
  const max = token.maxScreenPx === undefined ? Infinity : token.maxScreenPx / layout.scale;
  return Math.min(max, Math.max(min, token.design));
}

export function screenValue(layout: SurfaceLayout, token: DesignToken): number {
  return tokenValue(layout, token) * layout.scale;
}

function getVisibleFrame(layout: SurfaceLayout): SurfaceFrame {
  return {
    x: 0,
    y: 0,
    width: layout.visibleWidth,
    height: layout.visibleHeight,
  };
}

function getSafeFrame(layout: SurfaceLayout, margin: number): SurfaceFrame {
  return {
    x: layout.safeArea.left + margin,
    y: layout.safeArea.top + margin,
    width: layout.visibleWidth - layout.safeArea.left - layout.safeArea.right - margin * 2,
    height: layout.visibleHeight - layout.safeArea.top - layout.safeArea.bottom - margin * 2,
  };
}

function frameCenter(frame: SurfaceFrame): SurfacePoint {
  return {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  };
}

function frameAnchor(anchor: SurfaceAnchor, frame: SurfaceFrame): SurfacePoint {
  const horizontal = anchor.endsWith("left") ? 0 : anchor.endsWith("right") ? 1 : 0.5;
  const vertical = anchor.startsWith("top") ? 0 : anchor.startsWith("bottom") ? 1 : 0.5;
  return {
    x: frame.x + frame.width * horizontal,
    y: frame.y + frame.height * vertical,
  };
}
