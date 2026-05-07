# PixiJS Prototype Framework

이 문서는 현재 데모 안에 구현된 PixiJS 프로토타입 프레임워크를 사용하는 관점에서 정리한 빠른 시작, 런타임 구조, 씬 작성 API, surface/layout 스펙이다.

관련 문서의 역할은 다르다.

- `DESIGN.md`: surface 토큰, 1080x1920 기준 해상도, safe-area, UI 컴포넌트 계약의 source of truth
- `docs/pixi-stack.md`: LÖVE2D, PixiJS, async asset loading, scene lifecycle을 선택한 설계 근거
- `docs/pixi-status.md`: 현재 구현 상태와 Playwright 검증 상태
- 이 문서: 프레임워크를 실제로 쓰거나 확장할 때 먼저 읽는 사용 문서

## Quick Start

개발 서버:

```bash
bun install
mise run setup-browser
bun run dev
```

빠른 검증:

```bash
bun run check
```

전체 E2E:

```bash
mise run check-browser
bun run test:e2e
```

릴리즈 빌드:

```bash
bun run build:release
```

GitHub Pages용 데모 빌드는 debug panel을 포함하는 `bun run build:demo`를 사용한다. 서비스용 릴리즈 검증은 `VITE_DEMO_DEBUG=false`인 `bun run build:release`로 확인한다.

## Minimal App

현재 엔트리는 `src/main.ts`처럼 `createGame()`에 부모 DOM, 기준 해상도, 배경색, boot scene을 넘긴다.

```ts
import "./styles.css";
import { createGame } from "./runtime/createGame";
import { bootScene } from "./scenes/intro";

void createGame({
  parent: "#app",
  width: 1080,
  height: 1920,
  background: "#17202a",
  boot: bootScene,
});
```

`width`와 `height`는 디자인 기준 해상도다. 런타임은 브라우저 viewport를 채우고, 기준 해상도를 작은 축 기준으로 스케일한 뒤 남는 축의 visible design bounds를 확장한다. 이 정책은 `adaptive-expand`이며 critical UI는 safe-area frame 안에 배치해야 한다.

## Minimal Scene

씬은 `scene()` 헬퍼로 정의한다. `load(ctx)`는 동기 함수다. `assets`에 선언한 파일은 `load()`가 호출되기 전에 런타임이 먼저 로드하므로 `ctx.assets.get()`을 동기로 사용할 수 있다.

```ts
import { Graphics } from "pixi.js";
import { scene } from "../runtime/scene";
import { surfaceTheme } from "../ui/tokens";

export const sampleScene = scene({
  name: "sample",
  assets: [],

  load({ layers, surface }) {
    const radius = surface.token(surfaceTheme.size.markerRadius);
    const center = surface.center();

    const marker = new Graphics()
      .circle(0, 0, radius)
      .fill(surfaceTheme.color.marker);

    marker.label = "sample-marker";
    marker.position.set(center.x, center.y);
    layers.world.addChild(marker);
  },

  update(dt, { keyboard, layers }) {
    const marker = layers.world.getChildByLabel("sample-marker") as Graphics | null;
    if (!marker) return;

    if (keyboard.isDown("arrowright")) marker.x += 300 * dt;
    if (keyboard.isDown("arrowleft")) marker.x -= 300 * dt;
  },

  unload({ layers }) {
    for (const child of layers.world.removeChildren()) {
      child.destroy({ children: true });
    }
  },
});
```

## Scene Lifecycle

현재 scene lifecycle은 단순하게 유지한다.

```text
createGame()
  -> create Pixi Application
  -> create surface layers
  -> create SceneContext
  -> SceneManager.start(boot)

switchScene(next)
  -> accept/drop command through commandRuntime
  -> optional transition animate-in
  -> previous.unload(ctx)
  -> evaluate next.assets
  -> await ctx.assets.load(...)
  -> next.load(ctx)
  -> optional transition animate-out

each frame
  -> current.update(dt, ctx)

resize
  -> update SurfaceLayout
  -> current.resize(ctx)
```

