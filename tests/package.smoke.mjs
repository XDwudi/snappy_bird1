import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

test('built package boots with only WeChat APIs, handles input, resize and lifecycle', async () => {
  let nextId = 0;
  const frames = new Map();
  const listeners = new Map();
  const text = [];
  const scales = [];
  const ctx = {
    scale: (...args) => scales.push(args),
    fillRect() {},
    fillText: (value) => text.push(value),
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
    wx[`on${name}`] = (fn) => listeners.set(name, fn);
    wx[`off${name}`] = (fn) => {
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
      requestAnimationFrame(callback) {
        const id = nextId++;
        frames.set(id, callback);
        return id;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
    { timeout: 1000 },
  );
  assert.equal(frames.size, 1);
  assert.equal(canvas.width, 750);
  assert.equal(canvas.height, 1334);
  assert.deepEqual(scales, [[2, 2]]);
  frame(0);
  assert.ok(text.includes('工程骨架已就绪'));
  listeners.get('TouchStart')();
  frame(16);
  assert.ok(text.includes('触摸输入正常'));
  listeners.get('Hide')();
  assert.equal(frames.size, 0);
  listeners.get('Show')();
  listeners.get('Show')();
  assert.equal(frames.size, 1);
  listeners.get('WindowResize')();
  frame(10000);
  assert.equal(frames.size, 1);
  listeners.get('Hide')();
});
