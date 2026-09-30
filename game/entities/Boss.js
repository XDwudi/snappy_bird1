// 两章主题招式：观察预警 → 躲避 → 破绽反击。行为计时不消耗随机数。
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
    this.stateT++
    if (this._hitFlash > 0) this._hitFlash--
    if (this._hitGate > 0) this._hitGate--
    for (const key of Object.keys(this._weaponGates)) if (this._weaponGates[key] > 0) this._weaponGates[key]--
    if (this.phase2Flash > 0) this.phase2Flash--
    if (!['entering', 'dying', 'leaving'].includes(this.state)) {
      this.combatAge = combatFrames == null ? this.combatAge + 1 : combatFrames
      if (this.combatAge >= this.variant.survivalFrames / 2) this._enterPhase2()
    }
    if (this.state === 'entering') {
      const t = Math.min(1, this.stateT / B.INTRO_ENTER_FRAMES)
      this.x = this.screenW + this.width + (this.homeX - this.screenW - this.width) * t
      if (t >= 1) this._setState('roam')
    } else if (this.state === 'roam') {
      this.roamT++
      this.x = this.homeX
      this.y += MathUtil.clamp(this.baseY + Math.sin(this.roamT * 0.025) * 80 - this.y, -2, 2)
      if (this.stateT >= B.REST_FRAMES[this.phase - 1]) this._beginAttack(bird)
    } else if (this.state === 'windup') {
      const windupProgress = Math.min(1, this.stateT / B.DIVE_WARN_FRAMES)
      this.y = this._windupStartY + (this.chargeY - this._windupStartY) * windupProgress
      this.x = this.homeX + Math.min(1, this.stateT / B.DIVE_WARN_FRAMES) * 20
      if (this.stateT >= B.DIVE_WARN_FRAMES) this._setState('charging')
    } else if (this.state === 'charging') {
      this._trail.push({ x: this.x, y: this.y })
      if (this._trail.length > 5) this._trail.shift()
      this.x -= B.CHARGE_SPEED
      if (this.x <= this.screenW * 0.04) this._setState('return')
    } else if (this.state === 'return') {
      // 收翼返回无接触伤害，避免俯冲后堵住玩家位置。
      this.x += 5
      if (this.x >= this.homeX) { this.x = this.homeX; this._setState('recover') }
    } else if (this.state === 'telegraph') {
      const warn = this.action === 'wall' ? B.WALL_WARN_FRAMES : B.WARN_FRAMES
      if (this.stateT >= warn) {
        this._setState('attack')
        if (this.action === 'wall') this._deps.onSandWall(this.wallCenter, this.wallGap)
        else this._fireLeaves()
      }
    } else if (this.state === 'attack') {
      // 墙完整出屏后才出下一招，不叠加封路；第二阶段弹幕只加密同一波。
      const duration = this.action === 'wall' ? Math.ceil((this.screenW + B.WALL_WIDTH + 24) / B.WALL_SPEED) : 95
      if (this.stateT >= duration) this._setState('recover')
    } else if (this.state === 'recover') {
      this.y += Math.sin(this.stateT * 0.1) * 0.25
      if (this.stateT >= B.RECOVER_FRAMES) this._setState('roam')
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

  _beginAttack(bird) {
    const B = Config.BOSS
    const targetY = bird ? bird.y : this.baseY
    this.aimY = MathUtil.clamp(targetY, 140, this.groundY - 65)
    this.attackIndex++
    this._attackPhase = this.phase
    this._windupStartY = this.y
    if (this.variant.theme === 'meadow' && this.attackIndex % 2 === 0) {
      this.action = 'dive'; this.chargeY = this.aimY; this._setState('windup')
    } else {
      this.action = this.variant.theme === 'desert' && this.attackIndex % 2 === 1 ? 'wall' : 'leaves'
      this.aimAngle = Math.atan2(this.aimY - this.y, (bird ? bird.x : this.screenW * 0.3) - this.x)
      this.wallGap = B.WALL_GAP[this.phase - 1]
      // 缺口锁定后不追踪；基于玩家高度偏移，再限制到 HUD 与地面之间。
      this.wallCenter = MathUtil.clamp(this.aimY + (this.attackIndex % 4 === 1 ? -45 : 45), 140 + this.wallGap / 2, this.groundY - this.wallGap / 2 - 25)
      this._setState('telegraph')
    }
  }

  _fireLeaves() {
    const B = Config.BOSS
    const count = B.LEAF_COUNT[this._attackPhase - 1]
    for (let i = 0; i < count; i++) {
      const angle = this.aimAngle + (i - (count - 1) / 2) * B.LEAF_SPREAD
      this._deps.onFireFeather(this.x, this.y, angle, B.LEAF_SPEED[this._attackPhase - 1], this.variant.bulletColor)
    }
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
    const damage = n + (this.state === 'recover' ? 1 : 0)
    this.hp = Math.max(0, this.hp - damage)
    this._hitFlash = 8
    if (source === 'missile') this._hitGate = Config.BOSS.HIT_GATE_FRAMES
    else this._weaponGates[source] = Config.BOSS.HIT_GATE_FRAMES
    if (this.hp < this.maxHp * Config.BOSS.PHASE2_HP_RATIO && this.hp > 0) this._enterPhase2()
    return this.hp <= 0
  }

  getActionLabel() {
    if (this.state === 'recover') return '破绽！命中伤害 +1'
    if (this.state === 'windup') return '俯冲锁定 · 离开红色带'
    if (this.state === 'charging') return '疾风俯冲！'
    if (this.state === 'return') return '收翼返回 · 可以穿过'
    if (['telegraph', 'attack'].includes(this.state)) {
      if (this.action === 'wall') return '流沙屏障 · 穿过绿色缺口'
      return this.variant.theme === 'meadow' ? '追风叶刃 · 离开瞄准线' : '沙锥散射 · 离开瞄准线'
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
    const cfg = this.variant
    const c = cfg.colors
    const cx = this.x + this.width / 2
    const cy = this.y
    const flap = Math.sin(this.roamT * 0.12 + this.stateT * 0.08) * 10  // 翅膀扇动

    // 冲锋蓄力预警（§4.8 预警规范：≥0.5s 前摇+独立视觉语言）
    if (this.state === 'windup') this._renderChargeWarning(ctx)

    this._renderTelegraph(ctx)
    for (let i = 0; i < this._trail.length; i++) {
      const t = this._trail[i]
      ctx.fillStyle = 'rgba(190,255,210,' + (0.04 + i * 0.03) + ')'
      ctx.beginPath(); ctx.ellipse(t.x + this.width / 2, t.y, 40, 22, 0, 0, Math.PI * 2); ctx.fill()
    }

    // P2 暴怒红晕（血条变红在 HUD；本体给红色气场）
    if (this.phase === 2) {
      const pulse = 0.5 + 0.5 * Math.sin(this.stateT * 0.3)
      ctx.fillStyle = 'rgba(255, 60, 40, ' + (0.10 + 0.08 * pulse).toFixed(3) + ')'
      ctx.beginPath()
      ctx.arc(cx, cy, this.width * 0.75, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.save()
    ctx.translate(cx, cy)
    if (this.state === 'windup' || this.state === 'telegraph') ctx.scale(0.94, 1.06)
    else if (this.state === 'charging') ctx.scale(1.12, 0.9)
    else if (this.state === 'recover') ctx.rotate(0.12 + Math.sin(this.stateT * 0.1) * 0.04)
    if (this._hitFlash > 0) ctx.translate(Math.sin(this._hitFlash * 2) * 3, 0)
    if (this.state === 'dying') {
      // 死亡翻滚坠落渐隐
      ctx.rotate(this.stateT * 0.15)
      ctx.globalAlpha = Math.max(0, 1 - this.stateT / Config.BOSS.DEATH_SLOWMO_FRAMES)
    }

    const u = this.width / 90  // 尺寸归一系数（贴图坐标按 90px 宽基准绘制）

    // 草叶冠 / 沙晶冠：轮廓直接区分两章。
    ctx.fillStyle = cfg.theme === 'meadow' ? '#b9ef77' : '#ffdb91'
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-40 + i * 10, -17)
      ctx.lineTo(-44 + i * 12, -34 - (i === 1 ? 8 : 0)); ctx.lineTo(-28 + i * 10, -18); ctx.closePath(); ctx.fill()
    }
    // 尾羽（三片，朝右后方）
    ctx.fillStyle = c.wing
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(30 * u, i * 6 * u)
      ctx.lineTo((52 + Math.abs(i) * 4) * u, (i * 12 - 4) * u)
      ctx.lineTo((52 + Math.abs(i) * 4) * u, (i * 12 + 4) * u)
      ctx.closePath()
      ctx.fill()
    }

    // 翅膀（上下扇动的大三角，面向左侧玩家）
    ctx.fillStyle = c.wing
    ctx.beginPath()
    ctx.moveTo(-6 * u, -4 * u)
    ctx.lineTo(14 * u, (-34 - flap) * u)
    ctx.lineTo(30 * u, -6 * u)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-6 * u, 4 * u)
    ctx.lineTo(14 * u, (34 + flap) * u)
    ctx.lineTo(30 * u, 6 * u)
    ctx.closePath()
    ctx.fill()

    // 身体（横向椭圆）+ 腹部
    ctx.fillStyle = c.body
    ctx.beginPath()
    ctx.ellipse(0, 0, 34 * u, 22 * u, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = c.outline
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = c.belly
    ctx.beginPath()
    ctx.ellipse(-6 * u, 6 * u, 20 * u, 12 * u, 0, 0, Math.PI * 2)
    ctx.fill()

    if (this.state === 'recover') {
      ctx.strokeStyle = '#fff5a6'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(-5, 4, 15 + Math.sin(this.stateT * 0.18) * 3, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = '#fff5a6'; ctx.beginPath(); ctx.arc(-5, 4, 5, 0, Math.PI * 2); ctx.fill()
    }

    // 头（左前）+ 喙 + 眼（P2 红眼）
    ctx.fillStyle = c.body
    ctx.beginPath()
    ctx.arc(-32 * u, -8 * u, 14 * u, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = c.outline
    ctx.stroke()
    ctx.fillStyle = c.beak
    ctx.beginPath()
    ctx.moveTo(-42 * u, -10 * u)
    ctx.lineTo(-58 * u, -4 * u)
    ctx.lineTo(-42 * u, 0)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = this.phase === 2 ? '#ff3b3b' : c.eye
    ctx.beginPath()
    ctx.arc(-34 * u, -11 * u, 3.5 * u, 0, Math.PI * 2)
    ctx.fill()

    // 受击白闪 / 蓄力泛白预警（§4.8：泛白=冲锋前摇视觉语言）
    if (this._hitFlash > 0 || this.state === 'windup') {
      const a = this.state === 'windup'
        ? 0.25 + 0.25 * Math.sin(this.stateT * 0.5)   // 蓄力呼吸泛白
        : this._hitFlash / 6 * 0.5                    // 受击短闪
      ctx.globalAlpha = Math.max(0, a)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(0, 0, 36 * u, 24 * u, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = this.state === 'dying' ? Math.max(0, 1 - this.stateT / Config.BOSS.DEATH_SLOWMO_FRAMES) : 1
    }

    ctx.restore()

    // P2 入场爆闪：全屏闪电白闪（30 帧渐隐，粒子由 Game 侧补）
    if (this.phase2Flash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 220, ' + (this.phase2Flash / Config.BOSS.PHASE2_FLASH_FRAMES * 0.10).toFixed(3) + ')'
      ctx.fillRect(0, 0, this.screenW, this.screenH)
    }

    // Ch2 沙暴巨鹰：沙粒尾迹（§4.6 差异说明；位置由 stateT 推导，零随机源）
    if (cfg.trailColor) {
      for (let i = 0; i < 6; i++) {
        const tx = this.x + this.width + 8 + i * 14
        const ty = cy + Math.sin(this.stateT * 0.2 + i * 1.7) * 12 + (i % 2) * 8
        const alpha = Math.max(0, 0.4 - i * 0.06)
        ctx.fillStyle = 'rgba(' + cfg.trailColor + ', ' + alpha.toFixed(3) + ')'
        ctx.beginPath()
        ctx.arc(tx, ty, 3 - i * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  _renderChargeWarning(ctx) {
    const y = this.chargeY
    ctx.save()
    ctx.fillStyle = 'rgba(255,70,55,0.20)'
    ctx.fillRect(0, y - this.height / 2, this.screenW, this.height)
    ctx.strokeStyle = '#ff5b46'; ctx.lineWidth = 2
    ctx.strokeRect(0, y - this.height / 2, this.screenW, this.height)
    for (let x = 15; x < this.screenW; x += 35) {
      ctx.beginPath(); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x, y); ctx.lineTo(x + 7, y + 7); ctx.stroke()
    }
    ctx.restore()
  }

  _renderTelegraph(ctx) {
    if (this.state !== 'telegraph') return
    ctx.save()
    if (this.action === 'wall') {
      const top = this.wallCenter - this.wallGap / 2
      const bottom = this.wallCenter + this.wallGap / 2
      ctx.fillStyle = 'rgba(132,74,24,0.15)'
      ctx.fillRect(0, 130, this.screenW, Math.max(0, top - 130))
      ctx.fillRect(0, bottom, this.screenW, this.groundY - bottom)
      ctx.strokeStyle = '#caffbd'; ctx.lineWidth = 3
      ctx.strokeRect(2, top, this.screenW - 4, this.wallGap)
      ctx.fillStyle = '#e9ffd9'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('← 安全缺口', this.screenW / 2, this.wallCenter)
      ctx.fillStyle = '#bd7734'
      ctx.fillRect(this.screenW - 8, 130, 8, Math.max(0, top - 130))
      ctx.fillRect(this.screenW - 8, bottom, 8, this.groundY - bottom)
    } else {
      const count = Config.BOSS.LEAF_COUNT[this._attackPhase - 1]
      ctx.strokeStyle = 'rgba(255,85,50,0.65)'; ctx.lineWidth = 2
      for (let i = 0; i < count; i++) {
        const angle = this.aimAngle + (i - (count - 1) / 2) * Config.BOSS.LEAF_SPREAD
        ctx.beginPath(); ctx.moveTo(this.x, this.y)
        ctx.lineTo(this.x + Math.cos(angle) * this.screenW, this.y + Math.sin(angle) * this.screenW); ctx.stroke()
      }
    }
    ctx.restore()
  }
}
module.exports = Boss
