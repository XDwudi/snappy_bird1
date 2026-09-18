import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFrameLoop } from '../src/core/frame-loop.ts';
import type { FrameClock } from '../src/core/ports.ts';

function fakeClock() {
  let nextId = 0;
  const pending = new Map<number, (time: number) => void>();
  const clock: FrameClock = {
    requestFrame(callback) {
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    cancelFrame(id) {
      pending.delete(id);
    },
  };
  return {
    clock,
    pending,
    fire(time: number) {
      const item = pending.entries().next().value;
      assert.ok(item, 'one scheduled frame expected');
      pending.delete(item[0]);
      item[1](time);
    },
  };
}

test('start is idempotent and stopping cancels frame ID zero', () => {
  const fake = fakeClock();
  const loop = createFrameLoop(fake.clock, () => {});
  loop.start();
  loop.start();
  assert.equal(fake.pending.size, 1);
  loop.stop();
  loop.stop();
  assert.equal(fake.pending.size, 0);
});

test('delta uses seconds, clamps stalls and resets after background resume', () => {
  const fake = fakeClock();
  const deltas: number[] = [];
  const loop = createFrameLoop(fake.clock, (delta) => deltas.push(delta));
  loop.start();
  fake.fire(100);
  fake.fire(116);
  fake.fire(1000);
  loop.stop();
  loop.start();
  fake.fire(9000);
  fake.fire(8990);
  assert.deepEqual(deltas, [0, 0.016, 0.05, 0, 0]);
  loop.stop();
});

test('stopping from update does not queue another frame', () => {
  const fake = fakeClock();
  const loop = createFrameLoop(fake.clock, () => loop.stop());
  loop.start();
  fake.fire(0);
  assert.equal(fake.pending.size, 0);
});

test('update failure stops the loop and allows a clean restart', () => {
  const fake = fakeClock();
  let fail = true;
  const loop = createFrameLoop(fake.clock, () => {
    if (fail) throw new Error('render failed');
  });
  loop.start();
  assert.throws(() => fake.fire(0), /render failed/);
  assert.equal(fake.pending.size, 0);
  fail = false;
  loop.start();
  fake.fire(20);
  assert.equal(fake.pending.size, 1);
  loop.stop();
});
