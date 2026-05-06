# PixiJS Prototype Framework Research

> 이 문서는 대화를 통해 설계된 프레임워크의 의도, 목표, 설계 결정 및 그 이유를 다른 에이전트(또는 개발자)가 컨텍스트 없이도 이어받을 수 있도록 작성되었다.

Use `docs/pixi-framework.md` for the current framework quick start, architecture overview, runtime API, and implementation boundaries.

UI tokens, layout rules, safe-area policy, and component contracts are summarized for agents in the root `DESIGN.md`. Treat that file as the concise design-system source of truth, and use this document for broader framework rationale.

---

## 1. 배경 및 목표

### 왜 만드는가

게임 프로토타입을 빠르게 만들고, **모바일과 PC에서 설치 없이 동일한 URL로 플레이테스트**할 수 있는 환경이 필요하다. 매번 새 프로토타입을 설치하는 방식을 피하고, 샌드박스 앱(Capacitor 등)에서 URL만 바꿔 로드하는 형태를 목표로 한다.

### 왜 PixiJS인가

- LÖVE2D는 프로토타입에 이상적인 구조(`load/update/draw` 콜백, 내장 물리·오디오)를 가지고 있으나 웹 배포가 불편하고(love.js 유지보수 부족), Flutter 임베딩은 공수가 크다.
- PixiJS는 렌더러 레이어만 담당하므로 그 위에 어떤 아키텍처를 얹을지 완전히 자유롭다.
- 브라우저 기반이므로 URL 공유만으로 모바일/PC 동시 플레이테스트가 가능하다.

### 핵심 목표 요약

1. LÖVE2D 개발 경험에 가까운 API를 제공한다.
2. 비동기(에셋 로딩 등)는 프레임워크 내부에서 흡수하여 게임 코드에 노출하지 않는다.
3. 게임 구성(씬, 오브젝트, 전환)은 선언적으로 읽힌다.
4. 매 프레임 로직은 LÖVE 스타일 콜백으로 작성한다.
5. 오브젝트 단위 로직은 경량 ECS로 재사용 가능하게 한다.

### 앱 서페이스와 UI 계약

Pixi surface tokens, reference resolution, `adaptive-expand` behavior, safe-area policy, layer shape, and component contracts are canonical in the root `DESIGN.md`. This document should explain why the runtime needs those concepts, not redefine the contract.

Runtime responsibilities remain project-owned:

- resize the Pixi renderer/canvas to the browser viewport
- maintain the surface root, world/UI/debug layers, and design-space layout context
- collect CSS safe-area insets and expose them in design-space units
- provide scene APIs that avoid child-index assumptions
- keep DOM development overlays outside the Pixi scene tree

UI composition should prefer `@pixi/layout` and semantic primitives from `src/ui`. Gameplay, world, and effect placement may still use explicit design-space coordinates when that keeps game logic clearer. Current implementation and validation status lives in `docs/pixi-status.md`.

### Build and debug policy

현재 GitHub Pages는 서비스 릴리즈가 아니라 공유 가능한 개발 데모다.

- `bun run build`는 `build:demo` alias다.
- `bun run build:demo`는 `VITE_DEMO_DEBUG=true`로 빌드하며 layout debug panel을 포함한다.
- `bun run build:release`는 `VITE_DEMO_DEBUG=false`로 빌드하며 debug overlay module을 번들에서 제외한다.
- Pages workflow는 `bun run check` 후 `bun run build:demo`를 사용한다.

layout debug panel:

- DOM overlay로 구현한다. Pixi scene/layer 구조에 섞지 않는다.
- app surface 생성 직후 scene start보다 먼저 설치한다. `pageshow`/`visibilitychange`/ticker sync에서 DOM 연결 상태를 확인하고, 패널이 분리되면 다시 붙인다.
- `Fold/Open`으로 조작 버튼과 stats를 접을 수 있다. 접힘 상태는 layout debug 자체를 끄지 않고 DOM 패널 표시만 줄인다.
- `@pixi/layout` 내장 debug renderer를 토글한다.
- `All / World / UI` 필터로 layout debug 대상 노드를 제한한다.
- `DS` 버튼은 Storybook 대체용 runtime design system scene으로 이동한다.
- Debug/E2E 관측 상태는 typed debug store에 모으고 `window.__pixiDebug`가 Playwright용 adapter로 미러링한다. 현재 bridge는 `boot`, `sceneIndex`, `demo`, `designSystem`, `runtime`, `layout` 상태와 `version`, `getSnapshot()`, `dispatch(command)`를 노출하며 `VITE_DEMO_DEBUG=false` release build에서는 no-op이다.

### Debug and navigation direction

The current DOM debug panel is useful as a development inspector, but it should not keep growing into the primary sandbox app navigation. Shared demos should present an app-owned Pixi surface:

