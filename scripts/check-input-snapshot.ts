import { strict as assert } from "node:assert";
import { createInput } from "../src/runtime/input";
import type { SurfaceLayout } from "../src/runtime/scene";

type Listener = (event: any) => void;

class FakeEventTarget {
  private readonly listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: Listener): void {
    let bucket = this.listeners.get(type);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(type, bucket);
    }
    bucket.add(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: any): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

class FakePointerTarget extends FakeEventTarget {
  getBoundingClientRect(): DOMRect {
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      toJSON: () => ({}),
    } as DOMRect;
  }

  setPointerCapture(_pointerId: number): void {}
  releasePointerCapture(_pointerId: number): void {}
}

class FakeWindowTarget extends FakeEventTarget {}

const layout: SurfaceLayout = {
  referenceWidth: 1080,
  referenceHeight: 1920,
  viewportWidth: 1080,
  viewportHeight: 1920,
  scale: 1,
  visibleWidth: 1080,
  visibleHeight: 1920,
  referenceX: 0,
  referenceY: 0,
  safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
};

const pointerTarget = new FakePointerTarget();
const keyboardTarget = new FakeWindowTarget();
const input = createInput({
  pointerTarget: pointerTarget as unknown as HTMLElement,
  keyboardTarget: keyboardTarget as unknown as Window,
  getLayout: () => layout,
});

const pointerDown = (x: number, y: number): void => {
  pointerTarget.dispatch("pointerdown", {
    pointerId: 1,
    clientX: x,
    clientY: y,
    preventDefault() {},
  });
};

const pointerUp = (x: number, y: number): void => {
  pointerTarget.dispatch("pointerup", {
    pointerId: 1,
    clientX: x,
    clientY: y,
    preventDefault() {},
  });
};

const wheel = (deltaY: number): void => {
  pointerTarget.dispatch("wheel", {
    deltaY,
    preventDefault() {},
  });
};

const keyDown = (key: string, repeat = false): void => {
  keyboardTarget.dispatch("keydown", {
    key,
    repeat,
    preventDefault() {},
  });
};

const keyUp = (key: string): void => {
  keyboardTarget.dispatch("keyup", {
    key,
    preventDefault() {},
  });
};

pointerDown(100, 200);
input.preUpdate();
assert.equal(input.pointer.wasPressed(), true);
assert.equal(input.pointer.wasPressed(), true);
input.postUpdate();
input.preUpdate();
assert.equal(input.pointer.wasPressed(), false);

pointerUp(100, 200);
input.preUpdate();
assert.equal(input.pointer.wasReleased(), true);
assert.equal(input.pointer.wasReleased(), true);
input.postUpdate();
input.preUpdate();
assert.equal(input.pointer.wasReleased(), false);

wheel(120);
input.preUpdate();
assert.equal(input.pointer.wheelDelta(), 120);
assert.equal(input.pointer.wheelDelta(), 120);
input.postUpdate();
input.preUpdate();
assert.equal(input.pointer.wheelDelta(), 0);

keyDown("Enter");
input.preUpdate();
assert.equal(input.keyboard.wasPressed("enter"), true);
assert.equal(input.keyboard.wasPressed("enter"), true);
input.postUpdate();
input.preUpdate();
assert.equal(input.keyboard.wasPressed("enter"), false);

keyDown("Enter", true);
input.preUpdate();
assert.equal(input.keyboard.wasPressed("enter"), false);
assert.equal(input.keyboard.isDown("enter"), true);
keyUp("Enter");
input.preUpdate();
assert.equal(input.keyboard.isDown("enter"), false);

input.destroy();

console.log("input snapshot contract ok");
