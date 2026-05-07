import type { AppShellSheet } from "../ui/layouts/appShell";

export const demoDebugEnabled = import.meta.env.VITE_DEMO_DEBUG !== "false";

export type AppShellSheetContent = {
  sheetTitle: string;
  sheetLines: string[];
  sheetActions: Array<{ id: string; label: string }>;
};

export function getSceneIndexSheetContent(activeSheet: AppShellSheet, layoutBoundsEnabled: boolean): AppShellSheetContent {
  if (activeSheet !== "debug" || !demoDebugEnabled) {
    return {
      sheetTitle: "Controls",
      sheetLines: ["Select a sample from the list.", "Scene-specific controls will appear here."],
      sheetActions: [],
    };
  }

  return {
    sheetTitle: "Debug",
    sheetLines: ["Debug tools run inside the app shell.", layoutBoundsEnabled ? "Layout bounds are visible." : "Layout bounds are hidden."],
    sheetActions: [
      { id: "scene-vertical", label: "Open Vertical Slice" },
      { id: "scene-design", label: "Open Design System" },
      { id: "layout-toggle", label: layoutBoundsEnabled ? "Hide Layout Bounds" : "Show Layout Bounds" },
      { id: "reload", label: "Reload" },
    ],
  };
}

export function getSampleSheetContent(
  sceneId: string,
  activeSheet: AppShellSheet,
  layoutBoundsEnabled: boolean,
): AppShellSheetContent {
  if (activeSheet !== "debug" || !demoDebugEnabled) {
    return {
      sheetTitle: "Controls",
      sheetLines: getSampleControlsLines(sceneId),
      sheetActions: [],
    };
  }

  return {
    sheetTitle: "Debug",
    sheetLines: [
      "Debug actions are part of the Pixi app shell.",
      "The DOM debug panel is kept hidden for E2E state only.",
    ],
    sheetActions: getSampleDebugActions(sceneId, layoutBoundsEnabled),
  };
}

function getSampleControlsLines(sceneId: string): string[] {
  if (sceneId === "vertical-slice") return ["Drag or pinch the world.", "Tap empty space to move the player."];
  if (sceneId === "alternate") return ["Press X to return to the vertical slice."];
  return ["Inspect tokens, primitives, layout rows, and motion samples."];
}

function getSampleDebugActions(sceneId: string, layoutBoundsEnabled: boolean): Array<{ id: string; label: string }> {
  const actions = [
    { id: "scene-index", label: "Back to Samples" },
    { id: "layout-toggle", label: layoutBoundsEnabled ? "Hide Layout Bounds" : "Show Layout Bounds" },
    { id: "reload", label: "Reload" },
  ];
  if (sceneId !== "vertical-slice") actions.splice(1, 0, { id: "scene-vertical", label: "Open Vertical Slice" });
  if (sceneId !== "design-system") actions.splice(1, 0, { id: "scene-design", label: "Open Design System" });
  return actions;
}