```text
Boot
  -> Scene Index
  -> Sample Scene
     + AppShell
       - TopBar: scene name, back/navigation actions
       - ContentHost: scene or page content
       - BottomBar: controls/debug sheet triggers
       - BottomSheetHost: scene controls or debug content
```

Accepted direction:

- Scene navigation and sample discovery should move into a Pixi Scene Index after the boot action.
- Floating DOM controls should be reduced to development inspection duties, such as layout bounds tooling, while app navigation and scene controls move into Pixi UI.
- Scene-specific controls should render as bottom sheet content so mobile portrait playtesting keeps a clean default screen.
- AppShell is only one member of a broader Pixi layout component system. Repeated content surfaces such as popups, settings, shops, sample indexes, and scene controls should reuse layout components instead of scene-local coordinate placement.
- `@pixi/layout` should remain the default for AppShell slots, bars, sheets, and sample lists. `@pixi/ui` remains deferred until controls like sliders, checkboxes, scroll/list, or text input repeat across scenes.

Debug/E2E bridge direction:

- `window.__pixiDebug` should become a thin Playwright adapter, not the source of truth for app state.
- Runtime/debug state should live in a typed debug store with `getSnapshot`, `patch`, and app-internal `subscribe`.
- Test and debug commands should enter through a typed command API, for example `scene.open`, `layout.set`, `sheet.open`, `sheet.close`, and `app.reload`.
- The public window contract should stay small: `version`, `getSnapshot()`, and `dispatch(command)`.
- Pixi debug sheets and app UI must use the store and command modules directly, not read `window.__pixiDebug`.
- Release builds should keep the bridge and DOM debug UI absent or tree-shaken, with E2E or bundle checks proving `window.__pixiDebug` is not installed.

Promotion criteria:

- Directional architecture belongs here until implemented.
- Surface/layout contracts move to `DESIGN.md` before implementation.
- Implemented API and usage examples move to `docs/pixi-framework.md` only after the corresponding `src/` modules exist.
- Current status and validation coverage move to `docs/pixi-status.md`.

### 입력과 모바일 기본 동작

게임 surface에서는 브라우저 기본 제스처가 게임 입력을 방해하지 않아야 한다.

- `touch-action: none`
- `user-select: none`
- 필요 시 `contextmenu` 차단
- long press text selection 방지
- pointer/touch 입력은 keyboard 입력과 별도 런타임 모듈로 제공한다.
- pointer runtime은 browser coordinate를 surface design-space coordinate로 변환해 scene에 제공한다.
- scene은 viewport 픽셀을 직접 읽지 않고 `ctx.pointer`의 `isDown()`, `wasPressed()`, `wasReleased()`, `position()`을 사용한다.

### 명시적으로 기본값에서 제외

- `cover/crop`: 화면은 채우지만 중요한 콘텐츠가 잘릴 수 있으므로 기본 정책으로 쓰지 않는다.
- `stretch`: 비율 왜곡이 발생하므로 쓰지 않는다.
- `contain/fit` 단독: 중요한 콘텐츠는 보존하지만 레터박스가 생기므로 기본 정책으로 쓰지 않는다.

---

## 2. 탐색했다 기각한 방향들

### Flutter + LÖVE2D 네이티브 임베딩

- LÖVE2D의 `love.graphics`는 OpenGL 컨텍스트를 직접 소유하려 하고, Flutter도 자체 Impeller/Skia 렌더 컨텍스트를 가져서 두 렌더러가 충돌한다.
- 현실적 우회법(Flutter `Texture` 위젯 + dart:ffi 오프스크린 렌더링)은 레이턴시와 픽셀 복사 비용이 생긴다.
- iOS에서 LuaJIT의 JIT 컴파일러가 App Store 빌드에서 동작하지 않는다 (인터프리터 모드만 가능).
- **기각 이유**: 프로토타입 단계에서 감수하기엔 공수가 너무 크다.

### love.js (WASM)

- Emscripten으로 LÖVE를 WebAssembly로 컴파일한 프로젝트. URL 공유로 설치 없이 실행 가능.
- **기각 이유**: 유지보수가 커뮤니티 의존적이고 최신 LÖVE 버전을 즉시 따라가지 못함. `love.audio`가 Web AudioContext 제약을 받음. 게임 로직·렌더링은 돌아가지만 프로덕션 방향으로 발전시키기 어렵다.

### PixiJS 단독 플랫 스크립트

- `app.ticker.add()` 하나에 전부 — 개념 검증(PoC) 수준엔 충분하지만 씬 전환이 필요해지는 순간 구조 없이 커진다.
- **기각 이유**: 두 번째 프로토타입부터 이미 한계. 프레임워크 없이는 매 프로토타입마다 동일한 보일러플레이트를 반복 작성하게 된다.

