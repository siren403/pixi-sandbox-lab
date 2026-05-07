# Harness Inventory

This document is the registry of harness-level components in this repository.

Update it whenever adding, removing, or changing a harness spec: Codex custom agents, skills, hooks, MCP config, plugins, mise tasks, sandbox config, or harness documentation.

## Discovery Paths

Harness architects should inspect these paths at the start of harness work:

```text
AGENTS.md
README.md
DESIGN.md
.agents/skills/*/SKILL.md
.agents/skills/*/agents/openai.yaml
.agents/skills/*/references/*
.codex/agents/*.toml
.codex/config.toml
.codex/hooks/*
.serena/project.yml
.serena/memories/*
.mise.toml
.mise/tasks/*
.mise/tasks/lib/*
scripts/harness/*
docs/harness*.md
docs/sandbox*.md
docs/pixi*.md
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

- `.agents/skills/pixi-surface/SKILL.md`
  Provides the workflow for planning or reviewing PixiJS surface work against `DESIGN.md`, `docs/pixi-stack.md`, and `docs/pixi-status.md`; includes Pixi API surface heuristics such as namespace symmetry, public/raw separation, and one-shot scene args versus long-lived store boundaries.
  Discovery route: `pixi_surface_architect` reads this skill first; `harness_architect` boot discovery reads `.agents/skills/*/SKILL.md`.
  Expected user/agent: parent Codex and Pixi surface specialists planning or reviewing browser game surface work.
  Validation: `mise run validate-skills`.

- `.agents/skills/pixi-surface/agents/openai.yaml`
  UI metadata for the `pixi-surface` skill.

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
  Provides the pre-implementation planning procedure with feature summary, concrete assigned agents, scope, validation, closeout, plan review, optional persisted review-loop state, and the delegation/review heuristic for cost-efficient scoped-worker implementation plus specialist review of contract-bearing work.
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

- `.codex/agents/pixi-surface-architect.toml`
  Project-local custom agent responsible for reviewing PixiJS app surface architecture and related scene-authoring API surface against the canonical surface contract in `DESIGN.md`.
  Discovery route: `harness_architect` boot discovery reads `.codex/agents/*.toml`; parent Codex may spawn this specialist for Pixi surface planning or review.
  Expected user/agent: parent Codex and Pixi implementation agents needing specialist review before surface/UI changes.
  Validation: TOML syntax smoke check and `mise run validate-skills` for its supporting skill.

- `.codex/agents/game-rules-architect.toml`
  Project-local custom agent responsible for reviewing card, board, and lightweight game sample rules, including scoring, turn flow, state ownership, seeded RNG, deterministic testing, and rule/runtime boundaries.
  Discovery route: `harness_architect` boot discovery reads `.codex/agents/*.toml`; parent Codex may spawn this specialist before implementing rule-bearing game samples such as Balatro-lite, Yacht-lite, or board-game prototypes.
  Expected user/agent: parent Codex, Pixi implementation agents, and scoped workers that need rule architecture or validation strategy before game sample implementation.
  Validation: TOML syntax smoke check, required-field check for `name`, `description`, and `developer_instructions`, plus inventory reference search.

- `.codex/agents/context-engineer.toml`
  Project-local custom agent responsible for context architecture, source-of-truth boundaries, prompt/doc refactors, task-specific context bundles, and stale or conflicting instruction detection.
  Discovery route: `harness_architect` boot discovery reads `.codex/agents/*.toml`; parent Codex may spawn this specialist before documentation, prompt, skill, custom-agent, checkpoint, or source-of-truth refactors.
  Expected user/agent: parent Codex, harness agents, and documentation/refactor workflows that need context-loading strategy or instruction-boundary review.
  Validation: TOML syntax smoke check and reference search for required context files.

- `.codex/agents/scoped-worker.toml`
  Project-local low-cost implementation worker for narrow, already-designed tasks with explicit file ownership and validation commands.
  Discovery route: `harness_architect` boot discovery reads `.codex/agents/*.toml`; parent Codex may spawn this worker after architecture, planning, or specialist review has defined the implementation boundary.
  Expected user/agent: parent Codex and specialist agents that need bounded code or documentation edits without spending a high-reasoning specialist on mechanical implementation.
  Validation: TOML syntax smoke check and reference search for required context files.

### Codex Hooks

- `.codex/config.toml`  
  Project-scoped Codex config. Enables `codex_hooks`, declares the Serena MCP server, and registers `SessionStart`, `UserPromptSubmit`, `PreToolUse`, and `Stop` guardrail hooks.
  Discovery route: `harness_architect` boot discovery reads `.codex/config.toml`.

- `.codex/hooks/checkpoint-session-start.ts`
  Bun/TypeScript command hook for the Codex `SessionStart` event. Resolves the git root from the hook `cwd`, reads `.codex-harness/checkpoint.json`, and emits a non-blocking `systemMessage` when an active checkpoint should be resumed.
  Event: `SessionStart`. Matcher: none. Behavior: warn-only, non-blocking, read-only.
  Expected user/agent: all Codex sessions in this project once project hooks are active.
  Validation: smoke-tested with active, consumed, missing, malformed, and subdirectory `cwd` checkpoint cases.

- `.codex/hooks/task-cycle-front-guard.ts`
  Bun/TypeScript command hook for the Codex `UserPromptSubmit` event. Emits a concise task-cycle reminder before a submitted prompt is handled: non-trivial work should flow through task-plan, user approval, task-start, active-task manifest, implementation, validation, and task-end.
  Event: `UserPromptSubmit`. Matcher: none. Behavior: warn-only reminder.
  Expected user/agent: parent Codex sessions in this project, especially when continuing after plan review or repeated "next/continue" prompts.
  Validation: smoke-tested with representative `UserPromptSubmit`, `SessionStart`, and malformed JSON inputs.

- `.codex/hooks/task-boundary-pre-tool.ts`
  Bun/TypeScript command hook for the Codex `PreToolUse` event. Detects common write paths such as `apply_patch`, write-like shell commands, and git staging/commit commands, then warns when no active task manifest is open. Read-only search/status commands should produce no warning.
  Event: `PreToolUse`. Matcher: none. Behavior: warn-only, non-blocking.
  Expected user/agent: parent Codex and spawned agents using project hooks before file edits, staging, commits, or write-like shell commands.
  Validation: smoke-tested with write/no-active warning, read-only no-warning, active-task no-warning, and malformed JSON cases.

- `.codex/hooks/dirty-state-stop.ts`  
  Bun/TypeScript command hook for the Codex `Stop` event. Runs `git status --short` from the git root, reads `.codex-harness/active-task.json` when present, emits non-blocking `systemMessage` warnings for dirty state, missing active task manifests, dirty paths outside active task scope, and open active task manifests, and exits cleanly on git inspection errors with a warning.
  Event: `Stop`. Matcher: none. Behavior: warn-only, non-blocking.
  Expected user/agent: all Codex sessions in this project once project hooks are active.
  Validation: smoke-tested with clean, dirty/no active task, dirty/scope mismatch, and open active task cases.

When hooks are added, register:

- hook config location, usually `.codex/config.toml`
- hook script path under `.codex/hooks/`
- event name and matcher
- whether the hook warns, blocks, or adds context

### MCP Config

- `.codex/config.toml` (`mcp_servers.serena`)
  Project-scoped Codex MCP declaration for Serena semantic code analysis in this repository.
  Transport: stdio, launched with `serena start-mcp-server --project-from-cwd --context=codex`.
  Discovery route: `harness_architect` boot discovery reads `.codex/config.toml`; Codex sessions may need to restart before newly configured MCP tools are exposed.
  Expected user/agent: parent Codex and coding agents doing symbol-aware codebase exploration or refactors inside this yolobox project.
  Required assumptions: sandbox-local `uv` and `serena` command availability, network access for first install, and project CWD detection through `.git`.
  Validation: `mise run setup-serena`, `mise run check-serena`, and `codex mcp list`.

- `.serena/project.yml`
  Serena project metadata for this repository. Declares the project name, TypeScript language backend, encoding, ignore behavior, and tool inclusion/exclusion defaults.
  Discovery route: Serena loads this file after project activation; `harness_architect` discovery includes `.serena/project.yml`.
  Expected user/agent: parent Codex and Serena-backed coding agents using symbol-aware codebase exploration.
  Validation: `mise run check-serena` and Serena `get_current_config`.

- `.serena/memories/*.md`
  Serena project onboarding memories for project overview, code structure, style conventions, suggested commands, and task completion checks.
  Discovery route: Serena memory tools (`list_memories`, `read_memory`) after project activation; `harness_architect` discovery includes `.serena/memories/*`.
  Expected user/agent: parent Codex and Serena-backed coding agents that need lightweight project orientation before analysis.
  Validation: Serena `check_onboarding_performed` and `list_memories`.

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

- `.mise/tasks/help`
  Lists project-local mise task shortcuts for the yolobox harness.

- `.mise/tasks/active-task`
  Official mise execution surface for the active task guardrail. Agents should call `mise run active-task -- <command>` instead of invoking the Bun script directly.
  Discovery route: `harness_architect` boot discovery reads `.mise/tasks/*` and this inventory.
  Expected user/agent: parent Codex and harness agents opening, inspecting, and closing the current editing-session manifest before and after implementation work.
  Validation: state transition smoke tests with `status`, `start`, `close`, active overwrite refusal, and forced replacement.

- `.mise/tasks/setup-browser`
  Prepares the sandbox for headless browser validation. Runs Bun dependency install, project-local Playwright Chromium install, Chromium Linux dependency install, and the browser environment smoke check.
  Discovery route: `harness_architect` boot discovery reads `.mise/tasks/*` and this inventory.
  Expected user/agent: parent Codex and harness agents preparing browser app/game validation before implementation or E2E runs.
  Validation: `mise run setup-browser`.

- `.mise/tasks/check-browser`
  Verifies the prepared headless browser environment without changing app code. Checks project dependencies, project-local Playwright browser installation, Playwright version, and a headless Chromium launch. If Chromium fails because sandbox OS packages are missing after a fresh container start, it reports `mise run setup-browser` as the recovery command.
  Discovery route: `harness_architect` boot discovery reads `.mise/tasks/*` and this inventory.
  Expected user/agent: parent Codex and harness agents confirming browser validation readiness before app work.
  Validation: `mise run check-browser`.

- `.mise/tasks/setup-serena`
  Prepares the sandbox-local Serena MCP analysis environment. Installs `serena-agent` through `uv tool install` and smoke-checks the `serena` CLI plus MCP server help output.
  Discovery route: `harness_architect` boot discovery reads `.mise/tasks/*` and this inventory.
  Expected user/agent: parent Codex and harness agents preparing symbol-aware code analysis for this project.
  Validation: `mise run setup-serena`.

- `.mise/tasks/check-serena`
  Verifies the sandbox-local Serena MCP analysis environment without changing project code. Checks `uv`, `serena`, Serena MCP server help, and the Codex MCP listing command.
  Discovery route: `harness_architect` boot discovery reads `.mise/tasks/*` and this inventory.
  Expected user/agent: parent Codex and harness agents confirming Serena readiness before codebase analysis or refactor work.
  Validation: `mise run check-serena`.

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

- `scripts/harness/active-task.ts`
  Bun/TypeScript state manager for `.codex-harness/active-task.json`. It records the current editing-session task id, title, git branch, HEAD, in/out scope, validation commands, active/closed status, and closeout metadata for Stop hook guardrails.
  Discovery route: `.mise/tasks/active-task` points to this script; `harness_architect` discovery includes `scripts/harness/*`.
  Expected user/agent: parent Codex and harness agents creating a local guardrail before editing and closing it during task-end.
  Validation: run through the mise wrapper so the same command surface is used by agents.

- `scripts/harness/checkpoint.ts`
  Bun/TypeScript state manager for `.codex-harness/checkpoint.json`. It captures git state, task-flow summary, task-plan-loop summary, next action, and `active`/`consumed` checkpoint state, and emits continuation guidance that agents should translate into the next work proposal or plan.
  Discovery route: `.mise/tasks/checkpoint` points to this script; `harness_architect` discovery includes `scripts/harness/*`.
  Expected user/agent: parent Codex and harness agents guarding context boundaries and continuation points.
  Validation: run through the mise wrapper so the same command surface is used by agents; resume smoke tests should verify the structured `continuation` output.

- `scripts/harness/browser-env.ts`
  Bun/TypeScript helper for headless browser validation setup and checks. It is invoked by `.mise/tasks/setup-browser` and `.mise/tasks/check-browser`.
  Discovery route: `.mise/tasks/setup-browser`, `.mise/tasks/check-browser`, and harness script discovery.
  Expected user/agent: parent Codex and harness agents preparing or verifying browser-app validation in the sandbox.
  Validation: `mise run setup-browser` and `mise run check-browser`.

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
  Ignored local runtime state directory for harness workflows. Registered state files include `.codex-harness/active-task.json`, managed only by `scripts/harness/active-task.ts`, `.codex-harness/checkpoint.json`, managed only by `scripts/harness/checkpoint.ts`, `.codex-harness/task-plan-loop.json`, managed only by `scripts/harness/task-plan-loop.ts`, and `.codex-harness/task-flow.json`, managed only by `scripts/harness/task-flow.ts`.
  Discovery route: `.gitignore`, this inventory, and the relevant state manager documentation.
  Expected user/agent: parent Codex and harness agents recovering or inspecting active local harness workflow state.
  Validation: `git check-ignore -v .codex-harness/active-task.json`, `git check-ignore -v .codex-harness/checkpoint.json`, `git check-ignore -v .codex-harness/task-plan-loop.json`, and `git check-ignore -v .codex-harness/task-flow.json`.

### Harness Documentation

- `docs/harness.md`  
  Current PromptOps/yolobox harness notes, including headless browser validation guidance for sandbox browser apps and games.

- `docs/harness-inventory.md`  
  This registry.

- `docs/harness-change-protocol.md`  
  Required process for adding or changing harness specs.

- `docs/harness-task-boundary.md`  
  Defines the task boundary workflow: `task-plan`, `task-start`, implementation, `task-end`, Stop dirty-state hook, and harness-audit follow-up.

- `docs/harness-task-loop-implementation.md`
  Portable implementation spec for applying the task loop guardrail in another agent harness, including state files, command surface, hook set, agent instructions, Claude Code mapping, adoption phases, validation checklist, and first-cut rollout scope.
  Discovery route: `harness_architect` boot discovery reads `docs/harness*.md`; users may hand this document to another project for pre-implementation review.
  Expected user/agent: parent Codex, harness architects, and external harness implementers evaluating task-loop adoption.
  Validation: documentation reference checks, `git diff --check`, and `mise run validate-skills`.

### Demo-Project Documentation

- `DESIGN.md`
  Canonical Pixi surface design-system contract for tokens, layout policy, safe area, component contracts, and agent-readable visual rules.

- `docs/pixi-framework.md`
  PixiJS prototype framework quick start, runtime API, implemented architecture, and current boundaries.

- `docs/pixi-stack.md`  
  PixiJS rapid game prototyping framework architecture, research, and design rationale.

- `docs/pixi-status.md`
  Current PixiJS demo implementation and validation status.

## Update Rule

Any harness spec change is incomplete until this inventory reflects:

- what changed
- where it lives
- who or what should use it
- how it is discovered
- how it was validated
