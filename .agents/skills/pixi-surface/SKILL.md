---
name: pixi-surface
description: Plan or review PixiJS app surface, responsive layout, safe-area handling, design tokens, Pixi UI components, @pixi/layout, @pixi/ui, and viewport E2E checks for the PixiJS prototype stack.
---

# Pixi Surface

Use this skill for PixiJS browser game surface work: rendering policy, responsive layout, safe area, design tokens, UI primitives, `@pixi/layout`, `@pixi/ui`, and Playwright viewport validation.

## Baseline

The current Pixi surface contract is in the root `DESIGN.md`. Read it before planning or reviewing surface work. Use `docs/pixi-stack.md` for runtime architecture rationale, and `docs/pixi-status.md` for current implementation and validation status.

## Responsibility Split

Build or preserve these project-owned runtime parts:

- viewport resize and renderer resize
- safe-area collection and design-space conversion
- visible bounds calculation
- game-specific layout context
- viewport E2E expectations

Keep these contract changes in `DESIGN.md`:

- surface policy and reference resolution
- design token schema
- component sizing, alignment, and visual states
- safe-area and layout placement rules

Prefer Pixi ecosystem packages for these parts when they fit:

- `@pixi/layout`: flex-like UI layout, padding, gap, percentage sizing, panels, rows, columns
- `@pixi/ui`: buttons, sliders, checkboxes, progress, scroll/list, inputs

Do not assume `@pixi/layout` replaces the surface contract. It should operate inside the project-owned visible bounds and safe-area layout context.

## Design System Shape

Avoid raw one-off design px in scene code. Prefer:

- design tokens for font, spacing, radius, color, touch target, z-layer, and component size
- `@pixi/layout` containers for UI structure such as HUDs, panels, rows, columns, menus, modals, debug views, and design-system samples
- Pixi UI primitives and composed components
- screen constraints for readable/touchable UI, for example `minScreenPx`

Default placement policy:

- UI is layout-and-primitive first.
- Gameplay/world/effect objects may use explicit coordinates.
- Scene-local `Graphics + Text` UI is acceptable only for quick throwaway probes. Promote repeated or semantic UI, such as buttons, labels, panels, badges, lists, HUD groups, and modals, into primitives.
- If UI must use explicit coordinates, document why and add viewport/layout E2E coverage for overlap, crop, safe-area, and expected alignment.
- Component semantics define alignment contracts. For example, button text defaults to horizontal and vertical center, while HUD titles may be top-left and captions may be left-aligned.
- Design-system scenes should use layout nodes so `@pixi/layout` debug overlay can inspect boundaries.

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

## API Surface Heuristics

Use these checks when planning or reviewing Pixi framework API shape, especially scene, layout, UI primitive, and runtime facade changes:

- Prefer namespace symmetry: when the write/call API is namespaced, the read API should usually live in the same namespace. For example, scene transition payloads passed through `ctx.switchScene(scene, { args })` should be read through `ctx.scene.args<T>()`, not an unrelated top-level helper.
- Prefer clear concept boundaries over the shortest possible call. A short top-level API is acceptable only when it does not blur ownership such as scene metadata, surface layout, runtime commands, or long-lived game state.
- Do not expose a raw public value and a typed helper for the same concept at the same time. Pick one public surface and keep raw storage internal.
- Treat generic helpers without runtime validation as TypeScript assertions. Document that they do not validate shape.
- Keep one-shot transition payloads separate from long-lived state. Use scene args for initial tab, selected sample, or optional sheet state; use a future game state/store for inventory, progression, shop state, or cross-scene domain data.
- Preserve legacy compatibility only at the API boundary. Normalize old forms such as `ctx.switchScene(scene, "debug")` into the new internal shape before runtime logic consumes them.

## Review Checklist

Before implementation:

- Confirm whether the work is surface policy, UI primitives, composed UI, or game logic.
- Keep game logic, ECS, asset loading, physics, and deployment out of scope unless explicitly requested.
- Check whether `@pixi/layout` or `@pixi/ui` can reduce custom code.
- For UI work, default to layout containers and semantic primitives before scene-local coordinates.
- For component-like UI, define the semantic alignment contract before implementation.
- Define viewport behavior for desktop portrait and mobile portrait.
- Define how safe area affects anchors.
- Define E2E checks that prove canvas fill, no offset, no crop of critical UI, and interaction.
- For layout/debuggable UI, include a check that layout nodes exist and relevant component bounds are inspectable.
- For semantic components, include contract checks such as button label center delta, touch target minimum size, or no-overlap assertions.
- For panels, bottom sheets, popups, modals, and invisible overlays, define the input blocking contract before implementation. Prefer a dedicated blocker/backdrop object with `eventMode: "static"` and an explicit `hitArea`; do not rely on empty `Container` bounds.
- When panel content remains interactive, keep the blocker/backdrop separate from the content container so child buttons and lists can still receive events.
- For Pixi framework API surface changes, check namespace symmetry, public/raw separation, one-shot args versus store boundaries, and legacy normalization.

After implementation:

- Run `mise run check-browser`.
- Run `bun run check`.
- Run `bun run test:e2e`.
- If deployed, verify the GitHub Pages URL with headless Playwright against the relevant viewport checks.

## Escalation

One specialist is enough while the UI catalog is small. Reconsider splitting roles when at least two of these are true:

- UI components exceed roughly 8-10 reusable components.
- token/theme work and Pixi implementation block each other.
- `@pixi/layout` / `@pixi/ui` evaluation needs parallel implementation.
- visual regression or viewport testing becomes its own workstream.
- DOM overlay UI grows into a separate surface.