### 선언적 API 단독

씬/오브젝트 구성을 순수 선언으로만 하려 했으나 실패했다.

- 선언적 구조의 가정은 "씬이 정적 상태"인데, 게임 로직은 본질적으로 매 프레임 절차적이다.
- LÖVE 콜백 철학("지금 이 프레임에 뭘 해라")과 선언적 철학("이런 상태일 때 이렇게 보여라")이 충돌한다.
- `on.update` 안에 로직이 커지면 결국 명령형 코드 덩어리가 선언문 안에 들어가는 형태가 되어 선언적 이점이 사라진다.
- **결론**: 선언은 "무엇이 있나"(씬 구성, 에셋, 오브젝트 트리)에만 쓰고, "지금 뭘 하나"는 콜백, "오브젝트가 어떻게 동작하나"는 ECS로 레이어를 분리한다.

---

## 3. LÖVE2D에서 배운 것 (설계 근거)

### LÖVE 백엔드가 콜백 전에 처리하는 것들

LÖVE의 콜백은 결과물을 받는 창구일 뿐이며, 실제 작업은 C++ 레벨에서 미리 완료된다.

| 콜백 | C++ 백엔드가 먼저 처리하는 것 |
|------|-------------------------------|
| `love.load()` 전 | SDL 초기화, OpenGL 컨텍스트, OpenAL, PhysFS, LuaJIT VM, love.* 모듈 바인딩 |
| `love.update(dt)` 전 | SDL 이벤트 폴링, 키/마우스 상태 갱신, dt 측정, Box2D 스텝, 충돌 이벤트 큐잉, 오디오 버퍼링 |
| `love.draw()` 전/후 | 백버퍼 클리어, 렌더 상태 초기화, 스프라이트 배치 플러시, 백버퍼 스왑, vsync |

이 구조를 PixiJS 런타임에서 재현하는 것이 프레임워크의 핵심 역할이다.

### LÖVE의 비동기 부재

LÖVE는 비동기 문제가 없는 게 아니라 발생할 수 없는 구조다.
- 파일시스템이 로컬 전용(PhysFS)이고 C++ I/O가 블로킹이므로 `love.load()`가 리턴될 때 모든 에셋이 메모리에 있음이 보장된다.
- 대용량 에셋은 `love.thread` + Channel로 백그라운드 로드하지만 번거로워서 대부분 블로킹으로 감수한다.

**PixiJS 대응 전략**: 프레임워크가 `await PIXI.Assets.loadBundle()`을 내부에서 소비한 뒤 `load(ctx)`를 호출한다. 게임 코드의 `load()`는 `async`가 아니며, 이 시점에 `assets.get()`은 항상 동기로 접근 가능하다.

현재 구현 상태와 검증 기준은 `docs/pixi-status.md`에 둔다. 이 문서는 async 흡수, scene lifecycle, asset contract의 장기 설계 근거만 소유한다.

### LÖVE의 레벨 로드 패턴

LÖVE에서 레벨 전환은 씬 전환 타이밍에 블로킹으로 처리한다.
- 단순 블로킹 (`gotoLevel(n)`에서 새 에셋 로드, 프레임 잠깐 끊김)
- 로딩 씬 + 청크 분산 (매 프레임 1~2개씩 로드, 프로그레스바)
- `love.thread` 백그라운드 로드 (번거로워서 잘 안 씀)

**PixiJS 대응**: `await PIXI.Assets.loadBundle()`이 게임 루프를 살려둔 채로 백그라운드 로드를 자연스럽게 처리한다. 로딩 애니메이션이 공짜로 된다.

---

## 3. 아키텍처 설계

### 세 레이어 분리 원칙

```
게임 코드   →  무엇이 있나 (선언) + 지금 뭘 하나 (콜백) + 오브젝트 로직 (ECS)
런타임      →  비동기 흡수, 생명주기, 순서 보장, 모듈 제공
PixiJS      →  렌더링만
```

각 레이어는 아래 레이어를 알지만 위 레이어를 모른다. 게임 코드는 런타임의 존재를 모르고 `love.*` 네임스페이스를 통해 서비스를 받는다.

