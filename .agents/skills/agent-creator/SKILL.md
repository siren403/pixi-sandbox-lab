---
name: agent-creator
description: Create or update Codex custom agents and their supporting skills for project-specific specialist roles. Use when asked to design an agent, subagent, expert role, steward, architect, reviewer, explorer, worker specialization, or to translate Claude Code-style agent/harness concepts into Codex custom agent, skill, plugin, MCP, and AGENTS.md structures.
---

# Agent Creator

## Quick Start

Create Codex specialist behavior with the smallest durable surface that fits the request:

1. Use `AGENTS.md` for repo-wide standing instructions.
2. Use a skill when the request is mainly a reusable workflow or domain procedure.
3. Use a custom agent when the request needs a spawnable specialist role with its own instructions, model settings, sandbox mode, MCP servers, or skill config.
4. Use a plugin only when the user wants to package skills, MCP servers, apps, or hooks for reuse across projects.

When creating a custom agent, read `references/codex-agent-spec.md` first.

## Workflow

1. Clarify the role boundary from local project context. Prefer existing docs such as `AGENTS.md`, `README.md`, and `docs/`.
2. Decide whether the durable artifact is a skill, a custom agent, or both.
3. For a skill, create `SKILL.md` with concise workflow instructions and optional `references/`.
4. For a custom agent, create `.codex/agents/<agent-name>.toml`.
5. Keep agent names stable and machine-friendly: lowercase snake_case in `name`, hyphen-case filenames are acceptable.
6. Set `description` to tell the parent agent when to use the custom agent.
7. Put role behavior in `developer_instructions`, including files to read first, allowed scope, delegation style, and output expectations.
8. Configure sandbox or MCP only when the role genuinely needs it.
9. Validate TOML syntax and skill frontmatter after editing.

## Agent Design Rules

- Make each custom agent narrow and opinionated.
- Do not encode broad repo policy in a custom agent if it belongs in `AGENTS.md`.
- Do not make an agent responsible for both exploration and implementation unless the workflow really needs that coupling.
- Prefer read-only agents for research, architecture review, and evidence gathering.
- Prefer workspace-write agents only when the role is expected to edit files.
- Give implementation agents clear ownership boundaries and tell them not to revert unrelated work.
- Use skills to provide reusable procedures that multiple custom agents may share.

## Recommended Agent Template

```toml
name = "example_agent"
description = "When to use this agent and what it is responsible for."
model_reasoning_effort = "medium"
sandbox_mode = "read-only"

developer_instructions = """
Read AGENTS.md first, then inspect only the files needed for the task.
Stay within the role boundary described by this agent.
Return concise findings, changed files, and unresolved risks.
"""
```

## Validation

Run these checks after creating or updating artifacts:

```bash
python3 - <<'PY'
import tomllib
from pathlib import Path
p = Path(".codex/agents/<agent-file>.toml")
data = tomllib.loads(p.read_text())
missing = [k for k in ("name", "description", "developer_instructions") if not data.get(k)]
assert not missing, f"missing required fields: {missing}"
print("OK", data["name"])
PY
python3 /home/yolo/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/<skill-name>
```

If `quick_validate.py` cannot import `yaml`, install or provide PyYAML before relying on that validator.
