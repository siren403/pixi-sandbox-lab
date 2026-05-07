import type { Container } from "pixi.js";
import type { SurfaceLayout } from "../runtime/scene";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FrameAttachment = {
  id: string;
  role: string;
  frameBounds: Rect;
  overflow?: "visible" | "hidden";
  parentId?: string;
};

export type LayoutViolationKind = "invalid-size" | "render-overflow" | "frame-outside-parent" | "overlap";

export type LayoutViolation = {
  kind: LayoutViolationKind;
  id: string;
  role: string;
  message: string;
  frameBounds: Rect;
  renderBounds?: Rect;
  parentBounds?: Rect;
  otherId?: string;
  group?: string;
};

export type LayoutViolationGroup = {
  id: string;
  nodeIds: string[];
};

export type CollectLayoutViolationOptions = {
  parentFrameBounds?: Rect;
  overlapGroups?: Array<LayoutViolationGroup>;
  epsilon?: number;
};

export type LayoutViolations = {
  errors: Array<LayoutViolation>;
  inspected: number;
};

const frameMetadata = Symbol.for("prompt-ops.layout-frame");

type FrameNode = Container & {
  [frameMetadata]?: FrameAttachment;
};

const emptyRect = (): Rect => ({ x: 0, y: 0, width: 0, height: 0 });

export function attachFrame<T extends Container>(node: T, attachment: FrameAttachment): T {
  (node as FrameNode)[frameMetadata] = attachment;
  return node;
}

export function readFrameAttachment(node: Container | undefined | null): FrameAttachment | undefined {
  return (node as FrameNode | undefined | null)?.[frameMetadata];
}

export function readFrameBounds(node: Container | undefined | null): Rect {
  return readFrameAttachment(node)?.frameBounds ?? emptyRect();
}

export function readRenderBounds(layout: SurfaceLayout, node: Container | undefined | null): Rect {
  const bounds = node?.getBounds();
  if (!bounds) return emptyRect();
  return toDesignRect(layout, bounds);
}

export function collectLayoutViolations(
  layout: SurfaceLayout,
  nodes: Array<Container | undefined | null>,
  options: CollectLayoutViolationOptions = {},
): LayoutViolations {
  const epsilon = options.epsilon ?? 0.5;
  const inspected = nodes.length;
  const attachedNodes = nodes
    .map((node) => ({ node, attachment: readFrameAttachment(node) }))
    .filter((entry): entry is { node: Container; attachment: FrameAttachment } => Boolean(entry.node && entry.attachment));
  const errors: Array<LayoutViolation> = [];
  const byId = new Map<string, { node: Container; attachment: FrameAttachment; frameBounds: Rect; renderBounds: Rect }>();

  for (const entry of attachedNodes) {
    const frameBounds = normalizeRect(entry.attachment.frameBounds);
    const renderBounds = normalizeRect(readRenderBounds(layout, entry.node));
    byId.set(entry.attachment.id, { ...entry, frameBounds, renderBounds });

    if (!isPositiveRect(frameBounds)) {
      errors.push({
        kind: "invalid-size",
        id: entry.attachment.id,
        role: entry.attachment.role,
        message: `${entry.attachment.id} has a non-positive frame size.`,
        frameBounds,
        renderBounds,
      });
      continue;
    }

    if (options.parentFrameBounds && !rectWithin(frameBounds, normalizeRect(options.parentFrameBounds), epsilon)) {
      errors.push({
        kind: "frame-outside-parent",
        id: entry.attachment.id,
        role: entry.attachment.role,
        message: `${entry.attachment.id} frame extends outside its parent frame.`,
        frameBounds,
        renderBounds,
        parentBounds: normalizeRect(options.parentFrameBounds),
      });
    }

    if (entry.attachment.overflow !== "visible" && !rectWithin(renderBounds, frameBounds, epsilon)) {
      errors.push({
        kind: "render-overflow",
        id: entry.attachment.id,
        role: entry.attachment.role,
        message: `${entry.attachment.id} render bounds extend outside its frame.`,
        frameBounds,
        renderBounds,
      });
    }
  }

  for (const group of options.overlapGroups ?? []) {
    const groupNodes = group.nodeIds
      .map((id) => byId.get(id))
      .filter((entry): entry is { node: Container; attachment: FrameAttachment; frameBounds: Rect; renderBounds: Rect } =>
        Boolean(entry),
      );

    for (let i = 0; i < groupNodes.length; i += 1) {
      for (let j = i + 1; j < groupNodes.length; j += 1) {
        const left = groupNodes[i];
        const right = groupNodes[j];
        if (!rectsOverlap(left.frameBounds, right.frameBounds, epsilon)) continue;
        errors.push({
          kind: "overlap",
          id: left.attachment.id,
          role: left.attachment.role,
          message: `${left.attachment.id} overlaps ${right.attachment.id} in ${group.id}.`,
          frameBounds: left.frameBounds,
          renderBounds: left.renderBounds,
          otherId: right.attachment.id,
          group: group.id,
        });
      }
    }
  }

  return { errors, inspected };
}

function rectWithin(inner: Rect, outer: Rect, epsilon: number): boolean {
  return (
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    inner.x + inner.width <= outer.x + outer.width + epsilon &&
    inner.y + inner.height <= outer.y + outer.height + epsilon
  );
}

function rectsOverlap(left: Rect, right: Rect, epsilon: number): boolean {
  return !(
    left.x + left.width <= right.x + epsilon ||
    right.x + right.width <= left.x + epsilon ||
    left.y + left.height <= right.y + epsilon ||
    right.y + right.height <= left.y + epsilon
  );
}

function normalizeRect(rect: Rect): Rect {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function isPositiveRect(rect: Rect): boolean {
  return rect.width > 0 && rect.height > 0;
}

function toDesignRect(layout: SurfaceLayout, bounds: { x: number; y: number; width: number; height: number }): Rect {
  return {
    x: bounds.x / layout.scale,
    y: bounds.y / layout.scale,
    width: bounds.width / layout.scale,
    height: bounds.height / layout.scale,
  };
}