### 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│  게임 코드 (사용자 작성)                                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ createGame() │  │   scene()    │  │  scene.load / update  │  │
│  │ boot·layers  │  │ assets·objs  │  │  동기·switchScene     │  │
│  │ camera       │  │ transition   │  │  world 주입           │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │entity().with │  │    System    │  │      Component        │  │
│  │컴포넌트 체이닝│  │query·update  │  │   순수 데이터         │  │
│  │.tag().on()   │  │엔티티·서비스만│  │   이벤트 emit        │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ love.* 네임스페이스 (전역 노출)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  런타임 (프레임워크 내부 — 게임 코드에 비노출)                    │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  SceneManager    │  │  ECS World   │  │  GameLoop        │  │
│  │  전환·로딩화면   │  │  엔티티 관리  │  │  Ticker          │  │
│  │  assets 평가     │  │  System 순서  │  │  dt 보정         │  │
│  │  async 완전흡수  │  │  tag 조회     │  │  flush 순서 보장  │  │
│  └──────────────────┘  └──────────────┘  └──────────────────┘  │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Keyboard  │ │  Mouse   │ │AssetCache│ │ Physics  │           │
│  │isDown()  │ │pointer   │ │get() 동기│ │Matter.js │           │
│  │justPress │ │터치+마우스│ │loadBundle│ │step관리  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                   │
│  ┌──────────┐ ┌──────────────────────────────────────────────┐  │
│  │  Audio   │ │  EventBus                                    │  │
│  │Howler.js │ │  System → emit → 씬 콜백 수신 (단방향)        │  │
│  └──────────┘ └──────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  PixiJS (렌더러)                                                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Application  │  │    Stage     │  │       Assets         │  │
│  │ Ticker·Canvas│  │ world/ui     │  │  loadBundle (async)  │  │
│  │              │  │ Container    │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Renderer  —  WebGL2 / WebGPU                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 씬 전환 시 비동기 흐름 다이어그램

```
switchScene("level", { levelN: 2 })
    │
    ▼
현재 씬 정리 (removeChildren · unload)
    │
    ▼
로딩 화면 표시  ◄─────────────────────────────────┐
    │                                              │
    ▼                                         async 구간
assets 평가                                   (프레임워크 내부)
  typeof assets === "function"                     │
    ? assets(ctx)   ← 동적                         │
    : assets        ← 정적                         │
    │                                              │
    ▼                                              │
await PIXI.Assets.loadBundle(list) ───────────────┘
    │
    ▼  ← 이 아래는 전부 동기
AssetCache._markReady()   (get() 동기 접근 허용)
    │
    ▼
scene.load(ctx)           (게임 코드 — async 아님)
    │
    ▼
objects 트리 빌드 + ECS world 초기화
    │
    ▼
로딩 화면 숨김 · 게임 루프 시작
    │
    ▼
매 프레임:
  1. keyboard._flush()
  2. mouse._flush()
  3. physics._step(dt)
  4. _fireContactEvents()
  5. _runSystems(dt)
  6. scene.update(dt, api)
  7. PixiJS 자동 렌더
```

### 접근 범위 다이어그램

```
┌─────────────────────────────────────────────────────┐
│ 씬 콜백  update(dt, { world, switchScene, ctx })     │
│  ✓ world.getByTag()   ✓ switchScene()               │
│  ✓ love.*             ✓ ctx                         │
│                                                     │
│   ┌─────────────────────────────────────────┐      │
│   │ System  update(dt, entities, { keyboard })│      │
│   │  ✓ 쿼리된 엔티티    ✓ love.keyboard      │      │
│   │  ✗ switchScene      ✗ 씬 정보            │      │
│   │  → 씬 전환 필요 시 e.emit("event") 으로  │      │
│   │                                         │      │
│   │  ┌─────────────────────────────────┐   │      │
│   │  │ 오브젝트 .on("update", (dt,self))│   │      │
│   │  │  ✓ self (엔티티 자신)           │   │      │
│   │  │  ✗ world  ✗ switchScene        │   │      │
│   │  └─────────────────────────────────┘   │      │
│   └─────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘

이벤트 단방향 흐름:
System → e.emit("died") → EventBus → 씬 콜백 수신 → switchScene()
```

### 레이어 1 — 게임 코드

#### 선언 레이어 (`scene()`, `createGame()`)

씬 구성, 에셋 목록, 오브젝트 트리, 씬 전환 조건, 트랜지션을 선언한다. 코드를 읽으면 씬 구조가 보여야 한다.

```typescript
createGame({
  boot: "menu",           // scenes 키 중 하나. 문자열인 이유: 순환 참조 방지.
                          // TypeScript에서 SceneKey 타입으로 오타 방지 가능.
  layers: ["world", "ui"],
  camera: { follow: "player", lerp: 0.1 },

  scenes: {
    menu: scene({
      assets: ["ui/logo.png", "audio/title.ogg"],   // 정적 배열
      objects: [ sprite("ui/logo.png").at(400, 200) ],
      transition: { in: fadeIn(0.3), out: fadeOut(0.2) },
    }),

    level: scene({
      assets: (ctx) => [                             // 동적: ctx 받는 함수
        `levels/level${ctx.levelN}.png`,
        `audio/level${ctx.levelN}.ogg`,
      ],
      objects: (ctx) => [
        tilemap(`levels/level${ctx.levelN}.png`).at(0, 0),
        entity("player")
          .with(Position(ctx.spawnX ?? 100, 300))
          .with(Velocity())
          .with(Sprite("player.png"))
          .with(PlayerInput())
          .with(Collider({ r: 16 }))
          .tag("player"),
      ],
      systems: [MovementSystem, CollisionSystem, CameraSystem],
    }),
  },
})
```

