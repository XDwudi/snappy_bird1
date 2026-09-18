import { readFile } from 'node:fs/promises';

export function validateWechatConfig(config, release = false) {
  if (
    !/^wx[0-9a-f]{16}$/.test(config.appid) &&
    config.appid !== 'touristappid'
  ) {
    throw new Error('AppID must be wx followed by 16 hexadecimal characters.');
  }
  if (config.libVersion && !/^\d+\.\d+\.\d+$/.test(config.libVersion)) {
    throw new Error('Base library version must be an explicit x.y.z version.');
  }
  if (release && (config.appid === 'touristappid' || !config.libVersion)) {
    throw new Error(
      'Release requires a real AppID and a tested base library version. See docs/WECHAT.md.',
    );
  }
  return config;
}

export async function loadWechatConfig(release) {
  let local = {};
  try {
    local = JSON.parse(await readFile('wechat.local.json', 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return validateWechatConfig(
    {
      appid: process.env.WECHAT_APPID || local.appid || 'touristappid',
      libVersion: process.env.WECHAT_LIB_VERSION || local.libVersion || '',
    },
    release,
  );
}
