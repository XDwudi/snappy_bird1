import { random, rank } from './model.ts';
import type { Run, Faction } from './model.ts';
export interface Skill {
  id: string;
  name: string;
  faction: Faction | 'C' | 'X';
  max: number;
  descriptions: string[];
}
export const SKILLS: Skill[] = [
  {
    id: 'E01',
    name: '火羽',
    faction: 'E',
    max: 3,
    descriptions: [
      '6直伤 + 4灼烧 / 0.8秒',
      '8直伤 + 6灼烧 / 0.8秒',
      '10直伤 + 8灼烧 / 0.8秒',
    ],
  },
  {
    id: 'E02',
    name: '余烬',
    faction: 'E',
    max: 3,
    descriptions: ['灼烧最多2层', '灼烧最多3层', '灼烧最多4层'],
  },
  {
    id: 'E03',
    name: '爆燃',
    faction: 'E',
    max: 3,
    descriptions: ['燃烧目标死亡：爆炸6伤', '爆炸提升为9伤', '爆炸提升为12伤'],
  },
  {
    id: 'E04',
    name: '热浪',
    faction: 'E',
    max: 3,
    descriptions: [
      '每3道门释放8伤热浪',
      '每3道门释放12伤热浪',
      '每2道门释放12伤热浪',
    ],
  },
  {
    id: 'S01',
    name: '电羽',
    faction: 'S',
    max: 3,
    descriptions: [
      '8伤电击 / 0.9秒，连锁1次',
      '11伤电击 / 0.9秒',
      '14伤电击 / 0.9秒',
    ],
  },
  {
    id: 'S02',
    name: '导电',
    faction: 'S',
    max: 3,
    descriptions: ['连锁额外跳跃1次', '连锁额外跳跃2次', '连锁额外跳跃3次'],
  },
  {
    id: 'S03',
    name: '穿云',
    faction: 'S',
    max: 3,
    descriptions: ['精准穿门蓄电，每层+4伤', '每层电荷+6伤', '每层电荷+8伤'],
  },
  {
    id: 'S04',
    name: '节拍',
    faction: 'S',
    max: 3,
    descriptions: ['精准门叠3%攻速，最多4层', '每层4%攻速', '每层5%攻速'],
  },
  {
    id: 'I01',
    name: '钢羽',
    faction: 'I',
    max: 3,
    descriptions: ['9伤钢羽 / 秒，贯穿1次', '13伤钢羽 / 秒', '17伤钢羽 / 秒'],
  },
  {
    id: 'I02',
    name: '锻甲',
    faction: 'I',
    max: 3,
    descriptions: [
      '每18秒恢复1点锻甲护盾',
      '每15秒恢复1点锻甲护盾',
      '每12秒恢复1点锻甲护盾',
    ],
  },
  {
    id: 'I03',
    name: '回响',
    faction: 'I',
    max: 3,
    descriptions: ['护盾击破向前反击10伤', '反击提升为14伤', '反击提升为18伤'],
  },
  {
    id: 'I04',
    name: '擦翼',
    faction: 'I',
    max: 3,
    descriptions: [
      '安全擦门：下次钢羽+5伤',
      '安全擦门：下次钢羽+8伤',
      '安全擦门：下次钢羽+11伤',
    ],
  },
  {
    id: 'F01',
    name: '冰针',
    faction: 'F',
    max: 3,
    descriptions: [
      '每0.8秒7伤，附加减速',
      '每0.8秒10伤，附加减速',
      '每0.8秒13伤，附加减速',
    ],
  },
  {
    id: 'F02',
    name: '霜层',
    faction: 'F',
    max: 3,
    descriptions: [
      '每4次冰针冻结0.5秒',
      '每3次冰针冻结0.5秒',
      '每3次冰针冻结0.7秒',
    ],
  },
  {
    id: 'F03',
    name: '碎镜',
    faction: 'F',
    max: 3,
    descriptions: ['解冻向2敌散射3伤碎冰', '碎冰提升为5伤', '碎冰提升为7伤'],
  },
  {
    id: 'F04',
    name: '净空',
    faction: 'F',
    max: 3,
    descriptions: ['每12秒清除前方2枚敌弹', '冷却缩短至10秒', '冷却缩短至8秒'],
  },
  {
    id: 'N01',
    name: '双生灵',
    faction: 'N',
    max: 3,
    descriptions: [
      '双伙伴每0.9秒各造成4伤',
      '伙伴每次各造成5.5伤',
      '伙伴每次各造成7伤',
    ],
  },
  {
    id: 'N02',
    name: '萌芽',
    faction: 'N',
    max: 3,
    descriptions: [
      '8秒无伤生长，最多3层',
      '生长上限4层，每层+4%伤',
      '生长上限5层，每层+4%伤',
    ],
  },
  {
    id: 'N03',
    name: '花粉',
    faction: 'N',
    max: 3,
    descriptions: [
      '伙伴每5次命中附加4伤毒',
      '每4次命中附加4伤毒',
      '每3次命中附加4伤毒',
    ],
  },
  {
    id: 'N04',
    name: '结队',
    faction: 'N',
    max: 3,
    descriptions: [
      '每4道门唤灵鸟：2次5伤',
      '灵鸟改为3次攻击',
      '灵鸟改为4次攻击',
    ],
  },
  {
    id: 'A01',
    name: '星矢',
    faction: 'A',
    max: 3,
    descriptions: [
      '每1.2秒释放11伤追踪星矢',
      '星矢提升为15伤',
      '星矢提升为20伤',
    ],
  },
  {
    id: 'A02',
    name: '星痕',
    faction: 'A',
    max: 3,
    descriptions: ['星矢3次命中爆发6伤', '星痕爆发9伤', '星痕爆发12伤'],
  },
  {
    id: 'A03',
    name: '轨道',
    faction: 'A',
    max: 3,
    descriptions: [
      '每3门附带40%伤害卫星',
      '卫星伤害提升至55%',
      '卫星伤害提升至70%',
    ],
  },
  {
    id: 'A04',
    name: '脉冲',
    faction: 'A',
    max: 3,
    descriptions: ['每12秒储备一次+40%星矢', '脉冲间隔10秒', '脉冲间隔8秒'],
  },
  {
    id: 'X01',
    name: '回声拍翅',
    faction: 'X',
    max: 2,
    descriptions: ['每5次拍翅向敌人发6伤回声', '改为每4次拍翅触发'],
  },
  {
    id: 'X02',
    name: '落羽炸弹',
    faction: 'X',
    max: 2,
    descriptions: ['持续下降0.6秒投8伤炸弹', '炸弹提升为12伤'],
  },
  {
    id: 'X03',
    name: '风险存款',
    faction: 'X',
    max: 2,
    descriptions: ['连续3道无伤门：下次攻击+30%', '存款加成提升至50%'],
  },
  {
    id: 'X04',
    name: '雨水收藏',
    faction: 'X',
    max: 2,
    descriptions: ['雨天每8秒收藏水滴，晴天换盾', '收藏间隔缩短至6秒'],
  },
  {
    id: 'X05',
    name: '回旋羽',
    faction: 'X',
    max: 2,
    descriptions: ['每4次主攻击向身后补50%伤', '改为每3次主攻击触发'],
  },
  {
    id: 'X06',
    name: '精准兑换',
    faction: 'X',
    max: 2,
    descriptions: ['每3个精准门清除2枚敌弹', '改为每2个精准门触发'],
  },
  {
    id: 'X07',
    name: '以伤换锋',
    faction: 'X',
    max: 2,
    descriptions: ['失去生命后下一击+50%', '反击加成提升至80%'],
  },
  {
    id: 'X08',
    name: '延迟烟花',
    faction: 'X',
    max: 2,
    descriptions: ['每6秒种下延迟1秒的10伤烟花', '种植间隔缩短至4秒'],
  },
  {
    id: 'X09',
    name: '险境开花',
    faction: 'X',
    max: 2,
    descriptions: ['生命≤2时，每9秒补1盾', '冷却缩短至6秒'],
  },
  {
    id: 'X10',
    name: '门后伏击',
    faction: 'X',
    max: 2,
    descriptions: ['通过门后1秒攻速+20%', '增益延长至1.5秒'],
  },
  {
    id: 'X11',
    name: '气流借力',
    faction: 'X',
    max: 2,
    descriptions: ['风中精准穿门，下一击+10伤', '附伤提升至16伤'],
  },
  {
    id: 'X12',
    name: '温柔连锁',
    faction: 'X',
    max: 2,
    descriptions: ['清除4弹向最近敌人发8伤脉冲', '改为清除3弹触发'],
  },
  {
    id: 'C01',
    name: '结实羽毛',
    faction: 'C',
    max: 2,
    descriptions: [
      '生命上限+1（最高8），回复1血',
      '生命上限再+1（最高8），回复1血',
    ],
  },
  {
    id: 'C02',
    name: '专注',
    faction: 'C',
    max: 2,
    descriptions: ['武器直伤+8%', '武器直伤加成提升至14%'],
  },
  {
    id: 'C03',
    name: '轻快',
    faction: 'C',
    max: 2,
    descriptions: ['自动攻击速度+8%', '自动攻击速度加成至14%'],
  },
];
export const skillById = (id: string) =>
  SKILLS.find((skill) => skill.id === id);