**`assets` 이중 지원 설계**:
- `string[]` (정적) 또는 `(ctx) => string[]` (동적) 둘 다 받는다.
- 프레임워크 내부에서 `typeof scene.assets === "function" ? scene.assets(ctx) : scene.assets`로 판단.
- 게임 코드 입장에서는 "배열을 주느냐, 배열을 반환하는 함수를 주느냐" 차이만 있고 이후 동작은 동일.

#### 콜백 레이어 (`scene.load`, `scene.update`)

씬 수준의 로직만 담당한다. 오브젝트 개별 로직은 System이 처리하므로, 콜백은 씬 전환 판단과 씬 전체에 영향을 주는 의사결정만 한다.

```typescript
levelScene.load = (ctx) => {
  // async가 아님. 이 시점에 assets.get()은 동기로 접근 가능.
  // 에셋을 파싱하거나 초기 상태를 계산하는 용도.
  state.map = parseTiled(love.assets.get(`levels/level${ctx.levelN}.png`))
}

levelScene.update = (dt, { world, switchScene, ctx }) => {
  // 씬 전환 조건만. 오브젝트 로직은 System에서.
  const player = world.getByTag("player")
  if (player.get(Health).value <= 0)
    switchScene("gameover", { score: player.get(Score).value })
  if (player.get(Position).x > ctx.goalX)
    switchScene("level", { levelN: ctx.levelN + 1 })
}
```

**`load()`가 동기인 이유**: 프레임워크가 `await Assets.loadBundle()` 완료 후 `load()`를 호출하므로 이 시점은 항상 에셋 로드가 끝난 상태다. `async`를 게임 코드에 노출하지 않는 것이 설계 원칙.

#### ECS 레이어 (System, Component)

오브젝트 단위 로직을 씬과 무관하게 재사용한다.

```typescript
// Component — 순수 데이터
const Position = (x = 0, y = 0) => ({ x, y })
const Velocity = (x = 0, y = 0) => ({ x, y })
const Health   = (value = 3)    => ({ value })

// System — query에 매칭되는 엔티티만 처리
const MovementSystem = {
  query: [Position, Velocity],
  update(dt, entities) {
    for (const e of entities) {
      const pos = e.get(Position)
      const vel = e.get(Velocity)
      pos.x += vel.x * dt
      pos.y += vel.y * dt
    }
  }
}

const PlayerInputSystem = {
  query: [Velocity, PlayerInput],
  update(dt, entities, { keyboard }) {
    for (const e of entities) {
      const vel = e.get(Velocity)
      vel.x = keyboard.isDown("ArrowRight") ?  200
            : keyboard.isDown("ArrowLeft")  ? -200 : 0
      if (keyboard.justPressed("Space")) vel.y = -400
    }
  }
}
```

**접근 범위 제한**:

| 레이어 | 접근 가능 | 접근 불가 |
|--------|-----------|-----------|
| System | 쿼리된 엔티티, 공유 서비스(keyboard 등) | switchScene, 씬 정보 |
| 씬 콜백 | world, switchScene, ctx | 없음 (최상위) |
| 오브젝트 `.on` | self(엔티티 자신) | world, switchScene |

**이유**: System이 `switchScene`에 접근할 수 있으면 씬을 알아버려서 재사용이 불가능해진다. System은 이벤트를 emit하고, 씬 콜백이 수신해서 전환을 결정하는 단방향 흐름을 유지한다.

---

### 레이어 2 — 런타임 (게임 코드에 비노출)

#### SceneManager

씬 전환의 전체 흐름을 관리한다. 비동기는 이 안에서만 존재한다.

```typescript
async _switchScene(name: string, ctx: Record<string, any> = {}) {
  // 1. 현재 씬 정리
  await this._destroyScene()

  // 2. 로딩 화면 표시
  this._showLoader()

  // 3. assets 평가 (정적/동적 모두 처리)
  const scene = this._scenes[name]
  const assetList = typeof scene.assets === "function"
    ? scene.assets(ctx)
    : (scene.assets ?? [])

  // 4. 비동기 로드 (이 구간만 async)
  await ctx.assets.load(assetList)

  // 5. 이후는 전부 동기
  ctx.assets.get("player.png")            // get() 동기 접근 가능
  scene.load?.(ctx)                        // 게임 코드 load() 호출
  this._buildObjects(scene, ctx)           // ECS world 초기화
  this._hideLoader()
  this._startLoop()
}
```

#### GameLoop (Ticker)

