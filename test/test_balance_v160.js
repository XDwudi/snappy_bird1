// 固定种子可达性验收：同一拟人管道操控模型，不当作真人或 Boss 躲弹能力测量。
// node test/test_balance_v160.js [--width=390 --height=844]
const assert = require('node:assert/strict')
const { runGame, stats } = require('./test_human_sim.js')
const seeds = [20260151, 42, 8675309]
const rows = seeds.flatMap(seed => Array.from({ length: 100 }, (_, i) => runGame(i, seed)))
const reached = rows.filter(r => r.bossReached).length / rows.length
const early = rows.filter(r => r.survivalSec < 30).length / rows.length
const summary = {
  runs: rows.length, seeds,
  survival: stats(rows.map(r => r.survivalSec)),
  bossReachedPercent: reached * 100,
  pre30DeathPercent: early * 100,
  chapterClears: rows.filter(r => r.firstChapterCleared).length,
  note: '该模型不主动躲避 Boss 弹幕，通关数仅作观察，Boss 战另测 test_boss_sim.js'
}
console.log(JSON.stringify(summary, null, 2))
assert.ok(reached >= 0.6, '第一章 Boss 到达率应≥60%')
assert.ok(early <= 0.1, '前30秒死亡率应≤10%')
