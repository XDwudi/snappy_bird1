// Re-analyzes saved natural runs; does not claim additional independent playtests.
// node test/audit_v185_build_identity.js > docs/audits/v185-gameplay/build-identity.json
const data = require('../docs/audits/v185-gameplay/natural-runs.json')
const Registry = require('../game/abilities/AbilityRegistry')
const Mechanics = require('../game/entities/BossMechanics')
const q = (values, p) => {
  const a = values.slice().sort((a, b) => a - b)
  if (!a.length) return null
  if (p === .5) return (a[Math.floor((a.length - 1) / 2)] + a[Math.ceil((a.length - 1) / 2)]) / 2
  return a[Math.max(0, Math.ceil(a.length * p) - 1)]
}
function describe(entry) {
  const factions = {}
  for (const [id] of entry.cards) {
    const a = Registry.get(id)
    if (a && a.faction) factions[a.faction] = (factions[a.faction] || 0) + 1
  }
  return { unique: entry.cards.length, ranks: entry.cards.reduce((n, c) => n + c[1], 0),
    fourCardFactions: Object.values(factions).filter(n => n >= 4).length }
}
const chapters = []
for (let chapter = 1; chapter <= 6; chapter++) {
  const entries = data.rows.flatMap(r => r.entries.filter(e => e.chapter === chapter).slice(0, 1))
  const ds = entries.map(describe)
  chapters.push({ chapter, samples: entries.length,
    uniqueMedian: q(ds.map(d => d.unique), .5), uniqueP90: q(ds.map(d => d.unique), .9),
    ranksMedian: q(ds.map(d => d.ranks), .5),
    fourCardFactionsMedian: q(ds.map(d => d.fourCardFactions), .5),
    levelMedian: q(entries.map(e => e.level), .5) })
}
const late = data.rows.flatMap(r => r.entries.filter(e => e.chapter === 6).slice(0, 1))
const overlaps = []
for (let i = 0; i < late.length; i++) for (let j = i + 1; j < late.length; j++) {
  const a = new Set(late[i].cards.map(c => c[0])), b = new Set(late[j].cards.map(c => c[0]))
  overlaps.push([...a].filter(id => b.has(id)).length / new Set([...a, ...b]).size)
}
function mechanicTrace(theme) {
  // Isolated perfect zone-following probe, NOT physical pilot or boss battle.
  const boss = { screenW: 375, groundY: 587, power: 1, difficultyTier: 3,
    variant: { theme }, state: 'roam', hp: 1000, maxHp: 1000 }
  const m = new Mechanics(boss)
  const trace = []
  for (let frame = 1; frame <= 135; frame++) {
    m.update({ y: frame === 1 ? 190 : m.zoneY })
    if (frame % 45 === 0) trace.push({ frame, zoneY: m.zoneY, progress: m.progress,
      weak: m.weak, completed: m.completed, hp: boss.hp })
  }
  return trace
}
console.log(JSON.stringify({ source: 'natural-runs.json, same 192 runs as first audit',
  notes: 'First boss entry per chapter per run only; surviving subset, not longitudinal matched players. Median averages two middle values for even n; P90 uses nearest rank. Pairwise overlaps are dependent observations; no population estimate.',
  chapters, chapter6Overlap: { builds: late.length, pairs: overlaps.length, jaccardMedian: q(overlaps, .5) },
  isolatedMechanicTraces: { notes: 'Identical initial HP/tier, no hazards or physics, instant following of current zone; compares rules only.',
    glacier: mechanicTrace('glacier'), volcano: mechanicTrace('volcano') }
}, null, 2))
