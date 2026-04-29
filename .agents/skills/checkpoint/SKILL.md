---
name: checkpoint
description: Create, verify, and resume project-local continuity checkpoints that preserve the next action across context clearing, new sessions, or deliberate handoff. Use when the user invokes $checkpoint, asks to checkpoint, resume from a checkpoint, avoid context contamination, preserve task continuity, or verify that git/task-flow/task-plan-loop state still matches the recorded continuation point.
---

# Checkpoint

## Quick Start

Use this skill to create or consume a checkpoint before clearing context, starting a new session, or handing work to a continuation context.

Default behavior:

- `$checkpoint` runs auto mode.
- If no checkpoint exists and the next action is clear, create an `active` checkpoint.
- If an `active` checkpoint exists, verify and summarize it without consuming it.
- If a `consumed` checkpoint exists, report that it has already been used.

## Commands

- `$checkpoint`
  - Run `mise run checkpoint -- auto`.
  - Add `--next "<action>"` when the next action is not inferable from `task-flow`.
- `$checkpoint status`
  - Run `mise run checkpoint -- status`.
  - Summarize checkpoint, git, task-flow, and task-plan-loop state.
- `$checkpoint create --next "<action>"`
  - Run `mise run checkpoint -- create --next "<action>"`.
  - Use `--force` only when intentionally replacing an active checkpoint.
- `$checkpoint verify`
  - Run `mise run checkpoint -- verify`.
  - Stop if branch, HEAD, or dirty state differs from the checkpoint.
- `$checkpoint resume`
  - Run `mise run checkpoint -- resume`.
  - If verification passes, mark the checkpoint `consumed`, increment `resume_count`, and present `next_action`.

## Policy

- Do not add or expect a `clear` command in v1.
- Treat `resume` as a consumption event, not deletion: `active -> consumed`.
- Do not auto-run the `next_action` after resume. Present it and wait for the user to proceed.
- Refuse checkpoint creation when the working tree is dirty. Use `task-end` first.
- Allow `create` to overwrite a `consumed` checkpoint.
- Refuse `create` over an `active` checkpoint unless `--force` is provided.
- If verification fails, do not continue the next action until the mismatch is resolved.

## State

The runtime file is `.codex-harness/checkpoint.json`.

It is ignored by git and must be written only through:

```bash
mise run checkpoint -- ...
```

The state captures:

- git branch, HEAD, and dirty status
- task-flow active task, resume hint, and open detours
- task-plan-loop status and target
- next action
- active or consumed checkpoint status
