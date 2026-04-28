import { existsSync } from "node:fs";

type HookInput = {
  cwd?: string;
  hook_event_name?: string;
  session_id?: string;
  model?: string;
};

const stdin = await Bun.stdin.text();
let input: HookInput = {};

if (stdin.trim()) {
  try {
    input = JSON.parse(stdin) as HookInput;
  } catch {
    outputWarning("Codex dirty-state hook received invalid JSON input.");
    process.exit(0);
  }
}

const cwd = input.cwd || process.cwd();
if (!existsSync(cwd)) {
  outputWarning(`Codex dirty-state hook cwd does not exist:\n${cwd}`);
  process.exit(0);
}

let status;
try {
  status = Bun.spawnSync(["git", "status", "--short"], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
} catch (error) {
  outputWarning(`Codex dirty-state hook could not run git status:\n${String(error)}`);
  process.exit(0);
}

if (status.exitCode !== 0) {
  const error = decode(status.stderr).trim() || "git status failed";
  outputWarning(`Codex dirty-state hook could not inspect git status:\n${error}`);
  process.exit(0);
}

const dirty = decode(status.stdout).trim();

if (dirty) {
  outputWarning(`Working tree is dirty:\n${dirty}`);
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
