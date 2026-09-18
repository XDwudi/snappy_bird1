import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { validateWechatConfig } from './wechat-config.mjs';

const { values } = parseArgs({
  options: {
    appid: { type: 'string' },
    'lib-version': { type: 'string' },
  },
});
const config = validateWechatConfig(
  {
    appid: values.appid || '',
    libVersion: values['lib-version'] || '',
  },
  true,
);
await writeFile('wechat.local.json', `${JSON.stringify(config, null, 2)}\n`);
console.log(
  'Saved ignored local configuration to wechat.local.json. Rebuild to apply.',
);
