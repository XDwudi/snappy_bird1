const Art=require('../art/Entities')
// 六章主题招式与P2连协：观察预警 → 躲避 → 破绽反击。行为计时不消耗随机数。
const BossMechanics = require('./BossMechanics.js')
const castPattern = require('./BossPatterns.js')
const Config = require('../config/GameConfig.js')
const Obstacle = require('./Obstacle.js')
const MathUtil = require('../core/MathUtil.js')

class Boss extends Obstacle {
  constructor(variantIndex, screenW, screenH, hp, deps) {
    const B = Config.BOSS
    const cfg = B.VARIANTS[variantIndex] || B.VARIANTS[0]
    const w = B.WIDTH
    const h = B.HEIGHT
    const groundY = screenH - Config.GROUND.HEIGHT
    // 复用基类字段：topHeight/gap 映射为 Boss 包围盒（弹力护盾弹开方向等逻辑直接复用）
    super(screenW + w, screenH * 0.45 - h / 2, h, groundY, w)
    this.type = 'boss'
    this.isBoss = true               // isBoss 分支：铁喙/镜面/猎手连锁对 Boss 无效
    this.destructible = true         // 可被导弹锁定/命中（takeDamage）
    this.variant = cfg
    this.difficultyTier = cfg.tier
    this.power = 1
    this.survivalFrames = cfg.survivalFrames
    this.comboQueue = []
    this.comboStep = 0
    this.comboLength = 1
    this.warnFrames = cfg.warnFrames
    this.pendingSummon = null
    this.name = cfg.name
    this.hp = hp
    this.maxHp = hp
    this.height = h
    this.screenW = screenW
    this.screenH = screenH
    this._deps = deps

    // 巡游位于右侧，留出玩家飞行与观察空间。
    this.homeX = screenW * B.HOME_X_RATIO
    this.baseY = MathUtil.clamp(screenH * 0.45, B.ROAM_AMP + h / 2 + 10, groundY - B.ROAM_AMP - h / 2 - 10)
    this.y = this.baseY              // 中心Y
    this.roamT = 0                   // 巡游相位（帧）

    // 半血或存活半程进入 P2。
    this.phase = 1
    this.phase2Flash = 0             // P2 入场爆闪剩余帧（渲染闪烁用）

    // 入场 → 休息 → 预警 → 攻击 → 破绽；草地俯冲有独立返程。
    this.state = 'entering'
    this.stateT = 0                  // 当前状态已经过帧数
    this.chargeY = this.baseY        // 冲锋锁定高度（蓄力开始时取当前 y）

    this.combatAge = 0
    this.attackIndex = 0
    this._attackPhase = 1
    this._windupStartY = this.y
    this.action = null
    this.aimY = this.baseY
    this.aimAngle = Math.PI
    this.wallCenter = this.baseY
    this.wallGap = B.WALL_GAP[0]
    this._weaponGates = {}
    this._trail = []
    this._hitFlash = 0               // 受击白闪反馈（帧）
    this._hitGate = 0                // [v1.5.0 D21] 受击间隔门剩余帧（>0 时导弹命中不扣血，白闪照常）
    this.mechanics = new BossMechanics(this)
    this._syncBox()
  }

  /** 中心坐标同步到基类碰撞字段（topHeight/bottomY = 包围盒上下缘，同 Monster 手法） */
  _syncBox() {
    this.topHeight = this.y - this.height / 2
    this.gap = this.height
    this.bottomY = this.y + this.height / 2
  }

  update(bird, combatFrames) {
    const B = Config.BOSS
    bird=bird || {x:this.screenW*Config.BIRD.X_RATIO,y:this.baseY}
    this.stateT++
    this.mechanics.update(bird)
    if (this._hitFlash > 0) this._hitFlash--
    if (this._hitGate > 0) this._hitGate--
    for (const key of Object.keys(this._weaponGates)) if (this._weaponGates[key] > 0) this._weaponGates[key]--
    if (this.phase2Flash > 0) this.phase2Flash--
    if (!['entering', 'dying', 'leaving'].includes(this.state)) {
      this.combatAge = combatFrames == null ? this.combatAge + 1 : combatFrames
      if (this.combatAge >= this.survivalFrames * .35) this._enterPhase2()
    }
    if (this.state === 'entering') {
      const t = Math.min(1, this.stateT / B.INTRO_ENTER_FRAMES)
      this.x = this.screenW + this.width + (this.homeX - this.screenW - this.width) * t
      if (t >= 1) this._setState('roam')
    } else if (this.state === 'roam') {
      this.roamT++
      this.x = this.homeX
      this.y += MathUtil.clamp(this.baseY + Math.sin(this.roamT * 0.025) * 80 - this.y, -2, 2)
      if (this.stateT >= this.variant.restFrames / Math.sqrt(this.power)) this._beginAttack(bird)
    } else if (this.state === 'windup') {
      const windupProgress = Math.min(1, this.stateT / this.warnFrames)
      this.y = this._windupStartY + (this.chargeY - this._windupStartY) * windupProgress
      this.x = this.homeX + Math.min(1, this.stateT / this.warnFrames) * 20
      if (this.stateT >= this.warnFrames) this._setState('charging')
    } else if (this.state === 'charging') {
      this._trail.push({ x: this.x, y: this.y })
      if (this._trail.length > 5) this._trail.shift()
      this.x -= B.CHARGE_SPEED * Math.min(2.8, this.power)
      if (this.x <= this.screenW * 0.04) this._setState('return')
    } else if (this.state === 'return') {
      // 收翼返回无接触伤害，避免俯冲后堵住玩家位置。
      this.x += 5
      if (this.x >= this.homeX) { this.x = this.homeX; this._finishAttack(bird) }
    } else if (this.state === 'telegraph') {
      if (this.pendingSummon && this.stateT >= this.pendingSummon.at) {
        this._deps.onSummon('floater', this.screenW + 20, this.pendingSummon.y)
        this.pendingSummon = null
      }
      if (this.stateT >= this.warnFrames) this._setState('attack')
    } else if (this.state === 'attack') {
      if (this.stateT >= this.attackDuration) this._finishAttack(bird)
    } else if (this.state === 'recover') {
      this.y += Math.sin(this.stateT * 0.1) * 0.25
      if (this.stateT >= this.variant.recoverFrames / Math.sqrt(this.power)) this._setState('roam')
    } else if (this.state === 'dying') {
      this.y += 1.2; this.x += 0.6
    } else if (this.state === 'leaving') {
      this.x += 4 + this.stateT * 0.12; this.y -= 1 + this.stateT * 0.04
    }
    if (this.state !== 'charging') this._trail.length = 0
    if (this.state !== 'leaving') this.y = MathUtil.clamp(this.y, 130, this.groundY - this.height / 2 - 12)
    this._syncBox()
  }

