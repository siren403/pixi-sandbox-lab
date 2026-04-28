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

export async function launchAgent(tool: string, extraArgs: string[] = []): Promise<never> {
  const paths = resolvePaths();
  const session = `${tool}-${paths.projectName}`;

  // yolobox tool shortcuts don't accept extra args — must use `yolobox run <tool>` for passthrough.
  // For opencode, project-specific --mount flags must appear before the subcommand.
  const yoloboxFlags: string[] = [];
  if (tool === "opencode") {
    const cfg = OPENCODE_MOUNTS.config(paths.root);
    const data = OPENCODE_MOUNTS.data(paths.root);
    mkdirSync(cfg.src, { recursive: true });
    mkdirSync(data.src, { recursive: true });
    yoloboxFlags.push("--mount", `${cfg.src}:${cfg.dst}`, "--mount", `${data.src}:${data.dst}`);
  }

  const yoloboxCmd = extraArgs.length > 0
    ? ["yolobox", ...yoloboxFlags, "run", tool, ...extraArgs]
    : ["yolobox", tool, ...yoloboxFlags];

  const args: string[] = ["tmux", "new-session", "-A", "-s", session, ...yoloboxCmd];
  const proc = Bun.spawn(args, { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  process.exit(code === 0 || code === 130 ? 0 : (code ?? 1));
}
