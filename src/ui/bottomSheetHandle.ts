import { Container, Graphics, Rectangle } from "pixi.js";
import type { SurfaceLayout } from "../runtime/scene";
import { tokenValue } from "../runtime/surface";
import { surfaceTheme } from "./tokens";

export type BottomSheetHandle = Container & {
  hitTarget: Graphics;
  pill: Graphics;
  hitHeight: number;
};

export function createBottomSheetHandle(layout: SurfaceLayout, width: number): BottomSheetHandle {
  const handle = new Container({ label: "bottom-sheet-handle" }) as BottomSheetHandle;
  const hitHeight = tokenValue(layout, { design: 48, minScreenPx: 48 });
  const pillWidth = tokenValue(layout, { design: 92, minScreenPx: 48 });
  const pillHeight = tokenValue(layout, { design: 10, minScreenPx: 6 });

  const hitTarget = new Graphics()
    .rect(0, 0, width, hitHeight)
    .fill({ color: surfaceTheme.color.background, alpha: 0 });
  hitTarget.label = "bottom-sheet-handle-hit-target";
  hitTarget.eventMode = "static";
  hitTarget.hitArea = new Rectangle(0, 0, width, hitHeight);
  const stopPropagation = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };
  for (const eventName of [
    "pointerdown",
    "pointerup",
    "pointertap",
    "pointermove",
    "pointerover",
    "pointerout",
    "pointerenter",
    "pointerleave",
    "pointercancel",
    "pointerupoutside",
  ] as const) {
    hitTarget.on(eventName, stopPropagation);
  }

  const pill = new Graphics()
    .roundRect(0, 0, pillWidth, pillHeight, pillHeight / 2)
    .fill({ color: 0xe2e8f0, alpha: 0.42 });
  pill.label = "bottom-sheet-handle-pill";
  pill.eventMode = "none";
  pill.position.set((width - pillWidth) / 2, (hitHeight - pillHeight) / 2);

  handle.hitHeight = hitHeight;
  handle.hitTarget = hitTarget;
  handle.pill = pill;
  handle.layout = {
    width,
    height: hitHeight,
  };
  handle.addChild(hitTarget, pill);
  return handle;
}
