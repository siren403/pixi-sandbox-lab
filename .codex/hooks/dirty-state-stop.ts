import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

type HookInput = {
  cwd?: string;
  hook_event_name?: string;
  session_id?: string;
  model?: string;
};

type ActiveTaskManifest = {
  schema_version?: number;
  status?: string;
  task_id?: string;
  title?: string;
  scope?: {
    in?: string[];
    out?: string[];
  };
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

const rootResult = runGit(["rev-parse", "--show-toplevel"], cwd);
const root = rootResult.ok ? rootResult.stdout.trim() || cwd : cwd;

let status;
try {
  status = Bun.spawnSync(["git", "status", "--short"], {
    cwd: root,
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

const dirtyLines = decode(status.stdout)
  .split("\n")
  .map((line) => line.trimEnd())
  .filter(Boolean);

const activeTask = readActiveTask(root);
const manifest = activeTask.manifest;
const warnings: string[] = [];
if (activeTask.warning) {
  warnings.push(activeTask.warning);
}

if (dirtyLines.length > 0) {
  warnings.push(`Working tree is dirty:\n${dirtyLines.join("\n")}`);

  if (!manifest || manifest.status !== "active") {
    warnings.push("No active task manifest is open. Run task-start before editing, or use task-end to classify and close the current dirty state.");
  } else {
    const outsideScope = findOutsideScope(dirtyLines, manifest, root);
    if (outsideScope.length > 0) {
      warnings.push(`Dirty paths outside the active task scope:\n${outsideScope.join("\n")}`);
    }
  }
}

if (manifest?.status === "active") {
  const label = manifest.task_id ? `${manifest.task_id}${manifest.title ? ` (${manifest.title})` : ""}` : "(missing task_id)";
  warnings.push(`Active task manifest is still open: ${label}. Use task-end or mise run active-task -- close before final closeout.`);
}

if (warnings.length > 0) {
  outputWarning(warnings.join("\n\n"));
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

function runGit(args: string[], runCwd: string): { ok: true; stdout: string } | { ok: false; stderr: string } {
  try {
    const result = Bun.spawnSync(["git", ...args], {
      cwd: runCwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (result.exitCode !== 0) {
      return { ok: false, stderr: decode(result.stderr).trim() };
    }
    return { ok: true, stdout: decode(result.stdout) };
  } catch (error) {
    return { ok: false, stderr: String(error) };
  }
}

function readActiveTask(root: string): { manifest?: ActiveTaskManifest; warning?: string } {
  const manifestPath = join(root, ".codex-harness", "active-task.json");
  if (!existsSync(manifestPath)) return {};

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ActiveTaskManifest;
    return { manifest };
  } catch {
    return { warning: `Active task manifest is malformed:\n${manifestPath}` };
  }
}

function findOutsideScope(lines: string[], manifest: ActiveTaskManifest, root: string): string[] {
  const scopeIn = normalizeScopeEntries(manifest.scope?.in ?? []);
  const scopeOut = normalizeScopeEntries(manifest.scope?.out ?? []);
  if (scopeIn.length === 0 && scopeOut.length === 0) return [];

  const outside: string[] = [];
  for (const line of lines) {
    const path = statusPath(line);
    if (!path) continue;
    const normalized = normalizePath(path, root);
    const explicitlyOut = scopeOut.some((scope) => pathMatchesScope(normalized, scope));
    const outsideIn = scopeIn.length > 0 && !scopeIn.some((scope) => pathMatchesScope(normalized, scope));
    if (explicitlyOut || outsideIn) {
      outside.push(`${line} (${explicitlyOut ? "matches scope.out" : "not in scope.in"})`);
    }
  }
  return outside;
}

function statusPath(line: string): string | undefined {
  const path = line.slice(3).trim();
  if (!path) return undefined;
  const renamed = path.split(" -> ");
  return renamed[renamed.length - 1];
}

function normalizeScopeEntries(entries: string[]): string[] {
  return entries.map((entry) => normalizePath(entry, "")).filter(Boolean);
}

function normalizePath(path: string, root: string): string {
  const trimmed = path.trim().replaceAll("\\", "/").replace(/^["']|["']$/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith(root)) {
    return relative(root, trimmed).replaceAll("\\", "/");
  }
  return trimmed.replace(/^\.\//, "").replace(/\/$/, "");
}

function pathMatchesScope(path: string, scope: string): boolean {
  return path === scope || path.startsWith(`${scope}/`);
}
