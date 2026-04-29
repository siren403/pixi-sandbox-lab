# Task Boundary Workflow

This document defines how work starts, proceeds, and ends in this repository.

The goal is not to add ceremony to small edits. The goal is to keep non-trivial harness and project work understandable, reviewable, and clean.

## When To Use The Flow

Use the full task boundary flow for:

- harness changes
- skill, hook, custom agent, MCP, plugin, or mise task changes
- multi-file documentation changes
- PixiJS/demo implementation work with unclear scope
- any task where dirty state or ownership could become ambiguous

For trivial one-line edits, use judgment, but still close with `git status --short`.

## Standard Flow

```text
task-plan
  -> plan-reviewer, when non-trivial
  -> task-start
  -> implementation
  -> task-end
  -> Stop dirty-state hook as a guardrail
```

### 1. Plan

Use `$task-plan` before non-trivial implementation.

The plan must name:

- the feature or change
- the actual assigned agent or executor
- files in scope and out of scope
- validation
- closeout and commit expectations

For harness changes, `harness_architect` owns architecture/protocol fit and `plan_reviewer` reviews the plan before implementation.

### 2. Start

Use `$task-start` immediately before editing.

Record:

- branch
- HEAD
- existing `git status --short`
- intended file scope
- validation plan
- blockers before editing

If existing dirty files overlap the intended scope, stop and ask.

### 3. Implement

Keep implementation within the approved scope.

If the task expands into new skills, hooks, agents, tasks, MCP config, or app/demo code that was not planned, stop and re-plan.

### Detours

A `detour` is a temporary side path discovered while a main task is being planned or implemented. Use this term instead of `branch` so it is not confused with Git branches.

Use `task-flow` when a detour needs to be remembered across turns, commits, context compaction, or session restart:

```bash
mise run task-flow -- status
```

Decision policy:

- `main-first` is the default. Record or defer the detour and keep the main task moving.
- `detour-first` is for blockers. Pause the main task and handle the detour first only when it blocks correctness, validation, clean closeout, reliable agent coordination, or the user explicitly chooses it.

Trigger types:

- `explicit`: the user directly asks to handle, defer, or resume a detour.
- `agent-detected`: an agent finds a prerequisite, harness gap, or workflow risk.
- `policy`: harness policy requires a pause, such as validation failure, dirty-state risk, plan-review block, or scope drift.

Typical flow:

```text
main task active
  -> detour proposed
  -> main-first: detour deferred, main continues
  -> detour-first: main paused, detour active
  -> detour completed
  -> main resumed
```

Do not use a detour to silently expand scope. If the detour requires files outside the approved plan, stop and re-plan before editing those files.

### Checkpoints

A checkpoint records the current continuation point so a later context can resume consistently without relying on chat memory.

Use `$checkpoint` or `mise run checkpoint -- ...` before clearing context, opening a new session, or handing work to another continuation context.

Checkpoint policy:

- `$checkpoint` runs auto mode.
- A `SessionStart` hook may remind the session when an active checkpoint exists.
- `active` means the checkpoint has not yet been used to enter a continuation context.
- `resume` verifies the checkpoint, marks it `consumed`, increments `resume_count`, and prints `next_action`.
- `consumed` checkpoints remain on disk and may be overwritten by the next `create`.
- There is no `clear` command in v1.
- Creating a checkpoint requires a clean working tree.
- Creating over an `active` checkpoint requires `--force`.
- Resume does not automatically run the next action.

Typical flow:

```text
work reaches a stable continuation point
  -> checkpoint created
  -> context clears or changes
  -> checkpoint resume verifies state
  -> checkpoint becomes consumed
  -> user chooses whether to run next_action
```

### 4. End

Use `$task-end` before final response or commit closeout.

Classify dirty files as:

- intentional changes
- generated/runtime artifacts
- obvious temporary test artifacts
- unknown or user changes

Clean only artifacts that are clearly temporary and created by the current task, or that the user explicitly asked to clean.

Run relevant validation. For an approved implementation task, commit the intentional changes as part of closeout by default.

Stop before committing when:

- the user explicitly asked not to commit
- validation failed
- dirty files include unknown or user changes
- the implementation scope no longer matches the approved plan
- the work was exploratory and did not have prior implementation approval

### 5. Stop Hook

The Codex `Stop` hook is a guardrail, not a task manager.

It runs at turn end and warns when `git status --short` is dirty. It does not automatically block, clean, commit, or decide whether a task is complete.

If the Stop hook reports dirty state, the next turn should use `$task-end` or report why dirty files remain.

## Harness Audit Follow-Up

`$harness-audit` is read-only by default.

If audit findings require a harness spec change, the follow-up should be:

```text
harness-audit finding
  -> suggested $task-plan <follow-up task>
  -> user chooses/approves plan target
  -> task-plan
  -> task-start
  -> implementation
  -> task-end
```

If the user says "proceed" after an audit finding, proceed to the recommended `$task-plan` step first. Do not implement the fix unless the user explicitly says to apply or implement it.

## Closeout Expectations

At task closeout, report:

- validation run and result
- files changed
- files cleaned up
- commit hash, or why commit was intentionally skipped
- remaining dirty files, if any
- final `git status --short`

The preferred final state after committed work is a clean working tree.
