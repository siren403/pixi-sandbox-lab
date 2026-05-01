#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { surfaceTheme } from "../src/ui/tokens";

type TokenTree = Record<string, unknown>;
type Finding = {
  path: string;
  expected: unknown;
  actual: unknown;
};

const designPath = join(process.cwd(), "DESIGN.md");
const design = parseFrontmatter(readFileSync(designPath, "utf8"));
const findings: Finding[] = [];

compareSection("colors", design.colors, surfaceTheme.color);
compareTokenSection("typography", design.typography, surfaceTheme.typography, {
  title: "fontSize",
  display: "fontSize",
  body: "fontSize",
  caption: "fontSize",
});
compareTokenSection("rounded", design.rounded, surfaceTheme.rounded);
compareTokenSection("spacing", design.spacing, surfaceTheme.spacing, {
  xs: "design",
  sm: "design",
  md: "design",
  lg: "design",
});
compareComponents();

if (findings.length > 0) {
  console.error(`[design-tokens] ${findings.length} drift(s) found between DESIGN.md and src/ui/tokens.ts`);
  for (const finding of findings) {
    console.error(
      `[design-tokens] ${finding.path}: expected ${formatValue(finding.expected)}, actual ${formatValue(finding.actual)}`,
    );
  }
  process.exit(1);
}

console.log("[design-tokens] DESIGN.md and src/ui/tokens.ts are aligned");

function compareComponents(): void {
  const components = assertRecord(design.components, "components");
  compareValue("components.buttonPrimary.height", readPath(components, ["button-primary", "height"]), surfaceTheme.components.buttonPrimary.height.design);
  compareValue("components.buttonPrimary.padding", readPath(components, ["button-primary", "padding"]), surfaceTheme.components.buttonPrimary.padding.design);
  compareValue("components.buttonPrimary.rounded", readPath(components, ["button-primary", "rounded"]), surfaceTheme.components.buttonPrimary.rounded.design);
  compareValue("components.buttonPrimary.typography", readPath(components, ["button-primary", "typography", "fontSize"]), surfaceTheme.components.buttonPrimary.typography.design);

  compareValue("components.hudRow.height", readPath(components, ["hud-row", "height"]), surfaceTheme.components.hudRow.height.design);
  compareValue("components.hudRow.padding", readPath(components, ["hud-row", "padding"]), surfaceTheme.components.hudRow.padding.design);
  compareValue("components.hudRow.typography", readPath(components, ["hud-row", "typography", "fontSize"]), surfaceTheme.components.hudRow.typography.design);

  compareValue("components.marker.size", readPath(components, ["marker", "size"]), surfaceTheme.components.marker.size.design);
  compareValue("components.marker.rounded", readPath(components, ["marker", "rounded"]), surfaceTheme.components.marker.rounded.design);

  compareValue("components.player.size", readPath(components, ["player", "size"]), surfaceTheme.components.player.size.design);
  compareValue("components.player.rounded", readPath(components, ["player", "rounded"]), surfaceTheme.components.player.rounded.design);

  compareValue("components.playerStroke.size", readPath(components, ["player-stroke", "size"]), surfaceTheme.components.playerStroke.size.design);
  compareValue("components.actionHighlight.size", readPath(components, ["action-highlight", "size"]), surfaceTheme.components.actionHighlight.size.design);
  compareValue("components.actionHighlight.rounded", readPath(components, ["action-highlight", "rounded"]), surfaceTheme.components.actionHighlight.rounded.design);
  compareValue("components.inputTarget.size", readPath(components, ["input-target", "size"]), surfaceTheme.components.inputTarget.size.design);
  compareValue("components.inputTarget.rounded", readPath(components, ["input-target", "rounded"]), surfaceTheme.components.inputTarget.rounded.design);
  compareValue("components.loadingAccent.size", readPath(components, ["loading-accent", "size"]), surfaceTheme.components.loadingAccent.size.design);
  compareValue("components.loadingAccent.rounded", readPath(components, ["loading-accent", "rounded"]), surfaceTheme.components.loadingAccent.rounded.design);
}

function compareSection(path: string, designSection: unknown, themeSection: Record<string, unknown>): void {
  const section = assertRecord(designSection, path);
  for (const [key, expected] of Object.entries(section)) {
    compareValue(`${path}.${key}`, expected, themeSection[key]);
  }
}

function compareTokenSection(
  path: string,
  designSection: unknown,
  themeSection: Record<string, { design: number }>,
  fields?: Record<string, string>,
): void {
  const section = assertRecord(designSection, path);
  for (const [key, expected] of Object.entries(section)) {
    const field = fields?.[key] ?? "design";
    const expectedValue = isRecord(expected) ? readValue(expected, field) : expected;
    compareValue(`${path}.${key}`, expectedValue, themeSection[key]?.design);
  }
}

function compareValue(path: string, expectedRaw: unknown, actualRaw: unknown): void {
  const expected = normalizeValue(expectedRaw);
  const actual = normalizeValue(actualRaw);
  if (expected !== actual) {
    findings.push({ path, expected, actual });
  }
}

function readPath(root: TokenTree, segments: string[]): unknown {
  let current: unknown = root;
  for (const segment of segments) {
    current = readValue(current, segment);
  }
  return current;
}

function readValue(root: unknown, key: string): unknown {
  const record = assertRecord(root, key);
  return record[key];
}

function normalizeValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const px = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (px) return Number(px[1]);
  return value;
}

function parseFrontmatter(markdown: string): TokenTree {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error("DESIGN.md frontmatter not found");
  }
  const root: TokenTree = {};
  const stack: Array<{ indent: number; object: TokenTree }> = [{ indent: -1, object: root }];

  for (const rawLine of match[1].split("\n")) {
    if (!rawLine.trim()) continue;
    const indent = rawLine.match(/^ */)?.[0].length ?? 0;
    const line = rawLine.trim();
    const [, key, rawValue = ""] = line.match(/^([^:]+):(?:\s*(.*))?$/) ?? [];
    if (!key) throw new Error(`Cannot parse DESIGN.md frontmatter line: ${rawLine}`);

    while (stack.at(-1)!.indent >= indent) stack.pop();
    const parent = stack.at(-1)!.object;
    if (rawValue === "") {
      const child: TokenTree = {};
      parent[key] = child;
      stack.push({ indent, object: child });
    } else {
      parent[key] = resolveReferences(parseScalar(rawValue), root);
    }
  }

  return root;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) return trimmed.slice(1, -1);
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function resolveReferences(value: unknown, root: TokenTree): unknown {
  if (typeof value !== "string") return value;
  const reference = value.match(/^\{([^}]+)\}$/);
  if (!reference) return value;
  return readPath(root, reference[1].split("."));
}

function assertRecord(value: unknown, path: string): TokenTree {
  if (!isRecord(value)) {
    throw new Error(`Expected object at ${path}`);
  }
  return value;
}

function isRecord(value: unknown): value is TokenTree {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}
