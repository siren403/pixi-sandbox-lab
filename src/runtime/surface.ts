import type { SurfaceLayout } from "./scene";

export type DesignToken = {
  design: number;
  minScreenPx?: number;
  maxScreenPx?: number;
};

export function tokenValue(layout: SurfaceLayout, token: DesignToken): number {
  const min = token.minScreenPx === undefined ? -Infinity : token.minScreenPx / layout.scale;
  const max = token.maxScreenPx === undefined ? Infinity : token.maxScreenPx / layout.scale;
  return Math.min(max, Math.max(min, token.design));
}

export function screenValue(layout: SurfaceLayout, token: DesignToken): number {
  return tokenValue(layout, token) * layout.scale;
}
