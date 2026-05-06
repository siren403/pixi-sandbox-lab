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
  -> active-task manifest opened
  -> implementation
  -> task-end
  -> active-task manifest closed
  -> Stop dirty-state hook as a guardrail
```

Front guard hooks add early reminders before this flow can drift:

- `UserPromptSubmit` emits a short task-cycle reminder before handling each submitted prompt.
- `PreToolUse` emits a warn-only message before likely file edits, write-like shell commands, staging, or commits when no active task manifest is open.
- Read-only search/status commands should not warn.

These hooks do not replace approval. If `plan_reviewer` returns changes, present the revised plan to the user and wait for approval before `task-start` or file edits.

### 1. Plan

Use `$task-plan` before non-trivial implementation.

The plan must name:

- the feature or change
- the actual assigned agent or executor
- files in scope and out of scope
- validation
- closeout and commit expectations

For harness changes, `harness_architect` owns architecture/protocol fit and `plan_reviewer` reviews the plan before implementation.

`task-plan` is required for harness spec changes even when the visible edit is small. This includes skills, hooks, custom agents, MCP config, plugins, mise tasks, sandbox config, `scripts/harness/**`, `.codex/**`, `.agents/**`, and `docs/harness*.md`.

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

For approved implementation work, open an active task manifest:

```bash
mise run active-task -- start \
  --id <task-id> \
  --title "<task title>" \
  --in <path> \
  --out <path> \
  --validation "<command>"
```

The manifest is a local guardrail for the current editing session. It is not a long-running project tracker and does not replace `task-flow`, `task-plan-loop`, or `checkpoint`.

State file responsibilities:

- `.codex-harness/active-task.json`: current editing-session scope, validation, and closeout guardrail
- `.codex-harness/task-flow.json`: main task, detours, and resume hints across turns
- `.codex-harness/task-plan-loop.json`: persisted plan/review loop state
- `.codex-harness/checkpoint.json`: clean continuation checkpoint for context changes

Trivial one-line edits may omit an active task manifest at the parent agent's judgment. Do not use that exception for harness spec changes, multi-file changes, framework structure changes, or work that required `task-plan`.

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
- `resume` verifies the checkpoint, marks it `consumed`, increments `resume_count`, and prints continuation guidance.
- The continuation target is for the agent to translate into the next work proposal or plan, not a command the user is expected to run.
- `consumed` checkpoints remain on disk and may be overwritten by the next `create`.
- There is no `clear` command in v1.
- Creating a checkpoint requires a clean working tree.
- Creating over an `active` checkpoint requires `--force`.
- Resume does not automatically run or implement the next action.

Typical flow:

```text
work reaches a stable continuation point
  -> checkpoint created
  -> context clears or changes
  -> checkpoint resume verifies state
  -> checkpoint becomes consumed
  -> agent proposes or plans from the continuation target
  -> user approves, edits, or redirects that next work
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

It runs at turn end and warns when `git status --short` is dirty or when an active task manifest remains open. It does not automatically block, clean, commit, or decide whether a task is complete.

The Stop hook checks:

- dirty working tree without an active task manifest
- dirty files outside `active-task.scope.in` or matching `active-task.scope.out`
- active task manifest still open at turn end

If the Stop hook reports dirty state or an open active task, the next turn should use `$task-end`, close the manifest with `mise run active-task -- close`, or report why dirty files remain.

### Hook Limits

Hooks are deterministic reminders, not a complete enforcement boundary.

- `UserPromptSubmit` can remind the agent before a new user request is handled, but cannot decide the task scope.
- `PreToolUse` can catch common write paths such as `apply_patch`, write-like shell commands, `git add`, and `git commit`, but equivalent writes may still be possible through other tool paths.
- `Stop` remains the final dirty-state and scope-drift guardrail.

When hooks warn, the agent should pause and restore the task cycle rather than treating the warning as noise.

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
