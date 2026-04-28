# Harness Inventory

This document is the registry of harness-level components in this repository.

Update it whenever adding, removing, or changing a harness spec: Codex custom agents, skills, hooks, MCP config, plugins, mise tasks, sandbox config, or harness documentation.

## Discovery Paths

Harness architects should inspect these paths at the start of harness work:

```text
AGENTS.md
README.md
.agents/skills/*/SKILL.md
.agents/skills/*/references/*
.codex/agents/*.toml
.codex/config.toml
.codex/hooks/*
.mise.toml
.mise/tasks/*
.mise/tasks/lib/*
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

- `.agents/skills/hook-creator/SKILL.md`  
  Creates or updates Codex lifecycle hooks from official hook/config specs.

- `.agents/skills/hook-creator/references/codex-hooks-spec.md`  
  Local reference for Codex hook events, command hook shape, stdin/stdout semantics, and guardrail limits.

### Codex Custom Agents

- `.codex/agents/harness-architect.toml`  
  Project-local custom agent responsible for cloud sandbox harness architecture, agent strategy, skills, hooks, MCP integration, and documentation boundaries.

### Codex Hooks

- None yet.

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
  Use the project-scoped mise Python runtime and `.venv` to run Codex skill validation.

- `.mise/tasks/lib/shared.ts`  
  Shared launcher utilities.

- `.mise/tasks/lib/doctor.ts`  
  Shared doctor implementation.

### Sandbox Config

- `.mise.toml`  
  Project tool declarations. Currently declares Bun and Python.

- `requirements-harness.txt`  
  Python dependencies for harness validation tasks.

### Harness Documentation

- `docs/harness.md`  
  Current PromptOps/yolobox harness notes.

- `docs/harness-inventory.md`  
  This registry.

- `docs/harness-change-protocol.md`  
  Required process for adding or changing harness specs.

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