중복 scene switch 요청은 `commandRuntime`이 drop한다. 이 덕분에 Tap to start, debug panel 버튼, 키 입력이 짧은 시간에 겹쳐도 transition과 scene load가 중복 생성되지 않는다.

## SceneContext

`SceneContext`는 씬이 직접 쓰는 런타임 표면이다.

```ts
type SceneContext = {
  app: Application;
  stage: Container;
  layers: SurfaceLayers;
  assets: AssetRuntime;
  keyboard: Keyboard;
  pointer: Pointer;
  layout: SurfaceLayout;
  surface: SurfaceContext;
  scene: SceneMetadata;
  runtime: RuntimeApi;
  switchScene: (scene: Scene, options?: SceneOpenOptions) => boolean;
};

type SceneMetadata = {
  name: string;
  source: CommandSource;
  args: <T = unknown>() => T | undefined;
};
```

`ctx.runtime`은 scene authoring용 runtime facade다. 현재 공개된 범위는 scene readiness 대기와 scene 전환 요청이며, loading/app mode/counter 같은 mutable runtime state는 internal `runtimeState`로 격리한다.

```ts
ctx.runtime.scene.open(nextScene);
ctx.switchScene(nextScene, { source: "scene", args: { selectedSample: "design-system" } });
await ctx.runtime.scene.whenReady({ scene: "scene-index", interactive: true });
```

일반 scene code에서는 전환 요청용 `ctx.switchScene()`을 기본으로 사용한다. `ctx.runtime.scene.whenReady()`는 framework/debug/E2E처럼 완료 시점이 중요한 곳에서 제한적으로 사용한다.

현재는 migration 중이라 `ctx.layout`, `ctx.keyboard`, `ctx.pointer`를 계속 노출한다. 새 코드에서는 가능한 한 `ctx.surface`를 우선 사용한다.

### Scene Args

Scene args는 한 번의 scene 전환 요청에 붙는 가벼운 payload다. 기존 `ctx.switchScene(nextScene, "debug")` 호출은 계속 지원하고, 새 코드에서 source와 args를 함께 넘길 때는 options object를 쓴다.

```ts
ctx.switchScene(detailsScene, {
  source: "scene",
  args: { itemId: "orb-01" },
});

const args = ctx.scene.args<{ itemId?: string }>();
```

`ctx.scene`은 현재 active scene의 metadata이며 `name`, `source`, `args<T>()`를 포함한다. `args<T>()`는 runtime validation이 아니라 TypeScript 편의용 assertion이다. Args는 runtime이 소유하거나 merge하는 전역 store가 아니다. 전환 순간의 선택값, initial tab, optional sheet 같은 작은 입력에만 쓰고, inventory/progression/shop state처럼 오래 살아야 하는 값은 별도 game state/store로 둔다.

### Runtime Readiness

Runtime readiness는 scene 전환이 “요청됨”과 “플레이 가능한 상태가 됨”을 분리하기 위한 계약이다.

`ctx.switchScene()`과 `ctx.runtime.scene.open()`은 요청 수락 여부만 반환한다. 새 scene에서 필요한 상태는 scene 자체의 `load`/`update` 흐름이나 명시적인 game state로 전달하고, 전환 완료 후 검증이 필요한 framework/debug/E2E 코드는 `ctx.runtime.scene.whenReady(criteria)`를 기다린다.

`interactiveReady`는 다음 조건이 모두 true일 때만 true다.

- `sceneLifecycle === "ready"`
- `transitionLifecycle === "idle"`
- `loadingPhase === "idle"`이고 runtime loading이 아님
- 실행 중인 runtime command가 없음
- `appMode === "interactive"`

