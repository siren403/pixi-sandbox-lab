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

### 4. End

Use `$task-end` before final response or commit closeout.

Classify dirty files as:

- intentional changes
- generated/runtime artifacts
- obvious temporary test artifacts
- unknown or user changes

Clean only artifacts that are clearly temporary and created by the current task, or that the user explicitly asked to clean.

Run relevant validation. Commit only when the user asked for commit closeout or clearly approved implementation with commit.

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
- commit hash, if committed
- remaining dirty files, if any
- final `git status --short`

The preferred final state after committed work is a clean working tree.