콜백 실행 순서를 보장한다. LÖVE 백엔드의 "update 전 처리" 구조를 재현한다.

```
매 프레임 순서:
1. keyboard._flush()        justPressed 큐 초기화
2. mouse._flush()           justClicked 큐 초기화
3. physics._step(dt)        Matter.js 물리 스텝
4. _fireContactEvents()     충돌 이벤트 발행
5. _runSystems(dt)          ECS System 실행
6. scene.update(dt, api)    씬 콜백 실행
7. (PixiJS 자동 렌더)
```

**dt 보정**: `Math.min(ticker.deltaMS / 1000, 1/30)` — 탭 전환 후 복귀 시 deltaMS 스파이크로 물리가 폭발하는 것을 방지. LÖVE는 C++이 자동 처리하는 부분.

#### 모듈 목록

| 모듈 | 역할 | 대응 LÖVE |
|------|------|-----------|
| `KeyboardModule` | `isDown()`, `justPressed()`, 매 프레임 flush | `love.keyboard` |
| `MouseModule` | pointer 이벤트 통합 (터치+마우스) | `love.mouse` + `love.touch` |
| `AssetCache` | `get()` 동기 접근 보장, loadBundle 래핑 | `love.graphics.newImage()` 등 |
| `PhysicsModule` | Matter.js 래핑, 스텝 관리, 충돌 이벤트 | `love.physics` (Box2D 내장) |
| `AudioModule` | 환경별 구현체 교체 (Howler.js / CapacitorBridge) | `love.audio` (OpenAL 내장) |
| `EventBus` | System → 씬 콜백 단방향 통신 | 없음 (설계 추가) |

모든 모듈은 `window.love.*` 네임스페이스로 전역 노출된다.

**AudioModule 설계 원칙 — 인터페이스 고정, 구현체 환경별 교체**

게임 코드는 항상 `love.audio.play("bgm")`으로 동일하게 호출한다. 런타임이 실행 환경을 감지해서 구현체를 선택한다.

```typescript
// 환경 감지
const isCapacitor = window.Capacitor?.isNativePlatform()

// 런타임 내부 — 게임 코드는 모름
love.audio = isCapacitor
  ? new CapacitorAudioBridge()  // 네이티브 오디오 → 자동재생 제약 없음
  : new HowlerAudio()           // Web Audio API → 제스처 필요

// 게임 코드 — 항상 동일
love.audio.play("bgm")
```

오디오 자동재생은 브라우저 정책으로 PWA/Capacitor WebView 모두 동일하게 차단된다. Capacitor 환경에서 `@capacitor-community/native-audio` 같은 플러그인으로 네이티브 레이어를 직접 호출하면 WebView 제약을 우회할 수 있다. 브라우저(PWA) 환경에서는 "탭 to start" 화면으로 사용자 제스처를 확보하는 것이 표준 해결책이다.

배포 전략(PWA vs Capacitor)은 미결이며, AudioModule은 어느 쪽이든 인터페이스 변경 없이 구현체만 교체하면 된다.

#### 레이어 / 카메라

```typescript
createGame({
  layers: ["world", "ui"],     // 선언 순서 = 렌더 순서
  camera: {
    follow: "player",          // tag로 타겟 지정
    lerp: 0.1,
  },
})

// "world" 레이어 → camera Container (매 프레임 이동)
// "ui"    레이어 → hud Container    (고정)
// layer() 미선언 시 기본값 "world"
```

카메라가 "player" 태그를 가진 엔티티를 자동 추적하므로 플레이어 레퍼런스를 별도로 관리할 필요가 없다.

---

### 레이어 3 — PixiJS

렌더링만 담당한다. 프레임워크는 PixiJS의 `Application`, `Stage`, `Assets`, `Renderer`를 사용하되 게임 코드에 직접 노출하지 않는다.

- `Application`: Ticker 및 Canvas 관리
- `Stage`: world / ui Container 분리
- `Assets.loadBundle()`: 씬 전환 시 런타임이 내부에서 호출
- `Renderer`: WebGL2 기본, WebGPU 지원 시 자동 사용

---

## 4. 전역 vs 주입 결정

**결론: 레이어별로 접근 범위를 다르게 주입한다.**

전역 객체(`Game.switchScene()` 등)를 허용하면 System 내부에서 씬 전환 호출이 가능해져 System의 재사용성이 깨진다. 주입 방식으로 접근 범위를 강제하는 것이 설계 원칙.

단, `love.*` 모듈(keyboard, assets, audio 등)은 전역으로 노출한다. 이는 LÖVE의 `love.keyboard.isDown()` 같은 API와 동일한 UX를 제공하기 위함이며, System 내부에서도 자연스럽게 접근할 수 있어야 하기 때문이다.

---

## 5. 비동기 설계 결정

