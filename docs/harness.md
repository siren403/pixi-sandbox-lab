# AI 에이전트 하네스 인프라 (PromptOps 2026, v6)

오라클 클라우드(ARM64) + Linux 호스트에서 여러 AI 에이전트를 프로젝트별로 격리된 샌드박스에서 한 줄로 띄우기 위한 최소 구성.

---

## 1. 개요

- **목표**: `mise run claude` / `mise run codex` 등 한 줄로 격리된 에이전트 세션을 띄운다. 호스트는 깨끗하게 유지.
- **지원 에이전트**: `opencode`, `claude`, `codex`, `gemini`, `copilot`
- **핵심 스택**:
  - 진입점: `mise` + `tmux`
  - 격리: `yolobox` (프로젝트 폴더를 호스트 경로 그대로 마운트)
  - 에이전트: yolobox 이미지 내장, 자동 승인 플래그 포함 (yolo 모드)
  - 샌드박스 런타임 매니저: `mise` (`.mise.toml` 자동 인식, Bun/Python 관리)

## 2. 태스크 목록

| 명령 | 별칭 | 설명 |
|---|---|---|
| `mise run opencode` | `mise o` | OpenCode yolo 모드 |
| `mise run claude` | `mise c` | Claude Code yolo 모드 |
| `mise run codex` | `mise x` | OpenAI Codex full-auto 모드 |
| `mise run gemini` | `mise g` | Gemini CLI yolo 모드 |
| `mise run copilot` | `mise p` | GitHub Copilot yolo 모드 |
| `mise run bash` | — | 초기 설정·수동 조정용 인터랙티브 bash |
| `mise run doctor` | — | 환경 검증만 단독 실행 |
| `mise run validate-skills` | — | 프로젝트 venv로 Codex skill 구조 검증 |

## 3. 책임 분담

| 계층 | 역할 | 도구 |
|---|---|---|
| 호스트 | 진입점 태스크 실행 | mise + tmux |
| 게이트 | 격리 + 마운트 | yolobox |
| 샌드박스 | 에이전트 실행 | yolobox 내장 CLI (yolo 모드) |
| 샌드박스 | 프로젝트 런타임 관리 | mise (`.mise.toml` 자동 인식) |

## 4. yolobox 에이전트 동작 방식

모든 에이전트가 동일한 이미지(`ghcr.io/finbarr/yolobox:latest`)를 사용. 차이는 컨테이너 내 CLI alias뿐:

| 서브커맨드 | 실제 실행 |
|---|---|
| `yolobox opencode` | `opencode` |
| `yolobox claude` | `claude --dangerously-skip-permissions` |
| `yolobox codex` | `codex --ask-for-approval never --sandbox danger-full-access` |
| `yolobox gemini` | `gemini --yolo` |
| `yolobox copilot` | `copilot --yolo` |

**API 키**: 호스트 환경 변수를 컨테이너로 자동 전달.

| 에이전트 | 환경 변수 |
|---|---|
| claude | `ANTHROPIC_API_KEY` |
| codex | `OPENAI_API_KEY` |
| gemini | `GEMINI_API_KEY` |
| copilot | `GITHUB_TOKEN` / `COPILOT_GITHUB_TOKEN` |

**영속성**: yolobox가 `yolobox-home` named volume을 `/home/yolo`에 자동 마운트. opencode만 추가로 프로젝트별 `.opencode/`, `.opencode-data/`를 bind mount해 프로젝트 단위로 분리.

**tmux 세션**: 에이전트별로 독립 세션 생성 (`<tool>-<projectname>`).

## 5. 디렉토리 구조

```
프로젝트 루트/
├── .mise.toml                       # 도구 정의
├── .gitignore                       # 에이전트 설정 디렉토리 제외
├── .opencode/                       # (자동 생성) OpenCode 설정·API 키
├── .opencode-data/                  # (자동 생성) OpenCode 세션 이력
└── .mise/
    ├── bootstrap.log                # (자동 생성) bash 모드 부트스트랩 로그
    └── tasks/
        ├── opencode                 # mise run opencode (alias: o)
        ├── claude                   # mise run claude   (alias: c)
        ├── codex                    # mise run codex    (alias: x)
        ├── gemini                   # mise run gemini   (alias: g)
        ├── copilot                  # mise run copilot  (alias: p)
        ├── bash                     # mise run bash
        ├── doctor                   # mise run doctor
        └── lib/
            ├── shared.ts            # 색상·경로·launchAgent() 공통 모듈
            └── doctor.ts            # 검증 로직 (runDoctor() export)
```

## 6. 셋업

```bash
# 필수 도구
brew install finbarr/tap/yolobox   # macOS
apt install tmux                    # Ubuntu

# 실행 권한 (git clone 후 한 번만)
chmod +x .mise/tasks/{opencode,claude,codex,gemini,copilot,bash,doctor}

# 환경 검증
mise run doctor

# 에이전트 실행
mise run claude     # 또는 mise c
mise run opencode   # 또는 mise o
```

## 7. 워크플로우

### 기본 모드 (에이전트 직접 실행)

1. 호스트: `mise run claude` (또는 `mise c`)
2. 태스크가 `mise run doctor` 호출 → 검증 → 1초 대기
3. tmux 세션 `claude-<projectname>` 생성/attach
4. `yolobox claude` 실행 (자동 승인 플래그 포함)
5. 종료 시: 컨테이너 폐기, 에이전트 상태는 `yolobox-home` volume에 보존

