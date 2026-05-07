# Task Loop Implementation Spec

This document is a portable implementation spec for applying the task loop
guardrail to another agent harness. It is written for implementation planning,
not as a product-facing explanation.

The first adoption target is a Claude Code based project, but the model is
tool-agnostic: keep the state files, command surface, and lifecycle checks, then
map them to the host agent's hook and command system.

## Goal

Make non-trivial work follow an observable loop:

```text
task-plan -> approval -> task-start -> implementation -> validation -> task-end
```

The loop should reduce these failure modes:

- editing before scope is clear
- losing track of dirty files after context changes
- committing files outside the approved work item
- using expensive specialist agents for bounded mechanical implementation
- treating hook warnings as noise instead of restoring the task boundary

## Non-Goals

- Do not build a full project management system.
- Do not require the full loop for trivial one-line edits.
- Do not make hooks perform reasoning-heavy decisions.
- Do not block all writes perfectly. Hooks are guardrails, not a security
  boundary.
- Do not couple the implementation to this repository's PixiJS demo code.

## Required Concepts

### Task Plan

`task-plan` is a pre-editing plan for non-trivial work.

It must include:

- feature summary
- owner roles and concrete implementer
- files/directories in scope
- files/directories out of scope
- execution sequence
- validation commands
- commit/closeout expectation
- review requirement, if the work changes a public contract

Use a specialist reviewer for contract-bearing work. Use a low-cost scoped
worker for implementation only after the expected behavior, file ownership, and
validation commands are clear.

### Task Start

`task-start` records the local baseline immediately before editing.

It must capture:

- task id
- title
- branch
- HEAD
- initial `git status --short`
- in-scope paths
- out-of-scope paths
- validation commands
- active/closed state

The active task is an editing-session guardrail. It is not a backlog item.

### Task End

`task-end` closes the work item.

It must:

- inspect current dirty state
- classify files as intentional, generated/runtime, temporary, or unknown/user
  changes
- clean only obvious temporary artifacts created by the current task
- run validation
- compare dirty files and commits against the active task scope
- commit validated intentional work by default when implementation was approved
- close the active task state
- report final `git status --short`

### Detours

Use a persisted `task-flow` state only when a side path must survive turns,
context compaction, or session restart.

The default decision is `main-first`: record or defer the detour and keep the
main task moving. Use `detour-first` only when the detour blocks correctness,
validation, closeout, or reliable agent coordination.

### Checkpoints

Use a checkpoint state for context-boundary continuity. A checkpoint records the
next proposed action; it must not automatically perform that action after
resume.

Checkpoint creation should require a clean working tree.

## Minimum File Layout

Use project-local paths so the harness can be copied between repositories.

```text
AGENTS.md
.agent-harness/
  active-task.json        # ignored runtime state
  task-flow.json          # ignored runtime state
  task-plan-loop.json     # ignored runtime state, optional
  checkpoint.json         # ignored runtime state, optional
scripts/harness/
  active-task.ts
  task-flow.ts
  task-plan-loop.ts       # optional
  checkpoint.ts           # optional
  hooks/
    task-cycle-front-guard.ts
    task-boundary-pre-tool.ts
    dirty-state-stop.ts
docs/
  harness-task-loop.md
```

If the target project does not use TypeScript or Bun, keep the same command
semantics in the project's preferred runtime. The important boundary is the
state machine, not the language.

## Git Ignore Policy

Ignore local runtime state:

```gitignore
.agent-harness/
```

Track scripts, hooks, docs, and agent instructions:

```text
AGENTS.md
scripts/harness/**
docs/harness-task-loop.md
```

If the host tool stores hook config under a tracked directory such as
`.claude/`, `.codex/`, or `.config/agent/`, explicitly track the config and hook
scripts while keeping runtime state ignored.

## Command Surface

Expose commands through the project's normal task runner. In this repository the
wrapper is `mise`; in another project it may be `npm`, `pnpm`, `bun`, `just`, or
shell scripts.