**결론: 에셋 관련 비동기는 프레임워크가 완전히 숨긴다. 게임 코드에 `async/await`가 올라오지 않는다.**

### 이유

- 비동기를 노출하면 `load()`가 `async`가 되고, 로드 후 초기화 로직이 생기면 Promise 체인이 게임 코드로 올라온다.
- 프레임워크가 `await Assets.loadBundle()` 완료를 보장한 뒤 `load()`를 호출하면 게임 코드는 항상 "에셋이 준비된 상태"를 가정할 수 있다.
- LÖVE의 블로킹 I/O가 주는 "준비된 상태 보장"을 브라우저 환경에서 재현하는 방법이다.

### 동적 에셋 지원

씬 컨텍스트에 따라 로드할 파일이 달라지는 경우, `assets`를 함수로 선언한다.

```typescript
// 정적
assets: ["player.png", "bgm.ogg"]

// 동적
assets: (ctx) => [`levels/level${ctx.levelN}.png`]
```

프레임워크 내부 판단:
```typescript
const list = typeof scene.assets === "function"
  ? scene.assets(ctx)
  : scene.assets
await PIXI.Assets.loadBundle(list)
```

게임 코드 입장에서는 "배열 또는 배열을 반환하는 함수" 차이만 있고, 이후 동작은 동일하다.

---

## 6. ECS 도입 이유 및 범위

### 왜 ECS인가

- `scene.update()` 안에서 오브젝트를 일일이 순회하면 씬이 커질수록 콜백이 비대해진다.
- System으로 오브젝트 로직을 분리하면 `MovementSystem`, `CollisionSystem` 등을 모든 씬에서 `systems: [...]`에 선언만 하면 재사용된다.
- 프로토타입 초반에 ECS를 전면 도입하면 설계 비용이 크므로, 씬 콜백과 공존하는 경량 구조를 선택한다.

### 언제 ECS를 쓰나

- 같은 로직이 여러 씬에서 반복될 때 System으로 추출
- 오브젝트 종류가 컴포넌트 조합으로 자연스럽게 설명될 때
- 메카닉이 안정된 후 리팩터링 시점에 도입 (프로토타입 0일차에 강제하지 않음)

### 이벤트 흐름

```
System → e.emit("died")
       → EventBus 수신
       → 씬 콜백 world.events.has("died") 체크
       → switchScene("gameover")
```

System은 씬을 모르고 이벤트만 발행한다. 씬 콜백이 이벤트를 수신해서 전환을 결정한다. 단방향 흐름을 유지한다.

---

## 7. PixiJS 위에서 선택 가능한 구조 패턴 (왜 이 프레임워크가 필요한가)

PixiJS는 렌더러이므로 그 위에 어떤 게임 아키텍처를 얹을지 완전히 자유롭다. 이 프레임워크는 아래 세 패턴을 통합한다.

| 패턴 | 적합한 시점 | 한계 |
|------|------------|------|
| 플랫 스크립트 | 0일차 PoC, 씬 하나 | 씬 전환 불가, 규모 확장 어려움 |
| Scene Manager | 프로토타입 표준, 씬 전환 필요 | 씬간 상태 공유 설계 필요 |
| ECS | 메카닉 안정 후, 오브젝트 재사용 필요 | 초기 설계 비용 큼 |

**이 프레임워크의 포지션**: Scene Manager(씬 선언·전환)를 기반으로 하되, ECS(System·Component)를 선택적으로 얹을 수 있고, LÖVE 스타일 콜백(`load/update`)으로 씬 로직을 작성한다. 프로토타입 초반엔 플랫 스크립트처럼 빠르게 시작하고, 규모가 커지면 ECS를 도입하는 점진적 구조다.

### PixiJS와 LÖVE2D의 핵심 구조 차이

| | LÖVE2D | PixiJS |
|---|---|---|
| 씬 그래프 | 없음 (콜백만) | Container 트리 |
| 렌더 순서 | 개발자가 draw()에서 직접 제어 | 트리 순회가 결정 |
| `draw()` 역할 | love.graphics.* 직접 호출 | **거의 비워둠** — PixiJS 자동 렌더 |
| 물리 | Box2D 내장 | Matter.js 별도 |
| 오디오 | OpenAL 내장 | Howler.js 별도 |
| 루프 소유 | 프레임워크 소유 | 개발자 소유 (ticker) |

**`love.draw()`가 거의 비어있는 이유**: PixiJS는 `stage` 트리를 매 프레임 자동으로 렌더링한다. `update()`에서 sprite의 x/y를 바꿔두면 다음 프레임에 자동 반영된다. `draw()`는 `Graphics` 객체를 매 프레임 동적으로 재드로우해야 할 때(궤적, 동적 도형 등)만 사용한다.

