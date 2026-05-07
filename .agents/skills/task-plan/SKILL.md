---
name: task-plan
description: Plan a work item before implementation with a feature summary, concrete assigned agents, scope, execution sequence, validation, closeout, and plan review. Use when asked to plan, design, prepare, sequence, assign work, review a plan before coding, or handle non-trivial harness, skill, hook, agent, MCP, plugin, task, documentation, or multi-file changes.
---

# Task Plan

## Quick Start

Use this skill before non-trivial work. The output must be a plan the user can approve or edit before implementation.

For harness changes, follow `docs/harness-change-protocol.md` and use `harness_architect` plus `plan_reviewer`.

If invoked as a follow-up from `harness-audit`, treat "proceed" as permission to produce the plan, not permission to implement it. Wait for explicit implementation approval after presenting the plan.

## Missing Target Behavior

If this skill is invoked without a clear planning target:

1. Do not invent a full implementation plan immediately.
2. Infer likely targets from recent conversation, current git state, and `docs/harness-inventory.md`.
3. Offer 2-3 candidate targets.
4. Mark one as **Recommended** with a short reason.
5. Ask the user to choose one or provide a different target.

## Review Loop Mode

Use review loop mode when the user asks for `ralplan`, `--review-loop`, `--loop {n}`, repeated plan/review cycles, or automatic plan review iteration.

Invocation forms:

- `$task-plan ralplan <target>`
- `$task-plan --review-loop <target>`
- `$task-plan --loop {n} <target>`

Rules:

- Default loop count is `1` when no explicit `--loop {n}` is provided.
- Review loop mode is still planning-only. Do not implement until the user explicitly approves implementation after the loop result.
- Persist loop state through `mise run task-plan-loop -- ...`; do not rely only on chat memory for loop entry, count, verdicts, or terminal state.
- Use `.codex-harness/task-plan-loop.json` only through the task-plan loop state manager. Do not hand-edit this file.
- If an active non-terminal loop already exists, inspect it with `mise run task-plan-loop -- status` before starting another one.

State flow:

1. Start the loop with `mise run task-plan-loop -- start --target "<target>" --max-loops <n>`.
2. Produce the initial plan using the normal plan format.
3. Ask `plan_reviewer` to review the plan.
4. Record the review with `mise run task-plan-loop -- review --verdict <verdict> --notes "<summary>"`.
5. If the reviewer requests changes and loops remain, run `mise run task-plan-loop -- revise`, update the plan, and repeat review.
6. If approved, run `mise run task-plan-loop -- approve` and present the approved plan to the user.
7. If blocked, out of loop budget, or redirected by the user, run `mise run task-plan-loop -- stop --reason "<reason>"` unless the state manager already moved the loop to `blocked`.

## Detour Handling

Use `task-flow` when planning reveals work that may interrupt or delay the current main task.

Terms:

- `main task`: the primary work stream.
- `detour`: a temporary side path discovered during planning or implementation.
- `main-first`: default decision; record or defer the detour and keep the main task moving.
- `detour-first`: pause the main task and handle the detour first.

Trigger kinds:

- `explicit`: the user directly asks to handle, defer, or resume a detour.
- `agent-detected`: the agent finds a prerequisite, harness gap, or workflow risk.
- `policy`: harness policy requires a pause, such as validation failure, dirty-state risk, plan-review block, or scope drift.

Rules:

- Prefer `main-first` unless the detour blocks correctness, validation, clean closeout, reliable agent coordination, or the user explicitly chooses `detour-first`.
- Persist detour decisions through `mise run task-flow -- ...`; do not rely only on chat memory to remember why the main task paused or where to resume.
- Use the term `detour`, not `branch`, for task-flow work to avoid confusion with Git branches.
- If task-flow shows an active paused or detoured flow, include the resume target in the plan.
- Do not use detours to silently expand implementation scope. If a detour requires files outside the approved plan, stop and update the plan first.

Common commands:

- `mise run task-flow -- start --id <id> --title "<title>" --resume-hint "<next step>"`
- `mise run task-flow -- detour propose --id <id> --title "<title>" --trigger <explicit|agent-detected|policy> --reason "<reason>"`
- `mise run task-flow -- detour defer --id <id> --decision main-first --reason "<reason>"`
- `mise run task-flow -- detour start --id <id> --decision detour-first --reason "<reason>"`
- `mise run task-flow -- complete --id <id> --commit <hash>`
- `mise run task-flow -- resume`
- `mise run task-flow -- status`

## Plan Format

1. **Feature Summary**
   - Feature name
   - Problem
   - Proposal
   - User-visible outcome
   - Completion signal

2. **Ownership**
   - PM/parent agent
   - Architect or specialist agent, if any
   - Creator skill, if any
   - Implementer
   - Reviewer
   - File ownership for each role

3. **Scope**
   - In scope
   - Out of scope
   - Files to add/change
   - Files explicitly not to touch

4. **Execution Sequence**
   - Ordered steps
   - Handoff points
   - Stop/ask conditions

5. **Validation**
   - Behavior checks that prove the feature
   - Relevant `mise` tasks
   - Smoke tests
   - Documentation/reference checks

6. **Closeout**
   - Commit grouping
   - Commit message suggestion
   - Final `git status --short` expectation

7. **Plan Review**
   - For non-trivial changes, get `plan_reviewer` verdict before implementation.
   - Resolve blockers before editing files.

## Rules

- Name concrete assigned agents or executors. Do not write only “worker”.
- Keep the plan proportional to the feature.
- Prefer Bun/TypeScript for project-local harness scripts and hooks.
- Do not add generic validators unless they prove the feature behavior.
- Do not implement while using this skill unless the user separately approves implementation.

## Delegation and Review Heuristic

Use this role split for cost-efficient but reviewed execution:

- The parent agent owns task sequencing, user-facing decisions, integration, final validation, commit, and closeout.
- Use a specialist or architect for unsettled design, API surface, domain policy, or review of contract-bearing work.
- After design and expected behavior are clear, prefer a low-cost scoped worker for bounded implementation when target files, ownership, and validation commands are explicit.
- Do not let the parent agent be the only reviewer for UI primitives, framework contracts, harness specs, public APIs, release/debug boundaries, or cross-scene behavior. Assign the relevant specialist reviewer in the plan.
- The parent integrates worker output only after specialist review feedback is resolved or explicitly deferred with a reason.

Common patterns:

- Pixi UI primitive or app-surface work: `pixi_surface_architect` reviews, `scoped_worker` implements, parent integrates and validates.
- Harness spec work: `harness_architect` owns protocol fit, `plan_reviewer` reviews non-trivial plans, parent integrates and validates.
- Mechanical single-scope patches with no contract change may use `scoped_worker` implementation plus parent validation only.

## Task-Start Handoff

Before implementation, the approved plan should provide enough information for `task-start` to create an active task manifest.

Include these handoff fields explicitly for non-trivial work:

- stable task id or short slug
- task title
- whether a plan was required
- files/directories in scope
- files/directories out of scope
- validation commands
- commit or no-commit expectation

`task-plan` is required for harness spec changes even when the edit is small. This includes `.codex/**`, `.agents/**`, `.mise/**`, `scripts/harness/**`, `docs/harness*.md`, MCP config, hooks, skills, custom agents, plugins, sandbox config, and lifecycle/task protocol changes.