export function eligible(run: Run): Skill[] {
  return SKILLS.filter(
    (s) =>
      !run.bans.includes(s.id) &&
      rank(run, s.id) < s.max &&
      (s.faction === 'C' ||
        s.faction === 'X' ||
        run.weapons.includes(s.faction) ||
        (s.id.endsWith('01') && run.weapons.length < 2)),
  );
}
export function draft(run: Run, exclude: string[] = []): string[] {
  const all = eligible(run);
  let pool = all.filter((s) => !exclude.includes(s.id));
  if (pool.length < 3) pool = all;
  const chosen: string[] = [];
  const take = (candidates: Skill[]) => {
    if (!candidates.length) return;
    const weighted = candidates.flatMap((s) =>
      Array.from(
        { length: rank(run, s.id) ? 4 : s.faction === run.weapons[0] ? 3 : 1 },
        () => s,
      ),
    );
    const selected =
      weighted[Math.floor(random(run, 'draftRng') * weighted.length)];
    if (selected) {
      chosen.push(selected.id);
      pool = pool.filter((s) => s.id !== selected.id);
    }
  };
  const primary = `${run.weapons[0]}01`;
  if (run.upgrades % 3 === 2 && pool.some((s) => s.id === primary))
    take(pool.filter((s) => s.id === primary));
  else
    take(
      pool.filter((s) => rank(run, s.id) > 0 || s.faction === run.weapons[0]),
    );
  take(
    pool.filter(
      (s) => s.faction === 'C' || s.faction === 'X' || s.id === 'I02',
    ),
  );
  while (chosen.length < 3 && pool.length) take(pool);
  while (chosen.length < 3) chosen.push(`REST${chosen.length}`);
  return chosen;
}
export function chooseSkill(run: Run, id: string): boolean {
  if (run.phase !== 'draft' || !run.offers.includes(id)) return false;
  if (id.startsWith('REST'))
    run.bird.hp = Math.min(run.bird.maxHp, run.bird.hp + 1);
  else {
    const skill = eligible(run).find((s) => s.id === id);
    if (!skill) return false;
    run.skills[id] = rank(run, id) + 1;
    if (
      id.endsWith('01') &&
      skill.faction !== 'C' &&
      skill.faction !== 'X' &&
      !run.weapons.includes(skill.faction)
    )
      run.weapons.push(skill.faction);
    if (id === 'C01') {
      run.bird.maxHp = Math.min(8, run.bird.maxHp + 1);
      run.bird.hp = Math.min(run.bird.maxHp, run.bird.hp + 1);
    }
    if (id === 'I02')
      run.shieldCooldown = Math.min(
        run.shieldCooldown,
        [1080, 900, 720][rank(run, id) - 1] ?? 1080,
      );
  }
  run.history.push(id);
  run.upgrades++;
  run.pendingUpgrades = Math.max(0, run.pendingUpgrades - 1);
  run.offers = [];
  run.phase = run.returnPhase;
  run.bird.invulnerable = Math.max(run.bird.invulnerable, 30);
  return true;
}
export function reroll(run: Run): boolean {
  if (run.phase !== 'draft' || run.rerolls <= 0) return false;
  run.rerolls--;
  run.offers = draft(run, run.offers);
  return true;
}
export function banish(run: Run, id: string): boolean {
  if (
    run.phase !== 'draft' ||
    run.banishes <= 0 ||
    !run.offers.includes(id) ||
    id.startsWith('REST')
  )
    return false;
  // Never ban the starting weapon, so basic output remains upgradeable.
  if (id === `${run.weapons[0]}01`) return false;
  run.bans.push(id);
  run.banishes--;
  run.offers = draft(run);
  return true;
}

