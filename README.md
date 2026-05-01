# Cloud Sandbox Project Lab

This repository is a workspace for developing real projects inside a cloud sandbox while growing the agent harness, skills, MCP integrations, and operational notes needed to make that workflow reliable.

The current demonstration project is a PixiJS-based rapid game prototyping stack inspired by LÖVE2D. It gives the sandbox work a concrete target: build something runnable, discover what the environment needs, and capture the lessons as reusable project infrastructure.

## Repository Map

- `AGENTS.md` - working instructions for agents in this repository
- `.agents/skills/agent-creator/` - project skill for designing Codex custom agents and related skill/plugin/MCP structure
- `.agents/skills/hook-creator/` - project skill for designing Codex lifecycle hooks from official specs
- `.agents/skills/pixi-surface/` - project skill for PixiJS surface policy, layout, UI components, and viewport validation
- `.agents/skills/checkpoint/` - project skill for creating and consuming continuation checkpoints
- `.agents/skills/task-plan/` - project skill for implementation planning and plan review
- `.agents/skills/task-start/` - project skill for recording task baseline before edits
- `.agents/skills/task-end/` - project skill for validation, cleanup, optional commit, and clean closeout
- `.codex/agents/harness-architect.toml` - Codex custom agent for sandbox harness architecture
- `.codex/agents/plan-reviewer.toml` - Codex custom agent for implementation plan review
- `.codex/agents/pixi-surface-architect.toml` - Codex custom agent for PixiJS app surface architecture
- `.mise/tasks/checkpoint` - checkpoint state manager for context-boundary continuity
- `.mise/tasks/validate-skills` - project-scoped Codex skill validation task
- `DESIGN.md` - canonical PixiJS surface design-system contract
- `docs/harness-task-boundary.md` - task planning, start, end, audit follow-up, and dirty-hook workflow
- `docs/harness.md` - current PromptOps/yolobox agent harness notes
- `docs/harness-inventory.md` - registry of current harness components and discovery paths
- `docs/harness-change-protocol.md` - required process for adding or changing harness specs
- `docs/pixi-stack.md` - PixiJS prototype framework research and design notes
- `docs/pixi-status.md` - current PixiJS demo implementation and validation status

## Current Focus

1. Keep the cloud sandbox workflow reproducible.
2. Use the PixiJS prototype stack as the first hands-on sandbox project.
3. Add harness, skill, and MCP support only when real project work creates the need.
4. Split transitional notes into clearer domain documents as the workflow matures.

## Current Demo Status

The first runnable browser demo exists and now serves as the active validation target:

- TypeScript, Vite, Bun, and PixiJS scaffold
- `createGame()` / scene runtime sketch
- boot scene, vertical slice scene, and runtime design-system scene
- pointer and keyboard input coverage
- adaptive Pixi surface, semantic UI primitives, and layout debug tooling
- headless Playwright validation for desktop and mobile portrait viewports

## PixiJS Demo

The first runnable slice uses Bun, Vite, TypeScript, PixiJS, and headless Playwright.

```bash
bun install
mise run setup-browser
bun run dev
```

Open the Vite URL shown by the dev server. Inside the sandbox the app binds to `0.0.0.0`, while automated checks use `http://127.0.0.1:5173` from inside the container.

Fast local validation:

```bash
bun run check
```

Build and E2E checks:

```bash
bun run build
bun run test:e2e
```

`mise run setup-browser` installs Bun dependencies, installs the Playwright Chromium binary with `PLAYWRIGHT_BROWSERS_PATH=0`, installs Chromium Linux dependencies for the sandbox, and runs a headless Chromium launch smoke check. To verify an already prepared sandbox:

```bash
mise run check-browser
```

The intended direct-play path for shared demos is GitHub Pages from a static Vite build:

```text
https://siren403.github.io/pixi-sandbox-lab/
```

The repository must have Pages configured to deploy from GitHub Actions. Pushing to `main` runs `.github/workflows/pages.yml`, builds with Bun, and deploys `dist/`.

Use `DESIGN.md` for the PixiJS app surface contract, `docs/pixi-stack.md` for runtime architecture rationale, and `docs/pixi-status.md` for the current implementation and validation state.
