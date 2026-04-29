export type KeyName = string;

export type Keyboard = {
  isDown: (key: KeyName) => boolean;
  wasPressed: (key: KeyName) => boolean;
  destroy: () => void;
};

export function createKeyboard(target: Window = window): Keyboard {
  const down = new Set<string>();
  const pressed = new Set<string>();

  const normalize = (key: string) => key.toLowerCase();

  const onKeyDown = (event: KeyboardEvent) => {
    const key = normalize(event.key);
    if (!down.has(key)) pressed.add(key);
    down.add(key);
  };

  const onKeyUp = (event: KeyboardEvent) => {
    down.delete(normalize(event.key));
  };

  const onBlur = () => {
    down.clear();
    pressed.clear();
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", onBlur);

  return {
    isDown(key) {
      return down.has(normalize(key));
    },
    wasPressed(key) {
      const normalized = normalize(key);
      const result = pressed.has(normalized);
      pressed.delete(normalized);
      return result;
    },
    destroy() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("blur", onBlur);
      down.clear();
      pressed.clear();
    },
  };
}
