export type KeyName = string;

export type Keyboard = {
  isDown: (key: KeyName) => boolean;
  destroy: () => void;
};

export function createKeyboard(target: Window = window): Keyboard {
  const down = new Set<string>();

  const normalize = (key: string) => key.toLowerCase();

  const onKeyDown = (event: KeyboardEvent) => {
    down.add(normalize(event.key));
  };

  const onKeyUp = (event: KeyboardEvent) => {
    down.delete(normalize(event.key));
  };

  const onBlur = () => {
    down.clear();
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", onBlur);

  return {
    isDown(key) {
      return down.has(normalize(key));
    },
    destroy() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("blur", onBlur);
      down.clear();
    },
  };
}
