import type { Surface } from '../core/ports.ts';
import type { Run, Faction } from '../game/model.ts';
import {
  FACTIONS,
  FACTION_NAMES,
  COLORS,
  BIRD_X,
  rank,
  clamp,
} from '../game/model.ts';
import { skillById, RELICS } from '../game/skills.ts';

export interface ViewState {
  screen: 'menu' | 'game';
  faction: Faction;
  run: Run | null;
  paused: boolean;
  countdown: number;
  animation: number;
  banMode: boolean;
}
const ink = '#253948',
  cream = '#fff5df';
const labels = {
  clear: '晴空',
  wind: '微风',
  rain: '阵雨',
  heat: '热风',
  fire: '火雨',
};
function panel(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  color = cream,
) {
  s.rect(x, y + 4, w, h, '#22354833', 16);
  s.rect(x, y, w, h, color, 16);
}
function cloud(s: Surface, x: number, y: number, size: number, color: string) {
  s.circle(x, y, size, color);
  s.circle(x + size, y - size / 3, size * 1.15, color);
  s.circle(x + size * 2, y, size * 0.8, color);
  s.rect(x, y, size * 2, size * 0.8, color);
}
function bird(
  s: Surface,
  x: number,
  y: number,
  color: string,
  time: number,
  size = 1,
) {
  s.polygon(
    [
      { x: x - 15 * size, y: y + 2 * size },
      { x: x - 29 * size, y: y - 9 * size },
      { x: x - 25 * size, y: y + 10 * size },
    ],
    '#3b596a',
  );
  s.circle(x, y, 15 * size, '#334759');
  s.circle(x + 1 * size, y - 2 * size, 13 * size, color);
  s.circle(x + 3 * size, y + 4 * size, 8 * size, '#fff1d8');
  const wing = Math.sin(time * 15) * 5;
  s.polygon(
    [
      { x: x - 5 * size, y: y },
      { x: x - 19 * size, y: y + (wing - 8) * size },
      { x: x - 12 * size, y: y + 9 * size },
    ],
    '#d58953',
  );
  s.circle(x + 7 * size, y - 5 * size, 3.5 * size, '#fff9ee');
  s.circle(x + 8 * size, y - 5 * size, 2 * size, ink);
  s.polygon(
    [
      { x: x + 12 * size, y: y },
      { x: x + 24 * size, y: y + 3 * size },
      { x: x + 12 * size, y: y + 6 * size },
    ],
    '#f5ac4e',
  );
}
function background(s: Surface, chapter: number, time: number) {
  s.clear(chapter === 2 ? '#392d48' : '#a5dadd');
  s.gradient(
    chapter === 2 ? '#452e4c' : '#82c6d3',
    chapter === 2 ? '#dc9876' : '#f3ebc7',
  );
  s.circle(290, 115, 39, chapter === 2 ? '#ffc384' : '#fff2c4');
  for (let i = 0; i < 5; i++)
    cloud(
      s,
      ((i * 113 - time * 7 + 500) % 560) - 100,
      120 + (i % 3) * 65,
      20 + (i % 2) * 8,
      chapter === 2 ? '#c27f8177' : '#fff8e4aa',
    );
  for (let i = 0; i < 5; i++) {
    const x = ((i * 130 - time * 4 + 600) % 650) - 150;
    s.polygon(
      [
        { x, y: 640 },
        { x: x + 65, y: 350 + (i % 2) * 55 },
        { x: x + 145, y: 640 },
      ],
      chapter === 2 ? '#6c455c' : '#8bbbbb',
    );
    if (chapter === 2)
      s.polygon(
        [
          { x: x + 50, y: 389 + (i % 2) * 55 },
          { x: x + 65, y: 350 + (i % 2) * 55 },
          { x: x + 80, y: 392 + (i % 2) * 55 },
        ],
        '#f3ae69',
      );
  }
  s.rect(0, 614, 360, 26, chapter === 2 ? '#f99b65' : '#6f9e94');
  s.line(0, 615, 360, 615, '#fff1c9', 3);
}
function button(
  s: Surface,
  x: number,
  y: number,
  w: number,
  text: string,
  color = '#284d59',
) {
  s.rect(x, y, w, 44, color, 12);
  s.text(text, x + w / 2, y + 22, 16, '#fff5dc');
}
function menu(s: Surface, v: ViewState) {
  background(s, 1, v.animation);
  s.text('SNAPPY BIRD  /  VOL. 01', 180, 48, 11, '#355b65');
  s.text('风羽远征', 180, 103, 37, ink);
  s.text('让每一次拍翅，长出不同的可能', 180, 146, 12, '#41656e');
  bird(s, 180, 215, COLORS[v.faction], v.animation, 2.1);
  s.text('选择你的第一枚羽毛', 180, 280, 14, ink);
  FACTIONS.forEach((f, i) => {
    const x = 24 + (i % 3) * 106,
      y = 307 + Math.floor(i / 3) * 69;
    panel(s, x, y, 100, 58, v.faction === f ? COLORS[f] : '#fff6e5cc');
    s.text(FACTION_NAMES[f], x + 50, y + 20, 17, ink);
    s.text(
      {
        E: '灼烧与爆燃',
        S: '精准与连锁',
        F: '冻结与净空',
        N: '伙伴与生长',
        I: '护盾与反击',
        A: '标记与爆发',
      }[f],
      x + 50,
      y + 41,
      10,
      '#52616a',
    );
  });
  button(s, 30, 468, 300, '启程 · 林地 → 火山');
  s.text('两章 · 每章精英与Boss · 39技能', 180, 532, 11, '#355b65');
  s.text('轻触拍翅 · 自动攻击 · 升级时暂停', 180, 554, 11, '#355b65');
  s.text('60秒飞行练习', 180, 592, 13, ink);
  s.text('v0.2.0  首轮试玩版', 180, 631, 10, '#eef7e8');
}
function card(
  s: Surface,
  y: number,
  name: string,
  subtitle: string,
  details: string,
  color: string,
  marker: string,
) {
  panel(s, 23, y, 314, 94);
  s.rect(23, y, 7, 94, color, 3);
  s.text(marker, 47, y + 22, 11, '#7c8588', 'left');
  s.text(name, 46, y + 47, 20, ink, 'left');
  s.text(subtitle, 319, y + 23, 11, '#6c7b83', 'right');
  s.text(details, 46, y + 73, 11, '#576975', 'left');
}
function overlay(s: Surface, v: ViewState, r: Run) {
  s.rect(0, 0, 360, 640, '#132535cc');
  if (r.phase === 'draft') {
    s.text(
      v.banMode ? '放逐一项未来技能' : '一枚新羽，一种可能',
      180,
      84,
      23,
      cream,
    );
    s.text(
      v.banMode ? '选择后重新抽卡，主武器不可放逐' : '选择升级 · 世界已暂停',
      180,
      118,
      12,
      '#d2e7de',
    );
    r.offers.forEach((id, i) => {
      const skill = skillById(id);
      const level = rank(r, id);
      card(
        s,
        157 + i * 110,
        skill?.name ?? '旅途补给',
        skill ? `Lv.${level} → ${level + 1}` : '恢复1点生命',
        skill?.descriptions[level] ?? '让下一段旅途更从容',
        skill && skill.faction !== 'C' && skill.faction !== 'X'
          ? COLORS[skill.faction]
          : '#e1b5ee',
        skill?.faction === 'X' ? '灵感技能' : '技能升级',
      );
    });
    button(
      s,
      24,
      506,
      151,
      `重抽 ${r.rerolls}`,
      r.rerolls ? '#48716f' : '#50606a',
    );
    button(
      s,
      185,
      506,
      151,
      v.banMode ? '取消放逐' : `放逐 ${r.banishes}`,
      '#656077',
    );
    s.text('可以混搭第二派武器 · 副武器60%效率', 180, 579, 11, '#cce3df');
  } else if (r.phase === 'reward') {
    s.text(
      r.bossDefeated ? '巨翼已落，传奇在手' : '穿越险境，获得传奇',
      180,
      77,
      23,
      cream,
    );
    s.text(
      r.bossDefeated
        ? 'Boss击破：回复2血 + 遗物 + 技能'
        : 'Boss撤退：遗物 + 技能',
      180,
      111,
      12,
      '#e7cf9c',
    );
    r.relicOffers.forEach((id, i) => {
      const relic = RELICS.find((item) => item.id === id);
      if (relic)
        card(
          s,
          150 + i * 112,
          relic.name,
          '本局永久生效',
          relic.description,
          relic.color,
          '章末传奇',
        );
    });
    s.text(
      r.chapter === 1
        ? '选好奖励，带着新力量进入熔岩群峰'
        : '领取最终奖励后查看本局构筑',
      180,
      541,
      12,
      '#e7d7b5',
    );
  } else if (r.phase === 'result') {
    s.text(r.won ? '远征归来' : '暂歇云端', 180, 90, 34, cream);
    s.text(
      r.won
        ? r.practice
          ? '飞行练习完成'
          : '你已穿过晴空与熔岩'
        : `${r.lastHit || '生命耗尽'} · 下次试试另一套构筑`,
      180,
      136,
      12,
      '#d8d9cf',
    );
    panel(s, 28, 175, 304, 161);
    const stats = [
      [
        '飞行时间',
        `${Math.floor(r.tick / 3600)}分${Math.floor(r.tick / 60) % 60}秒`,
      ],
      ['安全穿门 / 精准', `${r.gateCount} / ${r.precise}`],
      ['击败敌人 / Boss', `${r.kills} / ${r.bossesKilled}`],
      ['升级 / 传奇', `${r.upgrades} / ${r.relics.length}`],
    ];
    stats.forEach(([a, b], i) => {
      s.text(a ?? '', 46, 203 + i * 34, 13, '#647882', 'left');
      s.text(b ?? '', 313, 203 + i * 34, 15, ink, 'right');
    });
    s.text('本局羽谱', 180, 369, 16, cream);
    const owned = Object.keys(r.skills).map(
      (id) => `${skillById(id)?.name ?? id}${rank(r, id)}`,
    );
    for (let i = 0; i < 7; i++)
      s.text(
        owned.slice(i * 3, i * 3 + 3).join(' · '),
        180,
        390 + i * 14,
        10,
        '#dde7dd',
      );
    s.text(
      r.relics
        .map((id) => RELICS.find((relic) => relic.id === id)?.name ?? id)
        .join(' · '),
      180,
      488,
      10,
      '#f5d58b',
    );
    button(s, 29, 501, 302, '再来一局');
    s.text('更换流派 / 返回营地', 180, 577, 13, cream);
  } else if (v.paused) {
    s.text('云端小憩', 180, 235, 32, cream);
    s.text('暂停期间不会受伤或推进时间', 180, 284, 13, '#d8e2d8');
    button(s, 60, 335, 240, '继续飞行');
    s.text('放弃本局，返回营地', 180, 429, 14, cream);
  } else if (v.countdown > 0) {
    s.text(
      r.chapter === 1 ? '准备好你的节奏' : '第二章 · 熔岩群峰',
      180,
      241,
      24,
      cream,
    );
    s.text(String(Math.ceil(v.countdown)), 180, 321, 64, cream);
    s.text('轻触拍翅 · 保持高度', 180, 389, 13, '#deece0');
  }
}
export function renderGame(s: Surface, v: ViewState) {
  if (v.screen === 'menu' || !v.run) {
    menu(s, v);
    return;
  }
  const r = v.run;
  background(s, r.chapter, r.tick / 60);
  for (const g of r.gates) {
    const top = g.center - g.gap / 2,
      bottom = g.center + g.gap / 2;
    if (g.ghost) {
      s.line(g.x, top, g.x, bottom, '#fff2b366', 3);
      s.circle(g.x, g.center, 4, '#fff1bf');
    } else {
      const c = r.chapter === 1 ? '#4f817c' : '#694857';
      s.rect(g.x - 23, 78, 46, top - 78, c, 5);
      s.rect(
        g.x - 27,
        top - 13,
        54,
        13,
        r.chapter === 1 ? '#a0c1a0' : '#eea071',
        4,
      );
      s.rect(g.x - 23, bottom, 46, 616 - bottom, c, 5);
      s.rect(
        g.x - 27,
        bottom,
        54,
        13,
        r.chapter === 1 ? '#a0c1a0' : '#eea071',
        4,
      );
      s.line(
        g.x - 12,
        top + g.gap / 2 - 12,
        g.x + 12,
        top + g.gap / 2 + 12,
        '#fff5cb66',
      );
    }
  }
  if (r.weather === 'rain' || r.weather === 'fire')
    for (let i = 0; i < 20; i++) {
      const x = ((i * 41 + r.tick * 0.7) % 380) - 10,
        y = ((i * 97 + r.tick * 4) % 550) + 70;
      s.line(
        x,
        y,
        x - 4,
        y + 12,
        r.weather === 'rain' ? '#ddf6fc55' : '#ffbb7455',
      );
    }
  if (r.weather === 'wind' || r.weather === 'heat')
    for (let i = 0; i < 5; i++) {
      const x = ((i * 83 - r.tick * 2 + 10000) % 450) - 45,
        y = 155 + i * 82;
      s.line(
        x,
        y,
        x + 40,
        y - 9,
        r.weather === 'heat' ? '#ffd6a866' : '#e9fbef99',
        2,
      );
    }
  if (r.fireWarning > 0) {
    s.line(r.fireX, 86, r.fireX - 132, 614, '#ffda8b88', 2);
    s.text('火雨', r.fireX, 100, 11, '#ffe8b3');
  }
  for (const e of r.enemies) {
    const big = e.kind === 'boss',
      elite = e.kind === 'elite';
    const size = big ? 34 : elite ? 24 : 13;
    s.circle(
      e.x,
      e.y,
      size + 3,
      e.frozen ? '#8ed6ec' : big ? '#4c3c56' : elite ? '#7c4252' : '#476271',
    );
    if (big || elite) {
      s.polygon(
        [
          { x: e.x - 25, y: e.y - 8 },
          { x: e.x - 58, y: e.y - 25 + Math.sin(e.age / 15) * 9 },
          { x: e.x - 38, y: e.y + 24 },
        ],
        big ? '#cca379' : '#d58b88',
      );
      s.polygon(
        [
          { x: e.x + 25, y: e.y - 8 },
          { x: e.x + 58, y: e.y - 25 },
          { x: e.x + 38, y: e.y + 24 },
        ],
        big ? '#cca379' : '#d58b88',
      );
    }
    s.circle(e.x - size * 0.35, e.y - size * 0.1, size * 0.26, '#fff1bd');
    s.circle(e.x + size * 0.35, e.y - size * 0.1, size * 0.26, '#fff1bd');
    s.circle(e.x - size * 0.4, e.y - size * 0.1, 2, '#3a3744');
    s.circle(e.x + size * 0.3, e.y - size * 0.1, 2, '#3a3744');
    s.rect(e.x - size, e.y - size - 10, size * 2, 3, '#20313d55');
    s.rect(
      e.x - size,
      e.y - size - 10,
      size * 2 * clamp(e.hp / e.maxHp, 0, 1),
      3,
      big ? '#ffbe8a' : '#bbe2ae',
    );
    if (e.burns.length) s.circle(e.x, e.y + size, 4, '#ffab68');
    if (e.firework) s.circle(e.x + size, e.y, 5, '#fbe0a1');
    if (
      (e.kind === 'moth' || big || elite) &&
      e.cooldown <= 54 &&
      e.cooldown > 0
    )
      s.line(e.x, e.y, BIRD_X, e.aimY, '#ffceac88', 1);
  }
  for (const shot of r.shots) {
    s.circle(shot.x, shot.y, 6, '#ffffff77');
    s.circle(shot.x, shot.y, 4, shot.color);
  }
  for (const a of r.sparks)
    s.line(a.x, a.y, a.x2, a.y2, a.color, Math.max(1, a.life / 5));
  if (r.warningTicks > 0) {
    s.rect(0, r.warningY - 40, 360, 80, '#e7596755');
    s.line(0, r.warningY - 40, 360, r.warningY - 40, '#ffd7b6', 2);
    s.text('羽流即将扫过 · 换高度', 180, r.warningY, 12, '#fff7d7');
  }
  if (r.bird.shield) s.circle(BIRD_X, r.bird.y, 23, '#abdfe755');
  if (!r.bird.invulnerable || Math.floor(r.tick / 5) % 2 === 0)
    bird(s, BIRD_X, r.bird.y, COLORS[r.weapons[0] ?? 'E'], r.tick / 60);
  if (r.weapons.includes('N')) {
    s.circle(BIRD_X - 22, r.bird.y - 24, 7, '#bbefac');
    s.circle(BIRD_X - 22, r.bird.y + 24, 7, '#bbefac');
  }
  s.rect(0, 0, 360, 76, '#1c3541ed');
  s.text(
    r.practice ? '练习航线' : r.chapter === 1 ? 'Ⅰ  晴空林地' : 'Ⅱ  熔岩群峰',
    16,
    21,
    15,
    '#fff0cf',
    'left',
  );
  s.text(
    `${Math.floor(r.stageTick / 3600)}:${String(Math.floor(r.stageTick / 60) % 60).padStart(2, '0')}  ${labels[r.weather]}`,
    16,
    44,
    11,
    '#bdcfc9',
    'left',
  );
  s.text(
    '●'.repeat(r.bird.hp) + '○'.repeat(Math.max(0, r.bird.maxHp - r.bird.hp)),
    159,
    23,
    12,
    '#ffbda1',
    'left',
  );
  s.text(
    r.bird.shield ? `护盾 ${r.bird.shield}` : `Lv.${r.upgrades + 1}`,
    159,
    45,
    11,
    '#a9dbe4',
    'left',
  );
  s.rect(301, 11, 46, 44, '#577178', 10);
  s.text('Ⅱ', 324, 33, 20, '#fff1cd');
  s.rect(
    0,
    71,
    360 * (r.stageTick / (r.practice ? 3600 : 10800)),
    4,
    r.chapter === 1 ? '#e6d28a' : '#ffad78',
  );
  const boss = r.enemies.find((e) => e.kind === 'boss' || e.kind === 'elite');
  if (boss)
    s.text(
      boss.kind === 'boss'
        ? r.chapter === 1
          ? 'BOSS · 风车巨鸮'
          : 'BOSS · 熔岩巨翼'
        : '精英 · 巡空卫士',
      180,
      100,
      14,
      r.chapter === 1 ? ink : '#fff0d9',
    );
  s.text(
    r.phase === 'boss'
      ? '坚持或击破Boss，夺取传奇遗物'
      : r.stageTick < 600
        ? '轻触拍翅，穿过云岩之间的空隙'
        : `${FACTION_NAMES[r.weapons[0] ?? 'E']}主羽 · 精准 ${r.precise} · 击败 ${r.kills}`,
    180,
    633,
    11,
    '#fff6dd',
  );
  if (
    ['draft', 'reward', 'result'].includes(r.phase) ||
    v.paused ||
    v.countdown > 0
  )
    overlay(s, v, r);
}
