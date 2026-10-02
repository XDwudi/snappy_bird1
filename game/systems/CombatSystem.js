const Art=require('../art/Entities')
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
    this.cooldowns = {}
    this.castCount = 0
    this.harvestKills = 0
    this.harvestCD = 0
    this.chainCD = 0
    this.pipeCount = 0
    this.endlessCharge = 0
    this.endlessGuardCD = 0
  }
  targets() {
    const g=this.game, b=g.boss
    const nodes=b && b.mechanics && !['entering','dying','leaving'].includes(b.state)
      ? b.mechanics.nodes.filter(n=>n.hp>0 && (n.kind!=='relay'||n.index===b.mechanics.activeNode)) : []
    return nodes.concat(g.monsters.filter(m=>m.hp>0), b && b.hp>0?[b]:[])
  }
  level(id) { return this.game.abilitySystem.owned.get(id) || 0 }
  clearShots() { this.shots.length = 0 }
  fire(damage = 1, bossDamage = 2, angles = [0], source = 'blade') {
    const b = this.game.bird
    for (const angle of angles) {
      if (this.shots.length >= Config.COMBAT.MAX_BLADES) break
      this.shots.push({ x: b.x + b.width / 2, y: b.y, angle, damage, bossDamage, source, life: 0, hits: new Set(), pierce: source === 'sand' ? this.level('sand_lance') + 1 : 1 })
    }
    this.flash = 8
    if (source !== 'echo' && this.level('shadow_echo') && ++this.castCount % 4 === 0) {
      const lv=this.level('shadow_echo');this.fire(lv+1,lv+2,[0],'echo')
    }
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
    if (!lv || this.guardCD > 0 || projectile.isSandWall || projectile.age < projectile.warn) return false
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
    const recovery=this.game.abilitySystem.recoveryRate
    for (const key of ['bladeCD', 'guardCD', 'revengeCD', 'flash', 'harvestCD', 'chainCD', 'endlessGuardCD']) if (this[key] > 0) this[key]-=(key==='guardCD'||key==='harvestCD'?recovery:1)
    const lv = this.level('feather_blade')
    if (lv && this.bladeCD <= 0) {
      this.fire()
      this.bladeCD = Math.round(Config.COMBAT.BLADE_INTERVAL[lv - 1]*this.game.abilitySystem.getStat('weaponCadence'))
    }
    const g = this.game
    this.updateCampaign()
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]
      if (s.source === 'seed') {
        const target=this.targets()[0]
        if(target) {
          const desired=Math.atan2(target.y-s.y,target.x-s.x)
          let delta=Math.atan2(Math.sin(desired-s.angle),Math.cos(desired-s.angle))
          s.angle+=Math.max(-0.05,Math.min(0.05,delta))
        }
      }
      s.x += Math.cos(s.angle) * Config.COMBAT.BLADE_SPEED
      s.y += Math.sin(s.angle) * Config.COMBAT.BLADE_SPEED
      s.life++
      const boss = g.boss
      const hit=this.targets().find(m=>!s.hits.has(m) && this.hit(s,m))
      if (hit) {
        s.hits.add(hit)
        this.damageTarget(hit,hit.isBoss?s.bossDamage:s.damage,s.source)
        if (s.source === 'frost' && !hit.isBoss) hit.frostFrames=120
        if(!hit.isMechanic && this.level('venom_thread') && hit.hp>0) hit.venom={remaining:180,tick:60,damage:this.level('venom_thread')}
        if (!hit.isBoss && this.level('storm_chain') && this.chainCD===0) {
          const next=g.monsters.find(m=>m!==hit && m.hp>0)
          if(next) {this.chainCD=60;this.damageTarget(next,this.level('storm_chain')+2,'chain');g._spawnExplosion(next.x,next.y,'180,240,255',8)}
        }
        s.pierce--
        g._spawnExplosion(s.x, s.y, '145, 247, 255', 5)
      }
      // 胜利可能清空 shots，避免对新数组继续结算。
      if (g._bossClearMode && boss && boss.hp <= 0) break
      if ((hit && s.pierce <= 0) || s.life > 120 || s.x > g.screenW + 20 || s.y < -20 || s.y > g.screenH) this.shots.splice(i, 1)
    }
  }
  damageTarget(target,damage,source) {
    damage+=this.game.abilitySystem.getStat('weaponBonus')||0
    if(target.hp/target.maxHp < .3) damage*=1+this.level('cinder_execution')*.3
    damage=Math.max(1,Math.round(damage))
    const before=target.hp
    const dead=target.takeDamage(damage,source)
    if(target.isMechanic && this.game.boss && this.game.boss.hp<=0)this.game._onBossVictory('kill')
    if(!target.isMechanic)this.chargeEndless(Math.max(0,before-Math.max(0,target.hp)))
    if(target.hp<before) this.game._addFloatingText(target.x+target.width/2,target.y-30,'-'+(before-target.hp),'#c6ffff',24)
    if(dead) {
      if(target.isBoss)this.game._onBossVictory('kill')
      else if(!target.isMechanic)this.game._onMonsterKilled(target)
    }
  }
  chargeEndless(amount) {
    const g=this.game
    if(!g.chapterSystem.endless || amount<=0)return
    const need=20*g.chapterSystem.getMods().pressure
    this.endlessCharge=Math.min(need,this.endlessCharge+amount)
    if(this.endlessCharge>=need && this.endlessGuardCD<=0 && g.abilitySystem.shieldLayers<g.abilitySystem.maxShieldLayers) {
      if(!g.abilitySystem.addShieldLayer(1))return
      this.endlessCharge=0;this.endlessGuardCD=360
      g._addFloatingText(g.bird.x,g.bird.y-40,'破敌护盾 +1','#b6f6ff',40)
    }
  }
  onKill() {
    const lv=this.level('seed_harvest')
    if(lv && ++this.harvestKills>=9-lv*2 && this.harvestCD<=0) {
      if(!this.game.abilitySystem.healHP(1))return
      this.harvestKills=0;this.harvestCD=720
      this.game._addFloatingText(this.game.bird.x,this.game.bird.y-32,'生机 +1HP','#b6ff98',45)
    }
  }
  onPipe() {
    const lv=this.level('dune_cache')
    if(lv && (this.pipeCount+=this.game.abilitySystem.recoveryRate)>=16-lv*3) {
      if(!this.game.abilitySystem.addShieldLayer(1))return
      this.pipeCount=0
      this.game._addFloatingText(this.game.bird.x,this.game.bird.y-32,'沙丘护盾','#ffdb91',40)
    }
  }
  updateCampaign() {
    const g=this.game
    const cadence=g.abilitySystem.getStat('weaponCadence')||1
    const auto=(id,interval,callback)=>{
      const lv=this.level(id)
      if(!lv)return
      this.cooldowns[id]=(this.cooldowns[id]||0)-1
      if(this.cooldowns[id]<=0){this.cooldowns[id]=Math.round(interval(lv)*cadence);callback(lv)}
    }
    if(g.weatherSystem.hasEffect('wind'))auto('wind_rider',lv=>(6-lv)*60,lv=>{
      this.fire(lv,lv+1,[-.13,.13],'wind');g._addFloatingText(g.bird.x,g.bird.y-38,'借风双刃','#c5f4ff',30)
    })
    auto('seed_bolt',lv=>(5-lv)*60,lv=>this.fire(lv,lv+1,[0],'seed'))
    auto('sand_lance',()=>180,lv=>this.fire(lv+1,lv+2,[0],'sand'))
    auto('frost_lance',()=>150,lv=>this.fire(lv+2,lv+3,[0],'frost'))
    const clear=(radius)=>{
      g.feathers=g.feathers.filter(p=>p.isSandWall || p.age<p.warn || Math.hypot(p.x-g.bird.x,p.y-g.bird.y)>radius)
      g._spawnExplosionRing(g.bird.x,g.bird.y,radius)
    }
    auto('frost_shell',lv=>(12-lv*2)*60,lv=>{clear(80);this.fire(lv+2,lv+3,[0],'frost_shell')})
    const area=(lv,bossDamage,source)=>{
      for(const m of this.targets().filter(t=>!t.isBoss))if(m.hp>0 && (source==='singularity' || m.x>g.bird.x))this.damageTarget(m,lv+2,source)
      if(g.boss && g.boss.hp>0 && (source==='singularity' || g.boss.x+g.boss.width>g.bird.x))this.damageTarget(g.boss,bossDamage,source)
    }
    auto('magma_core',()=>240,lv=>{area(lv,lv+4,'magma');g._spawnExplosionRing(g.bird.x+80,g.bird.y,90)})
    auto('singularity',lv=>(10-lv)*60,lv=>{clear(120);area(lv+2,lv+6,'singularity')})
    const targets=g.monsters.slice();if(g.boss)targets.push(g.boss)
    for(const target of targets) {
      if(target.hp<=0 || !target.venom)continue
      const v=target.venom;v.remaining--;v.tick--
      if(v.tick<=0){v.tick=60;this.damageTarget(target,v.damage,'venom')}
      if(v.remaining<=0)target.venom=null
    }
  }
  hit(s, target) {
    // 每帧8px，命中扩展5px，避免穿过细小怪物。
    return s.x + 5 >= target.x && s.x - 5 <= target.x + target.width &&
      s.y + 4 >= target.topHeight && s.y - 4 <= target.bottomY
  }
  render(ctx) {
    Art.combat(ctx, this)
  }
}
module.exports = CombatSystem