`RuntimeReadyCriteria`는 현재 active scene과 true 조건만 매칭한다. `{ scene, interactive: true }`는 특정 scene이 interactive-ready가 될 때까지 기다리는 기본 E2E 패턴이고, `{ transitionIdle: true, commandIdle: true }`처럼 낮은 수준의 조건은 transition/debug 검증에만 사용한다. scene code가 from-scene 선택값에 따라 to-scene을 다르게 구성해야 할 때는 `whenReady()` 완료 콜백에 의존하지 말고, 명시적인 scene args 또는 game state/store를 통해 전달한다.

### SurfaceContext

`ctx.surface`는 surface 좌표계와 layout 업데이트를 한 곳에서 다루기 위한 얇은 facade다.

```ts
surface.layout
surface.token(token)
surface.screen(token)
surface.safeFrame(margin?)
surface.center(frame?)
surface.anchor(anchor, frame?)
surface.updateLayout(container?)
```

- `token()`은 디자인 토큰을 현재 surface scale에 맞는 design-space 값으로 변환한다.
- `screen()`은 토큰의 실제 screen-space px 값을 확인할 때 쓴다.
- `safeFrame()`은 visible design bounds에서 safe-area와 margin을 뺀 frame을 반환한다.
- `center()`와 `anchor()`는 visible frame 또는 전달한 frame 안의 기준점을 반환한다.
- `updateLayout()`은 기본적으로 `layers.root`에 대해 `@pixi/layout` 업데이트를 실행한다.

`surface`는 게임 로직을 소유하지 않는다. 좌표계와 UI 배치 실수를 줄이는 도구일 뿐이다.

### Layers

현재 Pixi layer 구조:

```text
app.stage
└─ stage
   └─ surface-root
      ├─ world-layer
      ├─ ui-layer
      └─ debug-layer
```

- `layers.world`: gameplay, camera 대상, world coordinate 오브젝트
- `layers.ui`: HUD, menu, design-system scene, safe-area-aware UI
- `layers.debug`: runtime/debug용 Pixi layer

씬 코드는 child index에 의존하지 말고 `ctx.layers`를 사용한다.

## Surface And Layout Spec

현재 surface 정책:

- 기준 해상도: `1080 x 1920` portrait
- canvas: browser viewport 전체를 채움
- 스케일: `adaptive-expand`
- safe-area: CSS safe-area inset을 design-space 단위로 변환
- UI: safe-area-aware `@pixi/layout` container와 `src/ui` primitive 우선
- gameplay/world/effect: 명시 좌표 허용

금지 기본값:

- `cover/crop`: 중요한 콘텐츠가 잘릴 수 있으므로 기본 정책으로 쓰지 않는다.
- `stretch`: 비율 왜곡 때문에 쓰지 않는다.
- `contain/fit` 단독: 레터박스가 생기므로 기본 정책으로 쓰지 않는다.

자세한 토큰과 컴포넌트 계약은 `DESIGN.md`가 기준이다. 이 문서에서 수치를 다시 정의하지 않는다.

## UI Primitives

반복 UI는 scene-local `Graphics + Text`로 직접 만들지 말고 `src/ui` primitive로 승격한다.

현재 primitive:

- `createButton()` in `src/ui/button.ts`, using project-owned drawing plus `@pixi/ui` `ButtonContainer` events
- `createLabel()` in `src/ui/label.ts`
- `createPanel()` in `src/ui/panel.ts`
- `configureSafeAreaColumn()` / `configureSafeAreaRow()` in `src/ui/layout.ts`

권장 기준:

- HUD, menu, modal, panel, repeated control은 layout-first로 작성한다.
- 버튼 텍스트는 수평/수직 중앙 정렬이 기본 계약이다.
- design-system scene에 추가하는 주요 샘플은 layout node여야 debug bounds로 확인할 수 있다.
- `@pixi/ui`는 최소 이벤트 단위인 `ButtonContainer`부터 사용한다. `FancyButton`, slider, checkbox, scroll/list, text input 같은 상위 컴포넌트는 실제 요구가 생길 때 평가한다.

