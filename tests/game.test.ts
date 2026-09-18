import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRun, hurt, stepRun, weatherAt } from '../src/game/run.ts';
import {
  chooseRelic,
  chooseSkill,
  draft,
  eligible,
  SKILLS,
  RELICS,
} from '../src/game/skills.ts';
import { FACTIONS } from '../src/game/model.ts';
import type { Enemy, Run } from '../src/game/model.ts';

function enemy(kind: Enemy['kind'] = 'cloud'): Enemy {
  return {
    id: 999,
    kind,
    x: 150,
    y: 320,
    hp: 1000,
    maxHp: 1000,
    age: 0,
    cooldown: 9999,
    aimY: 320,
    burns: [],
    frostHits: 0,
    frozen: 0,
    slow: 0,
    mark: 0,
    markExpiry: 0,
    firework: 0,
  };
}
function hold(run: Run) {
  stepRun(run, run.bird.y > 330 && run.bird.vy > -50);
}

test('39 runtime skills are unique and all six factions can start without a second weapon', () => {
  assert.equal(SKILLS.length, 39);
  assert.equal(new Set(SKILLS.map((s) => s.id)).size, 39);
  assert.equal(RELICS.length, 6);
  for (const f of FACTIONS) {
    const r = createRun(42, f);
    assert.deepEqual(r.weapons, [f]);
    assert.equal(r.skills[`${f}01`], 1);
    assert.equal(new Set(draft(r)).size, 3);
  }
});
test('same seed and input produce identical state; cosmetic frame time is absent from domain', () => {
  const a = createRun(73, 'S'),
    b = createRun(73, 'S');
  for (let i = 0; i < 1500; i++) {
    if (a.phase === 'draft') {
      chooseSkill(a, a.offers[0]!);
      chooseSkill(b, b.offers[0]!);
    }
    const flap = i % 31 === 0;
    stepRun(a, flap);
    stepRun(b, flap);
  }
  assert.deepEqual(a, b);
});
test('draft/reward freeze time and repeated selections cannot duplicate upgrades or relics', () => {
  const r = createRun(12, 'E');
  r.phase = 'draft';
  r.offers = ['C01'];
  r.pendingUpgrades = 1;
  for (let i = 0; i < 100; i++) stepRun(r, true);
  assert.equal(r.tick, 0);
  assert.ok(chooseSkill(r, 'C01'));
  assert.equal(r.bird.maxHp, 6);
  assert.equal(r.upgrades, 1);
  assert.equal(chooseSkill(r, 'C01'), false);
  r.phase = 'reward';
  r.relicOffers = ['R02'];
  stepRun(r);
  assert.equal(r.tick, 0);
  assert.ok(chooseRelic(r, 'R02'));
  assert.equal(r.bird.maxHp, 8);
  assert.equal(chooseRelic(r, 'R02'), false);
});
test('damage arbitration, shields and lethal-save relic prevent duplicate damage', () => {
  const r = createRun(1, 'I');
  r.bird.shield = 1;
  assert.ok(hurt(r, 'test', 2));
  assert.equal(r.bird.hp, 4);
  assert.equal(r.bird.shield, 0);
  assert.equal(hurt(r, 'same tick'), false);
  assert.equal(r.bird.hp, 4);
  r.relics = ['R02'];
  r.bird.hp = 1;
  r.bird.invulnerable = 0;
  hurt(r, 'lethal');
  assert.equal(r.bird.hp, 1);
  assert.equal(r.phase, 'flight');
  r.bird.invulnerable = 0;
  hurt(r, 'lethal again');
  assert.equal(r.phase, 'result');
});
test('chapter weather escalates and is disabled during major combat', () => {
  assert.equal(weatherAt(1, 10), 'clear');
  assert.equal(weatherAt(1, 40), 'wind');
  assert.equal(weatherAt(1, 65), 'rain');
  assert.equal(weatherAt(2, 30), 'heat');
  assert.equal(weatherAt(2, 60), 'fire');
  assert.equal(weatherAt(2, 60, true), 'clear');
});
test('each chapter has one elite and one boss; rewards preserve build and reset chapter state', () => {
  const r = createRun(42, 'E');
  r.stageTick = 5399;
  stepRun(r);
  assert.equal(r.enemies.filter((e) => e.kind === 'elite').length, 1);
  r.pendingUpgrades = 0;
  r.phase = 'flight';
  r.scheduledUpgrades = 8;
  for (let i = 0; i < 30; i++) hold(r);
  assert.equal(r.enemies.filter((e) => e.kind === 'elite').length, 1);
  r.stageTick = 8099;
  r.phase = 'flight';
  stepRun(r);
  assert.equal(r.phase, 'boss');
  assert.equal(r.enemies.filter((e) => e.kind === 'boss').length, 1);
  r.bossDefeated = true;
  stepRun(r);
  assert.equal(r.phase, 'reward');
  assert.equal(r.relicOffers.length, 3);
  const id = r.relicOffers[0]!;
  chooseRelic(r, id);
  chooseSkill(r, r.offers[0]!);
  stepRun(r);
  assert.equal(r.chapter, 2);
  assert.equal(r.bossStarted, false);
  assert.equal(r.eliteSpawned, false);
  assert.ok(r.relics.includes(id));
  r.stageTick = 10799;
  r.phase = 'boss';
  r.bossStarted = true;
  r.bird.invulnerable = 999;
  stepRun(r);
  assert.equal(r.phase, 'reward');
  chooseRelic(r, r.relicOffers[0]!);
  chooseSkill(r, r.offers[0]!);
  stepRun(r);
  assert.equal(r.phase, 'result');
  assert.equal(r.won, true);
});
test('all six weapons damage a target and their secondary branches have actual execution', () => {
  for (const f of FACTIONS) {
    const r = createRun(111, f);
    r.enemies = [enemy('elite')];
    r.spawnEnemy = 9999;
    r.spawnGate = 9999;
    for (let i = 0; i < 150; i++) hold(r);
    assert.ok(r.damageDealt > 0, f);
    assert.ok(r.triggers[`${f}01`]! > 0, f);
  }
  const r = createRun(4, 'A');
  r.skills.A02 = 3;
  r.skills.A04 = 1;
  r.spawnGate = 9999;
  r.spawnEnemy = 9999;
  r.enemies = [enemy('elite')];
  for (let i = 0; i < 260; i++) hold(r);
  assert.ok(r.triggers.A02! > 0);
  assert.ok(r.triggers.A04! > 0);
});
test('creative skills trigger from real flaps, low health and projectiles without recursive explosions', () => {
  const r = createRun(6, 'F');
  Object.assign(r.skills, { X01: 2, X02: 2, X08: 2, X09: 2, F04: 3, X12: 2 });
  r.bird.hp = 2;
  r.enemies = [enemy('elite')];
  r.spawnGate = 9999;
  r.spawnEnemy = 9999;
  for (let i = 0; i < 500; i++) {
    if (i % 100 === 0)
      for (let j = 0; j < 3; j++)
        r.shots.push({
          id: r.id++,
          x: 210 + j * 8,
          y: 130,
          vx: -10,
          vy: 0,
          damage: 1,
          color: '#fff',
          hostile: true,
          life: 500,
        });
    hold(r);
  }
  assert.ok(r.triggers.X01! > 0);
  assert.ok(r.triggers.X08! > 0);
  assert.ok(r.triggers.X09! > 0);
  assert.ok(r.triggers.F04! > 0);
  assert.ok(r.triggers.X12! > 0);
  assert.ok(r.bird.shield <= 3);
  assert.ok(r.sparks.length <= 64);
});
test('sustained falling drops a bomb once and does not repeat inside its cooldown', () => {
  const r = createRun(6, 'E');
  r.skills.X02 = 2;
  r.spawnGate = 9999;
  r.spawnEnemy = 9999;
  r.bird.y = 160;
  r.bird.vy = 60;
  r.enemies = [enemy('elite')];
  for (let i = 0; i < 50; i++) stepRun(r);
  assert.equal(r.triggers.X02, 1);
});
test('health upgrades respect the same eight-health cap regardless of reward order', () => {
  const r = createRun(8, 'E');
  r.phase = 'reward';
  r.relicOffers = ['R02'];
  chooseRelic(r, 'R02');
  for (let i = 0; i < 2; i++) {
    r.phase = 'draft';
    r.offers = ['C01'];
    chooseSkill(r, 'C01');
  }
  assert.equal(r.bird.maxHp, 8);
  assert.ok(r.bird.hp <= 8);
});
test('draft excludes maxed cards, unavailable weapon supports and a third weapon', () => {
  const r = createRun(17, 'E');
  r.weapons.push('I');
  r.skills.I01 = 1;
  r.skills.E01 = 3;
  const pool = eligible(r).map((s) => s.id);
  assert.ok(!pool.includes('E01'));
  assert.ok(!pool.includes('F01'));
  assert.ok(!pool.includes('F04'));
  assert.ok(pool.includes('X01'));
});