Required commands:

```bash
task-loop active-task status
task-loop active-task start --id <id> --title <title> \
  --in <path> --out <path> --validation <command>
task-loop active-task close --reason <reason>
```

Recommended commands:

```bash
task-loop task-flow status
task-loop task-flow start --id <id> --title <title> --resume-hint <hint>
task-loop task-flow detour propose --id <id> --title <title> \
  --trigger explicit|agent-detected|policy --reason <reason>
task-loop task-flow detour defer --id <id> --decision main-first --reason <reason>
task-loop task-flow detour start --id <id> --decision detour-first --reason <reason>
task-loop task-flow complete --id <id> --commit <hash>
task-loop task-flow resume
```

Optional review-loop commands:

```bash
task-loop task-plan-loop start --target <target> --max-loops <n>
task-loop task-plan-loop status
task-loop task-plan-loop review --verdict approve|changes|block --notes <summary>
task-loop task-plan-loop revise
task-loop task-plan-loop approve
task-loop task-plan-loop stop --reason <reason>
```

Optional checkpoint commands:

```bash
task-loop checkpoint create --next-action <text>
task-loop checkpoint status
task-loop checkpoint verify
task-loop checkpoint resume
```

## Active Task State

Persist active task state as JSON. Use one writer script; do not let agents edit
the JSON directly.

Minimum schema:

```json
{
  "version": 1,
  "status": "active",
  "id": "short-task-id",
  "title": "Human readable task title",
  "branch": "main",
  "head": "abc1234",
  "started_at": "2026-05-07T00:00:00.000Z",
  "scope": {
    "in": ["docs/harness-task-loop.md"],
    "out": ["src", ".github/workflows"]
  },
  "validation": ["git diff --check"],
  "closed_at": null,
  "close_reason": null
}
```

Rules:

- `start` fails when another active task exists unless `--force` is provided.
- `start` records current branch, HEAD, and dirty state.
- `close` records close time and reason.
- `status` must be readable by humans and stable enough for hooks.
- Do not treat a closed task as permission to keep editing.

## Hook Set

Implement these hooks in warn-only mode first.

### User Prompt Submit

Purpose: remind the agent at the start of each prompt that non-trivial work must
go through the task loop.

Output should be short:

```text
Task loop reminder: non-trivial work should follow task-plan -> approval ->
task-start -> implementation -> validation -> task-end.
```

Do not make this hook decide whether the current prompt is trivial. That is an
agent responsibility.

### Pre Tool Use

Purpose: warn before likely writes when no active task is open.

Detect at least:

- patch/edit tools
- shell commands that write files
- `git add`
- `git commit`
- package install commands that modify lockfiles

Allow read-only commands:

- `git status`
- `git diff`
- `rg`
- `sed`
- `cat`
- `ls`
- test commands that do not write tracked files

Warning should say:

```text
Task boundary warning: write-like action detected without active task.
Confirm task-plan approval and run task-start before editing, unless this is a
trivial edit.
```

This hook is not a complete write barrier. It catches drift early.

### Stop

Purpose: warn before the agent ends while the tree is dirty or an active task is
still open.

Checks:

- `git status --short` is not empty and no active task exists
- dirty files are outside `scope.in`
- dirty files match `scope.out`
- active task remains open

Warning should include the next recovery action:

```text
Use task-end to classify dirty files, validate, commit or explain why not, and
close the active task.
```

## Agent Instructions

Add this to the project-level agent instruction file:

```markdown
## Task Loop

For non-trivial work, use the task loop:

1. Produce a task-plan before implementation.
2. Wait for user approval when the plan introduces non-obvious scope, public
   contract changes, or specialist review.
3. Run task-start immediately before editing and open an active task manifest.
4. Keep implementation within the approved in-scope paths.
5. Stop and re-plan if scope expands into hooks, skills, agents, public APIs,
   CI, deployment, or unrelated app code.
6. Run task-end before final closeout.
7. Commit validated approved work by default unless the user says not to, tests
   fail, dirty files include unknown/user changes, or scope drift occurred.

Use scoped low-cost workers only after the plan defines file ownership and
validation. Use specialists for architecture and review of contract-bearing
work.
```

