# Codex Hooks Spec Reference

Use this reference when creating or updating Codex hook configuration and hook scripts.

Official docs:

- Hooks guide: https://developers.openai.com/codex/hooks
- Configuration reference: https://developers.openai.com/codex/config-reference

## Enabling Hooks

Codex hooks are enabled with:

```toml
[features]
codex_hooks = true
```

Hooks can be configured inline in `config.toml` under `[hooks]` or loaded through `hooks.json`, using the same event schema.

## Supported Events

Common events listed in the official docs/config reference include:

- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `PermissionRequest`
- `Stop`

Managed enterprise hooks use the same event schema and may configure `hooks.managed_dir` or `hooks.windows_managed_dir`.

## Hook Handler Shape

Command hooks are currently supported. Prompt and agent hook handlers may be parsed but skipped in managed config, so use command hooks unless official docs for the current environment prove otherwise.

Inline TOML example:

```toml
[features]
codex_hooks = true

[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = '/usr/bin/python3 "$(git rev-parse --show-toplevel)/.codex/hooks/pre_tool_use_policy.py"'
timeout = 30
statusMessage = "Checking Bash command"
```

For repo-local hooks, resolve from the git root instead of relying on relative paths. Codex may start from a subdirectory.

## Command Runtime

- Commands run with the session `cwd`.
- `timeout` is in seconds.
- If `timeout` is omitted, Codex uses `600` seconds.
- `statusMessage` is optional.
- Every command hook receives one JSON object on stdin.

Common input fields:

| Field | Meaning |
| --- | --- |
| `session_id` | Current session or thread id |
| `transcript_path` | Path to transcript file, if any |
| `cwd` | Working directory for the session |
| `hook_event_name` | Current hook event |
| `model` | Active model slug |

Turn-scoped hooks may also include `turn_id`.

## Output Semantics

For `SessionStart`, `UserPromptSubmit`, and `Stop`, JSON stdout may include:

```json
{
  "continue": true,
  "stopReason": "optional",
  "systemMessage": "optional",
  "suppressOutput": false
}
```

`SessionStart` can also add extra developer context through `hookSpecificOutput.additionalContext`.

`PreToolUse` and `PermissionRequest` support `systemMessage`, but not `continue`, `stopReason`, or `suppressOutput`.

`PostToolUse` supports `systemMessage`, `continue: false`, and `stopReason`.

Exit `0` with no output is treated as success and Codex continues.

## Limits

The official docs call `PreToolUse` a guardrail rather than a complete enforcement boundary because equivalent work may be possible through another tool path. Use hooks to catch and surface violations, but pair them with `AGENTS.md`, skills, custom agents, and closeout checks for reliable workflow hygiene.
