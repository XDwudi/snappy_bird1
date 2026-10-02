const Art=require('../art/Entities')
/**
 * Monster.js - 怪物障碍实体 [v1.3.0新增]
 *
 * 继承 Obstacle 基类，是管道之外的第二类障碍物（可被导弹锁定，为 Boss 铺垫）。
 * 两种怪物（数值全部入 GameConfig.MONSTER）：
 * - 蝙蝠怪 bat 🦇：正弦垂直波动，HP=1
 * - 浮游怪 floater 👾：滞后追踪小鸟 y（追踪速度上限保证可躲避），HP=2
 *
 * 与小鸟碰撞走 Game._handleCollision 统一受击链（无敌帧/护盾/HP），与管道同级；
 * 不被管道碰撞影响（Game 中独立平行数组管理）。
 * 渲染为像素风几何体，风格与管道/小鸟一致。
 */

const Config = require('../config/GameConfig.js')
const Obstacle = require('./Obstacle.js')
const MathUtil = require('../core/MathUtil.js')

class Monster extends Obstacle {
  /**
   * @param {number} x - 左上角X（与基类/出屏判定一致，用左边缘坐标）
   * @param {number} y - 中心Y
   * @param {string} monsterType - 'bat' | 'floater'
   * @param {number} groundY - 地面顶部Y坐标
   * @param {Object} [opts] - [v1.5.0] 可选修正：{ elite, hpMult, trackSpeed, sineAmp }
   *                          elite=精英怪（§5.1 金边+体型×1.3+HP×3，移动参数不变）；
   *                          hpMult/trackSpeed/sineAmp=章节修正（§4.4，缺省=配置基准，零变化）
   */
  constructor(x, y, monsterType, groundY, opts) {
    const cfg = monsterType === 'bat' ? Config.MONSTER.BAT : Config.MONSTER.FLOATER
    // [v1.5.0] 精英怪体型 ×1.3（§5.1）；非精英 Math.round(×1)=原值，零变化
    const elite = !!(opts && opts.elite)
    const sizeMult = elite ? Config.MONSTER.ELITE_SIZE_MULT : 1
    const width = Math.round(cfg.WIDTH * sizeMult)
    const height = Math.round(cfg.HEIGHT * sizeMult)
    // 复用基类字段：topHeight/gap 映射为怪物包围盒（弹力护盾弹开方向等逻辑可直接复用）
    super(x, y - height / 2, height, groundY, width)
    this.type = 'monster'
    this.monsterType = monsterType
    this.destructible = true           // [v1.3.0] 可被导弹锁定/摧毁
    this.elite = elite                 // [v1.5.0] 精英标记（渲染金边/击杀奖励判定）
    // [v1.5.0] HP = 基础 × 精英倍率 × 章节倍率（§4.4 Ch3×1.5 向上取整）；默认全 1，零变化
    const hpMult = (opts && opts.hpMult) || 1
    this.hp = Math.ceil(cfg.HP * (elite ? Config.MONSTER.ELITE_HP_MULT : 1) * hpMult)
    this.maxHp = this.hp
    this.height = height
    this.y = y                          // 中心Y
    this.baseY = y                      // 蝙蝠正弦基准Y
    this.phase = Math.random() * Math.PI * 2  // 正弦/扇翅相位
    this._targetY = y                   // 浮游怪追踪目标Y（Game 每帧写入小鸟 y）
    // [v1.5.0] 章节移动参数覆写点（§4.4）；缺省取配置基准值，行为与 v1.4.0 完全一致
    this._trackSpeed = (opts && opts.trackSpeed) || Config.MONSTER.FLOATER.TRACK_SPEED
    this._sineAmp = (opts && opts.sineAmp) || Config.MONSTER.BAT.SINE_AMP
    this.age = 0
    this.hitFlash = 0
    this.trail = []
    this._syncBox()
  }

  /**
   * 将中心坐标同步到基类碰撞字段（topHeight/bottomY = 包围盒上下缘）
   */
  _syncBox() {
    this.topHeight = this.y - this.height / 2
    this.gap = this.height
    this.bottomY = this.y + this.height / 2
  }

  /**
   * 更新（覆盖基类模板方法，额外接收小鸟用于追踪）
   * @param {number} speed - 世界滚动速度
   * @param {Object} [bird] - 小鸟实体（浮游怪追踪其 y）
   */
  update(speed, bird, timeScale = 1) {
    if (bird) this._targetY = bird.y
    this._doUpdate(speed, timeScale)
  }

  /**
   * 子类实现：位置更新
   */
  _doUpdate(speed, timeScale = 1) {
    this.age++
    if (this.hitFlash > 0) this.hitFlash--
    if (this.age % 4 === 0) {
      this.trail.push({ x: this.x + this.width / 2, y: this.y })
      if (this.trail.length > 4) this.trail.shift()
    }
    this.x -= speed
    const M = Config.MONSTER

    if (this.monsterType === 'bat') {
      // 蝙蝠怪：正弦垂直波动（[v1.5.0] 振幅走实例字段，章节修正可覆写，默认=配置值）
      this.phase += M.BAT.SINE_FREQ * timeScale
      this.y = this.baseY + Math.sin(this.phase) * this._sineAmp
    } else {
      // 浮游怪：滞后追踪小鸟 y，速度设上限保证可躲避（[v1.5.0] 追踪速度走实例字段）
      this.phase += 0.08 * timeScale  // 触须摆动相位
      const dy = this._targetY - this.y
      const maxStep = this._trackSpeed * timeScale
      if (Math.abs(dy) > maxStep) {
        this.y += dy > 0 ? maxStep : -maxStep
      } else {
        this.y += dy
      }
    }

    // y 边界钳制（不出天花板/地面）
    this.y = MathUtil.clamp(this.y, this.height / 2, this.groundY - this.height / 2)
    this._syncBox()
  }

  /**
   * 子类实现：碰撞检测（AABB，碰撞箱为视觉的 0.8 倍）
   */
  _doCheckCollision(bird) {
    const w = this.width * 0.8
    const h = this.height * 0.8
    const birdRect = MathUtil.centerToRect(bird.x, bird.y, bird.collisionWidth, bird.collisionHeight)
    const monsterRect = MathUtil.centerToRect(this.x + this.width / 2, this.y, w, h)
    return MathUtil.aabbCollision(birdRect, monsterRect)
  }

  /**
   * 子类实现：渲染
   */
  takeDamage(n) {
    if (this.hp <= 0) return false
    this.hitFlash = 8
    return super.takeDamage(n)
  }

  _doRender(ctx) {
    Art.monster(ctx, this)
  }
}

module.exports = Monster