### bash 모드 (초기 설정·수동 조정)

1. 호스트: `mise run bash`
2. `mise run doctor` 검증 → 1초 대기
3. tmux 세션 `bash-<projectname>` 생성/attach
4. `yolobox run` + 부트스트랩 실행:
   - mise 설치 (named volume, 최초 1회)
   - `~/.bashrc`에 `mise activate bash` 등록 (최초 1회)
   - asdf-bun 플러그인 등록 (최초 1회, core:bun 버그 우회)
   - `mise install`로 `.mise.toml` 도구 설치
5. 인터랙티브 bash. 수동 설정 후 `exit` 종료
6. 부트스트랩 로그: `.mise/bootstrap.log`

## 8. 검증 체크리스트

처음 셋업 후 한 번씩 확인:

- `mise tasks`에 7개 태스크가 description과 함께 표시됨
- `mise run doctor`가 단독으로 동작함
- `mise run claude` (또는 원하는 에이전트)가 yolo 모드로 실행됨
- `mise run bash`로 bash 진입 후 `which bun`이 mise 관리 경로 반환
- `tmux ls`에 `<tool>-<projectname>` 세션 보임

## 9. Headless 브라우저 검증

yolobox의 기본 Codex 세션은 interactive GUI 브라우저를 전제로 하지 않는다. 브라우저 앱이나 게임을 검증할 때는 개발 서버 URL을 최종 확인 수단처럼 남기기보다, headless E2E 결과를 신뢰 가능한 검증 산출물로 보고한다.

권장 운영:

- Vite 같은 개발 서버는 검증 중에만 띄우고, 최종 보고 전에 종료한다.
- 로컬 서버는 컨테이너 내부에서 `0.0.0.0`에 bind하고, 자동 검증은 컨테이너 내부 `127.0.0.1:<port>`로 접속한다.
- 사용자가 직접 플레이해야 하는 빌드는 sandbox URL이 아니라 GitHub Pages 같은 외부 정적 배포 URL을 기본 경로로 둔다.
- Playwright 브라우저 바이너리는 `PLAYWRIGHT_BROWSERS_PATH=0`으로 project-local dependency tree 아래에 설치한다.
- Chromium 실행에 필요한 Linux library는 project dependency가 아니라 sandbox setup으로 분리한다.

예시:

```bash
mise run setup-browser
mise run check-browser
bun run build
bun run test:e2e
```

`setup-browser`는 Bun dependency 설치, project-local Playwright Chromium 설치, sandbox Chromium Linux dependency 설치, headless Chromium launch smoke check를 수행한다. 이미 준비된 sandbox를 확인할 때는 `check-browser`를 사용한다.

이 패턴은 아직 별도 skill로 승격하지 않는다. 두 번째 브라우저 앱/게임 작업에서도 같은 절차가 반복되면 `headless-browser-validation` 같은 project-local skill 후보로 재검토한다.

PixiJS 앱 서페이스 계약은 root `DESIGN.md`가 소유한다. 현재 구현 및 Playwright 검증 상태는 `docs/pixi-status.md`를 기준으로 확인한다.

## 10. 알려진 이슈

### mise core:bun 버전 목록 버그

mise의 내장 bun 플러그인(`core:bun`)이 `mise-versions.jdx.dev/bun`에서 `0.0.0-X` 형태의 가짜 버전 목록을 받아 설치에 실패하는 버그가 있음 (mise 2026.4.24 확인).

**우회책**: `bash` 모드 부트스트랩에서 `asdf-bun` 플러그인을 자동 등록. GitHub releases에서 직접 버전을 가져오므로 정상 동작.

```bash
mise plugin add bun https://github.com/cometkim/asdf-bun
mise install  # bun@1.3.13 정상 설치됨
```

### tmux 내 마우스·키보드 이슈

Claude Code, Codex 등 TUI 에이전트에서 마우스 스크롤과 Shift+Enter가 tmux 내에서 정상 동작하지 않을 수 있음. yolobox 또는 해당 CLI 상류 이슈로, 기본 동작에는 영향 없음.

## 11. 다음 단계 후보 (지금은 작업 안 함)

- gh 토큰 / SSH agent forward (`.yolobox.toml`)
- git config forward
- mise 도구를 named volume이 아닌 derived image에 베이크 (`.yolobox.Dockerfile`)
- doctor에 추가 검증 (디스크 여유, API 키 존재 여부 등)
- claude/codex 등 프로젝트별 config 격리 (`--claude-config` 등 활용)

---

## v1 → v6 변경 요약

| 항목 | v1 (원본) | v6 |
|---|---|---|
| 지원 에이전트 | OpenCode 단일 | opencode / claude / codex / gemini / copilot |
| 태스크 구조 | `agent/_default`, `agent:doctor` | 최상위 평탄 구조 (`opencode`, `claude`, ...) |
| 공통 런처 | 없음 (각 태스크에 중복) | `lib/shared.ts`의 `launchAgent(tool)` |
| tmux 세션명 | `agent-<project>` (고정) | `<tool>-<project>` (에이전트별 독립) |
| `.gitignore` | `.opencode/` 만 | 5개 에이전트 디렉토리 모두 |
| doctor gitignore 검증 | `.opencode` 존재 여부만 | 5개 에이전트 디렉토리 누락분 목록 출력 |
| yolobox 마운트 | 모든 태스크에서 `--mount` 직접 작성 | opencode만 bind mount, 나머지 yolobox-home 볼륨 |
