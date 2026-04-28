# AGENTS.md

## Project Goal

This repository is a cloud-sandbox project workspace.

The goal is to develop a practical workflow for building real projects inside a cloud sandbox while gradually growing the surrounding agent harness, skills, MCP integrations, and operational knowledge needed to make that workflow reliable.

The current demonstration domain is a fast PixiJS-based game prototyping stack inspired by LÖVE2D. It is being used as a concrete project to exercise the sandbox workflow, not as a detached design exercise.

## Current Context

- `README.md` is the top-level orientation for the combined sandbox and demo-project workspace.
- `.agents/skills/agent-creator/` contains the project-local skill for designing Codex custom agents and supporting skill/plugin/MCP structure.
- `.agents/skills/hook-creator/` contains the project-local skill for designing Codex lifecycle hooks and hook-backed guardrails.
- `.codex/agents/harness-architect.toml` defines the project-local Codex custom agent for sandbox harness architecture.
- `.codex/agents/plan-reviewer.toml` defines the project-local Codex custom agent for reviewing implementation plans before execution.
- `.mise/tasks/validate-skills` validates project-local Codex skills using the mise-managed Python runtime and project `.venv`.
- `docs/harness.md` documents the current PromptOps/yolobox agent harness and sandbox launch workflow.
- `docs/harness-inventory.md` registers harness components and discovery paths.
- `docs/harness-change-protocol.md` defines the required process for adding or changing harness specs.
- `docs/pixi-stack.md` captures the current PixiJS prototype framework research and design direction.
- These documents came from different phases. Treat them as source material that will keep being refined as the project direction settles.
- Do not assume the repository is only infrastructure or only a game framework. The project intentionally combines both:
  - cloud sandbox usage and agent harness development
  - a real sandbox demonstration project using PixiJS for rapid game prototyping

## Working Model

Work should advance both layers when relevant:

1. **Sandbox and harness layer**
   - Improve how agents run in the cloud sandbox.
   - Capture setup, runtime, networking, authentication, tool, skill, and MCP lessons as they become concrete.
   - Keep the workflow reproducible for future projects.

2. **Demo project layer**
   - Build a small runnable PixiJS/TypeScript prototype framework.
   - Use the framework work to reveal what the sandbox needs in practice.
   - Prefer real working examples over abstract architecture.

The PixiJS stack is currently the main hands-on test case for the sandbox workflow.

## Product Direction

The PixiJS prototype framework should aim for:

- browser-based playtesting from a shared URL
- fast iteration on desktop and mobile
- a LÖVE2D-like authoring feel with `load` and `update` callbacks
- framework-owned async asset loading so game code can stay simple
- a small scene manager, input layer, asset cache, and optional lightweight ECS
- incremental implementation through runnable vertical slices

Follow `docs/pixi-stack.md` for existing framework design intent, but validate choices through implementation.

## Documentation Direction

The current domain documents are transitional.

When documentation is updated:

- separate sandbox/harness docs from PixiJS framework docs
- keep a short top-level orientation that explains how the two layers relate
- record sandbox lessons only after they are observed or implemented
- avoid rewriting history into certainty before the workflow has been tested

Good future documents might include:

- `docs/sandbox.md` for cloud sandbox operation notes
- `docs/harness.md` for agent, skill, and MCP setup
- `docs/pixi-stack.md` for the prototype framework design
- `docs/decisions/` for important tradeoffs and decisions

## Implementation Principles

- For non-trivial work, use the task boundary flow: `task-plan` before implementation, `task-start` before editing, and `task-end` before final closeout.
- Start with the smallest runnable vertical slice before expanding architecture.
- Prefer clear, inspectable code over engine-like generality.
- Preserve the distinction between sandbox infrastructure and the demo application, but let discoveries in one inform the other.
- Add skills, MCP servers, or harness behavior only when a real workflow need appears.
- Treat harness spec changes as owned by `harness_architect`; update `docs/harness-inventory.md` and follow `docs/harness-change-protocol.md` when adding or changing skills, hooks, custom agents, MCP config, plugins, mise tasks, or sandbox config.
- Keep changes scoped and document why new operational assumptions are introduced.
- Do not overwrite unrelated user changes or generated state.

## First Milestone

Create a runnable browser demo that proves the PixiJS stack inside the cloud sandbox:

- TypeScript/Vite/PixiJS project scaffold
- `createGame()` and `scene()` API sketch
- boot scene with a rendered object
- per-frame `scene.update(dt)`
- keyboard input moving an object
- local dev server reachable from the sandbox environment
- notes on any sandbox-specific setup or networking behavior discovered

This milestone should produce both working code and a short documentation update that captures what was learned about using the cloud sandbox for this kind of project.
