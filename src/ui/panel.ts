import { Container, Graphics } from "pixi.js";
import type { SurfaceLayout } from "../runtime/scene";

type PanelOptions = {
  layout: SurfaceLayout;
  label?: string;
  width?: number;
  height?: number;
  direction?: "row" | "column";
  gap?: number;
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
  fill?: number;
  fillAlpha?: number;
  stroke?: string | number;
  strokeAlpha?: number;
  strokeWidth?: number;
  radius?: number;
};

export type PanelPrimitive = Container & {
  background?: Graphics;
};

export function createPanel({
  layout,
  label = "panel",
  width,
  height,
  direction = "column",
  gap = 0,
  alignItems = "flex-start",
  justifyContent = "flex-start",
  fill,
  fillAlpha = 0.18,
  stroke = "#94a3b8",
  strokeAlpha = 0.42,
  strokeWidth,
  radius,
}: PanelOptions): PanelPrimitive {
  const panel = new Container({ label }) as PanelPrimitive;
  panel.layout = {
    width,
    height,
    flexDirection: direction,
    alignItems,
    justifyContent,
    gap,
  };

  if (fill !== undefined && width !== undefined && height !== undefined) {
    const background = new Graphics()
      .roundRect(0, 0, width, height, radius ?? 8 / layout.scale)
      .fill({ color: fill, alpha: fillAlpha })
      .stroke({
        color: stroke,
        width: strokeWidth ?? Math.max(1, 2 / layout.scale),
        alpha: strokeAlpha,
      });
    background.label = `${label}-background`;
    panel.background = background;
    panel.addChild(background);
  }

  return panel;
}
