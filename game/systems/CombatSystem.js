const Art=require('../art/Entities')
const Rules=require('../config/BuildConfig')
// 新武器独立计时/有界实体池，不改变拍翅物理或旧导弹伤害链。
const Config = require('../config/GameConfig.js')
const MathUtil = require('../core/MathUtil.js')
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
    this.batch=0;this.marks=0;this.guardCharge=0;this.grazeCharge=0;this.grazeWindow=0;this.windWindow=0;this.reactionCD=0;this.avoidCD=0
  }
  targets() {
    const g=this.game, b=g.boss
    const nodes=b && b.mechanics && !['entering','dying','leaving'].includes(b.state)
      ? b.mechanics.nodes.filter(n=>n.hp>0 && (n.kind!=='relay'||n.index===b.mechanics.activeNode)) : []
    return nodes.concat(g.monsters.filter(m=>m.hp>0), b && b.hp>0?[b]:[])
  }
  chooseTarget() {
    const bird=this.game.bird,targets=this.targets().filter(t=>t.x+t.width>=bird.x)
    return targets.sort((a,b)=>{const rank=t=>(t.isMechanic?0:100)+Math.abs(t.y-bird.y)*2+Math.abs(t.x-bird.x)*.15;return rank(a)-rank(b)})[0]||null
  }
  source(id){return Rules.sources[id]}
  bound(source,ids){return source===this.source(this.game.build.sourceFor(ids))}
  cadence(id){
    let n=['feather_blade','seed_bolt','sand_lance'].includes(id)?1-.06*this.level('tailwind'):1
    const first=[...this.game.abilitySystem.owned.keys()].find(k=>Rules.components.includes(k)&&k!=='shield_burst')
    if(first===id&&this.game.abilitySystem.hp<=1)n*=1-.08*this.level('berserk')*(this.level('blood_pact')?.5:1)
    if(id==='wind_rider'&&this.game.weatherSystem.tamedWeather==='rain')n*=1-.03*this.level('raincoat')
    return Math.max(.5,n)
  }
  onGraze(){if(this.level('combo_heart'))this.chargeGraze(3)}
  chargeGraze(n){
    const b=this.game.build;if(!b.hasEvolution('graze')&&b.specialization!=='graze')return
    this.grazeCharge+=n
    const evolved=b.hasEvolution('graze');if(this.grazeCharge>=(evolved?6:8)){this.grazeCharge=0;this.grazeWindow=evolved?180:120;b.record('graze',evolved?'掠影蓄满 · 3秒强化':'连段蓄满 · 2秒强化')}
  }
  onAvoid(p){
    const g=this.game,b=g.bird;if(!this.level('combo_heart')||this.avoidCD>0||p._grazeCounted||p.age<p.warn||g._teleportGrace>0||g.abilitySystem.invincibleFrames>0||p.checkCollision(b))return
    let edge=Infinity
    if(p.kind==='beam')edge=Math.abs(b.y-p.y)-p.radius-b.collisionHeight/2
    else if(p.kind==='column'||p.kind==='gate'){if(Math.abs(p.x-b.x)<40)edge=Math.min(b.y-p.topHeight,p.bottomY-b.y)-b.collisionHeight/2}
    else edge=Math.hypot(p.x-b.x,p.y-b.y)-(p.radius||5)-Math.max(b.collisionWidth,b.collisionHeight)/2
    if(edge>=0&&edge<=18){p._grazeCounted=true;this.avoidCD=60;this.onGraze()}
  }
  level(id) { return this.game.abilitySystem.owned.get(id) || 0 }
  clearShots() { this.shots.length = 0 }
  fire(damage = 1, bossDamage = 2, angles = [0], source = 'blade') {
    const b = this.game.bird,build=this.game.build,batch=++this.batch
    if(source==='blade'){
      if(build.hasEvolution('precision')==='evo_precision_fan')angles=[-.23,0,.23]
    }
    if(this.grazeWindow>0&&this.bound(source,['feather_blade','seed_bolt','sand_lance','frost_lance','wind_rider'])){const bonus=build.hasEvolution('graze')?2:1;damage+=bonus;bossDamage+=bonus;if(build.apex===1&&build.specialization==='graze')angles=[-.2,0,.2]}
    const component=Object.keys(Rules.sources).find(k=>Rules.sources[k]===source)
    damage+=build.breakthroughs[component]||0;bossDamage+=build.breakthroughs[component]||0
    for (const angle of angles) {
      if (this.shots.length >= Config.COMBAT.MAX_BLADES) break
      this.shots.push({ x: b.x + b.width / 2, y: b.y, angle, damage, bossDamage, source, batch, life: 0, hits: new Set(), pierce: source === 'sand' ? this.level('sand_lance') + 1 : (source==='precision'&&build.hasEvolution('precision')!=='evo_precision_fan'||source==='blade'&&(build.hasEvolution('precision')==='evo_precision_pierce'||this.grazeWindow>0))?3:1 })
    }
    this.flash = 8
    if (this.bound(source,['feather_blade','seed_bolt','sand_lance']) && this.level('shadow_echo') && ++this.castCount % 4 === 0) {
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
    if (!lv || this.guardCD > 0 || projectile.isSandWall || projectile.piercing || ['beam','column'].includes(projectile.kind) || projectile.age < projectile.warn) return false
    const b = this.game.bird
    if (Math.hypot(projectile.x - b.x, projectile.y - b.y) > Config.COMBAT.GUARD_RADIUS + (projectile.radius || 5)) return false
    this.guardCD = Config.COMBAT.GUARD_CD[lv - 1]*this.cadence('orbit_guard')
    const build=this.game.build,mirror=this.level('mirror_shield')
    this.guardCharge+=(mirror||0)+(build.specialization==='guard'?1:0)
    const burst=this.guardCharge>=3
    if(burst){this.guardCharge-=3;build.record('guard','拦截蓄满 · 镜羽反击')}
    if(build.specialization==='guard'&&build.apex===0)this.guardCD*=.75
    this.fire(burst?4:1,burst?6+(build.apex===1?2:0):2,burst&&build.hasEvolution('guard')?[-.18,0,.18]:[0],'reflect')
    this.game._spawnExplosion(projectile.x, projectile.y, '145, 247, 255', 6)
    this.game._addFloatingText(b.x, b.y - 42, '拦截!', '#91f7ff', 35)
    return true
  }
  update() {
    if (this.game._bossDyingFrames > 0) { this.clearShots(); return }
    this.age++
    const recovery=this.game.abilitySystem.recoveryRate
    for (const key of ['bladeCD', 'guardCD', 'revengeCD', 'flash', 'harvestCD', 'chainCD', 'endlessGuardCD','grazeWindow','windWindow','reactionCD','avoidCD']) if (this[key] > 0) this[key]-=(key==='guardCD'||key==='harvestCD'?recovery:1)
    const lv = this.level('feather_blade')
    if (lv && this.bladeCD <= 0) {
      this.fire(lv,lv+1)
      this.bladeCD = Math.round(Config.COMBAT.BLADE_INTERVAL[lv - 1]*this.cadence('feather_blade'))
    }
    const g = this.game
    this.updateCampaign()
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]
      if (s.source === 'seed') {
        const target=this.chooseTarget()
        if(target) {
          const desired=Math.atan2(target.y-s.y,target.x-s.x)
          let delta=Math.atan2(Math.sin(desired-s.angle),Math.cos(desired-s.angle))
          s.angle+=Math.max(-0.05,Math.min(0.05,delta))
        }
      }
      s.previousX = s.x; s.previousY = s.y
      s.x += Math.cos(s.angle) * Config.COMBAT.BLADE_SPEED
      s.y += Math.sin(s.angle) * Config.COMBAT.BLADE_SPEED
      s.life++
      const boss = g.boss
      const contacts=this.targets().filter(m=>!s.hits.has(m)).map(target=>({target,
        time:MathUtil.projectileHitTime(s,target,5,4)})).filter(c=>c.time!==Infinity).sort((a,b)=>a.time-b.time)
      let hit = null
      for (const contact of contacts) {
        if (s.pierce <= 0 || (g._bossClearMode && boss && boss.hp <= 0)) break
        hit = contact.target
        if (hit.hp <= 0) continue
        s.hits.add(hit)
        const effectiveHit=this.damageTarget(hit,hit.isBoss?s.bossDamage:s.damage,s.source,s.batch)
        if(s.source==='frost') {hit.frostMark=180;if(!hit.isBoss&&!hit.isMechanic)hit.frostFrames=120}
        if(!hit.isMechanic && this.bound(s.source,['frost_lance','seed_bolt']) && this.level('venom_thread') && hit.hp>0) {
          // 刷新持续时间，不重置跳伤时钟：攻速越快不能反而取消毒伤。
          hit.venom={remaining:180,tick:hit.venom?hit.venom.tick:60,damage:this.level('venom_thread')}
        }
        if (!hit.isMechanic && this.bound(s.source,['frost_lance','seed_bolt','wind_rider']) && this.level('storm_chain') && this.chainCD<=0) {
          const next=this.targets().find(m=>!m.isMechanic&&m!==hit&&m.hp>0) || (hit.isBoss&&hit.hp>0?hit:null)
          if(next) {this.chainCD=60;this.damageTarget(next,this.level('storm_chain')+2,'chain');g._spawnExplosion(next.x,next.y,'180,240,255',8)}
        }
        if(!hit.isMechanic&&hit.hp>0&&hit.frostMark&&hit.venom&&this.reactionCD<=0&&(g.build.specialization==='element'||g.build.hasEvolution('element'))){
          this.reactionCD=120;hit.frostMark=0;this.damageTarget(hit,4+(g.build.hasEvolution('element')?3:0)+(g.build.apex===1?2:0),'reaction',++this.batch)
          if(g.build.apex===0&&g.build.specialization==='element')for(const next of this.targets().filter(t=>!t.isMechanic&&t!==hit&&Math.hypot(t.x-hit.x,t.y-hit.y)<90))this.damageTarget(next,3,'reaction',this.batch)
          g.build.record('reaction','霜毒反应')
        }
        if(effectiveHit>0&&s.source==='blade'&&g.build.specialization==='precision'&&++this.marks>=(g.build.apex===0?4:6)){this.marks=0;this.fire(4+(g.build.apex===1?2:0),5+(g.build.apex===1?2:0),g.build.hasEvolution('precision')==='evo_precision_fan'?[-.25,0,.25]:[0],'precision');g.build.record('precision','对线标记 · 强化弹')}
        s.pierce--
        g._spawnExplosion(s.x, s.y, '145, 247, 255', 5)
      }
      // 胜利可能清空 shots，避免对新数组继续结算。
      if (g._bossClearMode && boss && boss.hp <= 0) break
      if ((hit && s.pierce <= 0) || s.life > 120 || s.x > g.screenW + 20 || s.y < -20 || s.y > g.screenH) this.shots.splice(i, 1)
    }
  }
  damageTarget(target,damage,source,batch=++this.batch) {
    damage+=this.game.abilitySystem.getStat('weaponBonus')||0
    if(['frost','magma','singularity'].includes(source)&&target.hp/target.maxHp < .3) damage*=1+this.level('cinder_execution')*.3
    damage=Math.max(1,Math.round(damage))
    const before=target.hp
    const dead=target.takeDamage(damage,source,batch)
    const log=this.game.build.damage;log.hits++;log.attempted+=damage;log.applied+=before-target.hp;log.limited+=Math.max(0,damage-(before-target.hp))
    if(target.isMechanic && this.game.boss && this.game.boss.hp<=0)this.game._onBossVictory('kill')
    if(!target.isMechanic)this.chargeEndless(Math.max(0,before-Math.max(0,target.hp)))
    if(target.hp<before) this.game._addFloatingText(target.x+target.width/2,target.y-30,'-'+(before-target.hp),'#c6ffff',24)
    if(dead) {
      if(target.isBoss)this.game._onBossVictory('kill')
      else if(!target.isMechanic)this.game._onMonsterKilled(target)
    }
    return before-target.hp
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
    if(this.level('combo_heart'))this.chargeGraze(1)
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
      if(this.cooldowns[id]<=0){this.cooldowns[id]=Math.round(interval(lv)*this.cadence(id));callback(lv)}
    }
    auto('wind_rider',lv=>(6-lv)*60,lv=>{
      if(g.build.specialization==='weather'||g.build.hasEvolution('weather'))g.build.record('weather','个人风窗 · 风刃强化')
      this.windWindow=120+this.level('wind_reader')*12+(g.build.specialization==='weather'&&g.build.apex===0?60:0);const bonus=this.level('storm_child')+(g.build.specialization==='weather'?1:0)+(g.build.hasEvolution('weather')?2:0);this.fire(lv+bonus,lv+1+bonus,g.build.specialization==='weather'&&g.build.apex===1?[-.2,0,.2]:[-.13,.13],'wind');g._addFloatingText(g.bird.x,g.bird.y-38,'借风双刃','#c5f4ff',30)
    })
    auto('seed_bolt',lv=>(5-lv)*60,lv=>this.fire(lv,lv+1,[0],'seed'))
    auto('sand_lance',()=>180,lv=>this.fire(lv+1,lv+2,[0],'sand'))
    auto('frost_lance',()=>150,lv=>this.fire(lv+2,lv+3,[0],'frost'))
    const clear=(radius)=>{
      g.feathers=g.feathers.filter(p=>p.isSandWall || p.piercing || ['beam','column','gate'].includes(p.kind) || p.age<p.warn || Math.hypot(p.x-g.bird.x,p.y-g.bird.y)>radius)
      g._spawnExplosionRing(g.bird.x,g.bird.y,radius)
    }
    auto('frost_shell',lv=>(12-lv*2)*60,lv=>{clear(80);this.fire(lv+2,lv+3,[0],'frost_shell')})
    const area=(lv,bossDamage,source)=>{
      for(const m of this.targets().filter(t=>!t.isBoss))if(m.hp>0 && m.kind!=='relay' && (source==='singularity' || m.x>g.bird.x))this.damageTarget(m,lv+2,source)
      if(g.boss && g.boss.hp>0 && (source==='singularity' || g.boss.x+g.boss.width>g.bird.x))this.damageTarget(g.boss,bossDamage,source)
    }
    auto('magma_core',()=>240,lv=>{area(lv,lv+4,'magma');g._spawnExplosionRing(g.bird.x+80,g.bird.y,90)})
    auto('singularity',lv=>(10-lv)*60,lv=>{clear(120);area(lv+2,lv+6,'singularity')})
    const targets=g.monsters.slice();if(g.boss)targets.push(g.boss)
    for(const target of targets) {
      if(target.frostMark>0)target.frostMark--;if(target.hp<=0 || !target.venom)continue
      const v=target.venom;v.remaining--;v.tick--
      if(v.tick<=0){v.tick=60;this.damageTarget(target,v.damage,'venom')}
      if(v.remaining<=0)target.venom=null
    }
  }
  hit(s, target) {
    return MathUtil.projectileHitTime(s,target,5,4) !== Infinity
  }
  render(ctx) {
    Art.combat(ctx, this)
  }
}
module.exports = CombatSystem
