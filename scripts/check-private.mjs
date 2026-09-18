import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const allowed = 'wx0123456789abcdef'; // synthetic unit-test fixture only
const failures = [];
async function scan(dir = '.') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (
      [
        '.git',
        'node_modules',
        'dist',
        'coverage',
        '.worktrees',
        'wechat.local.json',
      ].includes(entry.name) ||
      entry.name.endsWith('.log')
    )
      continue;
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await scan(path);
    else {
      const text = await readFile(path, 'utf8');
      if ([...text.matchAll(/wx[0-9a-f]{16}/gi)].some(([id]) => id !== allowed))
        failures.push(path);
    }
  }
}
await scan();
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(
  '\n',
);
for (const file of tracked)
  if (file === 'wechat.local.json' || file.startsWith('dist/'))
    failures.push(file);
if (failures.length)
  throw new Error(
    `Private AppID/config must not enter GitHub: ${failures.join(', ')}`,
  );
console.log(
  'Privacy checked: no real AppID in source/docs; local config and generated output are not tracked.',
);
