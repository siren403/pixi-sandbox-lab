export type KeyName = string;

export type Keyboard = {
  isDown: (key: KeyName) => boolean;
  wasPressed: (key: KeyName) => boolean;
  destroy: () => void;
};

export type KeyboardDevice = Keyboard & {
  preUpdate: () => void;
  postUpdate: () => void;
  clearAll: () => void;
};

type KeyboardSnapshot = {
  down: Set<string>;
  pressed: Set<string>;
};

type KeyboardRawState = {
  down: Set<string>;
  pressed: Set<string>;
};

function createKeyboardSnapshot(): KeyboardSnapshot {
  return {
    down: new Set(),
    pressed: new Set(),
  };
}

function createKeyboardRawState(): KeyboardRawState {
  return {
    down: new Set(),
    pressed: new Set(),
  };
}

export function createKeyboard(target: Window = window): KeyboardDevice {
  const raw = createKeyboardRawState();
  const snapshot = createKeyboardSnapshot();

  const normalize = (key: string) => key.toLowerCase();

  const onKeyDown = (event: KeyboardEvent) => {
    const key = normalize(event.key);
    if (raw.down.has(key)) return;
    raw.down.add(key);
    raw.pressed.add(key);
  };

  const onKeyUp = (event: KeyboardEvent) => {
    raw.down.delete(normalize(event.key));
  };

  const onBlur = () => {
    clearAll();
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", onBlur);

  const preUpdate = () => {
    snapshot.down = new Set(raw.down);
    snapshot.pressed = new Set(raw.pressed);
    raw.pressed.clear();
  };

  const postUpdate = () => {
    snapshot.pressed.clear();
  };

  const clearAll = () => {
    raw.down.clear();
    raw.pressed.clear();
    snapshot.down.clear();
    snapshot.pressed.clear();
  };

  return {
    isDown(key) {
      return snapshot.down.has(normalize(key));
    },
    wasPressed(key) {
      const normalized = normalize(key);
      return snapshot.pressed.has(normalized);
    },
    preUpdate() {
      preUpdate();
    },
    postUpdate() {
      postUpdate();
    },
    clearAll() {
      clearAll();
    },
    destroy() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("blur", onBlur);
      clearAll();
    },
  };
}
