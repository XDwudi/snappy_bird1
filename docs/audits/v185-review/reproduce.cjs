// Audit reproductions, not passing regression tests: each assertion describes the
// intended contract. Exit 1 means defects remain. No production files are edited.
// Run from any directory; NODE_PATH may provide @napi-rs/canvas for A01 pixels.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '../../..')
const use = name => require(path.join(root, name))
const Game = use('game/core/Game')
const Registry = use('game/abilities/AbilityRegistry')
const Monster = use('game/entities/Monster')
const Missile = use('game/entities/Missile')
const Rain = use('game/weather/RainEffect')
const Hail = use('game/weather/HailEffect')
const cast = use('game/entities/BossPatterns')
use('game/systems/GameLogger').enabled = false
const results = []
const make = () => { const g = new Game({}, {}, 375, 667, null); g.start(); return g }
function give(g, id, count = 1) {
  for (let i = 0; i < count; i++) g.abilitySystem.selectAbility(id)
  g.abilitySystem.invalidateStats()
}
function fight(chapter = 0) {
  const g = make()
  g.chapterSystem.index = chapter
  g._spawnBoss()
  g.chapterSystem.startBossFight()
  g.boss.x = g.boss.homeX
  g.boss._setState('roam')
  return g
}
function test(id, title, fn) {
  const original = Math.random
  let seed = 185
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
  const result = { id, title }
  try { fn(result); result.status = result.review ? 'REVIEW' : result.skipped ? 'SKIP' : 'PASS' }
  catch (e) { result.status = 'FAIL'; result.error = e.message }
  finally { Math.random = original }
  results.push(result)
  console.log(`${result.status} ${id} ${title}`)
  if (result.observed) console.log(JSON.stringify(result.observed))
}

test('A01', '磁轨穿盾区域必须覆盖实际碰撞位置', r => {
  let createCanvas
  try { createCanvas = require('@napi-rs/canvas').createCanvas }
  catch (_) { r.skipped = '需要 @napi-rs/canvas 检查真实像素'; return }
  const g = fight(5)
  g.bird.y = 80
  cast(g.boss, g.bird, { kind: 'rail_switch' })
  const hazard = g.feathers[0]
  hazard.age = hazard.warn
  const canvas = createCanvas(375, 667), ctx = canvas.getContext('2d')
  use('game/art/Entities').hazard(ctx, hazard)
  const alpha = ctx.getImageData(g.bird.x, g.bird.y, 1, 1).data[3]
  const collides = hazard.checkCollision(g.bird)
  g.abilitySystem.shieldLayers = 1
  g._handleCollision(hazard)
  r.observed = { alpha, collides, hp: g.abilitySystem.hp, shield: g.abilitySystem.shieldLayers }
  assert.ok(!collides || alpha > 0, '区域无像素，但发生穿盾伤害')
})

test('A02', '无尽胜利演出应全程保护并完成领奖', r => {
  const g = make()
  g.chapterSystem.endless = true
  g.chapterSystem.endlessFrames = 15 * 3600
  g._spawnBoss(); g.chapterSystem.startBossFight()
  g.boss.x = g.boss.homeX; g.boss._setState('roam')
  g.abilitySystem.hp = 1
  g.bird.y = 587 - 65; g.bird.velocity = 0
  g.boss.hp = 0; g._onBossVictory('kill')
  let frames = 0
  while (frames < 30 && g.state === 'playing') { g.update(); frames++ }
  r.observed = { frames, state: g.state, hp: g.abilitySystem.hp,
    deathAnimationRemaining: g._bossDyingFrames, clears: g.bossClears.length, score: g.score }
  assert.notEqual(g.state, 'gameover', '击败已记账，奖励前死亡')
  assert.ok(g.score >= 200, '无尽奖励没有到账')
})

test('A03', '两只召唤物在场时战败清场不得使更新循环抛异常', r => {
  const g = fight()
  g.bird.y = 300; g.abilitySystem.hp = 1
  g.monsters = [0, 1].map(() => new Monster(g.bird.x - 10, 300, 'floater', 587))
  try { g._updateMonsters(0) }
  catch (e) {
    r.observed = { state: g.state, bossActive: g.chapterSystem.isBossActive(), monsters: g.monsters.length, error: e.message }
    throw e
  }
})

test('A04', '无尽不应新抽到已无章节事件可触发的章节之主', r => {
  const g = make()
  // Earlier chapters cannot supply this card, including their Boss reward pool.
  const earlierEligible = [1, 2, 3, 4, 5].some(ch =>
    Registry._meetsPrerequisite(Registry.get('chapter_master'), new Map(), ch))
  g.chapterSystem.index = 5; g._onChapterEnter(5)
  // Even the earliest possible acquisition is after its first panel was opened.
  g.abilitySystem.getChoices(30)
  give(g, 'chapter_master')
  const dueAfterAcquisition = g.abilitySystem.chapterFirstPanelDue
  g.chapterSystem.cleared = new Set([0, 1, 2, 3, 4, 5])
  g.chapterSystem.enterEndless()
  r.observed = { earlierEligible, dueAfterAcquisition,
    dueInEndless: g.abilitySystem.chapterFirstPanelDue,
    stillOfferedInEndless: Registry._meetsPrerequisite(Registry.get('chapter_master'), new Map(), 6) }
  assert.equal(r.observed.stillOfferedInEndless, false,
    '无尽没有章节祝福或新章首面板，该卡仍进入候选池')
})

