import type { Scene, SceneOpenOptions } from "./scene";

type SceneNavigator = (scene: Scene, options?: SceneOpenOptions) => boolean;

let switchScene: SceneNavigator | undefined;
let sceneIndex: Scene | undefined;

export function setSceneNavigator(navigator: SceneNavigator): void {
  switchScene = navigator;
}

export function setSceneIndexScene(scene: Scene): void {
  sceneIndex = scene;
}

export function navigateToSceneIndex(): boolean {
  if (!switchScene || !sceneIndex) return false;
  return switchScene(sceneIndex, { source: "scene", args: { from: "sample-shell" } });
}
