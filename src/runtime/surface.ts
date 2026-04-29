import type { SurfaceLayout } from "./scene";

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
