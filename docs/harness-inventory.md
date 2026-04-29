# Harness Inventory

This document is the registry of harness-level components in this repository.

Update it whenever adding, removing, or changing a harness spec: Codex custom agents, skills, hooks, MCP config, plugins, mise tasks, sandbox config, or harness documentation.

## Discovery Paths

Harness architects should inspect these paths at the start of harness work:

```text
AGENTS.md
README.md
.agents/skills/*/SKILL.md
.agents/skills/*/agents/openai.yaml
.agents/skills/*/references/*
.codex/agents/*.toml
.codex/config.toml
.codex/hooks/*
.mise.toml
.mise/tasks/*
.mise/tasks/lib/*
scripts/harness/*
docs/harness*.md
docs/sandbox*.md
```

Some paths may not exist yet. Absence is acceptable, but newly added paths must be registered here.

## Current Components

### Project Policy

- `AGENTS.md`  
  Repository-wide instructions for agents. Defines the combined cloud sandbox and PixiJS demo-project direction.

- `README.md`  
  Top-level orientation and repository map.

### Codex Skills

- `.agents/skills/agent-creator/SKILL.md`  
  Creates or updates Codex custom agents and supporting skill/plugin/MCP structure.

- `.agents/skills/agent-creator/references/codex-agent-spec.md`  
  Local reference for Codex custom agent locations, required fields, supported config, and Claude Code mapping.

- `.agents/skills/agent-creator/agents/openai.yaml`  
  UI metadata for the `agent-creator` skill.

- `.agents/skills/hook-creator/SKILL.md`  
  Creates or updates Codex lifecycle hooks from official hook/config specs.

- `.agents/skills/hook-creator/references/codex-hooks-spec.md`  
  Local reference for Codex hook events, command hook shape, stdin/stdout semantics, and guardrail limits.

- `.agents/skills/hook-creator/agents/openai.yaml`  
  UI metadata for the `hook-creator` skill.

- `.agents/skills/checkpoint/SKILL.md`
  Creates, verifies, and consumes project-local continuation checkpoints for context-boundary continuity and contamination prevention.
  Discovery route: `harness_architect` boot discovery reads `.agents/skills/*/SKILL.md`; users can invoke `$checkpoint`.
  Expected user/agent: parent Codex and harness agents checkpointing clean continuation points before context clearing, new sessions, or handoff.
  Validation: `mise run validate-skills`; checkpoint behavior is validated through `mise run checkpoint -- ...` smoke tests.

- `.agents/skills/checkpoint/agents/openai.yaml`
  UI metadata for the `checkpoint` skill.

- `.agents/skills/harness-audit/SKILL.md`  
  Provides the read-only harness audit procedure for inventory coverage, discovery paths, protocol coverage, validation, tracking policy, and clean-state readiness.
  Discovery route: `harness_architect` boot discovery reads `.agents/skills/*/SKILL.md`.
  Expected user/agent: parent Codex and harness agents auditing harness consistency before or after harness spec changes.
  Validation: `mise run validate-skills`.

- `.agents/skills/harness-audit/agents/openai.yaml`  
  UI metadata for the `harness-audit` skill.

- `.agents/skills/task-end/SKILL.md`  
  Provides the generic task closeout procedure for dirty-state hook follow-up, dirty file classification, safe temporary artifact cleanup, validation, optional commit, and final clean-state reporting.
  Discovery route: `harness_architect` boot discovery reads `.agents/skills/*/SKILL.md`.
  Expected user/agent: parent Codex and harness agents closing out work items.
  Validation: `mise run validate-skills`.

- `.agents/skills/task-end/agents/openai.yaml`  
  UI metadata for the `task-end` skill.

- `.agents/skills/task-plan/SKILL.md`  
  Provides the pre-implementation planning procedure with feature summary, concrete assigned agents, scope, validation, closeout, plan review, and optional persisted review-loop state.
  Discovery route: `harness_architect` boot discovery reads `.agents/skills/*/SKILL.md`.
  Expected user/agent: parent Codex and harness agents planning non-trivial work.
  Validation: `mise run validate-skills`; review-loop behavior is validated through `mise run task-plan-loop -- ...` smoke tests.

- `.agents/skills/task-plan/agents/openai.yaml`  
  UI metadata for the `task-plan` skill.

- `.agents/skills/task-start/SKILL.md`  
  Provides the task start baseline procedure for branch, HEAD, existing dirty state, intended file scope, validation plan, and blockers before editing.
  Discovery route: `harness_architect` boot discovery reads `.agents/skills/*/SKILL.md`.
  Expected user/agent: parent Codex and harness agents starting approved work.
  Validation: `mise run validate-skills`.

