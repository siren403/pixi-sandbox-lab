import type { Pointer, PointerDevice } from "./pointer";
import { createPointer } from "./pointer";
import type { Keyboard, KeyboardDevice } from "./keyboard";
import { createKeyboard } from "./keyboard";
import type { SurfaceLayout } from "./scene";

export type InputRuntime = {
  pointer: Pointer;
  keyboard: Keyboard;
  preUpdate: () => void;
  postUpdate: () => void;
  destroy: () => void;
};

export type InputApi = Pick<InputRuntime, "pointer" | "keyboard">;

export type InputOptions = {
  pointerTarget: HTMLElement;
  keyboardTarget?: Window;
  getLayout: () => SurfaceLayout;
};

export function createInput(options: InputOptions): InputRuntime {
  const keyboardTarget = options.keyboardTarget ?? window;
  const pointer = createPointer(options.pointerTarget, options.getLayout) as PointerDevice;
  const keyboard = createKeyboard(keyboardTarget) as KeyboardDevice;

  const clearAll = () => {
    pointer.clearAll();
    keyboard.clearAll();
  };

  const onBlur = () => {
    clearAll();
  };

  const onPageHide = () => {
    clearAll();
  };

  keyboardTarget.addEventListener("blur", onBlur);
  keyboardTarget.addEventListener("pagehide", onPageHide);

  return {
    pointer,
    keyboard,
    preUpdate() {
      pointer.preUpdate();
      keyboard.preUpdate();
    },
    postUpdate() {
      pointer.postUpdate();
      keyboard.postUpdate();
    },
    destroy() {
      keyboardTarget.removeEventListener("blur", onBlur);
      keyboardTarget.removeEventListener("pagehide", onPageHide);
      clearAll();
      pointer.destroy();
      keyboard.destroy();
    },
  };
}
