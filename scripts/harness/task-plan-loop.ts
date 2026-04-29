#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Status = "planning" | "reviewing" | "revising" | "approved" | "blocked" | "stopped";

type HistoryEntry = {
  at: string;
  command: string;
  loop: number;
  status: Status;
  verdict?: string;
  notes?: string;
  reason?: string;
};

type LoopState = {
  id: string;
  target: string;
  mode: "review-loop";
  max_loops: number;
  current_loop: number;
  status: Status;
  planner: string;
  reviewer: string;
  latest_verdict: null | {
    verdict: string;
    notes?: string;
    at: string;
  };
  history: HistoryEntry[];
  created_at: string;
  updated_at: string;
};

const statePath = resolve(process.cwd(), ".codex-harness/task-plan-loop.json");
const terminalStates = new Set<Status>(["approved", "blocked", "stopped"]);

function usage(exitCode = 1): never {
  const text = `Usage:
  mise run task-plan-loop -- start --target <text> [--max-loops <n>]
  mise run task-plan-loop -- status
  mise run task-plan-loop -- review --verdict <value> [--notes <text>]
  mise run task-plan-loop -- revise
  mise run task-plan-loop -- approve
  mise run task-plan-loop -- stop --reason <text>`;

  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${text}\n`);
  process.exit(exitCode);
}

function fail(message: string): never {
  process.stderr.write(`task-plan-loop: ${message}\n`);
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "task-plan-loop";
}

function readState(): LoopState {
  if (!existsSync(statePath)) {
    fail(`state file does not exist: ${statePath}`);
  }

  try {
    const raw = readFileSync(statePath, "utf8");
    const state = JSON.parse(raw) as Partial<LoopState>;
    validateState(state);
    return state;
  } catch (error) {
    if (error instanceof SyntaxError) {
      fail(`state file is malformed JSON: ${statePath}`);
    }
    throw error;
  }
}

function validateState(state: Partial<LoopState>): asserts state is LoopState {
  const statuses: Status[] = ["planning", "reviewing", "revising", "approved", "blocked", "stopped"];

  if (state.mode !== "review-loop") fail("state mode must be review-loop");
  if (!state.id) fail("state id is missing");
  if (!state.target) fail("state target is missing");
  if (!Number.isInteger(state.max_loops) || state.max_loops < 0) fail("state max_loops must be a non-negative integer");
  if (!Number.isInteger(state.current_loop) || state.current_loop < 0) fail("state current_loop must be a non-negative integer");
  if (!state.status || !statuses.includes(state.status)) fail("state status is invalid");
  if (!Array.isArray(state.history)) fail("state history must be an array");
}

function writeState(state: LoopState): void {
  mkdirSync(dirname(statePath), { recursive: true });
  state.updated_at = now();
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function appendHistory(
  state: LoopState,
  entry: Omit<HistoryEntry, "at" | "loop" | "status">
): void {
  state.history.push({
    at: now(),
    loop: state.current_loop,
    status: state.status,
    ...entry,
  });
}

function assertActive(state: LoopState, command: string): void {
  if (terminalStates.has(state.status)) {
    fail(`cannot run ${command}; loop is already terminal: ${state.status}`);
  }
}

function printState(state: LoopState): void {
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
}

function commandStart(): void {
  const target = requireArg("--target");
  const maxLoopsValue = getArg("--max-loops") ?? "1";
  const maxLoops = Number(maxLoopsValue);

  if (!Number.isInteger(maxLoops) || maxLoops < 0) {
    fail("--max-loops must be a non-negative integer");
  }

  if (existsSync(statePath)) {
    const existing = readState();
    if (!terminalStates.has(existing.status)) {
      fail(`active loop already exists with status ${existing.status}; stop, approve, or block it before starting a new loop`);
    }
  }

  const timestamp = now();
  const state: LoopState = {
    id: `${timestamp.replace(/[:.]/g, "-")}-${slugify(target)}`,
    target,
    mode: "review-loop",
    max_loops: maxLoops,
    current_loop: 0,
    status: "planning",
    planner: "parent Codex",
    reviewer: "plan_reviewer",
    latest_verdict: null,
    history: [],
    created_at: timestamp,
    updated_at: timestamp,
  };

  appendHistory(state, { command: "start" });
  writeState(state);
  printState(state);
}

function commandStatus(): void {
  printState(readState());
}

function commandReview(): void {
  const state = readState();
  assertActive(state, "review");

  const verdict = requireArg("--verdict");
  const notes = getArg("--notes");
  const at = now();

  state.status = "reviewing";
  state.latest_verdict = { verdict, notes, at };
  appendHistory(state, { command: "review", verdict, notes });
  writeState(state);
  printState(state);
}

function commandRevise(): void {
  const state = readState();
  assertActive(state, "revise");

  if (state.current_loop >= state.max_loops) {
    state.status = "blocked";
    appendHistory(state, {
      command: "revise",
      reason: `max loop count reached (${state.current_loop}/${state.max_loops})`,
    });
    writeState(state);
    fail(`max loop count reached (${state.current_loop}/${state.max_loops}); loop is now blocked`);
  }

  state.current_loop += 1;
  state.status = "revising";
  appendHistory(state, { command: "revise" });
  writeState(state);
  printState(state);
}

function commandApprove(): void {
  const state = readState();
  assertActive(state, "approve");

  state.status = "approved";
  appendHistory(state, { command: "approve" });
  writeState(state);
  printState(state);
}

function commandStop(): void {
  const state = readState();
  if (terminalStates.has(state.status)) {
    fail(`cannot stop; loop is already terminal: ${state.status}`);
  }

  const reason = requireArg("--reason");
  state.status = "stopped";
  appendHistory(state, { command: "stop", reason });
  writeState(state);
  printState(state);
}

const command = process.argv[2];

switch (command) {
  case "start":
    commandStart();
    break;
  case "status":
    commandStatus();
    break;
  case "review":
    commandReview();
    break;
  case "revise":
    commandRevise();
    break;
  case "approve":
    commandApprove();
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
