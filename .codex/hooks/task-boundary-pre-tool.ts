import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type HookInput = {
  cwd?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool?: string;
  name?: string;
  tool_input?: unknown;
  input?: unknown;
};

type ActiveTaskManifest = {
  status?: string;
  task_id?: string;
  title?: string;
};

const stdin = await Bun.stdin.text();
let input: HookInput = {};

if (stdin.trim()) {
  try {
    input = JSON.parse(stdin) as HookInput;
  } catch {
    outputWarning("Codex task-boundary PreToolUse hook received invalid JSON input.");
    process.exit(0);
  }
}

const toolName = String(input.tool_name ?? input.tool ?? input.name ?? "").trim();
const toolInput = input.tool_input ?? input.input ?? {};
const commandText = extractCommandText(toolInput);
const writeKind = classifyWrite(toolName, commandText);

if (!writeKind) {
  process.exit(0);
}

const root = gitRoot(input.cwd || process.cwd());
if (!root) {
  outputWarning(`Task boundary warning: ${writeKind} detected, but git root could not be resolved. Confirm task-plan approval and task-start before editing.`);
  process.exit(0);
}

const activeTask = readActiveTask(root);
if (activeTask.warning) {
  outputWarning(activeTask.warning);
  process.exit(0);
}

if (activeTask.manifest?.status !== "active") {
  outputWarning(`Task boundary warning: ${writeKind} detected without an active task manifest.

Before editing, staging, committing, or running write-like commands:
1. Decide whether task-plan is required.
2. For non-trivial or harness/runtime work, present the final plan and wait for user approval.
3. Run task-start and open an active task manifest.

Current recovery: stop before this write if approval/task-start is missing, or explain why this is a trivial edit.`);
}

function classifyWrite(toolName: string, commandText: string): string | undefined {
  const normalizedTool = toolName.toLowerCase();
  if (normalizedTool.includes("apply_patch")) return "apply_patch file edit";
  if (!commandText) return undefined;

  const command = commandText.trim();
  if (isReadOnlyCommand(command)) return undefined;

  if (/\bgit\s+(add|commit)\b/.test(command)) {
    return "git write/commit command";
  }
  if (/\b(cat\s+>|tee\s+|mv\s+|cp\s+|rm\s+|mkdir\s+|touch\s+|sed\s+-i|perl\s+-pi|truncate\s+|chmod\s+|bun\s+run\s+(format|lint:fix)|npm\s+run\s+(format|lint:fix))/.test(command)) {
    return "write-like shell command";
  }
  return undefined;
}

function isReadOnlyCommand(command: string): boolean {
  return /^(rg|grep|sed\s+-n|cat|ls|find|pwd|git\s+(status|diff|log|show|branch|rev-parse|remote)|mise\s+run\s+active-task\s+--\s+status)\b/.test(command);
}

function extractCommandText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["cmd", "command", "script"]) {
    const next = record[key];
    if (typeof next === "string") return next;
  }
  return "";
}

function gitRoot(cwd: string): string | null {
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (result.exitCode !== 0) return null;
    return decode(result.stdout).trim() || null;
  } catch {
    return null;
  }
}

function readActiveTask(root: string): { manifest?: ActiveTaskManifest; warning?: string } {
  const manifestPath = join(root, ".codex-harness", "active-task.json");
  if (!existsSync(manifestPath)) return {};

  try {
    return { manifest: JSON.parse(readFileSync(manifestPath, "utf8")) as ActiveTaskManifest };
  } catch {
    return { warning: `Task boundary warning: active task manifest is malformed:\n${manifestPath}` };
  }
}

function outputWarning(message: string) {
  console.log(JSON.stringify({
    systemMessage: message,
  }));
}

function decode(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}
