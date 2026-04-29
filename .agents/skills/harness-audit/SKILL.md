---
name: harness-audit
description: Audit this repository's harness inventory, discovery paths, Codex skills, custom agents, hooks, mise tasks, validation commands, git ignore/tracking policy, and clean-state readiness. Use when asked to audit, inspect, verify, or check harness consistency, or before/after adding harness specs such as skills, agents, hooks, MCP config, plugins, or tasks.
---

# Harness Audit

## Quick Start

Use this skill to inspect harness consistency. It is read-only by default.

Do not automatically fix findings. Report findings and recommended next fixes unless the user explicitly asks you to make changes.

## Audit Checklist

1. Inventory coverage:
   - List `.agents/skills/*/SKILL.md`.
   - List `.agents/skills/*/agents/openai.yaml`.
   - List `.agents/skills/*/references/*`.
   - List `.codex/agents/*.toml`.
   - List `.codex/config.toml` and `.codex/hooks/*`.
   - List `.mise/tasks/*` and `.mise/tasks/lib/*`.
   - Check that relevant components are registered in `docs/harness-inventory.md`.

2. Discovery coverage:
   - Check `docs/harness-inventory.md` discovery paths include the component classes being registered.
   - Check `.codex/agents/harness-architect.toml` boot discovery includes the same major paths.

3. Protocol coverage:
   - Check `docs/harness-change-protocol.md` still defines owner, plan review, inventory registration, validation, and closeout expectations.
   - Check non-trivial harness changes require `plan_reviewer`.

4. Validation:
   - Run `mise run validate-skills`.
   - Parse `.codex/agents/*.toml` if custom agents changed.
   - For hooks, run the hook command with representative JSON stdin when hook behavior changed.

5. Tracking and ignore policy:
   - Check project harness files are tracked or unignored as intended.
   - Check runtime/local state remains ignored.
   - Run `git status --short`.

## Follow-Up Flow

After reporting audit findings:

1. If there are no findings, stop after reporting residual risks.
2. If there are findings, convert them into candidate follow-up tasks.
3. If a fix changes harness specs, recommend `$task-plan <follow-up task>` before implementation.
4. Do not edit files directly from audit mode unless the user explicitly asks to apply a specific fix.
5. For each recommended fix, include:
   - Finding
   - Proposed task
   - Suggested skill, usually `$task-plan`
   - Why planning is or is not needed

## Output Format

Report:

- **Pass**: checks that passed.
- **Findings**: mismatches or risks.
- **Missing registrations**: files present but absent from inventory.
- **Validation run**: commands and results.
- **Recommended next fixes**: concrete follow-up actions.
- **Follow-up planning**: suggested `$task-plan ...` prompt when changes should go through the task planning flow.

If no issues are found, say so clearly and include residual risks.
