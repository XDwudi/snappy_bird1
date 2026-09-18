import { build, context } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadWechatConfig } from './wechat-config.mjs';

const args = process.argv.slice(2);
if (args.some((arg) => !['--release', '--watch'].includes(arg)))
  throw new Error('Unknown build argument.');
const release = args.includes('--release');
const watch = args.includes('--watch');
if (release && watch)
  throw new Error('Release builds cannot run in watch mode.');
// Validate before deleting the previous build.
const wechat = await loadWechatConfig(release);
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const project = JSON.parse(
  await readFile('config/project.config.json', 'utf8'),
);
project.appid = wechat.appid;
if (wechat.libVersion) project.libVersion = wechat.libVersion;
project.packOptions.ignore.push(
  { type: 'suffix', value: '.map' },
  { type: 'file', value: 'build-info.json' },
);
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

function revision() {
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const dirty =
      execFileSync('git', ['status', '--porcelain'], {
        encoding: 'utf8',
      }).trim().length > 0;
    return { commit, dirty };
  } catch {
    return { commit: 'uncommitted', dirty: true };
  }
}

const options = {
  entryPoints: ['src/main.ts'],
  outfile: 'dist/game.js',
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  target: 'es2020',
  minify: release,
  sourcemap: release ? false : 'external',
  legalComments: 'none',
  logLevel: 'info',
  plugins: [
    {
      name: 'wechat-package',
      setup(builder) {
        builder.onEnd(async (result) => {
          if (result.errors.length) return;
          await cp('config/game.json', 'dist/game.json');
          await rm('dist/assets', { recursive: true, force: true });
          await cp('assets/runtime', 'dist/assets', {
            recursive: true,
            filter: (path) => !path.endsWith('.gitkeep'),
          });
          await writeFile(
            'dist/project.config.json',
            JSON.stringify(project, null, 2),
          );
          const code = await readFile('dist/game.js');
          await writeFile(
            'dist/build-info.json',
            JSON.stringify(
              {
                version: pkg.version,
                mode: release ? 'release' : 'development',
                ...revision(),
                entrySha256: createHash('sha256').update(code).digest('hex'),
              },
              null,
              2,
            ),
          );
        });
      },
    },
  ],
};

if (watch) {
  const watcher = await context(options);
  await watcher.watch();
  console.log(
    'Watching TypeScript. Restart after config changes; asset-only changes need npm run build.',
  );
} else {
  await build(options);
}
