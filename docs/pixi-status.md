# PixiJS Demo Status

This document tracks the current implementation and validation state for the PixiJS prototype. Use `docs/pixi-framework.md` for the framework quick start and runtime API, keep stable design contracts in `DESIGN.md`, and keep runtime architecture rationale in `docs/pixi-stack.md`.

## Current Vertical Slice

- `Scene.assets` accepts a static array or `(ctx) => array`.
- `SceneManager.switch()` cleans up the previous scene, evaluates scene assets, awaits `ctx.assets.load()`, then runs sync scene loading.
- The app starts in the `boot` scene with `Tap to start`; Enter/Space or the boot button opens a Pixi-native Scene Index with vertical slice, design-system, and planned sample entries.
- `src/ui/layouts/appShell.ts` provides the first AppShell, TopBar, ContentHost, BottomBar, and BottomSheetHost skeleton for the Scene Index.
- The vertical slice scene contains a larger explorable world with dense demo objects; drag pans the camera and wheel/pinch zoom adjusts the view while taps still move the player.
- `SceneContext.surface` exposes the current surface layout plus token, screen-size, safe-frame, anchor, center, and layout update helpers. Existing `ctx.layout` remains available during migration.
- `src/runtime/world.ts` owns world bounds, center point, object clamp, target clamp, and camera creation against a world layer.
- `src/runtime/worldCamera.ts` owns world camera pan, zoom, clamp, gesture tracking, layer application, and screen-to-world conversion.
- The debug panel can switch to the vertical slice scene or the runtime design-system scene from boot.
- Scene transitions are configured through `Scene.transition` and rendered by a runtime-owned overlay with animated panels and slash patterns.
- Scene switch commands go through `src/runtime/commandRuntime.ts`; duplicate scene switch requests are dropped while a switch is active and counts are exposed through runtime debug state.
- The design-system scene renders tokens, type, components, and motion samples inside the Pixi runtime. Major sample regions use `@pixi/layout` nodes so layout debug bounds can inspect them.
- Semantic UI uses `src/ui` primitives for repeated components such as button, label, and panel. Button text is horizontally and vertically centered and covered by E2E checks.
- Runtime UI code imports the shared token object from `src/ui/tokens.ts`; `src/runtime/surface.ts` owns only token scaling helpers.
- `bun run check:design-tokens` compares the `DESIGN.md` frontmatter contract with `src/ui/tokens.ts`; release builds run this drift check before bundling.
- `bun run check` is the fast local validation path for design token drift, TypeScript, and demo build.
- The layout debug panel starts folded, stores fold/filter/drag position in `localStorage`, can be dragged by its header, and shows the current scene name.
- The transition overlay includes a progress bar and GSAP/PixiPlugin-based loop animation with a randomized minimum display time between 500ms and 1000ms.
- Motion code is isolated behind `src/runtime/motion.ts`. PixiPlugin is used for supported display-object properties, while filter animation uses Pixi filter instances plus GSAP core.
- Demo builds use code splitting across entry, Pixi vendor, motion vendor, shared vendor, and debug-only dynamic chunks.
- GitHub Pages deployment runs `bun run check` before uploading the demo build artifact.
- Vite `chunkSizeWarningLimit` is set to 1100kB. `bun run check:bundle` enforces total JS, gzip, max chunk, and entry budgets.
- `window.__pixiDebug.runtime` exposes E2E-only app mode, runtime readiness, command counts, loading state, transition state, sampled timing, progress, overlay alpha, and transition panel counts.
- `window.__pixiDebug` mirrors a typed debug store and exposes `version`, `getSnapshot()`, `dispatch(command)`, and runtime-backed `whenReady(criteria)` for Playwright. E2E helpers read state through `getSnapshot()` instead of direct runtime/demo/layout/debug field access, and send scene/layout/reload input through `dispatch(command)` instead of direct `pixi:*` DOM events.
- `scene.load(ctx)` is sync; assets are already available through `ctx.assets.get(source)` at that point.
- `AssetRuntime` wraps Pixi `Assets` and throws if `get()` is called for an asset that is not ready.
- The first validation asset uses a Vite import URL so GitHub Pages subpath deployment does not depend on `public` absolute paths.

## Current Validation

Playwright covers desktop portrait and mobile portrait. E2E coverage is split by behavior area so framework changes can fail against boot, transition, world camera, debug panel, design-system, or reload checks independently.

Current checks include:

- canvas starts at viewport origin and fills the viewport
- visible design bounds meet the reference surface contract from `DESIGN.md`
- Scene Index renders AppShell regions and opens the Debug bottom sheet skeleton on desktop and mobile portrait
- player, marker, and title have readable/touchable screen-space sizes
- vertical slice world size, object count, camera pan, and zoom behavior are observable through E2E debug state
- HUD title and marker do not overlap
- surface layers appear in the expected world/UI/debug order
- layout debug panel appears and its bounds/filter toggles work
- design-system scene renders color, type, and component samples
- button label center delta stays within contract
- button, input-target, and marker component sizes meet their screen-space token contracts
- release build output does not contain debug overlay identifiers

## Near-Term Surface Work

- Continue moving debug/navigation controls from the floating DOM panel into Pixi bottom sheet content while keeping DOM layout inspection as development tooling until replaced or retired.
- Keep Playwright specs on the `window.__pixiDebug.getSnapshot()` / `whenReady()` contract as runtime debug state evolves. Direct field reads should stay limited to bridge implementation or explicitly documented legacy compatibility checks.
- Expand AppShell from the Scene Index into sample scenes where top navigation, back, controls, or debug sheets are useful.
- Evaluate `@pixi/ui` when controls such as slider, checkbox, progress, scroll/list, or text input become real product needs.
- Expand scene-independent UI primitives as HUD, menu, modal, badge, list, and panel patterns repeat.
- Extend pointer/touch runtime when multi-touch, gesture, virtual stick, or other game input patterns are needed.
- Strengthen Playwright visual regression checks if layout regressions become frequent.