  _setState(s) { this.state = s; this.stateT = 0 }

  _beginAttack(bird, chained = false) {
    this._attackPhase = this.phase
    if (!chained) {
      if (this.phase === 2) {
        const combos=this.variant.combos
        this.comboQueue=combos[this.attackIndex % combos.length].slice()
      } else this.comboQueue=[this.attackIndex % this.variant.skills.length]
      this.comboLength=this.comboQueue.length
      this.comboStep=0
    }
    const idx=this.comboQueue.shift()
    this.skill=this.variant.skills[idx]
    this.action=this.skill.kind
    this.mechanics.onAttack()
    this.attackIndex++
    this.comboStep++
    this.aimY=bird.y
    this._setState('telegraph')
    this.warnFrames=castPattern(this,bird,this.skill)
  }

  _finishAttack(bird) {
    if(this.comboQueue.length) this._beginAttack(bird,true)
    else {this.piercingAttack=false;this._setState('recover')}
  }

  _enterPhase2() {
    if (this.phase === 2) return
    this.phase = 2
    this.phase2Flash = Config.BOSS.PHASE2_FLASH_FRAMES
    if (this._deps.onPhase2) this._deps.onPhase2(this)
  }

  takeDamage(n, source = 'missile') {
    if (['entering', 'dying', 'leaving'].includes(this.state) || this.hp <= 0) return false
    const gate = source === 'missile' ? this._hitGate : (this._weaponGates[source] || 0)
    if (gate > 0) return false
    const damage = Math.max(1, Math.round((n + (this.state === 'recover' ? 1 : 0)) * this.mechanics.damageScale()))
    this.hp = Math.max(0, this.hp - damage)
    this._hitFlash = 8
    if (source === 'missile') this._hitGate = Config.BOSS.HIT_GATE_FRAMES
    else this._weaponGates[source] = Config.BOSS.HIT_GATE_FRAMES
    if (this.hp < this.maxHp * Config.BOSS.PHASE2_HP_RATIO && this.hp > 0) this._enterPhase2()
    return this.hp <= 0
  }

  getActionLabel() {
    if (this.state === 'recover') return '破绽！命中伤害 +1'
    if (this.state === 'return') return '撤回 · 可穿过本体'
    if (this.skill && ['windup','charging','telegraph','attack'].includes(this.state)) {
      const hint={gate:'穿绿框',beam:'离开横线',pincer:'留在两线中间',dash:'离开红带',
        rain:'避开落点',columns:'避开雷轨',eruption:'避开地火',seek:'提前变向',
        split:'留意分裂',summon:'击退召唤',fan:'离开瞄线',burst:'持续变向',spiral:'绕开扇面'}
      return `${this.piercingAttack?'◆穿盾 ':''}${this.skill.name} · ${(this.skill.hint || hint[this.action] || '观察预警')}${this.comboLength>1?' · 连协'+this.comboStep+'/'+this.comboLength:''}`
    }
    return '观察起手 · 等待反击'
  }

  /** 死亡演出开始（Game 胜利结算调用；实体保留 30 帧做翻滚坠落） */
  startDying() { this._setState('dying') }

  /** 战败离场（§4.10 方案A：Boss 长鸣离场，章内进度保留） */
  startLeaving() { this._setState('leaving') }

  /** 冲锋/返回中（Game 接触伤害判定提示用，渲染也可读） */
  isCharging() { return this.state === 'charging' }

  /**
   * 子类实现：碰撞检测（AABB，碰撞箱为视觉的 0.8 倍，同 Monster 口径）
   * 接触伤害 1，走 Game._handleCollision 统一受击链（铁喙对 Boss 免疫，isBoss 分支）
   */
  _doCheckCollision(bird) {
    // entering/dying/leaving 不参与碰撞（演出期无威胁）
    if (['entering', 'dying', 'leaving', 'return', 'windup'].includes(this.state)) return false
    const w = this.width * 0.8
    const h = this.height * 0.8
    const birdRect = MathUtil.centerToRect(bird.x, bird.y, bird.collisionWidth, bird.collisionHeight)
    const bossRect = MathUtil.centerToRect(this.x + this.width / 2, this.y, w, h)
    return MathUtil.aabbCollision(birdRect, bossRect)
  }

  /** 是否已离开屏幕（leaving 态回收判定） */
  isOffscreen() {
    return this.x - this.width > this.screenW + 40 || this.y < -80
  }

  // ==================== 渲染（纯 Canvas 几何体像素风，零素材） ====================

  _doRender(ctx) {
    Art.boss(ctx, this)
  }

  _renderChargeWarning(ctx) {
    Art.charge(ctx, this)
  }

}
module.exports = Boss