- `.agents/skills/task-start/agents/openai.yaml`  
  UI metadata for the `task-start` skill.

### Codex Custom Agents

- `.codex/agents/harness-architect.toml`  
  Project-local custom agent responsible for cloud sandbox harness architecture, agent strategy, skills, hooks, MCP integration, and documentation boundaries.
  Discovery route: `harness_architect` core context includes `docs/harness-inventory.md` and `docs/harness-change-protocol.md`; task-specific context is loaded conditionally.
  Expected user/agent: parent Codex and harness agents planning or changing harness specs.
  Validation: TOML syntax smoke check and reference check for core/conditional context entries.

- `.codex/agents/plan-reviewer.toml`  
  Project-local custom agent responsible for reviewing implementation plans before execution.

### Codex Hooks

- `.codex/config.toml`  
  Project-scoped Codex config. Enables `codex_hooks` and registers the `SessionStart` checkpoint reminder hook and `Stop` dirty-state warning hook.
  Discovery route: `harness_architect` boot discovery reads `.codex/config.toml`.

- `.codex/hooks/checkpoint-session-start.ts`
  Bun/TypeScript command hook for the Codex `SessionStart` event. Resolves the git root from the hook `cwd`, reads `.codex-harness/checkpoint.json`, and emits a non-blocking `systemMessage` when an active checkpoint should be resumed.
  Event: `SessionStart`. Matcher: none. Behavior: warn-only, non-blocking, read-only.
  Expected user/agent: all Codex sessions in this project once project hooks are active.
  Validation: smoke-tested with active, consumed, missing, malformed, and subdirectory `cwd` checkpoint cases.

- `.codex/hooks/dirty-state-stop.ts`  
  Bun/TypeScript command hook for the Codex `Stop` event. Runs `git status --short` in the hook `cwd`, emits a non-blocking `systemMessage` when the working tree is dirty, and exits cleanly on git inspection errors with a warning.
  Event: `Stop`. Matcher: none. Behavior: warn-only, non-blocking.
  Expected user/agent: all Codex sessions in this project once project hooks are active.
  Validation: smoke-tested with clean and dirty temporary git repositories; dirty state emitted `systemMessage`.

When hooks are added, register:

- hook config location, usually `.codex/config.toml`
- hook script path under `.codex/hooks/`
- event name and matcher
- whether the hook warns, blocks, or adds context

### MCP Config

- None yet.

When MCP config is added, register:

- config file path
- server id
- transport
- intended users or agents
- required credentials or network assumptions

### Plugins

- None yet.

### Mise Tasks

- `.mise/tasks/opencode`  
  Launch OpenCode in the yolobox harness.

- `.mise/tasks/claude`  
  Launch Claude Code in the yolobox harness.

- `.mise/tasks/codex`  
  Launch Codex in the yolobox harness.

- `.mise/tasks/gemini`  
  Launch Gemini CLI in the yolobox harness.

- `.mise/tasks/copilot`  
  Launch GitHub Copilot CLI in the yolobox harness.

- `.mise/tasks/bash`  
  Open an interactive sandbox shell and bootstrap project runtime tools.

- `.mise/tasks/doctor`  
  Run environment checks.

- `.mise/tasks/validate-skills`  
  Use the project-scoped mise Python runtime and `.venv` to run Codex skill validation. Reports each valid project skill by name and path.

- `.mise/tasks/checkpoint`
  Official mise execution surface for the checkpoint continuity guard. Agents should call `mise run checkpoint -- <command>` instead of invoking the Bun script directly.
  Discovery route: `harness_architect` boot discovery reads `.mise/tasks/*` and this inventory.
  Expected user/agent: parent Codex and harness agents creating, verifying, and consuming continuation checkpoints.
  Validation: smoke tests with `auto`, `create`, `status`, `verify`, `resume`, consumed overwrite, active overwrite refusal, forced overwrite, dirty-state refusal, and malformed state failure.

- `.mise/tasks/task-plan-loop`  
  Official mise execution surface for the task-plan review-loop state manager. Agents should call `mise run task-plan-loop -- <command>` instead of invoking the Bun script directly.
  Discovery route: `harness_architect` boot discovery reads `.mise/tasks/*` and this inventory.
  Expected user/agent: parent Codex and harness agents running persisted plan/review loops.
  Validation: state transition smoke tests with `start`, `status`, `review`, `revise`, `approve`, and `stop`.

