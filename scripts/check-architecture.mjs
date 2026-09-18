import ts from 'typescript';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const allowed = {
  core: ['core'],
  game: ['core', 'game'],
  scenes: ['core', 'game', 'scenes'],
  app: ['core', 'game', 'scenes', 'app'],
  platform: ['core', 'platform'],
  'main.ts': ['app', 'platform'],
};

export function inspectSource(file, source) {
  const layer = file.split('/')[0];
  const errors = [];
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const report = (message) => errors.push(`${file}: ${message}`);
  function inspectImport(specifier) {
    if (!specifier.startsWith('.'))
      return report(
        `Runtime external dependency is not approved: ${specifier}`,
      );
    const target = relative(
      resolve('src'),
      resolve('src', dirname(file), specifier),
    ).replaceAll('\\', '/');
    const targetLayer = target.split('/')[0];
    if (!allowed[layer]?.includes(targetLayer))
      report(`Forbidden dependency: ${layer} -> ${target}`);
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
        inspectImport(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      report('Dynamic import/require needs an explicit architecture decision.');
    }
    if (
      ts.isIdentifier(node) &&
      layer !== 'platform' &&
      [
        'wx',
        'WechatMinigame',
        'window',
        'document',
        'GameGlobal',
        'globalThis',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'setTimeout',
        'setInterval',
      ].includes(node.text)
    ) {
      report(`Platform global outside adapter: ${node.text}`);
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ['core', 'game'].includes(layer) &&
      ['Math.random', 'Date.now'].includes(node.getText(ast))
    )
      report('Inject randomness/time into domain code.');
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return errors;
}

async function check(directory = 'src') {
  const errors = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) errors.push(...(await check(path)));
    else if (path.endsWith('.ts'))
      errors.push(
        ...inspectSource(path.slice(4), await readFile(path, 'utf8')),
      );
  }
  return errors;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const errors = await check();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Architecture boundaries checked.');
}
