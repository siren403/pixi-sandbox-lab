# PixiJS Demo Status

This document tracks the current implementation and validation state for the PixiJS prototype. Keep stable design contracts in `DESIGN.md` and runtime architecture rationale in `docs/pixi-stack.md`.

## Current Vertical Slice

- `Scene.assets` accepts a static array or `(ctx) => array`.
- `SceneManager.switch()` cleans up the previous scene, evaluates scene assets, awaits `ctx.assets.load()`, then runs sync scene loading.
- The app starts in the `boot` scene with `Tap to start`; Enter/Space or the boot button switches to `vertical-slice`.
- The debug panel can switch to the vertical slice scene or the runtime design-system scene from boot.
- Scene transitions use a runtime-owned overlay with animated panels and slash patterns.
- Scene switch commands go through `src/runtime/commandRuntime.ts`; duplicate scene switch requests are dropped while a switch is active and counts are exposed through runtime debug state.
- The design-system scene renders tokens, type, components, and motion samples inside the Pixi runtime. Major sample regions use `@pixi/layout` nodes so layout debug bounds can inspect them.
- Semantic UI uses `src/ui` primitives for repeated components such as button, label, and panel. Button text is horizontally and vertically centered and covered by E2E checks.
- Runtime UI code imports the shared token object from `src/ui/tokens.ts`; `src/runtime/surface.ts` owns only token scaling helpers.
- The layout debug panel starts folded, stores fold/filter/drag position in `localStorage`, can be dragged by its header, and shows the current scene name.
- The loading overlay includes a progress bar and GSAP/PixiPlugin-based loop animation with a randomized minimum display time between 500ms and 1000ms.
- Motion code is isolated behind `src/runtime/motion.ts`. PixiPlugin is used for supported display-object properties, while filter animation uses Pixi filter instances plus GSAP core.
- Demo builds use code splitting across entry, Pixi vendor, motion vendor, shared vendor, and debug-only dynamic chunks.
- Vite `chunkSizeWarningLimit` is set to 1100kB. `bun run check:bundle` enforces total JS, gzip, max chunk, and entry budgets.
- `window.__pixiDebug.runtime` exposes E2E-only app mode, command counts, loading state, transition state, sampled timing, progress, overlay alpha, and transition panel counts.
- `scene.load(ctx)` is sync; assets are already available through `ctx.assets.get(source)` at that point.
- `AssetRuntime` wraps Pixi `Assets` and throws if `get()` is called for an asset that is not ready.
- The first validation asset uses a Vite import URL so GitHub Pages subpath deployment does not depend on `public` absolute paths.

## Current Validation

Playwright covers desktop portrait and mobile portrait.

Current checks include:

- canvas starts at viewport origin and fills the viewport
- visible design bounds meet the reference surface contract from `DESIGN.md`
- player, marker, and title have readable/touchable screen-space sizes
- HUD title and marker do not overlap
- surface layers appear in the expected world/UI/debug order
- layout debug panel appears and its bounds/filter toggles work
- design-system scene renders color, type, and component samples
- button label center delta stays within contract
- button, input-target, and marker component sizes meet their screen-space token contracts
- release build output does not contain debug overlay identifiers

## Near-Term Surface Work

- Evaluate `@pixi/ui` when controls such as slider, checkbox, progress, scroll/list, or text input become real product needs.
- Expand scene-independent UI primitives as HUD, menu, modal, badge, list, and panel patterns repeat.
- Extend pointer/touch runtime when multi-touch, gesture, virtual stick, or other game input patterns are needed.
- Strengthen Playwright visual regression checks if layout regressions become frequent.
