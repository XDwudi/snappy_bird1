import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { validateWechatConfig } from './wechat-config.mjs';

const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const project = await json('dist/project.config.json');
const game = await json('dist/game.json');
const info = await json('dist/build-info.json');
const pkg = await json('package.json');
if (project.compileType !== 'game' || project.miniprogramRoot !== './')
  throw new Error('Invalid WeChat project structure.');
if (game.deviceOrientation !== 'portrait')
  throw new Error(
    'Orientation differs from the current architecture decision.',
  );
validateWechatConfig(project, info.mode === 'release');
const code = await readFile('dist/game.js');
new Script(code.toString());
if (
  info.version !== pkg.version ||
  info.entrySha256 !== createHash('sha256').update(code).digest('hex')
)
  throw new Error('Stale build metadata.');
async function walk(path) {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = `${path}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}
let size = 0;
for (const file of await walk('dist')) {
  if (file.endsWith('.map')) {
    if (info.mode === 'release')
      throw new Error('Release must not contain source maps.');
    continue;
  }
  if (/\.(pem|key|p12)$|\/\.env(?:\.|$)|\/node_modules\//.test(file))
    throw new Error(`Unexpected private/build file: ${file}`);
  size += (await stat(file)).size;
}
const { maxPackageBytes } = await json('config/budgets.json');
if (size > maxPackageBytes)
  throw new Error(
    `Package ${size} bytes exceeds internal budget ${maxPackageBytes}.`,
  );
console.log(
  `Package checked: ${size} bytes / ${maxPackageBytes} internal budget (${info.mode}).`,
);
