# Project Overview

`prompt-ops` is a combined cloud-sandbox harness workspace and PixiJS demo project.

The harness layer develops reusable workflow support for running real projects inside a yolobox/cloud sandbox: Codex skills, custom agents, hooks, MCP configuration, mise tasks, checkpointing, task boundaries, and inventory/protocol documentation.

The demo layer is a browser-based PixiJS/TypeScript rapid game prototyping stack inspired by LÖVE2D. It is used as the concrete vertical slice for discovering sandbox needs. Current stack includes Bun, Vite, TypeScript, PixiJS v8, `@pixi/layout`, GSAP, and Playwright E2E.

Key app direction:
- browser-based playtesting, including GitHub Pages deployment
- `createGame()` / `scene()` style runtime API
- scene manager, input runtime, asset cache/loading, transitions, command gate
- portrait-first `1080 x 1920` adaptive-expand surface policy
- safe-area aware layout
- layout-first Pixi UI using `@pixi/layout` and semantic primitives in `src/ui`

Key harness direction:
- Korean responses by default
- non-trivial work uses `task-plan`, `task-start`, and `task-end`
- harness spec changes require `docs/harness-change-protocol.md` and inventory updates
- add skills/MCP/hooks/tasks only when a real workflow need appears