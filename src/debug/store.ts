export type DebugStore<T extends object> = {
  getSnapshot: () => T;
  patch: (patch: Partial<T>) => T;
  subscribe: (listener: (snapshot: T) => void) => () => void;
};

export function createDebugStore<T extends object>(initialState: T): DebugStore<T> {
  let snapshot = initialState;
  const listeners = new Set<(snapshot: T) => void>();

  return {
    getSnapshot() {
      return snapshot;
    },
    patch(patch) {
      snapshot = {
        ...snapshot,
        ...patch,
      };
      for (const listener of listeners) listener(snapshot);
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
