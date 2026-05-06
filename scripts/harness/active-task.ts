#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type ActiveTaskStatus = "active" | "closed";

type ActiveTaskStateV1 = {
  schema_version: 1;
  status: ActiveTaskStatus;
  task_id: string;
  title: string;
  branch: string;
  head: string;
  scope: {
    in: string[];
    out: string[];
  };
  validation: string[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
  close_reason?: string;
};

type StartOptions = {
  id: string;
  title: string;
  in: string[];
  out: string[];
  validation: string[];
  force: boolean;
};

type CloseOptions = {
  reason?: string;
};

const repoRoot = resolveRepoRoot();
const statePath = resolve(repoRoot, ".codex-harness/active-task.json");

function usage(exitCode = 1): never {
  const text = `Usage:
  mise run active-task -- status
  mise run active-task -- start --id <id> --title <title> [--in <path>] [--out <path>] [--validation <cmd>] [--force]
  mise run active-task -- close [--reason <text>]

Direct script usage:
  bun scripts/harness/active-task.ts status
  bun scripts/harness/active-task.ts start --id <id> --title <title>
  bun scripts/harness/active-task.ts close`;

  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${text}\n`);
  process.exit(exitCode);
}

function fail(message: string): never {
  process.stderr.write(`active-task: ${message}\n`);
  process.exit(1);
}

function now(): string {
  return new Date().toISOString();
}

function resolveRepoRoot(): string {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.status === 0) {
    const root = result.stdout.trim();
    if (root) return root;
  }

  return process.cwd();
}

function runGit(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    fail(`git ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }

  return result.stdout.trim();
}

