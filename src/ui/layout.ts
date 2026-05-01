import type { Container } from "pixi.js";
import type { SurfaceLayout } from "../runtime/scene";
import { tokenValue } from "../runtime/surface";
import { surfaceTheme } from "./tokens";

export type SafeAreaFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  margin: number;
};

export type UiLayoutPolicy = "safe-area-frame" | "world-coordinate";

export function getSafeAreaFrame(layout: SurfaceLayout, margin = tokenValue(layout, surfaceTheme.spacing.screen)): SafeAreaFrame {
  const x = layout.safeArea.left + margin;
  const y = layout.safeArea.top + margin;
  return {
    x,
    y,
    width: layout.visibleWidth - layout.safeArea.left - layout.safeArea.right - margin * 2,
    height: layout.visibleHeight - layout.safeArea.top - layout.safeArea.bottom - margin * 2,
    margin,
  };
}

export function configureSafeAreaColumn(
  container: Container,
  layout: SurfaceLayout,
  options: {
    label?: string;
    gap?: number;
    alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
    justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
  } = {},
): SafeAreaFrame {
  const frame = getSafeAreaFrame(layout);
  if (options.label) container.label = options.label;
  container.position.set(frame.x, frame.y);
  container.layout = {
    width: frame.width,
    height: frame.height,
    flexDirection: "column",
    alignItems: options.alignItems ?? "center",
    justifyContent: options.justifyContent ?? "center",
    gap: options.gap ?? 0,
  };
  return frame;
}

export function configureSafeAreaRow(
  container: Container,
  layout: SurfaceLayout,
  options: {
    label?: string;
    height: number;
    gap?: number;
    alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
    justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
  },
): SafeAreaFrame {
  const frame = getSafeAreaFrame(layout);
  if (options.label) container.label = options.label;
  container.position.set(frame.x, frame.y);
  container.layout = {
    width: frame.width,
    height: options.height,
    flexDirection: "row",
    alignItems: options.alignItems ?? "center",
    justifyContent: options.justifyContent ?? "space-between",
    gap: options.gap ?? frame.margin,
  };
  return frame;
}
