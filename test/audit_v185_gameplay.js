// Design audit instrumentation. Does not change game rules or consume gameplay RNG.
// node test/audit_v185_gameplay.js > docs/audits/v185-gameplay/experience-metrics.json
const Game = require('../game/core/Game')
const Registry = require('../game/abilities/AbilityRegistry')
const Config = require('../game/config/GameConfig')
const Campaign = require('../game/config/CampaignConfig')
const { run } = require('./sim_v184')
require('../game/systems/GameLogger').enabled = false

const rng = seed => () => {
  seed = seed * 16807 % 2147483647
  return (seed - 1) / 2147483646
}
const quantile = (values, q) => {
  const sorted = values.filter(n => n !== null).sort((a, b) => a - b)
  return sorted.length ? sorted[Math.floor((sorted.length - 1) * q)] : null
}
const stats = values => ({ observed: values.filter(n => n !== null).length,
  p10: quantile(values, .1), p50: quantile(values, .5), p90: quantile(values, .9) })
const seconds = g => Math.round(g.gameTime / 6) / 10
const continuous = new Set(['feather_blade', 'seed_bolt', 'sand_lance', 'frost_lance',
  'magma_core', 'singularity', 'missile_barrage', 'wind_rider'])
let current
const originalSelect = Game.prototype.selectAbility
const originalKill = Game.prototype._onMonsterKilled
const originalUpdate = Game.prototype.update
Game.prototype.selectAbility = function (id) {
  current.panels.push({ seconds: seconds(this), chapter: this.chapterSystem.index + 1,
    mode: this._panelMode || 'normal', id, candidates: this._currentChoices.map(c => c.id) })
  const result = originalSelect.call(this, id)
  if (current.firstWeapon === null && continuous.has(id)) current.firstWeapon = seconds(this)
  return result
}
Game.prototype._onMonsterKilled = function (monster) {
  if (current.firstKill === null) current.firstKill = seconds(this)
  return originalKill.call(this, monster)
}
Game.prototype.update = function () {
  const result = originalUpdate.call(this)
  if (current.firstMonster === null && this.monsters.length) current.firstMonster = seconds(this)
  return result
}

const runs = []
try {
  for (const policy of ['coherent', 'random', 'economy']) {
    for (let i = 0; i < 64; i++) {
      current = { firstWeapon: null, firstKill: null, firstMonster: null, panels: [] }
      const result = run(20261002 + i * 7919, policy)
      runs.push({ ...current, result })
    }
  }
} finally {
  Game.prototype.selectAbility = originalSelect
  Game.prototype._onMonsterKilled = originalKill
  Game.prototype.update = originalUpdate
}
const summaries = {}
for (const policy of ['coherent', 'random', 'economy']) {
  const rows = runs.filter(r => r.result.policy === policy)
  summaries[policy] = {
    runs: rows.length,
    firstSelection: stats(rows.map(r => r.panels.length ? r.panels[0].seconds : null)),
    firstContinuousWeapon: stats(rows.map(r => r.firstWeapon)),
    firstMonster: stats(rows.map(r => r.firstMonster)),
    firstKill: stats(rows.map(r => r.firstKill)),
    weaponBy30Seconds: rows.filter(r => r.firstWeapon !== null && r.firstWeapon <= 30).length,
    aliveAt30WithoutWeapon: rows.filter(r => r.result.seconds >= 30 && (r.firstWeapon === null || r.firstWeapon > 30)).length,
    allPanelsBy60Seconds: stats(rows.map(r => r.panels.filter(p => p.seconds <= 60).length)),
    firstBossReached: rows.filter(r => r.result.entries.some(e => e.chapter === 1)).length,
    campaignCleared: rows.filter(r => new Set(r.result.clears.filter(c => !c.endless).map(c => c.chapter)).size === 6).length,
    firstBossEntry: stats(rows.map(r => { const e = r.result.entries.find(e => e.chapter === 1); return e ? e.seconds : null })),
    bossReachedByChapter: Campaign.chapters.map(ch => rows.filter(r => r.result.entries.some(e => e.chapter === ch.id)).length),
    chapterSixEntry: stats(rows.map(r => { const e = r.result.entries.find(e => e.chapter === 6); return e ? e.seconds : null })),
    survivedClears: rows.reduce((n, r) => n + r.result.clears.filter(c => c.method === 'survival').length, 0)
  }
}
// Isolated offer experiment: one owned level-1 seed weapon, no other cards.
// Fixed level 10 across chapters isolates pool expansion; NOT a natural-run prediction.
const oldRandom = Math.random
const offers = []
try {
  for (let chapter = 1; chapter <= 6; chapter++) {
    Math.random = rng(20261003 + chapter)
    let offered = 0
    for (let i = 0; i < 20000; i++) {
      Registry.resetPity()
      if (Registry.rollChoices(new Map([['seed_bolt', 1]]), 3, 10, chapter)
        .some(c => c.id === 'seed_bolt')) offered++
    }
    offers.push({ chapter, panels: 20000, seedUpgradeOffered: offered,
      proportion: offered / 20000 })
  }
} finally {
  Math.random = oldRandom
  Registry.resetPity()
}
const timing = Campaign.chapters.map((ch, i) => ({ chapter: ch.id,
  minFlightSeconds: ch.minFrames / 60, maxFlightSeconds: ch.maxFrames / 60,
  survivalSeconds: Campaign.bosses[i].survivalFrames / 60, bossHP: ch.mods.bossHp }))
const baselinePath = '../docs/audits/v185-gameplay/natural-runs.json'
let baselineMatch = null
try {
  const baseline = require(baselinePath)
  baselineMatch = JSON.stringify(baseline.rows) === JSON.stringify(runs.map(r => r.result))
} catch (_) { /* optional independent baseline */ }
console.log(JSON.stringify({ version: Config.VERSION, seedStart: 20261002, seedStep: 7919,
  notes: '375x667; finite-observation scripted pilot, uncalibrated to humans. Effective 60fps time only; selections are instantaneous. Missing-event quantiles exclude missing events. Instrumented runs must match independent baseline.',
  baselineMatch, summaries, offerExperiment: offers, timing,
  totals: { minFlight: timing.reduce((s, r) => s + r.minFlightSeconds, 0),
    maxFlight: timing.reduce((s, r) => s + r.maxFlightSeconds, 0),
    survival: timing.reduce((s, r) => s + r.survivalSeconds, 0) },
  runs: runs.map(r => ({ seed: r.result.seed, policy: r.result.policy, seconds: r.result.seconds,
    firstWeapon: r.firstWeapon, firstMonster: r.firstMonster, firstKill: r.firstKill, panels: r.panels }))
}, null, 2))