function gitSnapshot(): { branch: string; head: string } {
  const branchResult = spawnSync("git", ["branch", "--show-current"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (branchResult.status !== 0) {
    const detail = (branchResult.stderr || branchResult.stdout || "").trim();
    fail(`git branch --show-current failed${detail ? `: ${detail}` : ""}`);
  }

  let branch = branchResult.stdout.trim();
  if (!branch) {
    branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  }

  const head = runGit(["rev-parse", "--short", "HEAD"]);
  return { branch, head };
}

function readState(): ActiveTaskStateV1 {
  if (!existsSync(statePath)) {
    fail(`state file does not exist: ${statePath}`);
  }

  try {
    const state = JSON.parse(readFileSync(statePath, "utf8")) as Partial<ActiveTaskStateV1>;
    validateState(state);
    return state;
  } catch (error) {
    if (error instanceof SyntaxError) {
      fail(`state file is malformed JSON: ${statePath}`);
    }
    throw error;
  }
}

function readStateOrUndefined(): ActiveTaskStateV1 | undefined {
  if (!existsSync(statePath)) return undefined;
  return readState();
}

function validateState(state: Partial<ActiveTaskStateV1>): asserts state is ActiveTaskStateV1 {
  if (state.schema_version !== 1) fail("schema_version must be 1");
  if (state.status !== "active" && state.status !== "closed") fail("status must be active or closed");
  if (!state.task_id) fail("task_id is missing");
  if (!state.title) fail("title is missing");
  if (!state.branch) fail("branch is missing");
  if (!state.head) fail("head is missing");
  if (!state.scope || !Array.isArray(state.scope.in) || !Array.isArray(state.scope.out)) {
    fail("scope.in and scope.out must be arrays");
  }
  if (!Array.isArray(state.validation)) fail("validation must be an array");
  if (!state.created_at) fail("created_at is missing");
  if (!state.updated_at) fail("updated_at is missing");
  for (const value of [...state.scope.in, ...state.scope.out, ...state.validation]) {
    if (typeof value !== "string") fail("scope and validation entries must be strings");
  }
  if (state.closed_at !== undefined && typeof state.closed_at !== "string") fail("closed_at must be a string when present");
  if (state.close_reason !== undefined && typeof state.close_reason !== "string") fail("close_reason must be a string when present");
}

function writeState(state: ActiveTaskStateV1): void {
  mkdirSync(dirname(statePath), { recursive: true });
  state.updated_at = now();
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function print(message: string): void {
  process.stdout.write(`${message}\n`);
}

function summarizeState(state: ActiveTaskStateV1): string {
  const base = `${state.status} ${state.task_id} "${state.title}" on ${state.branch}@${state.head}`;
  const scopeIn = state.scope.in.length;
  const scopeOut = state.scope.out.length;
  const validation = state.validation.length;
  const closed = state.closed_at ? ` closed_at=${state.closed_at}` : "";
  const reason = state.close_reason ? ` reason=${state.close_reason}` : "";
  return `${base} | in=${scopeIn} out=${scopeOut} validation=${validation}${closed}${reason}`;
}

function parseOptions(args: string[]): {
  command: string;
  start?: StartOptions;
  close?: CloseOptions;
} {
  const command = args[0];
  if (!command || command === "-h" || command === "--help") usage(0);
  if (command !== "status" && command !== "start" && command !== "close") usage();

  const rest = args.slice(1);
  if (command === "status") {
    if (rest.length > 0) usage();
    return { command };
  }

  const values: {
    id?: string;
    title?: string;
    in: string[];
    out: string[];
    validation: string[];
    force: boolean;
    reason?: string;
  } = {
    in: [],
    out: [],
    validation: [],
    force: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];

    switch (token) {
      case "--id":
      case "--title":
      case "--reason": {
        const value = rest[index + 1];
        if (!value || value.startsWith("--") || value.trim().length === 0) usage();
        if (token === "--id") values.id = value;
        if (token === "--title") values.title = value;
        if (token === "--reason") values.reason = value;
        index += 1;
        break;
      }
      case "--in":
      case "--out":
      case "--validation": {
        const value = rest[index + 1];
        if (!value || value.startsWith("--") || value.trim().length === 0) usage();
        if (token === "--in") values.in.push(value);
        if (token === "--out") values.out.push(value);
        if (token === "--validation") values.validation.push(value);
        index += 1;
        break;
      }
      case "--force":
        values.force = true;
        break;
      default:
        usage();
    }
  }

  if (command === "start") {
    if (!values.id || !values.title) usage();
    return {
      command,
      start: {
        id: values.id,
        title: values.title,
        in: values.in,
        out: values.out,
        validation: values.validation,
        force: values.force,
      },
    };
  }

  return {
    command,
    close: {
      reason: values.reason,
    },
  };
}

function commandStatus(): void {
  const state = readStateOrUndefined();
  if (!state) {
    print("active-task: no active task manifest exists");
    return;
  }

  print(`active-task: ${summarizeState(state)}`);
}

function commandStart(options: StartOptions): void {
  const existing = options.force ? undefined : readStateOrUndefined();
  if (existing?.status === "active") {
    fail(`active manifest already exists for ${existing.task_id}; use --force to replace it`);
  }

  const snapshot = gitSnapshot();
  const timestamp = now();
  const state: ActiveTaskStateV1 = {
    schema_version: 1,
    status: "active",
    task_id: options.id,
    title: options.title,
    branch: snapshot.branch,
    head: snapshot.head,
    scope: {
      in: options.in,
      out: options.out,
    },
    validation: options.validation,
    created_at: timestamp,
    updated_at: timestamp,
  };

  writeState(state);
  print(`active-task: started ${summarizeState(state)}`);
}

function commandClose(options: CloseOptions): void {
  const existing = readState();
  const timestamp = now();

  const state: ActiveTaskStateV1 = {
    ...existing,
    status: "closed",
    updated_at: timestamp,
    closed_at: timestamp,
    close_reason: options.reason ?? existing.close_reason,
  };

  writeState(state);
  print(`active-task: closed ${summarizeState(state)}`);
}

const parsed = parseOptions(process.argv.slice(2));

switch (parsed.command) {
  case "status":
    commandStatus();
    break;
  case "start":
    commandStart(parsed.start as StartOptions);
    break;
  case "close":
    commandClose(parsed.close as CloseOptions);
    break;
  default:
    usage(1);
}