## Scene Index And App Shell

The boot action now opens a Pixi-native Scene Index instead of jumping directly into the vertical slice. The Scene Index is the sandbox sample browser for implemented and planned scenes.

Current entries:

- `Vertical Slice`
- `Design System`
- `Camera Sample - planned`
- `Layout Sample - planned`
- `Motion Sample - planned`

The first common layout shell lives in `src/ui/layouts/appShell.ts`.

```text
AppShell
├─ top-bar
├─ content-host
├─ bottom-bar
└─ bottom-sheet-host
```

The first implementation is intentionally small:

- `TopBar` shows the current surface title.
- `ContentHost` contains the scene list.
- `BottomBar` exposes `Controls` and `Debug` triggers.
- `BottomSheetHost` opens scene controls or debug placeholder content.

Scene switching and sample registry decisions stay outside `AppShell`. The shell owns placement slots, exposes `readAppShellButtonBounds()`, and resolves shell button hits through `resolveAppShellHit()` so scenes do not duplicate AppShell hit-test loops. Generic button and UI bounds helpers live in `src/ui/button.ts` for non-shell buttons such as the boot action and Scene Index sample entries.

Scaffold contract:

- `AppShell` itself belongs in `layers.ui`.
- UI/content scenes such as scene index, design-system, settings, shop, inventory, and component gallery put their primary content under `AppShell.contentHost`.
- Gameplay/world scenes may keep world objects under `layers.world`; their HUD, navigation, controls, and debug sheets should use AppShell slots or other safe-area-aware UI.
- Boot/splash scenes may remain AppShell exceptions when they are immediate start, loading, or branding screens.
- Content-host scenes must not attach primary content as a sibling of `AppShell`, because top/bottom bars and bottom sheets can cover it.

## World And Camera

월드 좌표와 카메라는 `src/runtime/world.ts`, `src/runtime/worldCamera.ts`가 담당한다.

```ts
const world = createWorld(layers.world, { width: 3600, height: 5200 });
const camera = world.createCamera(surface.layout, {
  minZoom: 0.32,
  maxZoom: 2.2,
});

const player = new Graphics();
player.position.set(world.center().x, world.center().y);
world.clampObject(player, 80);

camera.centerOn(player.x, player.y, surface.layout);
camera.updateGesture(pointer, surface.layout);
camera.apply(surface.layout);
```

현재 API는 아직 `layout`과 `pointer`를 직접 넘긴다. 다음 정리 대상은 `ctx.createWorld(bounds)`와 `camera.updateFromInput(...)`처럼 반복 인자를 줄이는 것이다.

## Input

키보드:

```ts
keyboard.isDown("a")
keyboard.wasPressed("enter")
```

포인터:

```ts
pointer.isDown()
pointer.wasPressed()
pointer.wasReleased()
pointer.position()
pointer.pointers()
pointer.wheelDelta()
```

`pointer.position()`은 viewport px가 아니라 surface scale이 제거된 design-space 좌표다. world camera가 있는 씬에서는 `camera.screenToWorld(pointer.position())`로 world 좌표로 변환한다. 이 함수명은 현재 구현명이며, 향후 `designToWorld()`로 정리할 수 있다.

## Assets

`Scene.assets`는 정적 배열 또는 `(ctx) => array`를 받는다.

```ts
import type { Texture } from "pixi.js";
import spriteUrl from "../assets/sprite.png";

export const sceneWithAsset = scene({
  name: "asset-demo",
  assets: [spriteUrl],

  load({ assets }) {
    const texture = assets.get<Texture>(spriteUrl);
  },
});
```

계약:

- `load()`에서 `assets.get()`은 동기다.
- 로드되지 않은 source를 `get()`하면 오류를 던진다.
- GitHub Pages subpath 배포를 위해 asset은 Vite import URL을 우선 사용한다.

## Scene Transition

