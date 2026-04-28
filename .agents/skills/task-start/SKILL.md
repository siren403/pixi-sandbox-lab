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

5. Stop and ask before editing if:
   - Existing dirty files overlap the intended scope.
   - The task scope is unclear.
   - The baseline cannot be inspected.

6. Begin implementation only after the baseline and scope are clear.

## Output Shape

Report:

- Task summary
- Branch and HEAD
- Existing dirty state
- Intended file scope
- Validation plan
- Any blockers before editing
