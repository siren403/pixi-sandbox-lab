---
version: "alpha"
name: "Pixi Sandbox Surface"
description: "Portrait-first PixiJS browser game surface for fast LÖVE2D-like prototyping in a cloud sandbox."
colors:
  primary: "#17202a"
  text: "#eef2f6"
  marker: "#4cc9f0"
  player: "#f7c948"
  playerStroke: "#fef3c7"
  action: "#0f766e"
  actionAccent: "#67e8f9"
  warning: "#facc15"
  motion: "#38bdf8"
typography:
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: "600"
    lineHeight: "1.25"
    letterSpacing: "0px"
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "92px"
    fontWeight: "700"
    lineHeight: "1.15"
    letterSpacing: "0px"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: "600"
    lineHeight: "1.35"
    letterSpacing: "0px"
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: "500"
    lineHeight: "1.35"
    letterSpacing: "0px"
rounded:
  sm: "8px"
  md: "16px"
  player: "28px"
spacing:
  xs: "18px"
  sm: "24px"
  md: "36px"
  lg: "72px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "86px"
    padding: "24px"
  hud-row:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text}"
    typography: "{typography.title}"
    height: "80px"
    padding: "{spacing.lg}"
  marker:
    backgroundColor: "{colors.marker}"
    size: "60px"
    rounded: "30px"
  player:
    backgroundColor: "{colors.player}"
    size: "160px"
    rounded: "{rounded.player}"
  player-stroke:
    backgroundColor: "{colors.playerStroke}"
    size: "8px"
    rounded: "{rounded.sm}"
  action-highlight:
    backgroundColor: "{colors.actionAccent}"
    size: "3px"
    rounded: "{rounded.sm}"
  input-target:
    backgroundColor: "{colors.motion}"
    size: "96px"
    rounded: "48px"
  loading-accent:
    backgroundColor: "{colors.warning}"
    size: "18px"
    rounded: "{rounded.sm}"
---

## Overview

This design system describes a PixiJS canvas game surface, not a DOM website. It exists so agents can preserve the current visual and layout rules without guessing. The product feeling is clean, readable, and prototype-friendly: high-contrast UI, direct touch targets, visible motion feedback, and minimal ornament.

This file is the canonical source of truth for Pixi surface tokens, layout policy, safe-area behavior, component contracts, and agent-readable visual rules. Other repository documents may summarize or link to these contracts, but should not redefine their formulas, thresholds, or placement rules.

The surface is portrait-first with a `1080 x 1920` reference resolution. Canvas fills the browser viewport. The runtime uses `adaptive-expand` scaling: it scales the reference design by the smaller viewport ratio, then expands the visible design bounds in the other axis. Gameplay-critical content and UI must not be cropped.

## Colors

Use a restrained dark game surface with bright, inspectable accents.

- `primary` is the default surface/background color for gameplay and HUD contexts.
- `text` is the default readable foreground.
- `action` and `actionAccent` define primary interactive controls.
- `player`, `playerStroke`, and `marker` are gameplay debug/demo colors and should remain visually distinct.
- `motion` and `warning` are for input target rings, loading motion, and temporary feedback.

Avoid one-note purple/blue gradient palettes, beige/brown editorial palettes, or decorative orb backgrounds. This project should feel like a working game prototype surface, not a marketing landing page.

## Typography

Use `Inter, system-ui, sans-serif` for all current Pixi text. Letter spacing is `0`.

Display text is reserved for the boot scene title. HUD text uses the `title` token. Body and caption tokens are for design-system samples, buttons, and smaller status text. Text must fit its control or layout region on desktop portrait and mobile portrait viewports. If text cannot fit, change the component layout or token rather than clipping.

## Layout

Coordinate spaces are explicit:

- Viewport pixels: browser/canvas size only.
- Design space: reference-resolution coordinates after inverse surface scale.
- Visible design bounds: the expanded design area produced by `adaptive-expand`.
- Safe-area frame: visible design bounds minus CSS safe-area insets and screen margin.
- World coordinates: gameplay/effect placement inside `world-layer`.

Default placement policy:

- UI uses safe-area-aware `@pixi/layout` containers and semantic primitives first.
- Gameplay, world, and effect objects may use explicit design-space coordinates.
- Repeated or semantic UI must live in `src/ui` primitives instead of scene-local `Graphics + Text`.
- Raw scene-local `Graphics + Text` UI is acceptable only for throwaway probes.
- If UI must use explicit coordinates, document why and add viewport E2E coverage for crop, overlap, safe area, and alignment.

Current Pixi layers:

```text
app.stage
└─ stage
   └─ surface-root
      ├─ world-layer
      ├─ ui-layer
      └─ debug-layer
```

`surface-root` receives the adaptive scale. Scene code should use `ctx.layers` and should not depend on child indices.

