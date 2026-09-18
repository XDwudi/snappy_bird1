import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bootstrap } from '../src/app/bootstrap.ts';
import type { GamePlatform } from '../src/core/ports.ts';

test('disposing app stops frames and removes every platform subscription once', () => {
  const pending = new Map<number, (time: number) => void>();
  const listeners = new Map<string, () => void>();
  let nextId = 0;
  let releases = 0;
  let platformDisposes = 0;
  function subscribe(name: string, callback: () => void) {
    listeners.set(name, callback);
    return () => {
      listeners.delete(name);
      releases++;
    };
  }
  const platform: GamePlatform = {
    surface: {
      viewport: () => ({ width: 375, height: 667 }),
      clear() {},
      text() {},
    },
    requestFrame(callback) {
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    cancelFrame: (id) => {
      pending.delete(id);
    },
    onHide: (callback) => subscribe('hide', callback),
    onShow: (callback) => subscribe('show', callback),
    onTap: (callback) => subscribe('tap', callback),
    dispose: () => {
      platformDisposes++;
    },
  };
  const app = bootstrap(platform);
  assert.equal(pending.size, 1);
  assert.equal(listeners.size, 3);
  listeners.get('hide')?.();
  assert.equal(pending.size, 0);
  listeners.get('show')?.();
  assert.equal(pending.size, 1);
  app.dispose();
  app.dispose();
  assert.equal(pending.size, 0);
  assert.equal(listeners.size, 0);
  assert.equal(releases, 3);
  assert.equal(platformDisposes, 1);
});
