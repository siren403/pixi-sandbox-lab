# Code Structure

Top-level orientation:
- `AGENTS.md`: repository-wide agent instructions and working model.
- `README.md`: project map, current focus, Pixi demo setup, Pages URL.
- `docs/harness*.md`: harness protocol, inventory, task boundary, and sandbox notes.
- `docs/pixi-stack.md`: PixiJS runtime/surface architecture notes.

Harness:
- `.agents/skills/*/SKILL.md`: project-local Codex skills such as `task-plan`, `task-start`, `task-end`, `checkpoint`, `harness-audit`, `pixi-surface`.
- `.codex/agents/*.toml`: custom agents including harness architect, plan reviewer, and Pixi surface architect.
- `.codex/config.toml`: project-scoped Codex hooks and Serena MCP declaration.
- `.codex/hooks/*.ts`: Bun/TypeScript Codex hook scripts.
- `.mise/tasks/*`: executable task entrypoints for agent launchers, browser setup/check, checkpoint/task-flow/task-plan-loop, Serena setup/check.
- `scripts/harness/*`: Bun/TypeScript harness helpers.

Pixi demo/runtime:
- `src/main.ts`: app entrypoint.
- `src/runtime/createGame.ts`: creates Pixi app, surface layers, layout context, and resize handling.
- `src/runtime/surface.ts`: surface policy/types.
- `src/runtime/scene*.ts`: scene type and scene manager.
- `src/runtime/keyboard.ts`, `pointer.ts`: input runtimes.
- `src/runtime/assets.ts`: asset loading/cache.
- `src/runtime/transition.ts`, `motion.ts`, `commandRuntime.ts`: transitions, motion helpers, command gate.
- `src/scenes/intro.ts`, `boot.ts`: intro, boot, alternate, and design system scenes.
- `src/ui/button.ts`: semantic Pixi UI primitive currently present.
- `src/debug/layoutDebugOverlay.ts`: DOM layout debug panel/overlay state.
- `tests/e2e/pixi-demo.spec.ts`: Playwright viewport/rendering/interaction checks.