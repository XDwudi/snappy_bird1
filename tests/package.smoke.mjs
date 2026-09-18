import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

test('built game boots, maps touch coordinates, enters gameplay and freezes on hide', async () => {
  let nextId = 0;
  const frames = new Map(),
    listeners = new Map(),
    texts = [];
  const transforms = [];
  const ctx = {
    setTransform: (...args) => transforms.push(args),
    fillRect() {},
    fillText: (value) => texts.push(value),
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    closePath() {},
    fill() {},
    arc() {},
    stroke() {},
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  const wx = {
    createCanvas: () => canvas,
    getWindowInfo: () => ({
      windowWidth: 375,
      windowHeight: 667,
      pixelRatio: 3,
    }),
  };
  for (const name of ['Hide', 'Show', 'TouchStart', 'WindowResize']) {
    wx['on' + name] = (fn) => listeners.set(name, fn);
    wx['off' + name] = (fn) => {
      if (listeners.get(name) === fn) listeners.delete(name);
    };
  }
  function frame(time) {
    const item = frames.entries().next().value;
    assert.ok(item);
    frames.delete(item[0]);
    item[1](time);
  }
  runInNewContext(
    await readFile('dist/game.js', 'utf8'),
    {
      wx,
      requestAnimationFrame(fn) {
        const id = nextId++;
        frames.set(id, fn);
        return id;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
    { timeout: 1000 },
  );
  assert.equal(canvas.width, 750);
  assert.equal(canvas.height, 1334);
  assert.equal(transforms.length, 1);
  frame(0);
  assert.ok(texts.includes('风羽远征'));
  const scale = 375 / 360,
    offsetY = (667 - 640 * scale) / 2;
  listeners.get('TouchStart')({
    changedTouches: [{ clientX: 180 * scale, clientY: 490 * scale + offsetY }],
  });
  for (let t = 16; t < 3500; t += 16) frame(t);
  assert.ok(texts.includes('Ⅰ  晴空林地'));
  listeners.get('Hide')();
  assert.equal(frames.size, 0);
  listeners.get('Show')();
  listeners.get('Show')();
  assert.equal(frames.size, 1);
  frame(10000);
  assert.ok(texts.includes('云端小憩'));
  listeners.get('WindowResize')();
  assert.equal(transforms.length, 2);
  listeners.get('Hide')();
  assert.equal(frames.size, 0);
});
