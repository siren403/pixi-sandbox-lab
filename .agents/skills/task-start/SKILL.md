---
name: task-start
description: Start a work item with a clear baseline before editing. Use when beginning an approved task, starting implementation after a plan, recording git state, noting existing dirty files, confirming intended scope, or preparing a task so task-end can distinguish pre-existing changes from new changes.
---

# Task Start

## Quick Start

Use this skill immediately before editing files for an approved task.

Goal: establish the starting baseline, intended scope, and existing dirty state.

## Workflow

1. Restate the approved task in one or two sentences.

2. Inspect baseline:

```bash
git status --short
git branch --show-current
git rev-parse --short HEAD
```

3. Classify existing dirty files, if any:
   - Pre-existing user changes
   - Generated/runtime artifacts
   - Unknown changes that require clarification

4. State intended scope:
   - Files/directories expected to change
   - Files/directories explicitly out of scope
   - Validation expected at the end

5. Create or update the active task manifest for approved implementation work:

```bash
mise run active-task -- start \
  --id <task-id> \
  --title "<task title>" \
  --in <path> \
  --out <path> \
  --validation "<command>"
```

Use repeated `--in`, `--out`, and `--validation` flags as needed. Use `--force` only when intentionally replacing a closed or stale manifest after inspecting `mise run active-task -- status`.

6. Stop and ask before editing if:
   - Existing dirty files overlap the intended scope.
   - The task scope is unclear.
   - The baseline cannot be inspected.
   - An active task manifest already exists for unrelated work.

7. Begin implementation only after the baseline, scope, and active task manifest are clear.

For trivial one-line edits, `task-start` may omit manifest creation at the parent agent's judgment. Do not use that exception for harness spec changes, multi-file changes, framework structure changes, or any work that already required `task-plan`.

## Output Shape

Report:

- Task summary
- Branch and HEAD
- Existing dirty state
- Intended file scope
- Validation plan
- Active task manifest status
- Any blockers before editing
