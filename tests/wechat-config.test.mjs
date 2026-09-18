import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateWechatConfig } from '../scripts/wechat-config.mjs';

test('development permits visitor placeholder; release requires account and pinned library', () => {
  assert.doesNotThrow(() => validateWechatConfig({ appid: 'touristappid' }));
  assert.throws(
    () => validateWechatConfig({ appid: 'touristappid' }, true),
    /Release requires/,
  );
  assert.throws(
    () => validateWechatConfig({ appid: 'wx0123456789abcdef' }, true),
    /Release requires/,
  );
  assert.doesNotThrow(() =>
    validateWechatConfig(
      { appid: 'wx0123456789abcdef', libVersion: '3.0.0' },
      true,
    ),
  );
});

test('invalid AppID and floating library versions fail early', () => {
  assert.throws(() => validateWechatConfig({ appid: 'example' }), /AppID/);
  assert.throws(
    () =>
      validateWechatConfig({
        appid: 'wx0123456789abcdef',
        libVersion: 'latest',
      }),
    /explicit/,
  );
});
