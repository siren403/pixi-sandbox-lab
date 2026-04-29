#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type CheckpointStatus = "active" | "consumed";

type GitSnapshot = {
  branch: string;
  head: string;
  dirty: boolean;
  status_short: string[];
};

type TaskFlowSummary = {
  exists: boolean;
  active_task: string | null;
  resume_hint?: string;
  open_detours: string[];
};

type TaskPlanLoopSummary = {
  exists: boolean;
  status?: string;
  target?: string;
};

type CheckpointState = {
  status: CheckpointStatus;
  created_at: string;
  updated_at: string;
  consumed_at?: string;
  resume_count: number;
  git: GitSnapshot;
  task_flow: TaskFlowSummary;
  task_plan_loop: TaskPlanLoopSummary;
  next_action: string;
  notes?: string;
};

const checkpointPath = resolve(process.cwd(), ".codex-harness/checkpoint.json");
const taskFlowPath = resolve(process.cwd(), ".codex-harness/task-flow.json");
const taskPlanLoopPath = resolve(process.cwd(), ".codex-harness/task-plan-loop.json");

function usage(exitCode = 1): never {
  const text = `Usage:
  mise run checkpoint -- auto [--next <text>] [--notes <text>]
  mise run checkpoint -- status
  mise run checkpoint -- create --next <text> [--notes <text>] [--force]
  mise run checkpoint -- verify
  mise run checkpoint -- resume`;

  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${text}\n`);
  process.exit(exitCode);
}

function fail(message: string): never {
  process.stderr.write(`checkpoint: ${message}\n`);
  process.exit(1);
}

function now(): string {
  return new Date().toISOString();
}

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function requireArg(name: string): string {
  const value = getArg(name);
  if (!value || value.startsWith("--")) fail(`missing required argument: ${name}`);
  return value;
}

function runGit(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(`git ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout.trim();
}

function gitSnapshot(): GitSnapshot {
  const status = runGit(["status", "--short"]);
  return {
    branch: runGit(["branch", "--show-current"]),
    head: runGit(["rev-parse", "--short", "HEAD"]),
    dirty: status.length > 0,
    status_short: status ? status.split("\n") : [],
  };
}

function readJson(path: string): unknown | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) fail(`state file is malformed JSON: ${path}`);
    throw error;
  }
}

function taskFlowSummary(): TaskFlowSummary {
  const state = readJson(taskFlowPath) as
    | {
        active_task?: string | null;
        tasks?: Array<{
          id?: string;
          kind?: string;
          status?: string;
          resume_hint?: string;
        }>;
      }
    | undefined;

  if (!state) return { exists: false, active_task: null, open_detours: [] };

  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const active = tasks.find((task) => task.id === state.active_task);
  const openDetours = tasks
    .filter((task) => task.kind === "detour" && !["completed", "stopped"].includes(task.status ?? ""))
    .map((task) => task.id)
    .filter((id): id is string => Boolean(id));

  return {
    exists: true,
    active_task: state.active_task ?? null,
    resume_hint: active?.resume_hint,
    open_detours: openDetours,
  };
}

function taskPlanLoopSummary(): TaskPlanLoopSummary {
  const state = readJson(taskPlanLoopPath) as
    | {
        status?: string;
        target?: string;
      }
    | undefined;

  if (!state) return { exists: false };
  return {
    exists: true,
    status: state.status,
    target: state.target,
  };
}

function readCheckpoint(): CheckpointState {
  const state = readJson(checkpointPath) as Partial<CheckpointState> | undefined;
  if (!state) fail(`checkpoint does not exist: ${checkpointPath}`);
  validateCheckpoint(state);
  return state;
}

function readCheckpointOrUndefined(): CheckpointState | undefined {
  if (!existsSync(checkpointPath)) return undefined;
  return readCheckpoint();
}

function validateCheckpoint(state: Partial<CheckpointState>): asserts state is CheckpointState {
  if (state.status !== "active" && state.status !== "consumed") fail("checkpoint status must be active or consumed");
  if (!state.created_at) fail("checkpoint created_at is missing");
  if (!state.updated_at) fail("checkpoint updated_at is missing");
  if (!Number.isInteger(state.resume_count) || state.resume_count < 0) fail("checkpoint resume_count must be a non-negative integer");
  if (!state.git?.branch) fail("checkpoint git.branch is missing");
  if (!state.git?.head) fail("checkpoint git.head is missing");
  if (typeof state.git.dirty !== "boolean") fail("checkpoint git.dirty is missing");
  if (!Array.isArray(state.git.status_short)) fail("checkpoint git.status_short must be an array");
  if (!state.task_flow) fail("checkpoint task_flow summary is missing");
  if (!state.task_plan_loop) fail("checkpoint task_plan_loop summary is missing");
  if (!state.next_action) fail("checkpoint next_action is missing");
}

