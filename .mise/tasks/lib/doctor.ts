// 환경 검증 로직. runDoctor()는 검증을 수행하고 실패·경고 카운트를 반환.

import { $ } from "bun";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { c, ok, warn, fail, info, header, resolvePaths } from "./shared.ts";

function has(cmd: string): boolean {
  return Bun.which(cmd) !== null;
}

async function dockerMemoryGB(): Promise<number | null> {
  try {
    const out = await $`docker info --format '{{.MemTotal}}'`.quiet().text();
    const bytes = parseInt(out.trim(), 10);
    if (!Number.isFinite(bytes) || bytes <= 0) return null;
    return bytes / 1024 ** 3;
  } catch {
    return null;
  }
}

export interface DoctorResult {
  failures: number;
  warnings: number;
}

export async function runDoctor(): Promise<DoctorResult> {
  const paths = resolvePaths();
  let failures = 0;
  let warnings = 0;

  console.log(`${c.magenta}🤖 Agent Harness — 환경 검증${c.reset}`);

  // ─── 필수 ──────────────────────────────────────────────
  header("🔧 필수 도구");

  if (!process.env.MISE_PROJECT_ROOT) {
    fail("mise 컨텍스트 밖 (MISE_PROJECT_ROOT 없음). `mise run ...`로 실행하세요");
    failures++;
  } else {
    ok("mise 컨텍스트 OK");
  }

  if (has("yolobox")) {
    try {
      const v = (await $`yolobox version`.quiet().text()).trim().split("\n")[0];
      ok(`yolobox 발견 (${v})`);
    } catch {
      ok("yolobox 발견");
    }
  } else {
    fail("yolobox 없음. 설치: brew install finbarr/tap/yolobox");
    failures++;
  }

  if (has("tmux")) {
    ok("tmux 발견");
  } else {
    fail("tmux 없음. 설치: apt install tmux (Ubuntu) / brew install tmux (macOS)");
    failures++;
  }

  const dockerOk =
    has("docker") &&
    (await $`docker info`.quiet().nothrow()).exitCode === 0;
  const podmanOk =
    has("podman") &&
    (await $`podman info`.quiet().nothrow()).exitCode === 0;
  if (dockerOk) {
    ok("Docker 데몬 응답");
  } else if (podmanOk) {
    ok("Podman 데몬 응답");
  } else {
    fail("Docker/Podman 데몬 응답 없음. 데몬을 시작하세요");
    failures++;
  }

  // ─── 경고 ──────────────────────────────────────────────
  header("📋 권장 사항");

  if (dockerOk) {
    const memGB = await dockerMemoryGB();
    if (memGB === null) {
      warn("Docker 메모리 정보 가져오기 실패 (무시 가능)");
      warnings++;
    } else if (memGB < 4) {
      warn(`Docker 메모리 ${memGB.toFixed(1)}GB < 4GB. 에이전트가 OOM될 수 있음`);
      warnings++;
    } else {
      ok(`Docker 메모리 ${memGB.toFixed(1)}GB`);
    }
  }

  const gitignorePath = join(paths.root, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf8");
    const needsEntries = [".opencode", ".claude", ".codex", ".gemini", ".copilot"]
      .filter((d) => !content.includes(d));
    if (needsEntries.length === 0) {
      ok(".gitignore에 에이전트 디렉토리 등록됨");
    } else {
      warn(`.gitignore에 추가 권장: ${needsEntries.join("  ")}`);
      warnings++;
    }
  } else {
    warn(".gitignore 없음. 에이전트 설정·자격증명 디렉토리 보호 안 됨");
    warnings++;
  }

  // ─── 정보 ──────────────────────────────────────────────
  header("📍 프로젝트 정보");
  info(`경로         : ${paths.root}`);
  info(`프로젝트     : ${paths.projectName}`);

  return { failures, warnings };
}
