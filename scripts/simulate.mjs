import { createRun, stepRun } from '../src/game/run.ts';
import { chooseSkill, chooseRelic } from '../src/game/skills.ts';
import { FACTIONS } from '../src/game/model.ts';
const results = [];
for (const faction of FACTIONS)
  for (let seed = 1; seed <= 10; seed++) {
    const r = createRun(seed, faction);
    let safety = 0;
    let maxShots = 0;
    let firstUpgrade = null;
    while (r.phase !== 'result' && safety++ < 30000) {
      if (r.phase === 'draft') {
        firstUpgrade ??= r.tick / 60;
        const pick =
          r.offers.find((id) => id === `${faction}01`) ??
          r.offers.find((id) =>
            ['I02', 'C01', 'C03', 'F04', 'X09'].includes(id),
          ) ??
          r.offers[0];
        chooseSkill(r, pick);
        continue;
      }
      if (r.phase === 'reward') {
        chooseRelic(
          r,
          r.relicOffers.find((id) => ['R02', 'R05'].includes(id)) ??
            r.relicOffers[0],
        );
        continue;
      }
      let target = 330;
      const gate = r.gates.find(
        (g) => !g.hit && g.x > 60 && g.x < 245 && !g.ghost,
      );
      if (gate) target = gate.center;
      if (r.warningTicks > 0) target = r.warningY < 330 ? 460 : 215;
      const shot = r.shots.find(
        (s) => s.x > 90 && s.x < 180 && Math.abs(s.y - r.bird.y) < 55,
      );
      if (shot && !gate) target = shot.y < 330 ? 440 : 220;
      stepRun(r, r.bird.y > target + 12 && r.bird.vy > -50);
      maxShots = Math.max(maxShots, r.shots.length);
    }
    results.push({
      faction,
      seed,
      won: r.won,
      seconds: Math.round(r.tick / 60),
      chapter: r.chapter,
      hp: r.bird.hp,
      kills: r.kills,
      elite: r.elitesKilled,
      boss: r.bossesKilled,
      upgrades: r.upgrades,
      firstUpgrade,
      maxShots,
      triggers: r.triggers,
      lastHit: r.lastHit,
    });
  }
for (const faction of FACTIONS) {
  const rows = results.filter((r) => r.faction === faction);
  console.log(
    JSON.stringify({
      faction,
      runs: rows.length,
      wins: rows.filter((r) => r.won).length,
      meanSeconds: rows.reduce((s, r) => s + r.seconds, 0) / rows.length,
      firstUpgradeSeconds: rows[0].firstUpgrade,
      maxShots: Math.max(...rows.map((r) => r.maxShots)),
    }),
  );
}
if (results.some((r) => !r.won || r.maxShots > 16)) process.exitCode = 1;
console.log(
  'Scripted input, no HP edits. This verifies flow only; it is not human playability or balance approval.',
);
