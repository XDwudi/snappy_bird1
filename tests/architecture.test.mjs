import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectSource } from '../scripts/check-architecture.mjs';

test('domain rejects platform imports, exports, globals and nondeterministic APIs', () => {
  for (const source of [
    "import { x } from '../platform/wechat/index.ts';",
    "export * from '../platform/wechat/index.ts';",
    'wx.getStorageSync("score");',
    'Math.random(); Date.now();',
    'globalThis.wx;',
    'import("../platform/wechat/index.ts");',
  ])
    assert.ok(inspectSource('game/rules.ts', source).length, source);
});

test('pure domain and adapter imports are allowed', () => {
  assert.deepEqual(
    inspectSource(
      'game/rules.ts',
      "import type { FrameClock } from '../core/ports.ts';",
    ),
    [],
  );
  assert.deepEqual(
    inspectSource('platform/wechat/index.ts', 'wx.createCanvas();'),
    [],
  );
});

test('entry point cannot import gameplay directly and source cannot escape src', () => {
  assert.ok(inspectSource('main.ts', "import './game/rules.ts';").length);
  assert.ok(
    inspectSource('core/a.ts', "import '../../scripts/build.mjs';").length,
  );
});
