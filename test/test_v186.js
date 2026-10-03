// Audit fixes: exercise live scoring, damage, reward and card lifecycle boundaries.
const assert = require('node:assert/strict')
const Game = require('../game/core/Game')
const R = require('../game/abilities/AbilityRegistry')
const C = require('../game/config/GameConfig')
const Monster = require('../game/entities/Monster')
const Missile = require('../game/entities/Missile')
const Pipe = require('../game/entities/Pipe')
const Rain = require('../game/weather/RainEffect')
const Hail = require('../game/weather/HailEffect')
require('../game/systems/GameLogger').enabled = false
let count = 0
function test(name, fn) {
  const original = Math.random
  let seed = 186
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
  try { fn(); count++; console.log('✓ ' + name) } finally { Math.random = original }
}
function make() { const g = new Game({}, {}, 375, 667, null); g.start(); g.bird.y = 300; return g }
function give(g, id, n = 1) { for (let i = 0; i < n; i++) g.abilitySystem.selectAbility(id); g.abilitySystem.invalidateStats() }
function fight(endless = false) {
  const g = make()
  if (endless) { g.chapterSystem.endless = true; g.chapterSystem.endlessFrames = 15 * 3600 }
  g._spawnBoss(); g.chapterSystem.startBossFight(); g.boss.x = g.boss.homeX; g.boss._setState('roam')
  return g
}
function sweep() { const m = new Missile(185, 300, null); m.previousX = 100; m.previousY = 300; m.x = 320; return m }
function mob(x, y = 300) { return new Monster(x, y, 'floater', 587, { hpMult: 10 }) }

