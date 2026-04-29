---
name: pixi-surface
description: Plan or review PixiJS app surface, responsive layout, safe-area handling, design tokens, Pixi UI components, @pixi/layout, @pixi/ui, and viewport E2E checks for the PixiJS prototype stack.
---

# Pixi Surface

Use this skill for PixiJS browser game surface work: rendering policy, responsive layout, safe area, design tokens, UI primitives, `@pixi/layout`, `@pixi/ui`, and Playwright viewport validation.

## Baseline

The current project policy is in `docs/pixi-stack.md`.

Default surface policy:

- Reference resolution: `1080 x 1920`
- Orientation: portrait-first
- Scale mode: `adaptive-expand`
- Canvas: fills the viewport, no letterbox
- Crop: gameplay-critical content and UI must not be cropped
- Layout: anchor-based, safe-area aware
- Validation: desktop portrait and mobile portrait Playwright coverage

`adaptive-expand`:

```text
scale = min(viewportWidth / 1080, viewportHeight / 1920)
visibleDesignWidth = viewportWidth / scale
visibleDesignHeight = viewportHeight / scale
```

## Responsibility Split

Build or preserve these project-owned parts:

- surface policy and reference resolution
- viewport resize and renderer resize
- safe-area collection and design-space conversion
- visible bounds calculation
- design token schema
- game-specific layout context
- viewport E2E expectations

Prefer Pixi ecosystem packages for these parts when they fit:

- `@pixi/layout`: flex-like UI layout, padding, gap, percentage sizing, panels, rows, columns
- `@pixi/ui`: buttons, sliders, checkboxes, progress, scroll/list, inputs

Do not assume `@pixi/layout` replaces the surface policy. It should operate inside the project-owned visible bounds and safe-area layout context.

## Design System Shape

Avoid raw one-off design px in scene code. Prefer:

- design tokens for font, spacing, radius, color, touch target, z-layer, and component size
- semantic layout helpers such as `anchor("top-left", "screen")`
- Pixi UI primitives and composed components
- screen constraints for readable/touchable UI, for example `minScreenPx`

Example component intent:

```ts
ui.title({
  text: "Score",
  anchor: "top-left",
  margin: "screen",
  safeArea: true,
});

ui.button({
  label: "Start",
  variant: "primary",
  anchor: "bottom-center",
  safeArea: true,
});
```

## Review Checklist

Before implementation:

- Confirm whether the work is surface policy, UI primitives, composed UI, or game logic.
- Keep game logic, ECS, asset loading, physics, and deployment out of scope unless explicitly requested.
- Check whether `@pixi/layout` or `@pixi/ui` can reduce custom code.
- Define viewport behavior for desktop portrait and mobile portrait.
- Define how safe area affects anchors.
- Define E2E checks that prove canvas fill, no offset, no crop of critical UI, and interaction.

After implementation:

- Run `mise run check-browser`.
- Run `bun run build`.
- Run `bun run test:e2e`.
- If deployed, verify the GitHub Pages URL with headless Playwright against the relevant viewport checks.

## Escalation

One specialist is enough while the UI catalog is small. Reconsider splitting roles when at least two of these are true:

- UI components exceed roughly 8-10 reusable components.
- token/theme work and Pixi implementation block each other.
- `@pixi/layout` / `@pixi/ui` evaluation needs parallel implementation.
- visual regression or viewport testing becomes its own workstream.
- DOM overlay UI grows into a separate surface.
