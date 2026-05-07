import { Container, Graphics, Rectangle } from "pixi.js";

export type BlockingPanel = Container & {
  blocker: Graphics;
  content: Container;
};

type BlockingPanelOptions = {
  label?: string;
  fillColor?: string | number;
  fillAlpha?: number;
  strokeColor?: string | number;
  strokeAlpha?: number;
  strokeWidth?: number;
  radius?: number;
};

export function createBlockingPanel(
  frame: { x: number; y: number; width: number; height: number },
  options: BlockingPanelOptions = {},
): BlockingPanel {
  const host = new Container({ label: options.label ?? "blocking-panel" }) as BlockingPanel;
  host.position.set(frame.x, frame.y);
  host.layout = {
    width: frame.width,
    height: frame.height,
  };

  const blocker = new Graphics();
  blocker.label = `${host.label}-blocker`;
  if ((options.radius ?? 0) > 0) {
    blocker.roundRect(0, 0, frame.width, frame.height, options.radius ?? 0);
  } else {
    blocker.rect(0, 0, frame.width, frame.height);
  }
  blocker.fill({ color: options.fillColor ?? 0x000000, alpha: options.fillAlpha ?? 0 });
  if ((options.strokeWidth ?? 0) > 0) {
    blocker.stroke({
      color: options.strokeColor ?? options.fillColor ?? 0x000000,
      width: options.strokeWidth ?? 0,
      alpha: options.strokeAlpha ?? 1,
    });
  }
  blocker.eventMode = "static";
  blocker.hitArea = new Rectangle(0, 0, frame.width, frame.height);
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
    blocker.on(eventName, stopPropagation);
  }

  const content = new Container({ label: `${host.label}-content` });
  content.position.set(0, 0);

  host.blocker = blocker;
  host.content = content;
  host.addChild(blocker, content);
  return host;
}
