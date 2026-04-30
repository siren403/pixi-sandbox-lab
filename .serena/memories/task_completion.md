# Task Completion Checklist

Before editing non-trivial work:
- Use `task-plan` for planning when scope is non-trivial, especially harness changes.
- Use `task-start` immediately before editing to record branch, HEAD, dirty state, intended file scope, validation, and blockers.

Before final response:
- Run validation that directly proves the changed behavior.
- For Pixi runtime/UI changes, typical validation is `bun run build:demo`, `bun run test:e2e`, and `bun run build:release` when relevant.
- For browser environment changes, use `mise run setup-browser` and/or `mise run check-browser`.
- For Serena MCP changes, use `mise run setup-serena`, `mise run check-serena`, and `codex mcp list` / `codex mcp get serena --json`.
- For skill changes, use `mise run validate-skills`.
- For hook changes, smoke-test the hook command with representative JSON stdin.
- Always run `git diff --check` before committing when files changed.

Closeout:
- Use `task-end` for cleanup/classification/validation/commit closeout.
- Approved implementation tasks should be committed by default after validation passes.
- Do not commit if validation fails, unknown/user dirty files are present, or scope drift occurred.
- Final state should normally be `git status --short` clean after commit.
- Report validation results, cleaned files if any, commit hash/message, and any remaining dirty files.