// Static document consistency only, not a gameplay or balance simulation.
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const atlas = await readFile('docs/design/SKILL_ATLAS.md', 'utf8');
const rows = atlas
  .split('\n')
  .filter((line) => /^\|\s*[ESFNIACH]\d{2}\s*\|/.test(line));
const ids = rows.map((row) => row.split('|')[1].trim());
const known = new Set(ids);
const expansion = await readFile('docs/design/CHAPTER_EXPANSION.md', 'utf8');
const extras = [...expansion.matchAll(/^\|\s*(X\d{2})\s*\|/gm)].map(
  (match) => match[1],
);
assert.equal(new Set(extras).size, 12, 'Expected 12 creative skills');
const { SKILLS, RELICS } = await import('../src/game/skills.ts');
assert.equal(SKILLS.length, 39);
assert.equal(RELICS.length, 6);
for (const skill of SKILLS)
  assert.ok(
    known.has(skill.id) || extras.includes(skill.id),
    `Unknown runtime skill ${skill.id}`,
  );
assert.equal(ids.length, 66, 'Expected 66 skill rows');
assert.equal(known.size, ids.length, 'Skill IDs must be unique');
for (const faction of ['E', 'S', 'F', 'N', 'I', 'A']) {
  for (let rank = 1; rank <= 8; rank++)
    assert.ok(known.has(`${faction}0${rank}`));
}
for (const prefix of ['C', 'H']) {
  for (let i = 1; i <= 9; i++) assert.ok(known.has(`${prefix}0${i}`));
}
for (const row of rows) {
  const [id, ...columns] = row
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
  for (const reference of columns.join(' ').matchAll(/\b[ESFNIACH]\d{2}\b/g)) {
    assert.ok(
      known.has(reference[0]),
      `${id} references unknown ${reference[0]}`,
    );
  }
  if (id.startsWith('H')) {
    const prereqs = columns[1].match(/[ESFNIA]\d{2}/g) || [];
    assert.equal(
      new Set(prereqs).size,
      2,
      `${id} needs two distinct prerequisites`,
    );
  }
}

const prototype = ids.filter((id) => /^[ESI]0[1-4]$|^C0[1-3]$/.test(id));
const mvp = ids.filter((id) => /^[ESI]0[1-8]$|^C0[1-9]$|^H0[15]$/.test(id));
assert.equal(prototype.length, 15);
assert.equal(mvp.length, 35);
for (const row of rows.filter((line) => /^\|\s*H0[15]\s*\|/.test(line))) {
  for (const id of row.split('|')[3].match(/[ESFNIA]\d{2}/g))
    assert.ok(mvp.includes(id));
}

async function checkLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await checkLinks(path);
    else if (path.endsWith('.md')) {
      const content = await readFile(path, 'utf8');
      for (const [, link] of content.matchAll(/\]\(([^)]+)\)/g)) {
        if (/^(https?:|#|<)/.test(link)) continue;
        await access(resolve(dirname(path), link.split('#')[0]));
      }
    }
  }
}
await checkLinks('.');
console.log(
  'Design checked: 78 design skills, 39 runtime skills, 6 relics, legacy resonance prerequisites and local Markdown links. No balance claim.',
);
