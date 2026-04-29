// agent 태스크들이 공유하는 상수·헬퍼

import { join, basename } from "node:path";
import { mkdirSync } from "node:fs";

export const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

export const ok = (msg: string) => console.log(`  ${c.green}✓${c.reset} ${msg}`);
export const warn = (msg: string) => console.log(`  ${c.yellow}⚠${c.reset} ${msg}`);
export const fail = (msg: string) => console.log(`  ${c.red}✗${c.reset} ${msg}`);
export const info = (msg: string) => console.log(`  ${c.dim}·${c.reset} ${msg}`);
export const header = (msg: string) =>
  console.log(`\n${c.bold}${c.cyan}${msg}${c.reset}`);

export interface HarnessPaths {
  root: string;
  projectName: string;
}

export function resolvePaths(): HarnessPaths {
  const root = process.env.MISE_PROJECT_ROOT ?? process.cwd();
  const projectName = basename(root).replace(/[^a-zA-Z0-9_-]/g, "_");
  return { root, projectName };
}

const YOLOBOX_FLAG_MAP: Record<string, string> = {
  "--host-auth":   "--codex-config",
  "--claude-auth": "--claude-config",
  "--gemini-auth": "--gemini-config",
};

export function parseArgs(argv: string[]): { yoloboxFlags: string[]; toolArgs: string[] } {
  const yoloboxFlags: string[] = [];
  const toolArgs: string[] = [];
  for (const arg of argv) {
    const mapped = YOLOBOX_FLAG_MAP[arg];
    mapped ? yoloboxFlags.push(mapped) : toolArgs.push(arg);
  }
  return { yoloboxFlags, toolArgs };
}

// opencode만 프로젝트별 마운트 사용; 나머지는 yolobox-home 공유 볼륨으로 관리
const OPENCODE_MOUNTS = {
  config: (root: string) => ({
    src: join(root, ".opencode"),
    dst: "/home/yolo/.config/opencode",
  }),
  data: (root: string) => ({
    src: join(root, ".opencode-data"),
    dst: "/home/yolo/.local/share/opencode",
  }),
};

export async function launchAgent(
  tool: string,
  extraArgs: string[] = [],
  yoloboxFlags: string[] = [],
): Promise<never> {
  const paths = resolvePaths();
  const session = `${tool}-${paths.projectName}`;

  // opencode uses project-scoped mounts; collect them as yolobox global flags.
  // All yolobox flags go before the subcommand so they aren't forwarded to the tool.
  const allYoloboxFlags = [...yoloboxFlags];
  if (tool === "opencode") {
    const cfg = OPENCODE_MOUNTS.config(paths.root);
    const data = OPENCODE_MOUNTS.data(paths.root);
    mkdirSync(cfg.src, { recursive: true });
    mkdirSync(data.src, { recursive: true });
    allYoloboxFlags.push("--mount", `${cfg.src}:${cfg.dst}`, "--mount", `${data.src}:${data.dst}`);
  }

  // yolobox tool shortcuts don't accept extra args — must use `yolobox run <tool>` for passthrough.
  // Flags go after the subcommand but before the tool/cmd: `yolobox run --flag cmd` or `yolobox tool --flag`
  const subCmd = extraArgs.length > 0
    ? ["run", ...allYoloboxFlags, tool, ...extraArgs]
    : [tool, ...allYoloboxFlags];

  // Wrap in sh -c so the pane stays open on error (tmux alternate screen hides error output on exit).
  // On error: drop into an interactive shell so the user can inspect; `exit` to close.
  const cmdStr = ["yolobox", ...subCmd].map(a => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
  const shellScript = `${cmdStr}; _ec=$?; if [ $_ec -ne 0 ] && [ $_ec -ne 130 ]; then printf '\\n\\033[31m✗ 오류 (exit %d). 확인 후 exit 으로 닫으세요.\\033[0m\\n' $_ec; exec "\${SHELL:-sh}"; fi`;
  const args = ["tmux", "new-session", "-A", "-s", session, "sh", "-c", shellScript];

  const proc = Bun.spawn(args, { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  process.exit(code === 0 || code === 130 ? 0 : (code ?? 1));
}
