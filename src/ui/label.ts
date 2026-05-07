import { CanvasTextMetrics, Text, TextStyle } from "pixi.js";
import { tokenValue } from "../runtime/surface";
import type { SurfaceLayout } from "../runtime/scene";

type TokenSize = { design: number; minScreenPx?: number; maxScreenPx?: number };

export type LabelAutoFit = {
  maxWidth: number;
  maxHeight: number;
  minFontSize: number;
};

type LabelOptions = {
  text: string;
  layout: SurfaceLayout;
  fontSize: TokenSize;
  color: string;
  weight?: "normal" | "bold" | "400" | "500" | "600" | "700";
  label?: string;
  autoFit?: LabelAutoFit;
};

export type LabelPrimitive = Text & {
  metrics: {
    fontSize: number;
    resolvedFontSize: number;
    overflowed: boolean;
  };
};

export function createLabel({
  text,
  layout,
  fontSize,
  color,
  weight = "600",
  label = "label",
  autoFit,
}: LabelOptions): LabelPrimitive {
  const baseFontSize = tokenValue(layout, fontSize);
  const resolved = resolveLabelFontSize(text, color, weight, baseFontSize, autoFit);
  const textNode = new Text({
    text,
    style: new TextStyle({
      fill: color,
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: resolved.fontSize,
      fontWeight: weight,
    }),
  }) as LabelPrimitive;
  textNode.label = label;
  textNode.metrics = {
    fontSize: resolved.fontSize,
    resolvedFontSize: resolved.fontSize,
    overflowed: resolved.overflowed,
  };
  return textNode;
}

function resolveLabelFontSize(
  text: string,
  color: string,
  weight: NonNullable<LabelOptions["weight"]>,
  baseFontSize: number,
  autoFit: LabelAutoFit | undefined,
): { fontSize: number; overflowed: boolean } {
  if (!autoFit) {
    return { fontSize: baseFontSize, overflowed: false };
  }

  const minFontSize = Math.min(baseFontSize, autoFit.minFontSize);
  for (let fontSize = baseFontSize; fontSize >= minFontSize; fontSize -= 1) {
    const style = new TextStyle({
      fill: color,
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize,
      fontWeight: weight,
    });
    const metrics = CanvasTextMetrics.measureText(text, style, undefined, false);
    if (metrics.width <= autoFit.maxWidth && metrics.height <= autoFit.maxHeight) {
      return { fontSize, overflowed: false };
    }
  }

  return { fontSize: minFontSize, overflowed: true };
}
