import type { RuntimeContext } from "./scene";
import type { InputRuntime } from "./input";

export type RuntimeSystems = {
  preUpdate: (dt: number, ctx: RuntimeContext) => void;
  postUpdate: (dt: number, ctx: RuntimeContext) => void;
  destroy: () => void;
};

export function createRuntimeSystems(input: InputRuntime): RuntimeSystems {
  return {
    preUpdate(_dt, _ctx) {
      input.preUpdate();
    },
    postUpdate(_dt, _ctx) {
      input.postUpdate();
    },
    destroy() {
      input.destroy();
    },
  };
}
