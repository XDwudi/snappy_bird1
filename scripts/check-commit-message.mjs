import { readFileSync } from 'node:fs';
const title = readFileSync(process.argv[2], 'utf8').split('\n')[0];
if (
  !/^(feat|fix|docs|refactor|test|build|ci|chore|perf|revert)(\([a-z0-9-]+\))?!?: .+/.test(
    title,
  )
) {
  console.error('Use Conventional Commits, e.g. feat(game): add score rules');
  process.exitCode = 1;
}
