import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type HookInput = {
  cwd?: string;
  hook_event_name?: string;
  session_id?: string;
  model?: string;
};

type Checkpoint = {
  status?: string;
  next_action?: string;
  notes?: string;
};

const stdin = await Bun.stdin.text();
let input: HookInput = {};

if (stdin.trim()) {
  try {
    input = JSON.parse(stdin) as HookInput;
  } catch {
    outputWarning("Codex checkpoint hook received invalid JSON input.");
    process.exit(0);
  }
}

const cwd = input.cwd || process.cwd();
const root = gitRoot(cwd);

if (!root) {
  process.exit(0);
}

const checkpointPath = join(root, ".codex-harness", "checkpoint.json");

if (!existsSync(checkpointPath)) {
  process.exit(0);
}

let checkpoint: Checkpoint;
try {
  checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8")) as Checkpoint;
} catch {
  outputWarning(`Active checkpoint check could not parse:\n${checkpointPath}`);
  process.exit(0);
}

if (checkpoint.status !== "active") {
  process.exit(0);
}

const nextAction = checkpoint.next_action || "(missing next_action)";
const notes = checkpoint.notes ? `\n\nNotes:\n${checkpoint.notes}` : "";

outputWarning(`Active checkpoint found.\n\nNext action:\n${nextAction}\n\nRun:\n$checkpoint resume${notes}`);

function gitRoot(startCwd: string): string | null {
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
      cwd: startCwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (result.exitCode !== 0) return null;
    return decode(result.stdout).trim() || null;
  } catch {
    return null;
  }
}

function outputWarning(message: string) {
  console.log(JSON.stringify({
    continue: true,
    systemMessage: message,
  }));
}

function decode(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}
