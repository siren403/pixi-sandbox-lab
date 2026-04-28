# Cloud Sandbox Project Lab

This repository is a workspace for developing real projects inside a cloud sandbox while growing the agent harness, skills, MCP integrations, and operational notes needed to make that workflow reliable.

The current demonstration project is a PixiJS-based rapid game prototyping stack inspired by LÖVE2D. It gives the sandbox work a concrete target: build something runnable, discover what the environment needs, and capture the lessons as reusable project infrastructure.

## Repository Map

- `AGENTS.md` - working instructions for agents in this repository
- `.agents/skills/agent-creator/` - project skill for designing Codex custom agents and related skill/plugin/MCP structure
- `.agents/skills/hook-creator/` - project skill for designing Codex lifecycle hooks from official specs
- `.codex/agents/harness-architect.toml` - Codex custom agent for sandbox harness architecture
- `docs/harness.md` - current PromptOps/yolobox agent harness notes
- `docs/harness-inventory.md` - registry of current harness components and discovery paths
- `docs/harness-change-protocol.md` - required process for adding or changing harness specs
- `docs/pixi-stack.md` - PixiJS prototype framework research and design notes

## Current Focus

1. Keep the cloud sandbox workflow reproducible.
2. Use the PixiJS prototype stack as the first hands-on sandbox project.
3. Add harness, skill, and MCP support only when real project work creates the need.
4. Split transitional notes into clearer domain documents as the workflow matures.

## First Milestone

Create a runnable browser demo inside the sandbox:

- TypeScript, Vite, and PixiJS scaffold
- small `createGame()` / `scene()` API sketch
- boot scene with a rendered object
- per-frame `update(dt)`
- keyboard-controlled movement
- notes on any sandbox networking or setup details discovered
