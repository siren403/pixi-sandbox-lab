import { FancyButton } from "@pixi/ui";
import { Container, Graphics, Text } from "pixi.js";
import { tokenValue } from "../runtime/surface";
import { surfaceTheme } from "./tokens";
import type { SurfaceLayout } from "../runtime/scene";

type TokenSize = { design: number; minScreenPx?: number; maxScreenPx?: number };

export type ButtonPrimitive = FancyButton & {
  background: Graphics;
  labelText: Text;
  metrics: {
    x: number;
    y: number;
    width: number;
    height: number;
    labelCenterX: number;
    labelCenterY: number;
  };
};

export type UiBounds = { x: number; y: number; width: number; height: number };

export type UiButtonHitTarget<TId extends string = string> = {
  id: TId;
  bounds: UiBounds;
};

type ButtonOptions = {
  text: string;
  width: number;
  height: number;
  layout: SurfaceLayout;
  fontSize: TokenSize;
  fill?: number;
  stroke?: string;
  textColor?: string;
};

export function createButton({
  text,
  width,
  height,
  layout,
  fontSize,
  fill = 0x0f766e,
  stroke = surfaceTheme.color.actionAccent,
  textColor = surfaceTheme.color.text,
}: ButtonOptions): ButtonPrimitive {
  const radius = tokenValue(layout, surfaceTheme.components.buttonPrimary.rounded);
  const strokeWidth = tokenValue(layout, surfaceTheme.components.actionHighlight.size);
  const background = new Graphics()
    .roundRect(0, 0, width, height, radius)
    .fill({ color: fill, alpha: 0.94 })
    .stroke({ color: stroke, width: strokeWidth });
  background.label = "button-background";
  const hoverBackground = new Graphics()
    .roundRect(0, 0, width, height, radius)
    .fill({ color: fill, alpha: 1 })
    .stroke({ color: stroke, width: strokeWidth * 1.35 });
  hoverBackground.label = "button-background-hover";
  const pressedBackground = new Graphics()
    .roundRect(0, 0, width, height, radius)
    .fill({ color: fill, alpha: 0.82 })
    .stroke({ color: stroke, width: strokeWidth * 1.1 });
  pressedBackground.label = "button-background-pressed";

  const labelText = new Text({
    text,
    style: {
      fill: textColor,
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: tokenValue(layout, fontSize),
      fontWeight: "600",
    },
  });
  labelText.label = "button-label";
  labelText.anchor.set(0.5);

  const button = new FancyButton({
    defaultView: background,
    hoverView: hoverBackground,
    pressedView: pressedBackground,
    text: labelText,
    padding: tokenValue(layout, surfaceTheme.spacing.xs),
    contentFittingMode: "none",
  }) as ButtonPrimitive;
  button.label = "button";
  button.background = background;
  button.labelText = labelText;
  button.metrics = {
    x: 0,
    y: 0,
    width,
    height,
    labelCenterX: width / 2,
    labelCenterY: height / 2,
  };
  button.addChild(background, labelText);
  return button;
}

export function readUiBounds(layout: SurfaceLayout, node: Container | undefined | null): UiBounds {
  return toDesignBounds(layout, node?.getBounds());
}

export function readButtonBounds(layout: SurfaceLayout, button: Container | undefined | null): UiBounds {
  return readUiBounds(layout, button);
}

export function containsBounds(bounds: UiBounds, position: { x: number; y: number }): boolean {
  return (
    position.x >= bounds.x &&
    position.x <= bounds.x + bounds.width &&
    position.y >= bounds.y &&
    position.y <= bounds.y + bounds.height
  );
}

export function resolveButtonHit<TId extends string>(
  targets: Array<UiButtonHitTarget<TId>>,
  position: { x: number; y: number },
): TId | undefined {
  return targets.find((target) => containsBounds(target.bounds, position))?.id;
}

function toDesignBounds(
  layout: SurfaceLayout,
  bounds: { x: number; y: number; width: number; height: number } | undefined,
): UiBounds {
  if (!bounds) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: bounds.x / layout.scale,
    y: bounds.y / layout.scale,
    width: bounds.width / layout.scale,
    height: bounds.height / layout.scale,
  };
}
