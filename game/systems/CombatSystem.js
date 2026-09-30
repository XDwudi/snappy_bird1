// 新武器独立计时/有界实体池，不改变拍翅物理或旧导弹伤害链。
const Config = require('../config/GameConfig.js')
class CombatSystem {
  constructor(game) {
    this.game = game
    this.shots = []
    this.bladeCD = 0
    this.guardCD = 0
    this.revengeCD = 0
    this.age = 0
    this.flash = 0
  }
  level(id) { return this.game.abilitySystem.owned.get(id) || 0 }
  clearShots() { this.shots.length = 0 }
  fire(damage = 1, bossDamage = 2, angles = [0], source = 'blade') {
    const b = this.game.bird
    for (const angle of angles) {
      if (this.shots.length >= Config.COMBAT.MAX_BLADES) break
      this.shots.push({ x: b.x + b.width / 2, y: b.y, angle, damage, bossDamage, source, life: 0 })
    }
    this.flash = 8
  }
  retaliate() {
    const lv = this.level('revenge_pulse')
    if (!lv || this.revengeCD > 0 || this.game.state !== 'playing' || this.game._bossDyingFrames > 0) return
    this.revengeCD = Config.COMBAT.REVENGE_CD
    this.fire(lv, lv + 1, [-0.24, 0, 0.24], 'revenge')
    this.game._addFloatingText(this.game.bird.x, this.game.bird.y - 42, '逆羽反击!', '#91f7ff', 40)
  }
  intercept(projectile) {
    const lv = this.level('orbit_guard')
    if (!lv || this.guardCD > 0 || projectile.isSandWall) return false
    const b = this.game.bird
    if (Math.hypot(projectile.x - b.x, projectile.y - b.y) > Config.COMBAT.GUARD_RADIUS + (projectile.radius || 5)) return false
    this.guardCD = Config.COMBAT.GUARD_CD[lv - 1]
    this.fire(1, 2, [0], 'reflect')
    this.game._spawnExplosion(projectile.x, projectile.y, '145, 247, 255', 6)
    this.game._addFloatingText(b.x, b.y - 42, '拦截!', '#91f7ff', 35)
    return true
  }
  update() {
    if (this.game._bossDyingFrames > 0) { this.clearShots(); return }
    this.age++
    for (const key of ['bladeCD', 'guardCD', 'revengeCD', 'flash']) if (this[key] > 0) this[key]--
    const lv = this.level('feather_blade')
    if (lv && this.bladeCD <= 0) {
      this.fire()
      this.bladeCD = Config.COMBAT.BLADE_INTERVAL[lv - 1]
    }
    const g = this.game
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]
      s.x += Math.cos(s.angle) * Config.COMBAT.BLADE_SPEED
      s.y += Math.sin(s.angle) * Config.COMBAT.BLADE_SPEED
      s.life++
      let hit = null
      const boss = g.boss
      if (boss && boss.hp > 0 && !['entering', 'dying', 'leaving'].includes(boss.state) && this.hit(s, boss)) hit = boss
      if (!hit) hit = g.monsters.find(m => m.hp > 0 && this.hit(s, m))
      if (hit) {
        if (hit.isBoss) {
          const before = hit.hp
          hit.takeDamage(s.bossDamage, s.source)
          if (hit.hp < before) g._addFloatingText(hit.x + hit.width / 2, hit.y - 32, '-' + (before - hit.hp), '#91f7ff', 24)
          if (hit.hp <= 0) g._onBossVictory('kill')
        } else if (hit.takeDamage(s.damage)) g._onMonsterKilled(hit)
        g._spawnExplosion(s.x, s.y, '145, 247, 255', 5)
      }
      // 胜利可能清空 shots，避免对新数组继续结算。
      if (g._bossClearMode && boss && boss.hp <= 0) break
      if (hit || s.life > 120 || s.x > g.screenW + 20 || s.y < -20 || s.y > g.screenH) this.shots.splice(i, 1)
    }
  }
  hit(s, target) {
    // 每帧8px，命中扩展5px，避免穿过细小怪物。
    return s.x + 5 >= target.x && s.x - 5 <= target.x + target.width &&
      s.y + 4 >= target.topHeight && s.y - 4 <= target.bottomY
  }
  render(ctx) {
    const b = this.game.bird
    ctx.save()
    for (const s of this.shots) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle)
      ctx.fillStyle = 'rgba(145,247,255,0.28)'; ctx.fillRect(-25, -3, 22, 6)
      ctx.fillStyle = '#ecffff'; ctx.strokeStyle = '#169bac'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-8,-5); ctx.lineTo(-3,0); ctx.lineTo(-8,5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore()
    }
    if (this.flash) {
      ctx.strokeStyle = '#ecffff'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(b.x + b.width / 2, b.y, 12 - this.flash, 0, Math.PI * 2); ctx.stroke()
    }
    const lv = this.level('orbit_guard')
    if (lv) {
      const ready = this.guardCD <= 0
      ctx.strokeStyle = '#137d89'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.arc(b.x, b.y, Config.COMBAT.GUARD_RADIUS, 0, Math.PI * 2); ctx.stroke()
      ctx.strokeStyle = ready ? '#baffff' : 'rgba(145,247,255,0.65)'
      ctx.lineWidth = ready ? 2 : 1
      const progress = ready ? 1 : 1 - this.guardCD / Config.COMBAT.GUARD_CD[lv - 1]
      ctx.beginPath(); ctx.arc(b.x, b.y, Config.COMBAT.GUARD_RADIUS, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke()
      if (ready) {
        ctx.fillStyle = '#ecffff'
        const angle = this.age * 0.06
        ctx.beginPath(); ctx.arc(b.x + Math.cos(angle) * 34, b.y + Math.sin(angle) * 34, 4, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.restore()
  }
}
module.exports = CombatSystem