`Scene.transition`은 씬 전환 연출을 켜거나 끄는 공개 설정이다. 전환 구현은 현재 debug layer의 Pixi overlay로 그려지지만, 씬 API에서는 overlay가 아니라 transition으로 다룬다.

```ts
export const menuScene = scene({
  name: "menu",
  transition: {
    enabled: true,
    minimumMs: 0,
  },
});
```

계약:

- `transition.enabled: false`는 해당 씬으로 들어갈 때 전환 연출을 만들지 않는다.
- `transition.minimumMs`는 async asset loading이 너무 빨리 끝나도 전환 로딩 상태를 최소 유지할 시간이다.
- `loading.overlay`는 이전 설정명과의 호환용으로만 남긴다. 새 씬은 `transition`을 사용한다.

## Debug And E2E

debug build는 DOM 기반 layout debug panel과 `window.__pixiDebug` bridge를 포함한다.

Debug state now flows through a typed runtime store before reaching the window adapter:

```text
src/debug/store.ts
  -> getSnapshot / patch / subscribe

src/debug/commands.ts
  -> typed command dispatch

src/debug/stateBridge.ts
  -> legacy stateBridge setters
  -> window.__pixiDebug adapter
```

The public E2E-facing adapter shape is:

```ts
window.__pixiDebug = {
  version: 1,
  getSnapshot(): PixiDebugState,
  dispatch(command): DebugCommandResult | Promise<DebugCommandResult>,
  whenReady(criteria): Promise<RuntimeReadySnapshot>,
}
```

`whenReady()` is an E2E adapter over runtime-owned readiness. It must not infer scene readiness from debug-only rendered flags. Runtime readiness is based on the active scene, scene lifecycle, transition lifecycle, loading phase, command idle state, and `appMode`.

Legacy direct fields such as `window.__pixiDebug.runtime` and `window.__pixiDebug.demo` remain mirrored for compatibility, but Playwright specs should read state through `getSnapshot()` and wait through `whenReady()`. Direct field reads belong inside the bridge implementation or in narrowly documented legacy checks.

Playwright input should use `dispatch(command)` rather than firing `pixi:*` DOM events directly. The current command surface covers `app.reload`, `scene.open`, and `layout.set`; legacy DOM events remain only for internal debug overlay compatibility.

주요 기능:

- 현재 scene 이름 표시
- folded/open 상태 저장
- 드래그 위치 저장
- reload 버튼
- layout bounds/filter 토글
- boot, vertical slice, design-system scene 이동

E2E는 Playwright로 desktop portrait와 mobile portrait를 검증한다. 현재 분리된 spec:

- `tests/e2e/boot.spec.ts`
- `tests/e2e/transition.spec.ts`
- `tests/e2e/world-camera.spec.ts`
- `tests/e2e/debug-panel.spec.ts`
- `tests/e2e/design-system.spec.ts`
- `tests/e2e/reload.spec.ts`

framework 또는 surface 변경 후 기본 검증:

```bash
bun run check
mise run check-browser
bun run test:e2e
bun run build:release
```

## Current Boundaries

현재 구현된 것:

- Pixi app bootstrap
- scene lifecycle
- sync `load(ctx)` with framework-owned async asset loading
- command-guarded scene switch
- transition overlay
- adaptive surface layout
- keyboard/pointer input
- world bounds and world camera
- Scene Index sample browser
- AppShell and BottomSheet skeleton
- typed debug store and thin E2E window adapter
- UI primitives and design-system scene
- debug panel and Playwright E2E

아직 프레임워크 API로 확정하지 않은 것:

- ECS
- physics
- audio
- generalized scene-local state manager
- generic entity/component authoring API
- `@pixi/ui` controls
- fully migrated Debug bottom sheet
- production deployment policy

연구 문서에 있는 장기 방향을 구현된 API처럼 사용하지 않는다. 새 기능은 vertical slice에서 검증한 뒤 이 문서와 `docs/pixi-status.md`를 함께 갱신한다.