- `.mise/tasks/task-flow`
  Official mise execution surface for the task-flow detour state manager. Agents should call `mise run task-flow -- <command>` instead of invoking the Bun script directly.
  Discovery route: `harness_architect` boot discovery reads `.mise/tasks/*` and this inventory.
  Expected user/agent: parent Codex and harness agents recording main tasks, detours, main-first/detour-first decisions, and resume targets.
  Validation: state transition smoke tests with `start`, `status`, `detour propose`, `detour defer`, `detour start`, `complete`, `resume`, and invalid transition cases.

- `.mise/tasks/lib/shared.ts`  
  Shared launcher utilities.

- `.mise/tasks/lib/doctor.ts`  
  Shared doctor implementation.

### Sandbox Config

- `.mise.toml`  
  Project tool declarations. Currently declares Bun and Python.

- `requirements-harness.txt`  
  Python dependencies for harness validation tasks.

### Harness Scripts

- `scripts/harness/checkpoint.ts`
  Bun/TypeScript state manager for `.codex-harness/checkpoint.json`. It captures git state, task-flow summary, task-plan-loop summary, next action, and `active`/`consumed` checkpoint state, and emits continuation guidance that agents should translate into the next work proposal or plan.
  Discovery route: `.mise/tasks/checkpoint` points to this script; `harness_architect` discovery includes `scripts/harness/*`.
  Expected user/agent: parent Codex and harness agents guarding context boundaries and continuation points.
  Validation: run through the mise wrapper so the same command surface is used by agents; resume smoke tests should verify the structured `continuation` output.

- `scripts/harness/task-plan-loop.ts`  
  Bun/TypeScript state manager for persisted task-plan review loops. It is the only supported writer for `.codex-harness/task-plan-loop.json` and enforces loop bounds, terminal states, and invalid transition failures.
  Discovery route: `.mise/tasks/task-plan-loop` points to this script; `harness_architect` discovery includes `scripts/harness/*`.
  Expected user/agent: parent Codex and harness agents using review-loop planning.
  Validation: run through the mise wrapper so the same command surface is used by agents.

- `scripts/harness/task-flow.ts`
  Bun/TypeScript state manager for persisted main task and detour flow. It is the only supported writer for `.codex-harness/task-flow.json` and enforces single-active-task state, detour decisions, resume behavior, duplicate id rejection, and malformed state failures.
  Discovery route: `.mise/tasks/task-flow` points to this script; `harness_architect` discovery includes `scripts/harness/*`.
  Expected user/agent: parent Codex and harness agents coordinating detours without relying on chat memory.
  Validation: run through the mise wrapper so the same command surface is used by agents.

### Tracking Policy

- `.gitignore`  
  Controls local/runtime state ignore rules and project-scoped `.codex/` tracking exceptions.
  Discovery route: `harness_architect` boot discovery reads repository policy and inventory files before harness changes.
  Expected user/agent: parent Codex and harness agents checking tracking/ignore policy during audits and closeout.
  Validation: `git check-ignore` for local state and tracked Codex config/hook exceptions, plus final `git status --short`.

- `.codex-harness/`  
  Ignored local runtime state directory for harness workflows. Registered state files include `.codex-harness/checkpoint.json`, managed only by `scripts/harness/checkpoint.ts`, `.codex-harness/task-plan-loop.json`, managed only by `scripts/harness/task-plan-loop.ts`, and `.codex-harness/task-flow.json`, managed only by `scripts/harness/task-flow.ts`.
  Discovery route: `.gitignore`, this inventory, and the relevant state manager documentation.
  Expected user/agent: parent Codex and harness agents recovering or inspecting active local harness workflow state.
  Validation: `git check-ignore -v .codex-harness/checkpoint.json`, `git check-ignore -v .codex-harness/task-plan-loop.json`, and `git check-ignore -v .codex-harness/task-flow.json`.

### Harness Documentation

- `docs/harness.md`  
  Current PromptOps/yolobox harness notes.

- `docs/harness-inventory.md`  
  This registry.

- `docs/harness-change-protocol.md`  
  Required process for adding or changing harness specs.

- `docs/harness-task-boundary.md`  
  Defines the task boundary workflow: `task-plan`, `task-start`, implementation, `task-end`, Stop dirty-state hook, and harness-audit follow-up.

### Demo-Project Documentation

- `docs/pixi-stack.md`  
  PixiJS rapid game prototyping framework research and design notes.

## Update Rule

Any harness spec change is incomplete until this inventory reflects:

- what changed
- where it lives
- who or what should use it
- how it is discovered
- how it was validated
