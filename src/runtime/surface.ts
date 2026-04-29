import type { SurfaceLayout } from "./scene";

export type Anchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type DesignToken = {
  design: number;
  minScreenPx?: number;
  maxScreenPx?: number;
};

export const surfaceTheme = {
  color: {
    background: "#17202a",
    marker: "#4cc9f0",
    player: "#f7c948",
    playerStroke: "#fef3c7",
    text: "#eef2f6",
  },
  font: {
    title: { design: 64, minScreenPx: 22 },
  },
  radius: {
    player: { design: 28 },
  },
  size: {
    markerRadius: { design: 30, minScreenPx: 10 },
    player: { design: 160, minScreenPx: 52 },
    playerStroke: { design: 8, minScreenPx: 3 },
  },
  spacing: {
    screen: { design: 72, minScreenPx: 24 },
    markerInset: { design: 112, minScreenPx: 40 },
  },
} as const;

export function tokenValue(layout: SurfaceLayout, token: DesignToken): number {
  const min = token.minScreenPx === undefined ? -Infinity : token.minScreenPx / layout.scale;
  const max = token.maxScreenPx === undefined ? Infinity : token.maxScreenPx / layout.scale;
  return Math.min(max, Math.max(min, token.design));
}

export function screenValue(layout: SurfaceLayout, token: DesignToken): number {
  return tokenValue(layout, token) * layout.scale;
}

export function anchorPoint(
  layout: SurfaceLayout,
  anchor: Anchor,
  margin: DesignToken = surfaceTheme.spacing.screen,
  safeArea = true,
): { x: number; y: number } {
  const inset = tokenValue(layout, margin);
  const safe = safeArea ? layout.safeArea : { top: 0, right: 0, bottom: 0, left: 0 };
  const left = layout.referenceX + safe.left + inset;
  const right = layout.referenceX + layout.referenceWidth - safe.right - inset;
  const top = layout.referenceY + safe.top + inset;
  const bottom = layout.referenceY + layout.referenceHeight - safe.bottom - inset;
  const centerX = layout.visibleWidth / 2;
  const centerY = layout.visibleHeight / 2;

  switch (anchor) {
    case "top-left":
      return { x: left, y: top };
    case "top-center":
      return { x: centerX, y: top };
    case "top-right":
      return { x: right, y: top };
    case "center":
      return { x: centerX, y: centerY };
    case "bottom-left":
      return { x: left, y: bottom };
    case "bottom-center":
      return { x: centerX, y: bottom };
    case "bottom-right":
      return { x: right, y: bottom };
  }
}