## Claude Code Mapping

For a Claude Code based project, map the implementation like this:

- Put persistent policy in `AGENTS.md` or the repository's equivalent
  instruction file.
- Put slash commands or reusable prompts around `task-plan`, `task-start`, and
  `task-end` if the host supports them.
- Put deterministic lifecycle checks in Claude hooks or the host's hook
  equivalent.
- Keep runtime state in an ignored project-local directory.
- Use the existing project task runner for the command surface.
- Keep subagent delegation optional at first. The task loop must work even when
  a single agent performs the task.

Do not copy Codex-specific assumptions blindly:

- Hook event names may differ.
- JSON stdin/stdout contracts may differ.
- Subagent spawning and model selection may differ.
- Some tools may not expose a reliable pre-tool hook. In that case, prioritize
  start/stop checks and explicit commands.

## Adoption Phases

### Phase 1: Manual Loop

Implement:

- project instruction policy
- `active-task` state command
- `task-plan`, `task-start`, and `task-end` prompt/command templates
- ignored runtime state directory

Exit criteria:

- an agent can start a task, edit within scope, validate, close, and commit
- `active-task status` is readable and reliable
- no hooks are required yet

### Phase 2: Warn-Only Hooks

Implement:

- prompt-start reminder
- pre-write warning
- stop dirty-state warning

Exit criteria:

- hooks never mutate tracked files
- malformed hook input fails open with a warning
- read-only commands do not warn
- write-like commands without active task do warn
- dirty tree at stop produces a clear recovery message

### Phase 3: Delegation Heuristic

Implement:

- cost-aware role guidance
- scoped worker handoff template
- specialist review trigger list

Exit criteria:

- plans name parent, architect/specialist, implementer, reviewer, and file
  ownership
- bounded implementation can be handed to a low-cost worker without losing
  validation or review quality

### Phase 4: Continuity State

Implement only after the basic loop works:

- `task-flow` for detours
- checkpoint resume state
- persisted plan-review loop, if repeated plan review is common

Exit criteria:

- context restart can recover the next proposed action
- resume verifies branch, HEAD, and dirty state before suggesting work
- checkpoint resume does not automatically edit files

## Validation Checklist

Run these checks when implementing the task loop in a new project:

- start with clean git state
- create active task with in/out scope
- verify `status` output
- attempt a second `start` and confirm it refuses without `--force`
- run a read-only command and confirm no pre-write warning
- run a write-like dry smoke case and confirm warning when no active task exists
- create an in-scope dirty file and confirm stop hook reports open active task
- create an out-of-scope dirty file and confirm stop hook reports scope drift
- close active task and confirm final status is closed
- verify runtime state files are ignored
- verify hook scripts and docs are tracked

## Implementation Risks

- Hooks can become noisy if they try to infer too much. Keep them deterministic.
- If the active task scope is too broad, the guardrail loses value.
- If the scope is too narrow, legitimate validation artifacts may create false
  alarms. Prefer explicit `--in` and `--out` paths.
- If the project has multiple agents editing concurrently, use separate
  worktrees or require explicit ownership boundaries before parallel work.
- Do not let task-loop state replace git discipline. Commits remain the durable
  boundary.

## Recommended First Cut

For a first implementation in another project, build only:

- `AGENTS.md` task-loop policy
- ignored `.agent-harness/active-task.json`
- `task-loop active-task status/start/close`
- warn-only stop hook
- `task-start` and `task-end` command templates

Add pre-write hooks and delegation heuristics after the first task has been
closed successfully. This keeps the first rollout small while proving the most
important behavior: the agent cannot quietly end with unclassified dirty state.