test('A05', '三个百分比得分增益的一级效果不应全部取整归零', r => {
  const observed = {}
  for (const id of ['blood_pact', 'berserk', 'storm_child']) {
    const g = make(); give(g, id)
    if (id === 'berserk') g.abilitySystem.hp = 1
    if (id === 'storm_child') g.abilitySystem.setWeatherActive(true)
    observed[id] = g.abilitySystem.getStats().scoreMultiplier
  }
  r.observed = observed
  assert.ok(Object.values(observed).every(value => value > 1), '承诺的 +30% / +25% / +20% 都变成 ×1')
})

test('A06', '策划确认项：生机收割冷却结束后需要额外击杀', r => {
  const g = make(); give(g, 'seed_harvest')
  g.chapterSystem.endless = true; g.chapterSystem.endlessFrames = 3 * 3600
  g.abilitySystem.hp = 1
  g.abilitySystem.renewalInterval = 330; g.abilitySystem.renewalCD = 2
  g.combat.harvestKills = 6; g.combat.onKill()
  for (let i = 0; i < 5; i++) { g.abilitySystem.tickCooldowns(); g.combat.update() }
  r.observed = { hp: g.abilitySystem.hp, kills: g.combat.harvestKills, renewalCD: g.abilitySystem.renewalCD }
  // The card describes kills plus a healing cooldown, but does not unambiguously
  // promise an automatic retry. Record behavior without declaring it a bug.
  r.review = '达标后仍需额外击杀才重试治疗；需明确触发契约，不计入确认缺陷'
})

test('A07a', '停雨后的拍翅甩水提示应仍可兑现', r => {
  const g = make(), rain = new Rain()
  rain.rainLevel = 50; rain.active = false
  g.weatherSystem.rainResidual = rain
  g.flap()
  r.observed = { waterAfterFlap: rain.rainLevel,
    detail: use('game/art/Effects').weatherDetail(g) }
  assert.equal(rain.rainLevel, 45, '残水对象没有收到拍翅事件')
})

test('A07b', 'Boss冻结残水时应保持原有重力修饰', r => {
  const g = make(), rain = new Rain()
  rain.rainLevel = 50; rain.active = false
  g.weatherSystem.rainResidual = rain
  let ctx = g._buildGameCtx(); g.weatherSystem.update(1, ctx)
  const before = ctx.gravityModifier
  g.weatherSystem.setFrozen(true)
  ctx = g._buildGameCtx(); g.weatherSystem.update(2, ctx)
  r.observed = { before, frozenGravity: ctx.gravityModifier, water: rain.rainLevel }
  assert.equal(ctx.gravityModifier, before, '仅停止干燥却连重力效果也丢失')
})

test('A08', '导弹连续碰撞应选择运动路径上最先接触的怪物', r => {
  const g = make()
  const near = new Monster(190, 300, 'floater', 587, { hpMult: 10 })
  const far = new Monster(205, 300, 'floater', 587, { hpMult: 10 })
  near._projectileX = 205; far._projectileX = 220
  near._projectileY = far._projectileY = 300
  g.monsters = [near, far]
  const missile = new Missile(185, 300, null)
  missile.update(2.5) // Real maximum movement, 17.5 px; no fabricated long segment.
  const M = use('game/core/MathUtil')
  const times = [near, far].map(m => M.projectileHitTime(missile, m, 8, 4))
  assert.ok(times[0] > 0 && times[0] < times[1] && times[1] !== Infinity)
  g._checkMissileHit(missile)
  r.observed = { times, nearHp: near.hp, farHp: far.hp }
  assert.ok(near.hp < near.maxHp && far.hp === far.maxHp, '反向数组遍历伤害了后排')
})

test('A09', '屠龙者的Boss战受击无敌应覆盖冰雹伤害', r => {
  const values = {}
  for (const source of ['feather', 'hail']) {
    const g = fight(); give(g, 'boss_slayer', 2)
    if (source === 'hail') new Hail()._handleHailCollision({ x: g.bird.x, y: g.bird.y }, g._buildGameCtx())
    else g._handleCollision({ type: 'feather' })
    values[source] = g.abilitySystem.invincibleFrames
  }
  r.observed = values
  assert.equal(values.hail, values.feather, '同场Boss受伤，冰雹漏加60帧')
})

test('A10', '满盾超载可转临时心时应正确显示补给冷却', r => {
  const g = make(); give(g, 'aegis_overdrive', 3)
  g.abilitySystem.shieldLayers = g.abilitySystem.maxShieldLayers
  g.abilitySystem.renewalInterval = 300; g.abilitySystem.renewalCD = 100
  g._collectItem({ type: 'shield_pack' })
  r.observed = { tempHp: g.abilitySystem.tempHp, texts: g.floatingTexts.map(t => t.text) }
  assert.ok(r.observed.texts.some(text => text.includes('冷却')), '可转换但被冷却拒绝，误报护盾已满')
})

const failed = results.filter(r => r.status === 'FAIL').length
const skipped = results.filter(r => r.skipped).length
const review = results.filter(r => r.review).length
for (const r of results) if (r.review) r.status = 'REVIEW'
const report = { baseline: '98d7da0', failed, passed: results.length - failed - skipped - review, review, skipped, results }
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n')
console.log(`${failed} failing checks, ${report.passed} passing, ${review} review, ${skipped} skipped`)
process.exitCode = failed ? 1 : 0
