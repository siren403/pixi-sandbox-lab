# Harness Change Protocol

Use this protocol whenever adding, removing, or changing a harness spec.

Harness specs include:

- `AGENTS.md` policy
- Codex custom agents under `.codex/agents/`
- Codex skills under `.agents/skills/`
- Codex hooks under `.codex/hooks/` and `.codex/config.toml`
- MCP configuration
- plugins
- mise tasks
- yolobox or sandbox configuration
- harness documentation under `docs/harness*.md` or `docs/sandbox*.md`

## Owner

`harness_architect` is the gatekeeper for harness spec changes.

`plan_reviewer` reviews non-trivial harness implementation plans before execution.

The architect may use creator skills:

- custom agent changes: `agent-creator`
- hook changes: `hook-creator`
- skill changes: `skill-creator`
- plugin changes: `plugin-creator`

## Required Steps

1. **Classify the change**
   - Identify the spec type: policy, skill, agent, hook, MCP, plugin, task, sandbox config, or docs.
   - State the workflow need before creating new machinery.

2. **Use the right creator**
   - Use the matching creator skill when one exists.
   - Keep generated artifacts narrow and project-local unless user asks for global installation.

3. **Register the component**
   - Update `docs/harness-inventory.md`.
   - Include path, purpose, discovery route, expected user/agent, and validation note.

4. **Wire discovery**
   - Ensure `harness_architect` boot discovery covers the new path.
   - If broadly relevant, update `README.md` or `AGENTS.md`.
   - If role-specific, update the relevant `.codex/agents/*.toml`.

5. **Validate**
   - Prefer validation that proves the feature behavior.
   - For project-local harness scripts and hooks, prefer Bun/TypeScript and direct command smoke tests.
   - Use Python only for Python-native tools such as `quick_validate.py` or when explicitly justified.
   - Skills: check `SKILL.md` frontmatter has `name` and `description`; run `quick_validate.py` when PyYAML is available.
   - Hooks: run the hook command with representative JSON stdin and verify the user-visible outcome.
   - Tasks: run or dry-run the task where safe.
   - Skill validation: prefer `mise run validate-skills` so PyYAML and Python execution come from the project-scoped runtime.
   - Docs: search for stale paths or renamed files.

6. **Review the plan**
   - For non-trivial changes, ask `plan_reviewer` to review the implementation plan before editing files.
   - Do not proceed if the reviewer blocks on unclear ownership, overengineering, runtime mismatch, irrelevant validation, missing inventory update, or missing closeout.

7. **Report closeout**
   - Summarize changed harness components.
   - Note validation results.
   - Note unresolved risks or setup requirements.

## Boot Discovery Checklist

At the start of harness work, `harness_architect` should inspect:

```bash
find .agents/skills -maxdepth 3 -type f | sort
find .codex/agents -maxdepth 2 -type f | sort
find .codex/hooks -maxdepth 2 -type f | sort
test -f .codex/config.toml && sed -n '1,220p' .codex/config.toml
find .mise/tasks -maxdepth 2 -type f | sort
sed -n '1,220p' docs/harness-inventory.md
sed -n '1,220p' docs/harness-change-protocol.md
```

Missing directories are acceptable. New directories should be added to `docs/harness-inventory.md`.

## Implementation Plan Format

When `harness_architect` writes a plan for a harness change, the plan must identify who does what.

Use this format:

1. **Feature Summary**
   - Feature name.
   - Problem being solved.
   - Proposed change.
   - User-visible outcome.
   - Completion signal.

2. **Ownership**
   - Assigned agent names or concrete executor for each role, such as parent Codex, `harness_architect`, a named custom agent, or a spawned worker/explorer.
   - PM/parent agent: decision owner, sequencing, final integration, commit/closeout.
   - `harness_architect`: architecture, protocol compliance, inventory/discovery updates.
   - Creator skill or specialist agent: exact generation/research responsibility.
   - Worker/explorer agents: bounded implementation or read-only discovery tasks.
   - For cost control, assign bounded implementation to `scoped_worker` after architecture and expected behavior are clear.
   - For contract-bearing work, assign a domain specialist reviewer instead of relying on parent-only review. Examples: `pixi_surface_architect` for Pixi UI primitives/app surface, `harness_architect` for harness specs, and `plan_reviewer` for non-trivial implementation plans.
   - Parent Codex integrates worker output only after reviewer feedback is resolved or explicitly deferred with a reason.
   - File ownership for each role.

3. **Scope**
   - In scope.
   - Out of scope.
   - Files/directories to add or change.
   - Files/directories that must not be touched.

4. **Execution sequence**
   - Ordered steps.
   - Handoff points between roles.
   - Conditions for stopping or asking the user.

5. **Validation**
   - Feature behavior checks.
   - Smoke tests.
   - Relevant `mise` tasks.
   - Dirty-state or hook checks when applicable.

6. **Commit and clean-state closeout**
   - Commit grouping.
   - Commit message suggestion.
   - Required final `git status --short` check.

7. **Plan review**
   - `plan_reviewer` verdict for non-trivial changes.
   - Required plan edits before implementation.

## Anti-Patterns

- Adding a skill, hook, custom agent, MCP server, plugin, or task without inventory registration.
- Hiding project-wide policy inside one custom agent.
- Using hooks for complex reasoning that belongs in a skill.
- Using skills for deterministic checks that should be scripts or tasks.
- Using shell or Python for project-local harness logic when Bun/TypeScript is sufficient.
- Adding generic validation steps that do not prove the feature behavior.
- Changing demo-project code as part of a harness spec change unless explicitly requested.
