import type { Scene } from "./scene";
import type { RuntimeInternalState } from "./scene";

export type AppMode = "interactive" | "transitioning" | "loading" | "destroyed";
export type CommandSource = "scene" | "intro" | "debug";
export type SceneSwitchTask = () => Promise<void>;

export type CommandRuntime = {
  requestSceneSwitch: (scene: Scene, source: CommandSource, task: SceneSwitchTask) => boolean;
  isRunning: (key?: string) => boolean;
  destroy: () => void;
};

type CommandRuntimeOptions = {
  runtimeState: Pick<
    RuntimeInternalState,
    "appMode" | "sceneSwitchRequests" | "acceptedCommands" | "ignoredCommands" | "runningCommands"
  >;
  onChange?: () => void;
  onError?: (error: unknown) => void;
};

const sceneSwitchCommand = "switchScene";

export function createCommandRuntime({
  runtimeState,
  onChange = () => {},
  onError = console.error,
}: CommandRuntimeOptions): CommandRuntime {
  const running = new Set<string>();

  const syncRunningCommands = () => {
    runtimeState.runningCommands = Array.from(running);
    onChange();
  };

  return {
    requestSceneSwitch(_scene, _source, task) {
      runtimeState.sceneSwitchRequests += 1;

      if (runtimeState.appMode !== "interactive" || running.has(sceneSwitchCommand)) {
        runtimeState.ignoredCommands += 1;
        onChange();
        return false;
      }

      runtimeState.acceptedCommands += 1;
      runtimeState.appMode = "transitioning";
      running.add(sceneSwitchCommand);
      syncRunningCommands();

      void task()
        .catch(onError)
        .finally(() => {
          running.delete(sceneSwitchCommand);
          if (runtimeState.appMode !== "destroyed") runtimeState.appMode = "interactive";
          syncRunningCommands();
        });

      return true;
    },

    isRunning(key) {
      return key ? running.has(key) : running.size > 0;
    },

    destroy() {
      running.clear();
      runtimeState.appMode = "destroyed";
      syncRunningCommands();
    },
  };
}
