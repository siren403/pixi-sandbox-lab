---
name: task-end
description: End a work item safely after edits or a dirty-state hook warning. Use when asked to finish, wrap up, clean up, commit, close out, end a task, respond to a Codex Stop hook dirty-state warning, classify dirty files, remove obvious temporary artifacts, run final validation, or confirm the working tree is clean.
---

# Task End

## Quick Start

Use this skill at the end of a task or after the dirty-state Stop hook reports uncommitted changes.

Goal: classify the working tree, clean only safe temporary artifacts, run relevant validation, commit approved task work by default, and report the final state.

## Workflow

1. Inspect state:

```bash
git status --short
```

2. Classify each dirty path:
   - **Intentional changes**: files changed to satisfy the user request.
   - **Generated/runtime artifacts**: caches, logs, build output, or local state that should usually be ignored or removed.
   - **Obvious temporary test artifacts**: files created only for smoke tests, such as `.hook-smoke-test`.
   - **Unknown/user changes**: anything not clearly created by this task.

3. Clean only safe temporary artifacts:
   - Show the candidate cleanup list first in the working summary.
   - Remove a file only when it is clearly temporary and was created by the current task, or when the user explicitly requested cleanup.
   - Never delete unknown/user changes without asking.

4. Run relevant validation:
   - For skill changes, run `mise run validate-skills`.
   - For hook changes, run the hook command with representative JSON stdin.
   - For app/code changes, run the project-specific test/build command when available.
   - If validation cannot be run, report why.

5. Inspect the active task manifest:

```bash
mise run active-task -- status
```

Confirm that dirty files match the manifest scope. If intentional work is outside scope, stop before committing and report the scope drift.

6. Commit policy:
   - If the user approved implementation for a planned task and validation passed, commit the intentional changes as part of task closeout.
   - If the user explicitly asked not to commit, leave changes uncommitted and report the remaining status.
   - If validation failed, dirty files include unknown/user changes, or scope changed unexpectedly, stop before committing and report the blocker.
   - For exploratory edits without prior implementation approval, ask before committing unless the user already requested commit closeout.

7. Close the active task manifest after validation and commit decision:

```bash
mise run active-task -- close --reason "<validated and committed|validated without commit|blocked: reason>"
```

If no manifest exists for a trivial task, report that explicitly. Do not close an unrelated active task.

8. Confirm final state:

```bash
git status --short
```

Report whether the tree is clean. If it is not clean, list each remaining path and why it remains.

## Deletion Rules

Allowed without further confirmation:

- Temporary files created by the current validation step and named as such, for example `.hook-smoke-test`.
- Empty temporary directories created by the current validation step.

Ask before deleting:

- Files with ambiguous names.
- User-authored files.
- Generated files that may be meaningful artifacts.
- Any tracked file.

Never use broad destructive commands such as `git clean -fd`, `rm -rf .`, or reset/checkout commands for cleanup unless the user explicitly requested that exact destructive operation.

## Closeout Response

Include:

- Validation run and result.
- Files cleaned up.
- Files committed, including commit hash, or why commit was intentionally skipped.
- Active task manifest closeout result, or why no manifest was used.
- Remaining dirty files, if any.
- Final `git status --short` result.