test('无尽15分钟：击杀/生存演出全程保护，领奖仅一次，正常战斗无敌仍压缩', () => {
  for (const method of ['kill', 'survival']) {
    const g = fight(true), a = g.abilitySystem
    a.hp = 1; a.invincibleFrames = 600; a.renewalCD = 600
    g.bird.y = 522; g.bird.velocity = 0
    g._onBossVictory(method); g._onBossVictory(method)
    for (let i = 0; i < 30; i++) {
      // Both damage chains remain harmless even after the combat cap has expired.
      g._handleCollision({ type: 'feather', piercing: true })
      new Hail()._handleHailCollision({ x: g.bird.x, y: g.bird.y }, g._buildGameCtx())
      g.update()
      assert.equal(a.hp, 1)
      assert.notEqual(g.state, 'gameover')
      assert.ok(a.invincibleFrames <= g.chapterSystem.getMods().invincibleCap)
    }
    assert.equal(g.score, 200); assert.equal(g.bossClears.length, 1); assert.equal(g._bossDyingFrames, 0)
    assert.equal(g.state, 'upgrading')
    const protection = g._bossVictoryProtectionFrames
    for (let i = 0; i < 60; i++) g.update()
    assert.equal(g.score, 200); assert.equal(g._bossVictoryProtectionFrames, protection)
    for (let i = 0; i < 10 && g.state === 'upgrading'; i++) g.selectAbility(g._currentChoices[0].id)
    assert.equal(g.state, 'playing')
    for (let i = 0; i < 4; i++) { g.bird.y = 300; g.bird.velocity = 0; g.update() }
    assert.equal(g._isVictoryProtected(), false)
    g.start(); assert.equal(g._bossVictoryProtectionFrames, 0)
  }
})
test('剧情领奖面板链即使长时间停留也不耗尽结算保护', () => {
  const g = fight(); g._onBossVictory('kill')
  for (let i = 0; i < 30; i++) g.update()
  assert.equal(g.state, 'upgrading'); assert.ok(g._bossRewardPending)
  g._bossVictoryProtectionFrames = 0
  const hp = g.abilitySystem.hp
  for (let i = 0; i < 100; i++) g.update()
  g._handleCollision({ type: 'feather', piercing: true })
  new Hail()._handleHailCollision({ x: g.bird.x, y: g.bird.y }, g._buildGameCtx())
  assert.equal(g.abilitySystem.hp, hp)
  for (let i = 0; i < 15 && g.state === 'upgrading'; i++) g.selectAbility(g._currentChoices[0].id)
  assert.equal(g._bossRewardPending, false)
})
test('召唤物碰撞触发战败或凤凰后不再更新旧数组剩余对象', () => {
  for (const phoenix of [false, true]) {
    const g = fight(); if (phoenix) give(g, 'phoenix')
    g.abilitySystem.hp = 1
    const stale = mob(g.bird.x - 10), hit = mob(g.bird.x - 10)
    let updates = 0; stale.update = () => { updates++ }
    g.monsters = [stale, hit]; g._updateMonsters(0)
    assert.equal(updates, 0)
    if (phoenix) assert.ok(g.phoenixAnim)
    else { assert.equal(g.monsters.length, 0); assert.equal(g.chapterSystem.isBossActive(), false) }
  }
})
test('章节之主第五章四种抽卡入口可得，第六章/无尽四入口均排除', () => {
  const master = R.get('chapter_master')
  assert.equal(master.unlockChapter, 5)
  const owned = new Map(R.getAll().filter(a => a.id !== master.id).map(a => [a.id, a.maxLevel]))
  assert.deepEqual(R.rollChoices(owned, 3, 40, 5).map(a => a.id), [master.id])
  assert.equal(R.rollEpic(owned, [], 40, 5).id, master.id)
  assert.equal(R.rollRarePlus(owned, [], 40, 5).id, master.id)
  const rewardOwned = new Map(owned); rewardOwned.delete('trophy_wall'); rewardOwned.delete('hunter_mark')
  assert.ok(R.rollBossRewardChoices(rewardOwned, 40, 5).some(a => a.id === master.id))
  for (const chapter of [6, 7]) {
    assert.ok(!R.rollChoices(new Map(), 100, 40, chapter).some(a => a.id === master.id))
    assert.equal(R.rollEpic(owned, [], 40, chapter), null)
    assert.equal(R.rollRarePlus(owned, [], 40, chapter), null)
    assert.ok(!(R.rollBossRewardChoices(rewardOwned, 40, chapter) || []).some(a => a.id === master.id))
  }
})
test('第五章获取章节之主后祝福加成及第六章首面板史诗保底实际触发', () => {
  const g = make(); g.chapterSystem.index = 4; g._onChapterEnter(4)
  g.abilitySystem.getChoices(30); give(g, 'chapter_master')
  g._applyBlessing('bless_growth')
  assert.ok(Math.abs(g.abilitySystem.blessingExpMult - (1 + C.BOSS.BLESSING_GROWTH_EXP * 1.5)) < 1e-9)
  g.chapterSystem.index = 5; g._onChapterEnter(5)
  const roll = R.rollChoices
  R.rollChoices = () => ['light_feather', 'agile', 'magnet'].map(id => R.get(id))
  try { assert.ok(g.abilitySystem.getChoices(30).some(a => a.rarity === 'epic')) }
  finally { R.rollChoices = roll }
  assert.equal(g.abilitySystem.chapterFirstPanelDue, false)
})
test('百分比分数一级实际过20管：血契26分、狂暴25分、风暴24分；无尽各翻倍', () => {
  for (const endless of [false, true]) for (const [id, score] of [['blood_pact',26],['berserk',25],['storm_child',24]]) {
    const g = make(); give(g, id); g.chapterSystem.endless = endless
    if (id === 'berserk') g.abilitySystem.hp = 1
    if (id === 'storm_child') g.abilitySystem.setWeatherActive(true)
    const scores = []; g.onScoreChange = value => scores.push(value)
    for (let i = 0; i < 20; i++) g._onPipePass({})
    assert.equal(g.score, score * (endless ? 2 : 1)); assert.ok(scores.every(Number.isInteger))
    const before = g.score; g._addScore(100)
    assert.equal(g.score - before, endless ? 200 : 100)
  }
})
test('倍率切换保留小数，重开与回首页清除上一局余数', () => {
  const g = make(); give(g, 'storm_child'); g.abilitySystem.setWeatherActive(true)
  g._onPipePass({}); g.abilitySystem.setWeatherActive(false); g._onPipePass({})
  g.abilitySystem.setWeatherActive(true)
  for (let i = 0; i < 4; i++) g._onPipePass({})
  assert.equal(g.score, 7)
  g._addScore(.3); g.start(); assert.equal(g._scoreRemainder, 0)
  g._addScore(.9); g.backToReady(); assert.equal(g._scoreRemainder, 0)
})
test('生机收割：自身/共享冷却中达标保留，等下一次击杀才治疗', () => {
  for (const ownCD of [false, true]) {
    const g = make(); give(g, 'seed_harvest'); g.abilitySystem.hp = 1
    g.combat.harvestKills = 6
    if (ownCD) g.combat.harvestCD = 2
    else { g.abilitySystem.renewalInterval = 300; g.abilitySystem.renewalCD = 2 }
    g.combat.onKill()
    for (let i = 0; i < 5; i++) { g.abilitySystem.tickCooldowns(); g.combat.update() }
    assert.equal(g.abilitySystem.hp, 1); assert.equal(g.combat.harvestKills, 7)
    g.combat.onKill(); assert.equal(g.abilitySystem.hp, 2); assert.equal(g.combat.harvestKills, 0)
    assert.equal(g.combat.harvestCD, 720)
  }
  assert.match(R.get('seed_harvest').effectText(1), /冷却后下次击杀/)
})
test('残水冻结保留重量/甩水/粒子推进，解冻干燥；免疫和驯化仍豁免', () => {
  const g = make(), ws = g.weatherSystem, rain = new Rain()
  rain.active = false; rain.rainLevel = 50; ws.rainResidual = rain; ws.setFrozen(true)
  for (let i = 0; i < 4; i++) { const ctx = g._buildGameCtx(); ws.update(i, ctx); assert.equal(ctx.gravityModifier, .25) }
  g.flap(); assert.equal(rain.rainLevel, 45)
  const life = rain.splashParticles[0].life; ws.update(5, g._buildGameCtx()); assert.equal(rain.splashParticles[0].life, life - 1)
  for (const immunity of ['charm', 'tamed']) {
    g.abilitySystem.weatherImmuneUntil = immunity === 'charm' ? 100 : 0
    ws.tamedWeather = immunity === 'tamed' ? 'rain' : null
    const ctx = g._buildGameCtx(); ws.update(6, ctx); assert.equal(ctx.gravityModifier, 0)
  }
  ws.setFrozen(false); ws.update(7, g._buildGameCtx()); assert.equal(rain.rainLevel, 44.5)
})
test('导弹首接触顺序不受数组顺序/锁定目标影响；未交叉不误中', () => {
  for (const reverse of [false, true]) {
    const g = make(), near = mob(190), far = mob(205)
    near._projectileX = 205; far._projectileX = 220
    near._projectileY = far._projectileY = 300
    g.monsters = reverse ? [far,near] : [near,far]
    const m = new Missile(185, 300, far); m.update(2.5)
    g._checkMissileHit(m); assert.equal(near.hp, 19); assert.equal(far.hp, 20)
    const miss = new Missile(185, 400, null); miss.update(2.5)
    assert.equal(g._checkMissileHit(miss), false)
  }
})
test('导弹跨类型首次接触：前排怪物挡住机关/Boss，前排管体挡住怪物', () => {
  const g = fight(), b = g.boss; b.x = 280; b.y = 300; b._syncBox()
  b.mechanics.cycleStart(); b.mechanics.nodes.forEach(n => { n.x = 245; n.y = 300 })
  const near = mob(180); g.monsters = [near]
  const hp = b.hp, nodeHP = b.mechanics.nodes.map(n => n.hp)
  const m = sweep(); m.target = b; g._checkMissileHit(m)
  assert.equal(near.hp,19); assert.equal(b.hp,hp); assert.deepEqual(b.mechanics.nodes.map(n => n.hp),nodeHP)
  const plain = make(), pipe = new Pipe(160,330,150,587), monster = mob(240)
  plain.pipes = [pipe]; plain.monsters = [monster]; plain._checkMissileHit(sweep())
  assert.equal(pipe.hp,0); assert.equal(monster.hp,20)
})
test('导弹经过管道缺口仍可命中后排；无效Boss及死亡目标不拦截', () => {
  const g = make(), pipe = new Pipe(160,220,160,587), monster = mob(240)
  g.pipes = [pipe]; g.monsters = [monster]; g._checkMissileHit(sweep())
  assert.equal(pipe.hp,1); assert.equal(monster.hp,19)
  const f = fight(); f.boss.x = 140; f.boss.y = 300; f.boss._setState('entering')
  const dead = mob(170), living = mob(230); dead.hp = 0; f.monsters = [dead,living]
  f._checkMissileHit(sweep()); assert.equal(living.hp,19)
})
test('冰雹与普通伤害共享屠龙者无敌，非Boss无加成，冰晶/护盾规则保留', () => {
  for (const boss of [false,true]) for (const lv of [0,1,2]) {
    const frames = []
    for (const hail of [false,true]) {
      const g = boss ? fight() : make(); give(g,'boss_slayer',lv)
      if (hail) new Hail()._handleHailCollision({x:100,y:300},g._buildGameCtx())
      else g._handleCollision({type:'feather'})
      frames.push(g.abilitySystem.invincibleFrames)
    }
    assert.deepEqual(frames,[60+(boss?lv*30:0),60+(boss?lv*30:0)])
  }
  const g = fight(); give(g,'boss_slayer',2); g.abilitySystem.shieldLayers=1
  new Hail()._handleHailCollision({x:100,y:300},g._buildGameCtx())
  assert.equal(g.abilitySystem.invincibleFrames,30); assert.equal(g.abilitySystem.hp,2)
  g.abilitySystem.invincibleFrames=0; give(g,'ice_crystal')
  new Hail()._handleHailCollision({x:100,y:300},g._buildGameCtx())
  assert.equal(g.abilitySystem.shieldLayers,1); assert.equal(g.abilitySystem.hp,2)
})
test('护盾补给区分联合容量已满、普通盾冷却、转心冷却与成功转换', () => {
  const g = make(), a = g.abilitySystem
  const pick = () => { g.floatingTexts=[]; g._collectItem({type:'shield_pack'}); return g.floatingTexts.map(t=>t.text).join(' ') }
  give(g,'aegis_overdrive',3); a.shieldLayers=a.maxShieldLayers; a.renewalInterval=300; a.renewalCD=100
  assert.match(pick(),/冷却/); assert.equal(a.tempHp,0)
  a.renewalCD=0; assert.match(pick(),/转临时生命/); assert.equal(a.tempHp,1)
  a.tempHp=2; assert.match(pick(),/已满/)
  a.blessingTempHpCapBonus=1; assert.match(pick(),/冷却/)
  a.renewalCD=0; assert.match(pick(),/转临时生命/); assert.equal(a.tempHp,3)
  a.shieldLayers=0; assert.match(pick(),/冷却/)
  a.renewalCD=0; assert.match(pick(),/护盾\+1/)
})
console.log(count + ' v1.8.6 lifecycle tests passed')