## Shapes

Cards and controls use modest radii. Buttons use `8px` at the reference scale unless a component contract says otherwise. Player/demo shapes may use larger radii because they are game objects, not UI chrome.

Do not use oversized rounded cards as page sections. Use cards only for repeated items, modals, or framed tools. Do not place cards inside cards.

## Components

Button:

- Use `button-primary` for the boot start action and design-system control samples.
- The text label is horizontally and vertically centered.
- Minimum visible touch target is `48px` screen-space height; current boot button target is larger.
- Use `createButton()` rather than hand-building a `Graphics + Text` pair. `createButton()` keeps project-owned drawing and uses `@pixi/ui` `ButtonContainer` for button events.

HUD row:

- Place HUD rows inside the safe-area frame.
- Use `@pixi/layout` row behavior with `space-between` alignment for title/marker patterns.
- HUD labels may be left-aligned by component intent; button labels should stay centered.

Panel:

- Use `createPanel()` for grouped design-system samples and future menus/modals.
- Major design-system sections must be layout nodes so the layout/bounds debug overlay can inspect them.
- Visible panels, bottom sheets, popups, modal backdrops, and invisible input blockers must own their covered input region. Use a Pixi interactive object with `eventMode: "static"` and an explicit `hitArea` for the blocking region.
- Do not rely on an empty `Container` or a visual `Graphics` bounds alone for input blocking. If the covered area matters, set the hit area deliberately.
- If panel content must remain interactive, split the blocker/backdrop object from the content container. Do not set `interactiveChildren = false` on a container that must pass input to child buttons, lists, or form controls.
- Backdrop-like blockers should stop pointer propagation for the pointer events they consume. Closing on backdrop tap is an explicit component option, not the default behavior.

Safe-area containers:

- Use `configureSafeAreaColumn()` for centered boot/menu UI.
- Use `configureSafeAreaRow()` for top HUD/control rows.
- Keep safe-area frame logic in `src/ui/layout.ts` or a future surface-level primitive, not scattered scene math.

Accepted direction and first implementation:

- The sandbox demo should move from floating DOM debug controls toward Pixi-native navigation and controls.
- After the boot action, a Scene Index acts as the sample browser for vertical slice, design-system, and future camera/input/layout/motion samples.
- Shared Pixi layout components should support repeated surfaces whose content changes, such as sample indexes, popups, settings, shops, and scene-specific controls.
- `AppShell` is one layout component in that system, not the whole system.
- App UI must not read `window.__pixiDebug`; debug and E2E bridge state stays behind runtime/store adapters.

Proposed layout component contracts:

- `AppShell` owns only placement slots: `topBar`, `contentHost`, `bottomBar`, `bottomSheetHost`, and optional `overlayHost`. It must not own scene registry, scene switching, or game commands.
- `TopBar` sits inside the safe-area frame, exposes scene title and navigation/action slots, and keeps back/navigation touch targets at least `48px` screen-space.
- `ContentHost` provides the usable scene or page region after top/bottom shell regions are reserved. It must not be silently covered by closed shell UI.
- `BottomBar` sits inside the safe-area frame and exposes controls/debug/sheet trigger slots with centered labels or icons and stable hit targets.
- `BottomSheetHost` owns sheet bounds, open/closed state visuals, optional scrim, clipping, and input capture rules. Sheet content is supplied separately.
- `BottomSheetHost` must block pointer input inside the open sheet bounds, including visually empty sheet background. If it uses a scrim, the scrim must also have an explicit hit area and input policy.
- `SceneIndexLayout` is a safe-area-aware list/grid surface for sample cards or rows. Each item must have a visible label, stable bounds, and a touch target of at least `48px` screen-space height.
- `DebugSheetContent` may expose reload, scene navigation, layout inspection, and runtime status in demo/debug builds. It should use the same layout primitives as other sheet content.
- Scene-specific controls should be provided as bottom sheet content rather than floating over the gameplay surface.

## Do's and Don'ts

Do:

- Keep UI layout-first and safe-area-aware.
- Keep world/gameplay coordinates explicit when that makes game logic clearer.
- Add E2E checks for component contracts such as button label centering, touch target size, no overlap, and no critical crop.
- Use debug inspection bounds to inspect semantic boxes before considering a layout task complete.
- Update this file when design tokens or component contracts change.

Don't:

- Do not fix UI by hardcoding viewport pixels.
- Do not put gameplay-critical UI outside the safe-area frame.
- Do not let title, marker, player, or boot controls overlap on supported portrait viewports.
- Do not introduce DOM-style design system assumptions that ignore Pixi `Container`, `Graphics`, `Text`, `@pixi/layout`, and canvas scaling.
- Do not use decorative gradients, bokeh blobs, or marketing-page hero composition for the game surface.