export const RELICS = [
  {
    id: 'R01',
    name: '双重羽冠',
    description: '每3次主攻击再发一次50%回声',
    color: '#ffe49d',
  },
  {
    id: 'R02',
    name: '不灭火种',
    description: '生命上限+2，每章抵挡一次致命伤',
    color: '#ffa886',
  },
  {
    id: 'R03',
    name: '风暴电池',
    description: '精准门蓄8伤，最多3层叠加',
    color: '#c7b0ff',
  },
  {
    id: 'R04',
    name: '霜镜圣杯',
    description: '12秒清3弹，累计清6弹可回血',
    color: '#9eefff',
  },
  {
    id: 'R05',
    name: '铁翼王印',
    description: '每10秒补盾，破盾时向前反击',
    color: '#e1e9f7',
  },
  {
    id: 'R06',
    name: '万象种子',
    description: '所有已拥有未满级技能升一级',
    color: '#b8f0b6',
  },
];
export function relicDraft(run: Run): string[] {
  const pool = RELICS.filter((r) => !run.relics.includes(r.id));
  const offers: string[] = [];
  while (offers.length < 3 && pool.length) {
    const [choice] = pool.splice(
      Math.floor(random(run, 'draftRng') * pool.length),
      1,
    );
    if (choice) offers.push(choice.id);
  }
  return offers;
}
export function chooseRelic(run: Run, id: string): boolean {
  if (
    run.phase !== 'reward' ||
    !run.relicOffers.includes(id) ||
    run.relics.includes(id)
  )
    return false;
  run.relics.push(id);
  if (id === 'R02') {
    run.bird.maxHp = Math.min(8, run.bird.maxHp + 2);
    run.bird.hp = Math.min(run.bird.maxHp, run.bird.hp + 2);
  }
  if (id === 'R06') {
    for (const skill of SKILLS)
      if (rank(run, skill.id) > 0 && rank(run, skill.id) < skill.max) {
        run.skills[skill.id] = rank(run, skill.id) + 1;
        if (skill.id === 'C01') {
          run.bird.maxHp = Math.min(8, run.bird.maxHp + 1);
          run.bird.hp = Math.min(run.bird.maxHp, run.bird.hp + 1);
        }
      }
    run.bird.hp = Math.min(run.bird.maxHp, run.bird.hp + 1);
  }
  run.pendingUpgrades++;
  run.relicOffers = [];
  run.returnPhase = 'rest';
  run.phase = 'draft';
  run.offers = draft(run);
  return true;
}
