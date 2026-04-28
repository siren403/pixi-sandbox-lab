# Codex Agent Spec Reference

Use this reference when creating or updating Codex custom agents.

## Official Model

Codex customization layers are complementary:

- `AGENTS.md`: project or repository instructions.
- Skills: reusable workflows with progressive disclosure.
- MCP: external tools and context servers.
- Plugins: installable distribution units for skills, apps, and MCP.
- Subagents/custom agents: spawned specialist agents that can carry their own configuration.

Official docs:

- Codex customization: https://developers.openai.com/codex/concepts/customization
- Codex subagents: https://developers.openai.com/codex/subagents
- Codex skills: https://developers.openai.com/codex/skills
- Codex plugins: https://developers.openai.com/codex/plugins

## Custom Agent Location

Use project-local custom agents for repo-specific specialists:

```text
.codex/agents/<agent-file>.toml
```

User-level agents may live under:

```text
~/.codex/agents/<agent-file>.toml
```

## Required Fields

Each standalone custom agent file must define:

```toml
name = "agent_name"
description = "Human-facing guidance for when Codex should use this agent."
developer_instructions = """
Core role instructions.
"""
```

`name` is the source of truth. Matching the filename to the name is a convention, not a requirement.

## Supported Configuration Fields

Custom agent files can include normal Codex config keys when the role needs them:

```toml
model = "gpt-5.4"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
nickname_candidates = ["Atlas", "Delta"]

[mcp_servers.example]
url = "https://example.com/mcp"

[[skills.config]]
path = ".agents/skills/example/SKILL.md"
enabled = true
```

Only set model, sandbox, MCP, or skills config when there is a clear reason.

## Claude Code Mapping

When translating Claude Code-style agents into Codex:

| Claude Code concept | Codex equivalent |
| --- | --- |
| `CLAUDE.md` project instructions | `AGENTS.md` |
| `.claude/agents/*.md` specialist agents | `.codex/agents/*.toml` custom agents |
| slash commands / reusable workflows | skills or prompts |
| MCP config | MCP config, optionally packaged in plugins |
| reusable team setup | plugin with skills/MCP/apps |

Keep Codex custom agents focused on spawnable roles. Put long reusable procedures into skills.
