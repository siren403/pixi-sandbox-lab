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
