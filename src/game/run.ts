import {
  BIRD_X,
  STEP,
  UPGRADE_XP,
  clamp,
  random,
  rank,
  value,
  count,
  trigger,
} from './model.ts';
import type { Enemy, Faction, Run } from './model.ts';
import { draft, relicDraft } from './skills.ts';

export function createRun(
  seed: number,
  faction: Faction,
  practice = false,
): Run {
  return {
    seed,
    worldRng: (seed ^ 0x9e3779b9) >>> 0 || 1,
    draftRng: (seed ^ 0x85ebca6b) >>> 0 || 2,
    tick: 0,
    id: 1,
    stageTick: 0,
    chapter: 1,
    chapterComplete: false,
    weather: 'clear',
    phase: 'flight',
    returnPhase: 'flight',
    practice,
    bird: { y: 320, vy: 0, hp: 5, maxHp: 5, shield: 0, invulnerable: 0 },
    gates: [],
    enemies: [],
    shots: [],
    sparks: [],
    weapons: [faction],
    skills: { [`${faction}01`]: 1 },
    weaponCooldowns: { E: 0, S: 0, F: 0, N: 0, I: 0, A: 0 },
    offers: [],
    rerolls: 2,
    bans: [],
    banishes: 2,
    upgrades: 0,
    bonusXp: 0,
    gateCount: 0,
    precise: 0,
    kills: 0,
    damageDealt: 0,
    lastHit: '',
    charge: 0,
    chargeExpiry: 0,
    rhythm: 0,
    rhythmExpiry: 0,
    graze: false,
    shieldCooldown: 1080,
    echoCooldown: 0,
    explosionCooldown: 0,
    spawnGate: 0,
    spawnEnemy: 900,
    bossStarted: false,
    bossDefeated: false,
    eliteSpawned: false,
    elitesKilled: 0,
    bossesKilled: 0,
    scheduledUpgrades: 0,
    pendingUpgrades: 0,
    relics: [],
    relicOffers: [],
    counters: {},
    cooldowns: {},
    triggers: {},
    lastFlap: -100,
    fallingTicks: 0,
    hitsTaken: 0,
    warningY: -1,
    warningTicks: 0,
    fireX: 0,
    fireWarning: 0,
    won: false,
    history: [],
  };
}
function spark(
  run: Run,
  x: number,
  y: number,
  x2: number,
  y2: number,
  color: string,
) {
  if (run.sparks.length < 64)
    run.sparks.push({ x, y, x2, y2, color, life: 14 });
}
function efficiency(run: Run, faction: Faction) {
  return run.weapons.indexOf(faction) === 0 ? 1 : 0.6;
}
function direct(run: Run, faction: Faction, damage: number) {
  return (
    damage * (1 + value(run, 'C02', [0.08, 0.14])) * efficiency(run, faction)
  );
}
function hitEnemy(run: Run, enemy: Enemy, damage: number, explosive = true) {
  if (enemy.hp <= 0) return;
  const actual = Math.min(enemy.hp, damage);
  enemy.hp -= damage;
  run.damageDealt += actual;
  if (enemy.hp > 0) return;
  if (explosive && enemy.frozen > 0 && rank(run, 'F03')) {
    enemy.frozen = 0;
    for (const other of run.enemies
      .filter((e) => e.hp > 0 && e.id !== enemy.id)
      .slice(0, 2))
      hitEnemy(
        run,
        other,
        value(run, 'F03', [3, 5, 7]) * efficiency(run, 'F'),
        false,
      );
    trigger(run, 'F03');
  }
  run.kills++;
  run.bonusXp += enemy.kind === 'boss' ? 0 : 0.5;
  spark(run, enemy.x - 12, enemy.y - 12, enemy.x + 12, enemy.y + 12, '#ffe6a4');
  if (enemy.kind === 'elite') {
    run.elitesKilled++;
    run.pendingUpgrades++;
  }
  if (enemy.kind === 'boss') {
    run.bossDefeated = true;
    run.bossesKilled++;
    run.shots = run.shots.filter((s) => !s.hostile);
    run.warningTicks = 0;
  }
  if (
    explosive &&
    enemy.burns.some((b) => b.source === 'fire') &&
    rank(run, 'E03') &&
    run.explosionCooldown <= 0
  ) {
    run.explosionCooldown = 24;
    for (const other of run.enemies.filter(
      (e) => e.hp > 0 && Math.hypot(e.x - enemy.x, e.y - enemy.y) <= 45,
    )) {
      spark(run, enemy.x, enemy.y, other.x, other.y, '#ff9165');
      hitEnemy(
        run,
        other,
        value(run, 'E03', [6, 9, 12]) * efficiency(run, 'E'),
        false,
      );
    }
  }
}
export function hurt(run: Run, cause: string, amount = 1): boolean {
  if (run.bird.invulnerable > 0 || run.phase === 'result') return false;
  const shieldBefore = run.bird.shield;
  const absorbed = Math.min(amount, shieldBefore);
  run.bird.shield -= absorbed;
  run.bird.hp = Math.max(0, run.bird.hp - amount + absorbed);
  run.bird.invulnerable = 72;
  run.lastHit = cause;
  run.rhythm = 0;
  run.hitsTaken++;
  run.counters.growth = Math.max(0, (run.counters.growth ?? 0) - 2);
  run.counters.growthTimer = 0;
  run.counters.bankGates = 0;
  if (amount > absorbed && rank(run, 'X07')) run.counters.revenge = 1;
  if (
    run.bird.hp <= 0 &&
    run.relics.includes('R02') &&
    !run.counters.reviveUsed
  ) {
    run.bird.hp = 1;
    run.counters.reviveUsed = 1;
    run.shots = [];
    run.bird.invulnerable = 180;
    trigger(run, 'R02');
  }
  if (run.bird.hp <= 0) {
    run.phase = 'result';
    return true;
  }
  if (
    shieldBefore > 0 &&
    run.bird.shield === 0 &&
    (rank(run, 'I03') || run.relics.includes('R05')) &&
    run.echoCooldown <= 0
  ) {
    run.echoCooldown = 180;
    for (const e of run.enemies
      .filter((e) => e.hp > 0 && e.x >= BIRD_X)
      .slice(0, 3)) {
      spark(run, BIRD_X, run.bird.y, e.x, e.y, '#a8cbd8');
      hitEnemy(
        run,
        e,
        value(run, 'I03', [10, 14, 18]) * efficiency(run, 'I') +
          (run.relics.includes('R05') ? 8 : 0),
        false,
      );
    }
  }
  return true;
}
function shootEnemy(run: Run, e: Enemy, dy = 0) {
  if (run.shots.filter((s) => s.hostile).length >= 16) return;
  const distance = Math.max(1, Math.hypot(BIRD_X - e.x, e.aimY + dy - e.y));
  run.shots.push({
    id: run.id++,
    x: e.x - 10,
    y: e.y,
    vx: ((BIRD_X - e.x) / distance) * 125,
    vy: ((e.aimY + dy - e.y) / distance) * 125,
    damage: 1,
    color: '#fb7f8b',
    hostile: true,
    life: 240,
  });
}
function gates(run: Run) {
  const speed = 80 + (run.chapter - 1) * 8 + Math.min(run.stageTick / 1200, 8);
  const ghost = run.phase === 'boss';
  if (--run.spawnGate <= 0 && run.phase !== 'rest') {
    const last = run.gates[run.gates.length - 1];
    const center = clamp(
      (last?.center ?? 320) + (random(run, 'worldRng') - 0.5) * 90,
      210,
      430,
    );
    run.gates.push({
      id: run.id++,
      x: 395,
      center,
      gap: ghost
        ? 230
        : 208 -
          (run.chapter - 1) * 10 -
          Math.min(10, run.stageTick / 720) +
          (run.weather === 'wind' || run.weather === 'heat' ? 22 : 0),
      passed: false,
      hit: false,
      ghost,
    });
    run.spawnGate = ghost ? 180 : 165;
  }
  for (const gate of run.gates) {
    gate.x -= speed * STEP;
    if (
      !gate.ghost &&
      !gate.hit &&
      Math.abs(gate.x - BIRD_X) < 32 &&
      Math.abs(run.bird.y - gate.center) > gate.gap / 2 - 9
    ) {
      hurt(run, '撞上云岩');
      gate.hit = true;
      run.bird.y = clamp(
        run.bird.y,
        gate.center - gate.gap / 2 + 15,
        gate.center + gate.gap / 2 - 15,
      );
      run.bird.vy = 0;
    }
    if (!gate.passed && gate.x < BIRD_X) {
      gate.passed = true;
      if (gate.hit) continue;
      const offset = Math.abs(run.bird.y - gate.center);
      if (offset > gate.gap / 2 - 9) continue;
      run.gateCount++;
      if (rank(run, 'X03') && count(run, 'bankGates') % 3 === 0) {
        run.counters.bank = 1;
        trigger(run, 'X03');
      }
      if (rank(run, 'X10'))
        run.counters.ambushUntil = run.tick + value(run, 'X10', [60, 90]);
      if (rank(run, 'N04') && run.gateCount % 4 === 0) {
        run.counters.spiritShots = value(run, 'N04', [2, 3, 4]);
        trigger(run, 'N04');
      }
      if (rank(run, 'A03') && run.gateCount % 3 === 0)
        run.counters.satellite = 1;
      if (offset <= 18) {
        run.precise++;
        run.bonusXp += 0.3;
        if (rank(run, 'X06') && run.precise % value(run, 'X06', [3, 2]) === 0) {
          clearBullets(run, 2);
          trigger(run, 'X06');
        }
        if (
          rank(run, 'X11') &&
          (run.weather === 'wind' || run.weather === 'heat')
        ) {
          run.counters.windStrike = 1;
          trigger(run, 'X11');
        }
        if (run.relics.includes('R03'))
          run.counters.battery = Math.min(3, (run.counters.battery ?? 0) + 1);
        if (rank(run, 'S03')) {
          run.charge = Math.min(5, run.charge + 1);
          run.chargeExpiry = run.tick + 360;
        }
        if (rank(run, 'S04')) {
          run.rhythm = Math.min(4, run.rhythm + 1);
          run.rhythmExpiry = run.tick + 480;
        }
      } else if (gate.gap / 2 - 9 - offset <= 12 && rank(run, 'I04'))
        run.graze = true;
      const every = rank(run, 'E04') === 3 ? 2 : 3;
      if (rank(run, 'E04') && run.gateCount % every === 0) {
        for (const e of run.enemies
          .filter((e) => e.hp > 0 && e.x > BIRD_X)
          .slice(0, 3)) {
          spark(run, BIRD_X, run.bird.y, e.x, e.y, '#ffb86d');
          hitEnemy(
            run,
            e,
            value(run, 'E04', [8, 12, 12]) * efficiency(run, 'E'),
            false,
          );
        }
      }
    }
  }
  run.gates = run.gates.filter((g) => g.x > -50);
}
function enemies(run: Run) {
  if (
    run.phase === 'flight' &&
    !run.practice &&
    !run.enemies.some((e) => e.kind === 'elite') &&
    --run.spawnEnemy <= 0
  ) {
    if (run.enemies.length < 6) {
      const roll = random(run, 'worldRng');
      const kind =
        run.stageTick < 1800 && run.chapter === 1
          ? 'cloud'
          : roll < 0.4
            ? 'cloud'
            : roll < 0.7
              ? 'bee'
              : 'moth';
      const hp =
        (kind === 'cloud' ? 12 : kind === 'bee' ? 18 : 16) *
        (run.chapter === 1 ? 1 : 1.4);
      run.enemies.push({
        id: run.id++,
        kind,
        x: 395,
        y: 170 + random(run, 'worldRng') * 290,
        hp,
        maxHp: hp,
        age: 0,
        cooldown: 150,
        aimY: run.bird.y,
        burns: [],
        frostHits: 0,
        frozen: 0,
        slow: 0,
        mark: 0,
        markExpiry: 0,
        firework: 0,
      });
    }
    run.spawnEnemy = Math.max(145, 250 - run.stageTick / 120);
  }
  for (const e of run.enemies) {
    if (e.hp <= 0) continue;
    e.age++;
    e.cooldown--;
    if (e.slow > 0) e.slow--;
    if (e.frozen > 0) {
      e.frozen--;
      if (e.frozen === 0 && rank(run, 'F03'))
        for (const other of run.enemies
          .filter((other) => other.id !== e.id && other.hp > 0)
          .slice(0, 2)) {
          hitEnemy(
            run,
            other,
            value(run, 'F03', [3, 5, 7]) * efficiency(run, 'F'),
            false,
          );
          spark(run, e.x, e.y, other.x, other.y, '#9deeff');
          trigger(run, 'F03');
        }
    }
    if (e.firework > 0 && --e.firework === 0) {
      hitEnemy(run, e, 10, false);
      spark(run, e.x - 20, e.y - 20, e.x + 20, e.y + 20, '#ffd690');
      trigger(run, 'X08');
    }
    if (run.tick > e.markExpiry) e.mark = 0;
    if (e.burns.length) {
      hitEnemy(run, e, e.burns.reduce((sum, b) => sum + b.dps, 0) * STEP);
      e.burns.forEach((b) => b.ticks--);
      e.burns = e.burns.filter((b) => b.ticks > 0);
    }
    if (e.hp <= 0) continue;
    if (e.kind === 'boss' || e.kind === 'elite') {
      e.y = 310 + Math.sin(e.age / 115) * 95;
      if (e.cooldown === 54) e.aimY = run.bird.y;
      if (e.cooldown <= 0) {
        shootEnemy(run, e, -65);
        shootEnemy(run, e, 65);
        e.cooldown = 180;
      }
      if (e.kind === 'boss' && e.age % 420 === 180) {
        run.warningY = clamp(run.bird.y, 150, 500);
        run.warningTicks = 90;
      }
    } else {
      e.x -=
        (e.frozen ? 0 : e.slow > 0 ? 0.75 : 1) *
        (e.kind === 'bee' && e.age > 114 ? 150 : 44) *
        STEP;
      if (e.kind === 'bee') {
        if (e.age === 60) e.aimY = run.bird.y;
        if (e.age > 114) e.y += clamp(e.aimY - e.y, -90 * STEP, 90 * STEP);
      }
      if (e.kind === 'moth') {
        if (e.cooldown === 54) e.aimY = run.bird.y;
        if (e.cooldown <= 0) {
          shootEnemy(run, e);
          e.cooldown = 210;
        }
      }
      if (Math.hypot(e.x - BIRD_X, e.y - run.bird.y) < 22) {
        hurt(run, '碰到空中怪物');
        e.x = BIRD_X - 35;
      }
    }
  }
  run.enemies = run.enemies.filter((e) => e.hp > 0 && e.x > -30);
  if (run.warningTicks > 0) {
    run.warningTicks--;
    if (run.warningTicks === 0 && Math.abs(run.bird.y - run.warningY) < 40)
      hurt(run, '巨鸮羽流重击', 2);
  }
}
function weapons(run: Run) {
  const attackSpeed =
    1 +
    (run.tick < (run.counters.ambushUntil ?? 0) ? 0.2 : 0) +
    value(run, 'C03', [0.08, 0.14]) +
    run.rhythm * value(run, 'S04', [0.03, 0.04, 0.05]);
  for (const faction of run.weapons) {
    run.weaponCooldowns[faction]--;
    if (run.weaponCooldowns[faction] > 0) continue;
    const targets = run.enemies
      .filter(
        (e) => e.hp > 0 && e.x > BIRD_X - 5 && Math.abs(e.y - run.bird.y) < 150,
      )
      .sort((a, b) => a.x - b.x || a.id - b.id);
    const target = targets[0];
    if (!target) continue;
    run.weaponCooldowns[faction] = Math.ceil(
      { E: 48, S: 54, F: 48, N: 54, I: 60, A: 72 }[faction] / attackSpeed,
    );
    if (faction === 'E') {
      const maxBurns = 1 + rank(run, 'E02');
      if (target.burns.filter((b) => b.source === 'fire').length >= maxBurns) {
        const index = target.burns.findIndex((b) => b.source === 'fire');
        target.burns.splice(index, 1);
      }
      target.burns.push({
        ticks: 120,
        source: 'fire',
        dps: value(run, 'E01', [2, 3, 4]) * efficiency(run, 'E'),
      });
      hitEnemy(run, target, direct(run, 'E', value(run, 'E01', [6, 8, 10])));
      spark(run, BIRD_X, run.bird.y, target.x, target.y, '#ff9969');
    } else if (faction === 'S') {
      const charge = Math.min(3, run.charge);
      run.charge -= charge;
      let damage = direct(run, 'S', value(run, 'S01', [8, 11, 14]));
      hitEnemy(
        run,
        target,
        damage + charge * value(run, 'S03', [4, 6, 8]) * efficiency(run, 'S'),
      );
      spark(run, BIRD_X, run.bird.y, target.x, target.y, '#c5a8ff');
      const used = new Set([target.id]);
      let last = target;
      for (let i = 0; i < Math.min(4, 1 + rank(run, 'S02')); i++) {
        const next = run.enemies
          .filter(
            (e) =>
              e.hp > 0 &&
              !used.has(e.id) &&
              Math.hypot(e.x - last.x, e.y - last.y) < 150,
          )
          .sort(
            (a, b) =>
              Math.hypot(a.x - last.x, a.y - last.y) -
              Math.hypot(b.x - last.x, b.y - last.y),
          )[0];
        if (!next) break;
        used.add(next.id);
        damage *= i === 0 ? 0.35 : 0.6;
        hitEnemy(run, next, damage);
        spark(run, last.x, last.y, next.x, next.y, '#bda5ff');
        last = next;
      }
    } else if (faction === 'I') {
      const damage = direct(
        run,
        'I',
        value(run, 'I01', [9, 13, 17]) +
          (run.graze ? value(run, 'I04', [5, 8, 11]) : 0),
      );
      run.graze = false;
      hitEnemy(run, target, damage);
      spark(run, BIRD_X, run.bird.y, target.x, target.y, '#aadbec');
      const second = targets.find(
        (e) => e.hp > 0 && e.id !== target.id && Math.abs(e.y - target.y) < 35,
      );
      if (second) {
        hitEnemy(run, second, damage * 0.5);
        spark(run, target.x, target.y, second.x, second.y, '#aadbec');
      }
    } else if (faction === 'F') {
      hitEnemy(run, target, direct(run, 'F', value(run, 'F01', [7, 10, 13])));
      target.slow = 120;
      target.frostHits++;
      if (
        rank(run, 'F02') &&
        target.frostHits >= value(run, 'F02', [4, 3, 3]) &&
        ready(run, `freeze-${target.id}`, 240)
      ) {
        target.frostHits = 0;
        if (target.kind === 'boss' || target.kind === 'elite')
          hitEnemy(run, target, 6, false);
        else target.frozen = value(run, 'F02', [30, 30, 42]);
        trigger(run, 'F02');
      }
      spark(run, BIRD_X, run.bird.y, target.x, target.y, '#88ddff');
    } else if (faction === 'N') {
      const damage =
        direct(run, 'N', value(run, 'N01', [8, 11, 14])) *
        (1 + (run.counters.growth ?? 0) * 0.04);
      hitEnemy(run, target, damage);
      if (
        rank(run, 'N03') &&
        count(run, 'pollen', 2) >= value(run, 'N03', [5, 4, 3])
      ) {
        run.counters.pollen = 0;
        target.burns = target.burns.filter((b) => b.source !== 'poison');
        target.burns.push({
          ticks: 120,
          source: 'poison',
          dps: 2 * efficiency(run, 'N'),
        });
        trigger(run, 'N03');
      }
      spark(run, BIRD_X - 15, run.bird.y - 20, target.x, target.y, '#b7edaa');
      spark(run, BIRD_X - 15, run.bird.y + 20, target.x, target.y, '#b7edaa');
    } else if (faction === 'A') {
      let damage = direct(run, 'A', value(run, 'A01', [11, 15, 20]));
      if (
        rank(run, 'A04') &&
        ready(run, 'pulse', value(run, 'A04', [720, 600, 480]))
      ) {
        damage *= 1.4;
        trigger(run, 'A04');
      }
      hitEnemy(run, target, damage);
      target.mark++;
      target.markExpiry = run.tick + 360;
      if (rank(run, 'A02') && target.mark >= 3) {
        target.mark = 0;
        hitEnemy(
          run,
          target,
          value(run, 'A02', [6, 9, 12]) * efficiency(run, 'A'),
          false,
        );
        trigger(run, 'A02');
      }
      if (run.counters.satellite) {
        run.counters.satellite = 0;
        hitEnemy(
          run,
          target,
          damage * value(run, 'A03', [0.4, 0.55, 0.7]),
          false,
        );
        trigger(run, 'A03');
      }
      spark(run, BIRD_X, run.bird.y, target.x, target.y, '#ffdf89');
    }
    trigger(run, `${faction}01`);
    if (faction === run.weapons[0]) {
      const baseValues: Record<Faction, number[]> = {
        E: [6, 8, 10],
        S: [8, 11, 14],
        F: [7, 10, 13],
        N: [8, 11, 14],
        I: [9, 13, 17],
        A: [11, 15, 20],
      };
      const base = direct(
        run,
        faction,
        value(run, `${faction}01`, baseValues[faction]),
      );
      const attacks = count(run, 'primary');
      let bonus = 0;
      if (run.counters.bank) {
        run.counters.bank = 0;
        bonus += base * value(run, 'X03', [0.3, 0.5]);
      }
      if (run.counters.revenge) {
        run.counters.revenge = 0;
        bonus += base * value(run, 'X07', [0.5, 0.8]);
        trigger(run, 'X07');
      }
      if (run.counters.windStrike) {
        run.counters.windStrike = 0;
        bonus += value(run, 'X11', [10, 16]);
      }
      if (run.counters.battery) {
        bonus += run.counters.battery * 8;
        run.counters.battery = 0;
        trigger(run, 'R03');
      }
      if (run.relics.includes('R01') && attacks % 3 === 0) {
        bonus += base * 0.5;
        trigger(run, 'R01');
      }
      if (bonus) hitEnemy(run, target, bonus, false);
      if (rank(run, 'X05') && attacks % value(run, 'X05', [4, 3]) === 0) {
        const back = run.enemies.find((e) => e.hp > 0 && e.x < BIRD_X);
        if (back) {
          hitEnemy(run, back, base * 0.5, false);
          spark(run, BIRD_X, run.bird.y, back.x, back.y, '#e3bfff');
          trigger(run, 'X05');
        }
      }
    }
  }
}
function ready(run: Run, key: string, interval: number): boolean {
  if ((run.cooldowns[key] ?? 0) > run.tick) return false;
  run.cooldowns[key] = run.tick + interval;
  return true;
}
function nearest(run: Run): Enemy | undefined {
  return run.enemies
    .filter((e) => e.hp > 0)
    .sort(
      (a, b) =>
        Math.hypot(a.x - BIRD_X, a.y - run.bird.y) -
        Math.hypot(b.x - BIRD_X, b.y - run.bird.y),
    )[0];
}
function clearBullets(run: Run, limit: number) {
  const victims = [...run.shots]
    .sort(
      (a, b) =>
        Math.hypot(a.x - BIRD_X, a.y - run.bird.y) -
        Math.hypot(b.x - BIRD_X, b.y - run.bird.y),
    )
    .slice(0, limit);
  run.shots = run.shots.filter((s) => !victims.includes(s));
  for (const s of victims)
    spark(run, s.x - 6, s.y - 6, s.x + 6, s.y + 6, '#c5f8ff');
  const cleansed = count(run, 'cleansed', victims.length);
  if (
    rank(run, 'X12') &&
    victims.length &&
    cleansed >= value(run, 'X12', [4, 3])
  ) {
    run.counters.cleansed = 0;
    const enemy = nearest(run);
    if (enemy) {
      hitEnemy(run, enemy, 8, false);
      trigger(run, 'X12');
    }
  }
  if (
    run.relics.includes('R04') &&
    victims.length &&
    count(run, 'chaliceClears', victims.length) >= 6 &&
    (run.counters.chaliceHeals ?? 0) < 2
  ) {
    run.counters.chaliceClears = 0;
    count(run, 'chaliceHeals');
    run.bird.hp = Math.min(run.bird.maxHp, run.bird.hp + 1);
    trigger(run, 'R04');
  }
}
function effects(run: Run, flap: boolean) {
  const target = nearest(run);
  if (flap && run.tick - run.lastFlap >= 8) {
    run.lastFlap = run.tick;
    const taps = count(run, 'flaps');
    if (
      rank(run, 'X01') &&
      taps % value(run, 'X01', [5, 4]) === 0 &&
      target &&
      ready(run, 'echoFlap', 48)
    ) {
      hitEnemy(run, target, 6, false);
      spark(run, BIRD_X, run.bird.y, target.x, target.y, '#f4b6ed');
      trigger(run, 'X01');
    }
  }
  run.fallingTicks = run.bird.vy > 40 ? run.fallingTicks + 1 : 0;
  if (
    rank(run, 'X02') &&
    run.fallingTicks >= 36 &&
    target &&
    ready(run, 'bomb', 180)
  ) {
    hitEnemy(run, target, value(run, 'X02', [8, 12]), false);
    spark(run, BIRD_X, run.bird.y, target.x, target.y, '#ffc789');
    trigger(run, 'X02');
  }
  if (
    rank(run, 'X08') &&
    target &&
    ready(run, 'firework', value(run, 'X08', [360, 240]))
  )
    target.firework = 60;
  if (
    rank(run, 'X09') &&
    run.bird.hp <= 2 &&
    ready(run, 'dangerShield', value(run, 'X09', [540, 360]))
  ) {
    run.bird.shield = Math.min(3, run.bird.shield + 1);
    trigger(run, 'X09');
  }
  if (
    rank(run, 'X04') &&
    (run.weather === 'rain' || run.weather === 'fire') &&
    ready(run, 'rainJar', value(run, 'X04', [480, 360]))
  ) {
    run.counters.rain = Math.min(3, (run.counters.rain ?? 0) + 1);
    trigger(run, 'X04');
  }
  if (
    run.weather === 'clear' &&
    (run.counters.rain ?? 0) > 0 &&
    run.bird.shield < 3 &&
    ready(run, 'rainConvert', 240)
  ) {
    run.counters.rain = (run.counters.rain ?? 0) - 1;
    run.bird.shield++;
  }
  if (
    rank(run, 'F04') &&
    ready(run, 'frostClear', value(run, 'F04', [720, 600, 480]))
  ) {
    clearBullets(run, 2);
    trigger(run, 'F04');
  }
  if (run.relics.includes('R04') && ready(run, 'chalice', 720))
    clearBullets(run, 3);
  if (run.relics.includes('R05') && ready(run, 'royalShield', 600)) {
    run.bird.shield = Math.min(3, run.bird.shield + 1);
    trigger(run, 'R05');
  }
  if (rank(run, 'N02') && count(run, 'growthTimer') >= 480) {
    run.counters.growthTimer = 0;
    run.counters.growth = Math.min(
      value(run, 'N02', [3, 4, 5]),
      (run.counters.growth ?? 0) + 1,
    );
    trigger(run, 'N02');
  }
  if (
    (run.counters.spiritShots ?? 0) > 0 &&
    target &&
    ready(run, 'spiritAttack', 30)
  ) {
    run.counters.spiritShots = (run.counters.spiritShots ?? 0) - 1;
    hitEnemy(run, target, 5 * efficiency(run, 'N'), false);
    spark(run, BIRD_X, run.bird.y - 25, target.x, target.y, '#b2efb0');
  }
}
export function weatherAt(
  chapter: number,
  seconds: number,
  fighting = false,
): Run['weather'] {
  if (fighting) return 'clear';
  if (chapter === 1)
    return seconds >= 35 && seconds < 55
      ? 'wind'
      : seconds >= 60 && seconds < 80
        ? 'rain'
        : 'clear';
  return seconds >= 20 && seconds < 45
    ? 'heat'
    : seconds >= 50 && seconds < 80
      ? 'fire'
      : 'clear';
}
function weather(run: Run): number {
  run.weather = weatherAt(
    run.chapter,
    run.stageTick / 60,
    run.phase === 'boss' || run.enemies.some((e) => e.kind === 'elite'),
  );
  if (run.weather === 'fire' && run.stageTick % 300 === 0) {
    run.fireX = 170 + random(run, 'worldRng') * 70;
    run.fireWarning = 90;
  }
  if (
    run.fireWarning > 0 &&
    --run.fireWarning === 0 &&
    run.weather === 'fire' &&
    run.shots.length < 16
  ) {
    run.shots.push({
      id: run.id++,
      x: run.fireX,
      y: 86,
      vx: -45,
      vy: 180,
      damage: 1,
      hostile: true,
      color: '#ffb069',
      life: 190,
    });
  }
  if (run.weather === 'wind' || run.weather === 'heat') {
    const start = run.chapter === 1 ? 35 : 20;
    const end = run.chapter === 1 ? 55 : 45;
    const fade = Math.min(
      1,
      (run.stageTick / 60 - start) / 2,
      (end - run.stageTick / 60) / 2,
    );
    return (
      Math.sin(run.stageTick / 280) *
      (run.weather === 'heat' ? 65 : 40) *
      Math.max(0, fade)
    );
  }
  return 0;
}
function spawnMajor(run: Run, kind: 'elite' | 'boss') {
  const hp = (kind === 'boss' ? 360 : 85) * (run.chapter === 1 ? 1 : 1.65);
  run.enemies = [];
  run.shots = [];
  run.gates = [];
  run.enemies.push({
    id: run.id++,
    kind,
    x: 285,
    y: 320,
    hp,
    maxHp: hp,
    age: 0,
    cooldown: 180,
    aimY: 320,
    burns: [],
    frostHits: 0,
    frozen: 0,
    slow: 0,
    mark: 0,
    markExpiry: 0,
    firework: 0,
  });
  if (kind === 'boss') {
    run.phase = 'boss';
    run.bossStarted = true;
    run.spawnGate = 30;
  } else run.eliteSpawned = true;
}
function completeChapter(run: Run) {
  run.chapterComplete = true;
  run.phase = 'reward';
  run.relicOffers = relicDraft(run);
  if (run.bossDefeated) run.bird.hp = Math.min(run.bird.maxHp, run.bird.hp + 2);
  run.enemies = [];
  run.shots = [];
  run.gates = [];
  run.warningTicks = 0;
  run.fireWarning = 0;
}
function over(run: Run) {
  return run.phase === 'result';
}
export function stepRun(run: Run, flap = false) {
  if (run.phase === 'draft' || run.phase === 'reward' || over(run)) return;
  if (run.phase === 'rest' && run.chapterComplete) {
    if (run.chapter === 2) {
      run.phase = 'result';
      run.won = true;
      return;
    }
    run.chapter++;
    run.stageTick = 0;
    run.chapterComplete = false;
    run.bossStarted = false;
    run.bossDefeated = false;
    run.eliteSpawned = false;
    run.scheduledUpgrades = 0;
    run.bonusXp = 0;
    run.phase = 'flight';
    run.spawnGate = 0;
    run.spawnEnemy = 600;
    run.bird.y = 320;
    run.bird.vy = 0;
    run.bird.invulnerable = 120;
    run.counters.reviveUsed = 0;
    run.counters.chaliceHeals = 0;
    run.counters.chaliceClears = 0;
  }
  run.tick++;
  run.stageTick++;
  if (run.bird.invulnerable > 0) run.bird.invulnerable--;
  run.echoCooldown--;
  run.explosionCooldown--;
  if (run.tick > run.chargeExpiry) run.charge = 0;
  if (run.tick > run.rhythmExpiry) run.rhythm = 0;
  const wind = run.practice ? 0 : weather(run);
  if (flap) run.bird.vy = -280;
  run.bird.vy = Math.min(400, run.bird.vy + (900 + wind) * STEP);
  run.bird.y += run.bird.vy * STEP;
  if (run.bird.y < 84) {
    run.bird.y = 84;
    run.bird.vy = Math.max(0, run.bird.vy);
  }
  if (run.bird.y > 604) {
    hurt(run, '坠入云海');
    run.bird.y = 510;
    run.bird.vy = -160;
  }
  if (over(run)) return;
  gates(run);
  if (over(run)) return;
  enemies(run);
  if (over(run)) return;
  weapons(run);
  effects(run, flap);
  if (rank(run, 'I02') && --run.shieldCooldown <= 0) {
    run.bird.shield = Math.max(run.bird.shield, 1);
    run.shieldCooldown = value(run, 'I02', [1080, 900, 720]);
    trigger(run, 'I02');
  }
  for (const shot of run.shots) {
    const oldX = shot.x,
      oldY = shot.y;
    const rainSlow = run.weather === 'rain' ? 0.9 : 1;
    shot.x += shot.vx * STEP * rainSlow;
    shot.y += shot.vy * STEP * rainSlow;
    shot.life--;
    const dx = shot.x - oldX,
      dy = shot.y - oldY;
    const t = clamp(
      ((BIRD_X - oldX) * dx + (run.bird.y - oldY) * dy) /
        Math.max(0.001, dx * dx + dy * dy),
      0,
      1,
    );
    if (Math.hypot(oldX + t * dx - BIRD_X, oldY + t * dy - run.bird.y) < 13) {
      hurt(run, shot.color === '#ffb069' ? '被火雨击中' : '被敌方弹幕击中');
      shot.life = 0;
    }
  }
  run.shots = run.shots.filter(
    (s) => s.life > 0 && s.x > -20 && s.y > 60 && s.y < 640,
  );
  run.sparks.forEach((s) => s.life--);
  run.sparks = run.sparks.filter((s) => s.life > 0);
  if (over(run)) return;
  if (run.practice) {
    if (run.tick >= 3600) {
      run.phase = 'result';
      run.won = true;
    }
    return;
  }
  if (run.stageTick >= 5400 && !run.eliteSpawned) spawnMajor(run, 'elite');
  if (run.stageTick >= 6900)
    run.enemies = run.enemies.filter((e) => e.kind !== 'elite');
  if (run.stageTick >= 8100 && !run.bossStarted) spawnMajor(run, 'boss');
  if (run.bossDefeated || run.stageTick >= 10800) {
    completeChapter(run);
    return;
  }
  const xp =
    run.stageTick / 60 + Math.min(run.bonusXp, (run.stageTick / 60) * 0.15);
  const threshold = UPGRADE_XP[run.scheduledUpgrades];
  if (threshold !== undefined && xp >= threshold) {
    run.scheduledUpgrades++;
    run.pendingUpgrades++;
  }
  if (run.phase !== 'boss' && run.pendingUpgrades > 0) {
    run.returnPhase = run.phase === 'rest' ? 'rest' : 'flight';
    run.phase = 'draft';
    run.offers = draft(run);
  }
}