function writeCheckpoint(state: CheckpointState): void {
  mkdirSync(dirname(checkpointPath), { recursive: true });
  state.updated_at = now();
  writeFileSync(checkpointPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function inferNextAction(explicit?: string): string | undefined {
  if (explicit) return explicit;
  return taskFlowSummary().resume_hint;
}

function buildCheckpoint(nextAction: string, notes?: string): CheckpointState {
  const git = gitSnapshot();
  if (git.dirty) fail("working tree is dirty; run task-end/closeout before creating a checkpoint");

  const timestamp = now();
  return {
    status: "active",
    created_at: timestamp,
    updated_at: timestamp,
    resume_count: 0,
    git,
    task_flow: taskFlowSummary(),
    task_plan_loop: taskPlanLoopSummary(),
    next_action: nextAction,
    notes,
  };
}

function verifyCheckpoint(state: CheckpointState): { ok: boolean; errors: string[]; current_git: GitSnapshot } {
  const currentGit = gitSnapshot();
  const errors: string[] = [];

  if (currentGit.branch !== state.git.branch) {
    errors.push(`branch mismatch: expected ${state.git.branch}, got ${currentGit.branch}`);
  }
  if (currentGit.head !== state.git.head) {
    errors.push(`HEAD mismatch: expected ${state.git.head}, got ${currentGit.head}`);
  }
  if (currentGit.dirty !== state.git.dirty) {
    errors.push(`dirty-state mismatch: expected ${state.git.dirty ? "dirty" : "clean"}, got ${currentGit.dirty ? "dirty" : "clean"}`);
  }
  if (currentGit.dirty) {
    errors.push("working tree is dirty; checkpoint continuation requires clean state");
  }

  return {
    ok: errors.length === 0,
    errors,
    current_git: currentGit,
  };
}

function commandCreate(): void {
  const existing = readCheckpointOrUndefined();
  const force = hasFlag("--force");
  if (existing?.status === "active" && !force) {
    fail("active checkpoint already exists; use --force to overwrite it");
  }

  const nextAction = requireArg("--next");
  const state = buildCheckpoint(nextAction, getArg("--notes"));
  writeCheckpoint(state);
  print(state);
}

function commandAuto(): void {
  const existing = readCheckpointOrUndefined();
  if (!existing) {
    const nextAction = inferNextAction(getArg("--next"));
    if (!nextAction) fail('no checkpoint exists and next action is unclear; run checkpoint -- create --next "<next action>"');
    const state = buildCheckpoint(nextAction, getArg("--notes"));
    writeCheckpoint(state);
    print({ action: "created", checkpoint: state });
    return;
  }

  if (existing.status === "consumed") {
    print({
      action: "consumed",
      message: "checkpoint has already been consumed; create a new checkpoint when ready",
      checkpoint: existing,
    });
    return;
  }

  const verification = verifyCheckpoint(existing);
  print({
    action: verification.ok ? "verified" : "mismatch",
    verification,
    checkpoint: existing,
  });
  if (!verification.ok) process.exit(1);
}

function commandStatus(): void {
  const existing = readCheckpointOrUndefined();
  if (!existing) {
    print({ exists: false });
    return;
  }

  print({
    exists: true,
    checkpoint: existing,
    current_git: gitSnapshot(),
  });
}

function commandVerify(): void {
  const state = readCheckpoint();
  const verification = verifyCheckpoint(state);
  print({
    verification,
    checkpoint: state,
  });
  if (!verification.ok) process.exit(1);
}

function commandResume(): void {
  const state = readCheckpoint();
  if (state.status === "consumed") {
    fail(`checkpoint already consumed at ${state.consumed_at ?? "unknown time"}; next action was: ${state.next_action}`);
  }

  const verification = verifyCheckpoint(state);
  if (!verification.ok) {
    print({
      verification,
      checkpoint: state,
    });
    process.exit(1);
  }

  state.status = "consumed";
  state.consumed_at = now();
  state.resume_count += 1;
  writeCheckpoint(state);

  print({
    action: "resume",
    next_action: state.next_action,
    checkpoint: state,
  });
}

const command = process.argv[2] ?? "auto";

switch (command) {
  case "auto":
    commandAuto();
    break;
  case "status":
    commandStatus();
    break;
  case "create":
    commandCreate();
    break;
  case "verify":
    commandVerify();
    break;
  case "resume":
    commandResume();
    break;
  case "-h":
  case "--help":
    usage(0);
    break;
  default:
    fail(`unknown command: ${command}`);
}
