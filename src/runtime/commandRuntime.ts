import type { Scene } from "./scene";

export type AppMode = "interactive" | "transitioning" | "loading" | "destroyed";
export type CommandSource = "scene" | "intro" | "debug";
export type SceneSwitchTask = () => Promise<void>;

export type CommandRuntime = {
  requestSceneSwitch: (scene: Scene, source: CommandSource, task: SceneSwitchTask) => boolean;
  isRunning: (key?: string) => boolean;
  destroy: () => void;
};

type CommandRuntimeOptions = {
  runtime: {
    appMode: AppMode;
    sceneSwitchRequests: number;
    acceptedCommands: number;
    ignoredCommands: number;
    runningCommands: string[];
  };
  onChange?: () => void;
  onError?: (error: unknown) => void;
};

const sceneSwitchCommand = "switchScene";

export function createCommandRuntime({
  runtime,
  onChange = () => {},
  onError = console.error,
}: CommandRuntimeOptions): CommandRuntime {
  const running = new Set<string>();

  const syncRunningCommands = () => {
    runtime.runningCommands = Array.from(running);
    onChange();
  };

  return {
    requestSceneSwitch(_scene, _source, task) {
      runtime.sceneSwitchRequests += 1;

      if (runtime.appMode !== "interactive" || running.has(sceneSwitchCommand)) {
        runtime.ignoredCommands += 1;
        onChange();
        return false;
      }

      runtime.acceptedCommands += 1;
      runtime.appMode = "transitioning";
      running.add(sceneSwitchCommand);
      syncRunningCommands();

      void task()
        .catch(onError)
        .finally(() => {
          running.delete(sceneSwitchCommand);
          if (runtime.appMode !== "destroyed") runtime.appMode = "interactive";
          syncRunningCommands();
        });

      return true;
    },

    isRunning(key) {
      return key ? running.has(key) : running.size > 0;
    },

    destroy() {
      running.clear();
      runtime.appMode = "destroyed";
      syncRunningCommands();
    },
  };
}
