import { Text } from "pixi.js";
import { tokenValue } from "../runtime/surface";
import type { SurfaceLayout } from "../runtime/scene";

type TokenSize = { design: number; minScreenPx?: number; maxScreenPx?: number };

type LabelOptions = {
  text: string;
  layout: SurfaceLayout;
  fontSize: TokenSize;
  color: string;
  weight?: "normal" | "bold" | "400" | "500" | "600" | "700";
  label?: string;
};

export type LabelPrimitive = Text & {
  metrics: {
    fontSize: number;
  };
};

export function createLabel({
  text,
  layout,
  fontSize,
  color,
  weight = "600",
  label = "label",
}: LabelOptions): LabelPrimitive {
  const resolvedFontSize = tokenValue(layout, fontSize);
  const textNode = new Text({
    text,
    style: {
      fill: color,
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: resolvedFontSize,
      fontWeight: weight,
    },
  }) as LabelPrimitive;
  textNode.label = label;
  textNode.metrics = { fontSize: resolvedFontSize };
  return textNode;
}
