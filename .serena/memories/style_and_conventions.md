# Style and Conventions

General:
- Communicate with the user in Korean unless asked otherwise.
- Keep changes tightly scoped; do not overwrite unrelated user changes.
- Prefer `rg`/`rg --files` for text and file search.
- Use `apply_patch` for manual file edits.
- Default to ASCII in edited files unless the file already uses non-ASCII or there is a clear reason.
- Add comments sparingly and only when they clarify non-obvious logic.

Task/harness workflow:
- Non-trivial work uses `task-plan` before implementation, `task-start` before editing, and `task-end` before closeout.
- Approved implementation tasks end in a validated commit by default unless validation fails, scope drifts, unknown dirty files exist, or the user says not to commit.
- Harness spec changes are owned by the harness protocol: update `docs/harness-inventory.md`, follow `docs/harness-change-protocol.md`, and use plan review for non-trivial changes.

Frontend/Pixi policy:
- The app is portrait-first with a `1080 x 1920` reference resolution and adaptive-expand scaling.
- UI should be safe-area aware.
- Meaningful UI such as buttons, labels, panels, badges, menus, modals, and HUD groups should use semantic primitives in `src/ui` instead of repeated scene-local `Graphics + Text` combinations.
- Use `@pixi/layout` for UI layout first. Explicit coordinates are acceptable for gameplay/world/effects or when a UI case has a clear reason and matching E2E coverage.
- Component contracts should be testable, e.g. button text is centered unless the component intentionally documents otherwise.
- Design system scene major areas should be layout nodes visible through the layout debug overlay.

TypeScript style:
- Project uses ESM (`type: module`), TypeScript, Vite, Bun.
- Runtime code tends toward small functions and explicit state objects rather than heavy engine abstractions.
- Use existing runtime helpers and local patterns before adding new abstractions.