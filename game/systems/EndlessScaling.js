// 时间增长快于玩家的对数突破成长；不设强制死亡计时器。
const Campaign = require('../config/CampaignConfig.js')
module.exports = function endlessScaling(frames) {
  const minutes = Math.max(0, frames / 3600)
  const pressure = Math.pow(1 + minutes / 4, 2)
  return {
    minutes, pressure,
    recoveryRate:1/(1+Math.max(0,minutes-5)*0.65),
    gapBonusScale:1/(1+Math.max(0,minutes-8)*0.18),
    scrollSpeedAdd:1.2 + minutes * 0.48 + Math.pow(Math.max(0,minutes-10),2)*0.18,
    gapAdd:-30 - minutes * 4,
    pipeDistanceScale:Math.max(0.62, 0.875 - minutes * 0.016),
    monsterSpawnDistance:Math.max(170,310 - minutes * 10),
    monsterMaxAlive:Math.min(8,4 + Math.floor(minutes / 2)),
    monsterHpMult:3.25 * pressure,
    floaterTrackSpeed:Math.min(2.4,1.35 + minutes * 0.07),
    batSineAmp:65,eliteChance:Math.min(0.8,0.45 + minutes * 0.03),
    bossHp:Math.round(Campaign.chapters[Campaign.chapters.length-1].mods.bossHp * pressure),
    bossPower:1 + minutes * 0.12 + Math.pow(Math.max(0,minutes-10),2)*0.015,
    bossInterval:Math.max(15,35 - minutes * 1.3)*60,
    // 第5分钟开始时空压缩：受击无敌最多1.5s，随后缓慢压到0.3s。
    invincibleCap:minutes < 5 ? Infinity : Math.max(18,90 - (minutes-5)*7.2)
  }
}
