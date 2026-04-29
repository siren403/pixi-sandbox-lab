#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type TaskKind = "main" | "detour";
type TaskStatus = "active" | "paused" | "proposed" | "deferred" | "completed" | "stopped";
type Decision = "main-first" | "detour-first";
type Trigger = "explicit" | "agent-detected" | "policy";

type HistoryEntry = {
  at: string;
  command: string;
  status: TaskStatus;
  reason?: string;
  decision?: Decision;
  trigger?: Trigger;
  commit?: string;
};

type FlowTask = {
  id: string;
  title: string;
  kind: TaskKind;
  status: TaskStatus;
  parent?: string;
  decision?: Decision;
  trigger?: Trigger;
  reason_started?: string;
  reason_paused?: string;
  resume_hint?: string;
  commit?: string;
  history: HistoryEntry[];
  created_at: string;
  updated_at: string;
};

type FlowState = {
  active_task: string | null;
  tasks: FlowTask[];
  created_at: string;
  updated_at: string;
};

const statePath = resolve(process.cwd(), ".codex-harness/task-flow.json");

function usage(exitCode = 1): never {
  const text = `Usage:
  mise run task-flow -- start --id <id> --title <title> [--resume-hint <text>]
  mise run task-flow -- detour propose --id <id> --title <title> --trigger <explicit|agent-detected|policy> --reason <text>
  mise run task-flow -- detour defer --id <id> --decision main-first [--reason <text>]
  mise run task-flow -- detour start --id <id> --decision detour-first [--reason <text>]
  mise run task-flow -- complete --id <id> [--commit <hash>] [--reason <text>]
  mise run task-flow -- resume
  mise run task-flow -- status
  mise run task-flow -- stop --reason <text>`;

  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${text}\n`);
  process.exit(exitCode);
}

function fail(message: string): never {
  process.stderr.write(`task-flow: ${message}\n`);
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

function requireArg(name: string): string {
  const value = getArg(name);
  if (!value || value.startsWith("--")) {
    fail(`missing required argument: ${name}`);
  }
  return value;
}

function assertChoice<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) {
    fail(`${label} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function appendHistory(task: FlowTask, entry: Omit<HistoryEntry, "at" | "status">): void {
  task.history.push({
    at: now(),
    status: task.status,
    ...entry,
  });
}

function createTask(input: {
  id: string;
  title: string;
  kind: TaskKind;
  status: TaskStatus;
  parent?: string;
  decision?: Decision;
  trigger?: Trigger;
  reason_started?: string;
  resume_hint?: string;
}): FlowTask {
  const timestamp = now();
  const task: FlowTask = {
    id: input.id,
    title: input.title,
    kind: input.kind,
    status: input.status,
    parent: input.parent,
    decision: input.decision,
    trigger: input.trigger,
    reason_started: input.reason_started,
    resume_hint: input.resume_hint,
    history: [],
    created_at: timestamp,
    updated_at: timestamp,
  };
  appendHistory(task, {
    command: input.kind === "main" ? "start" : "detour propose",
    decision: input.decision,
    trigger: input.trigger,
    reason: input.reason_started,
  });
  return task;
}

function readState(): FlowState {
  if (!existsSync(statePath)) {
    fail(`state file does not exist: ${statePath}`);
  }

  try {
    const raw = readFileSync(statePath, "utf8");
    const state = JSON.parse(raw) as Partial<FlowState>;
    validateState(state);
    return state;
  } catch (error) {
    if (error instanceof SyntaxError) {
      fail(`state file is malformed JSON: ${statePath}`);
    }
    throw error;
  }
}

function readStateOrNew(): FlowState {
  if (!existsSync(statePath)) {
    const timestamp = now();
    return {
      active_task: null,
      tasks: [],
      created_at: timestamp,
      updated_at: timestamp,
    };
  }
  return readState();
}

function validateState(state: Partial<FlowState>): asserts state is FlowState {
  if (!Array.isArray(state.tasks)) fail("state tasks must be an array");
  if (state.active_task !== null && typeof state.active_task !== "string") {
    fail("state active_task must be a string or null");
  }

  const ids = new Set<string>();
  let activeCount = 0;
  for (const task of state.tasks as Partial<FlowTask>[]) {
    if (!task.id) fail("task id is missing");
    if (ids.has(task.id)) fail(`duplicate task id in state: ${task.id}`);
    ids.add(task.id);
    if (!task.title) fail(`task title is missing: ${task.id}`);
    if (task.kind !== "main" && task.kind !== "detour") fail(`task kind is invalid: ${task.id}`);
    if (!["active", "paused", "proposed", "deferred", "completed", "stopped"].includes(task.status ?? "")) {
      fail(`task status is invalid: ${task.id}`);
    }
    if (!Array.isArray(task.history)) fail(`task history must be an array: ${task.id}`);
    if (task.status === "active") activeCount += 1;
  }

  if (activeCount > 1) fail("state has more than one active task");
  if (state.active_task && !ids.has(state.active_task)) {
    fail(`active_task points to an unknown id: ${state.active_task}`);
  }
  if (state.active_task) {
    const active = (state.tasks as FlowTask[]).find((task) => task.id === state.active_task);
    if (active?.status !== "active") fail("active_task must point to an active task");
  }
}

function writeState(state: FlowState): void {
  mkdirSync(dirname(statePath), { recursive: true });
  state.updated_at = now();
  for (const task of state.tasks) {
    task.updated_at = state.updated_at;
  }
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function printState(state: FlowState): void {
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
}

function findTask(state: FlowState, id: string): FlowTask {
  const task = state.tasks.find((candidate) => candidate.id === id);
  if (!task) fail(`unknown task id: ${id}`);
  return task;
}

function requireNoDuplicate(state: FlowState, id: string): void {
  if (state.tasks.some((task) => task.id === id)) {
    fail(`task id already exists: ${id}`);
  }
}

function activeTask(state: FlowState): FlowTask | undefined {
  return state.active_task ? state.tasks.find((task) => task.id === state.active_task) : undefined;
}

function activeMain(state: FlowState): FlowTask | undefined {
  return state.tasks.find((task) => task.kind === "main" && task.status === "active");
}

function pausedMain(state: FlowState): FlowTask | undefined {
  return state.tasks.find((task) => task.kind === "main" && task.status === "paused");
}

function commandStart(): void {
  const state = readStateOrNew();
  const id = requireArg("--id");
  const title = requireArg("--title");
  const resumeHint = getArg("--resume-hint");

  requireNoDuplicate(state, id);
  const active = activeTask(state);
  if (active) fail(`cannot start main task; active task already exists: ${active.id}`);

  const task = createTask({
    id,
    title,
    kind: "main",
    status: "active",
    resume_hint: resumeHint,
  });
  state.tasks.push(task);
  state.active_task = id;
  writeState(state);
  printState(state);
}

function commandStatus(): void {
  printState(readState());
}

function commandDetour(): void {
  const subcommand = process.argv[3];
  switch (subcommand) {
    case "propose":
      commandDetourPropose();
      break;
    case "defer":
      commandDetourDefer();
      break;
    case "start":
      commandDetourStart();
      break;
    default:
      fail(`unknown detour command: ${subcommand ?? "<missing>"}`);
  }
}

function commandDetourPropose(): void {
  const state = readState();
  const main = activeMain(state) ?? pausedMain(state);
  if (!main) fail("cannot propose detour without an active or paused main task");

  const id = requireArg("--id");
  const title = requireArg("--title");
  const trigger = assertChoice(requireArg("--trigger"), ["explicit", "agent-detected", "policy"] as const, "--trigger");
  const reason = requireArg("--reason");

  requireNoDuplicate(state, id);
  const task = createTask({
    id,
    title,
    kind: "detour",
    status: "proposed",
    parent: main.id,
    trigger,
    reason_started: reason,
  });
  state.tasks.push(task);
  writeState(state);
  printState(state);
}

function commandDetourDefer(): void {
  const state = readState();
  const id = requireArg("--id");
  const decision = assertChoice(requireArg("--decision"), ["main-first"] as const, "--decision");
  const reason = getArg("--reason");
  const task = findTask(state, id);

  if (task.kind !== "detour") fail(`task is not a detour: ${id}`);
  if (task.status !== "proposed") fail(`can only defer proposed detours; ${id} is ${task.status}`);

  task.status = "deferred";
  task.decision = decision;
  appendHistory(task, { command: "detour defer", decision, reason });
  writeState(state);
  printState(state);
}

function commandDetourStart(): void {
  const state = readState();
  const id = requireArg("--id");
  const decision = assertChoice(requireArg("--decision"), ["detour-first"] as const, "--decision");
  const reason = getArg("--reason");
  const task = findTask(state, id);

  if (task.kind !== "detour") fail(`task is not a detour: ${id}`);
  if (task.status !== "proposed" && task.status !== "deferred") {
    fail(`can only start proposed or deferred detours; ${id} is ${task.status}`);
  }

  const main = activeMain(state);
  if (!main) fail("cannot start detour-first without an active main task");

  main.status = "paused";
  main.reason_paused = reason ?? `detour-first: ${id}`;
  appendHistory(main, { command: "pause", reason: main.reason_paused });

  task.status = "active";
  task.decision = decision;
  appendHistory(task, { command: "detour start", decision, reason });
  state.active_task = task.id;
  writeState(state);
  printState(state);
}

function commandComplete(): void {
  const state = readState();
  const id = requireArg("--id");
  const commit = getArg("--commit");
  const reason = getArg("--reason");
  const task = findTask(state, id);
  const active = activeTask(state);

  if (task.kind === "main" && active?.kind === "detour") {
    fail(`cannot complete main task while active detour exists: ${active.id}`);
  }
  if (task.status === "completed" || task.status === "stopped") {
    fail(`cannot complete terminal task: ${id}`);
  }

  task.status = "completed";
  task.commit = commit;
  appendHistory(task, { command: "complete", commit, reason });

  if (state.active_task === id) {
    state.active_task = null;
  }

  writeState(state);
  printState(state);
}

function commandResume(): void {
  const state = readState();
  const active = activeTask(state);
  if (active) fail(`cannot resume while active task exists: ${active.id}`);

  const main = pausedMain(state);
  if (!main) fail("no paused main task to resume");

  main.status = "active";
  main.reason_paused = undefined;
  appendHistory(main, { command: "resume" });
  state.active_task = main.id;
  writeState(state);
  printState(state);
}

function commandStop(): void {
  const state = readState();
  const reason = requireArg("--reason");
  const active = activeTask(state);
  if (!active) fail("no active task to stop");

  active.status = "stopped";
  appendHistory(active, { command: "stop", reason });
  state.active_task = null;
  writeState(state);
  printState(state);
}

const command = process.argv[2];

switch (command) {
  case "start":
    commandStart();
    break;
  case "detour":
    commandDetour();
    break;
  case "complete":
    commandComplete();
    break;
  case "resume":
    commandResume();
    break;
  case "status":
    commandStatus();
    break;
  case "stop":
    commandStop();
    break;
  case "-h":
  case "--help":
  case undefined:
    usage(command ? 0 : 1);
    break;
  default:
    fail(`unknown command: ${command}`);
}
