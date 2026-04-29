import { Assets } from "pixi.js";

export type AssetList = readonly string[];

export type AssetRuntime = {
  load: (sources: AssetList) => Promise<void>;
  get: <T = unknown>(source: string) => T;
  isReady: (source: string) => boolean;
};

export function createAssetRuntime(): AssetRuntime {
  const ready = new Set<string>();

  return {
    async load(sources) {
      const uniqueSources = [...new Set(sources)];
      if (uniqueSources.length === 0) return;

      await Assets.load(uniqueSources);
      for (const source of uniqueSources) {
        ready.add(source);
      }
    },
    get<T = unknown>(source: string): T {
      if (!ready.has(source)) {
        throw new Error(`Asset is not ready: ${source}`);
      }

      return Assets.get(source) as T;
    },
    isReady(source: string): boolean {
      return ready.has(source);
    },
  };
}
