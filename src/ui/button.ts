import { Container, Graphics, Text } from "pixi.js";
import { tokenValue } from "../runtime/surface";
import { surfaceTheme } from "./tokens";
import type { SurfaceLayout } from "../runtime/scene";

type TokenSize = { design: number; minScreenPx?: number; maxScreenPx?: number };

export type ButtonPrimitive = Container & {
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
  const button = new Container({ label: "button" }) as ButtonPrimitive;
  const background = new Graphics()
    .roundRect(0, 0, width, height, tokenValue(layout, surfaceTheme.components.buttonPrimary.rounded))
    .fill({ color: fill, alpha: 0.94 })
    .stroke({ color: stroke, width: tokenValue(layout, surfaceTheme.components.actionHighlight.size) });
  background.label = "button-background";

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
  labelText.position.set(width / 2, height / 2);

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
