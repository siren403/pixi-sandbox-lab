# Suggested Commands

Environment and dependency setup:
- `bun install`
- `mise run setup-browser`
- `mise run check-browser`
- `mise run setup-serena`
- `mise run check-serena`

Pixi demo development:
- `bun run dev` starts Vite on `0.0.0.0`.
- `bun run build` runs the demo debug build.
- `bun run build:demo` runs `tsc` and Vite build with `VITE_DEMO_DEBUG=true`.
- `bun run build:release` runs `tsc`, Vite build with `VITE_DEMO_DEBUG=false`, and bundle-size check.
- `bun run check:bundle` runs bundle size validation.
- `bun run test:e2e` runs Playwright E2E with project-local Chromium.
- `bun run pw:install` installs Playwright Chromium.

Harness validation and state:
- `mise run validate-skills` validates project-local Codex skills.
- `mise run checkpoint -- status|create|verify|resume` manages checkpoint continuity.
- `mise run task-flow -- status|resume` inspects task-flow state.
- `mise run task-plan-loop -- status` inspects plan review-loop state.

Agent launch tasks:
- `mise run codex`
- `mise run claude`
- `mise run gemini`
- `mise run copilot`
- `mise run opencode`
- `mise run bash`
- `mise run doctor`

Useful Linux/git commands:
- `git status --short`
- `git branch --show-current`
- `git rev-parse --short HEAD`
- `git diff --check`
- `git diff --stat`
- `rg "pattern" path`
- `rg --files`
- `find path -maxdepth N -type f | sort`
- `sed -n '1,200p' file`