### 게임 엔진 요소별 LÖVE → PixiJS 대응

#### 입력
- LÖVE: SDL 이벤트 폴링 결과를 `love.keyboard.isDown()` 테이블로 제공. `keypressed` 콜백은 프레임 단위 트리거.
- PixiJS: `keydown/keyup` 이벤트로 직접 맵 관리. `justPressed`는 프레임워크가 매 프레임 flush하는 별도 Set으로 구현.
- 터치와 마우스: PixiJS `eventMode="static"` + `pointerdown` 이벤트로 통합. LÖVE의 `love.mouse` + `love.touch` 분리와 달리 단일 인터페이스.

#### 충돌
- LÖVE: Box2D 내장. `love.physics.newWorld()` → `world:update(dt)` → `beginContact` 콜백.
- PixiJS 프레임워크: Matter.js 래핑. 물리 스텝은 GameLoop가 `scene.update()` 전에 자동 실행. 충돌 이벤트는 EventBus를 통해 씬 콜백에 전달.
- 프로토타입 초반: AABB 직접 구현으로 시작해도 충분. 물리가 핵심 메카닉일 때만 Matter.js 붙임.

#### 오디오
- LÖVE: OpenAL 내장. `love.audio.newSource()` 동기 로드.
- PixiJS 프레임워크: Howler.js 래핑. 에셋 선언에 오디오 파일 포함 시 씬 전환 타이밍에 프레임워크가 로드. `love.audio.play()` 인터페이스 유지.

#### 카메라
- LÖVE: 없음. `love.graphics.push()` → `love.graphics.translate(-cam.x, -cam.y)` → `love.graphics.pop()` 직접 구현.
- PixiJS 프레임워크: `world` Container의 x/y를 이동시키는 것으로 동일 효과. `camera: { follow: "player" }` 선언으로 자동 추적. `ui` 레이어는 별도 Container라 카메라 영향 없음.

---

## 8. 미결 사항 및 다음 단계

| 항목 | 상태 | 메모 |
|------|------|------|
| 플랫폼 배포 전략 | 미결 | PWA(URL 공유, 설치 불필요) vs Capacitor(네이티브 오디오 브릿지 가능) 검토 필요. AudioModule은 어느 쪽이든 인터페이스 변경 없음. |
| `boot` 타입 안전성 | 미결 | `type SceneKey = keyof typeof scenes`로 문자열 키 타입화 가능 |
| 트랜지션 API 상세 | 미결 | `fadeIn(duration)` 구조는 정의됨, 내부 구현 미작성 |
| ECS 구현체 선택 | 미결 | bitECS(성능) vs miniplex(간결) vs 직접 구현 |
| 오브젝트 빌더 체이닝 전체 | 미결 | `sprite().at().anchor().scale().tag().on()` API 구현 필요 |
| 물리 추상화 수준 | 미결 | Matter.js를 직접 노출할지 래핑 깊이 결정 필요 |
| 로딩 화면 커스터마이징 | 미결 | 기본 스피너 제공, 오버라이드 API 필요 |
| `love.draw()` 역할 | 결정됨 | 동적 Graphics 재드로우만. 위치 갱신은 update에서. |
| `dt` 단위 | 결정됨 | 초(seconds). `ticker.deltaMS / 1000`. max 1/30 클램프. |
| `assets` 이중 지원 | 결정됨 | 배열 또는 `(ctx) => 배열` 모두 허용 |
| 전역 vs 주입 | 결정됨 | `love.*` 모듈은 전역, `switchScene/world`는 콜백 주입 |
| 비동기 노출 여부 | 결정됨 | 프레임워크가 흡수. 게임 코드 `load()`는 동기. |

---

## 9. 참고: LÖVE2D와의 대응 요약

| LÖVE2D | 이 프레임워크 |
|--------|---------------|
| `love.load()` | `scene.load(ctx)` — 동기, 에셋 준비 후 호출 |
| `love.update(dt)` | `scene.update(dt, { world, switchScene })` |
| `love.draw()` | 자동 렌더. 동적 드로우만 별도 처리. |
| `love.keyboard.isDown()` | `love.keyboard.isDown()` — 동일 |
| `love.keypressed()` | `love.keyboard.justPressed()` |
| `love.graphics.newImage()` | `love.assets.get()` — 동기, load() 이후 |
| `love.physics` (Box2D 내장) | `love.physics` (Matter.js 래핑) |
| `love.audio` (OpenAL 내장) | `love.audio` (Howler.js 래핑) |
| `love.thread` + Channel | 불필요 — 프레임워크가 비동기 흡수 |
| 씬 관리 없음 (직접 구현) | `SceneManager` 내장 |
| 카메라 없음 (직접 구현) | `camera: { follow, lerp }` 선언 |
| ECS 없음 | 경량 ECS 내장 |
