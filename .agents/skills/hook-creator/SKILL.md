---
name: hook-creator
description: Create or update Codex lifecycle hooks from the official hooks/config specification. Use when asked to design hooks, session-start checks, stop/end checks, dirty-state guardrails, PreToolUse/PostToolUse policies, PermissionRequest handling, or Codex hook-based harness automation.
---

# Hook Creator

## Quick Start

Use hooks for deterministic guardrails around Codex sessions and tool use. Do not use hooks as a replacement for project policy or workflow instructions:

- Put standing behavior rules in `AGENTS.md`.
- Put reusable human/agent procedures in skills.
- Put deterministic lifecycle checks in hooks.
- Put shell/Python implementation details in hook scripts.

Before creating hook config or scripts, read `references/codex-hooks-spec.md`.

## Workflow

1. Identify the lifecycle point:
   - `SessionStart`: load context or record initial state.
   - `UserPromptSubmit`: inspect or enrich user prompts.
   - `PreToolUse`: guard tool calls before execution.
   - `PostToolUse`: inspect results after execution.
   - `PermissionRequest`: handle approval requests.
   - `Stop`: run closeout checks before the agent stops.
2. Decide whether the hook should only warn, add context, or block continuation where supported.
3. Prefer command hooks with small scripts committed under `.codex/hooks/`.
4. Resolve repo-local scripts from the git root in config commands.
5. Keep hooks fast and deterministic; long reasoning belongs in a skill or custom agent.
6. Validate config syntax and run hook scripts locally with representative JSON stdin.

## Dirty-State Guardrail Pattern

For task-boundary hygiene, prefer this staged hook set:

1. `SessionStart`: record `git status --short`, branch, and HEAD into a session state file.
2. `PostToolUse`: after Bash or file-edit tools, update a lightweight dirty-state snapshot.
3. `Stop`: compare current dirty state to the recorded start state and emit a warning if unreported changes remain.

Do not rely on hooks alone for perfect enforcement. Official docs describe `PreToolUse` as a guardrail, not a complete enforcement boundary.

## Hook Script Rules

- Read one JSON object from stdin.
- Exit `0` for success.
- Emit JSON when the event supports structured output.
- Use `systemMessage` for warnings surfaced to the UI/event stream.
- Keep repo-local state under a dedicated harness directory such as `.codex-harness/`.
- Avoid modifying tracked project files from hooks unless the user explicitly wants generated artifacts committed.

## Validation

Check TOML config:

```bash
python3 - <<'PY'
import tomllib
from pathlib import Path
p = Path(".codex/config.toml")
if p.exists():
    tomllib.loads(p.read_text())
print("OK")
PY
```

Smoke-test a hook script:

```bash
printf '{"session_id":"test","cwd":"%s","hook_event_name":"Stop","model":"test"}\n' "$PWD" \
  | python3 .codex/hooks/<script>.py
```
