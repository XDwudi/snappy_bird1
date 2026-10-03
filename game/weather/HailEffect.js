const Random=require('../core/Random')
const FX=require('../art/Effects')
/**
 * HailEffect.js - 冰雹环境效果 [v1.2.0新增]
 *
 * 掉落冰雹实体，触碰玩家造成1点伤害（走碰撞优先级链）。
 * 冰雹数量和密度：低→高→低（sin曲线）。
 * 冰雹从屏幕顶部生成，以5~8px/帧速度下落。
 */

const WeatherEffect = require('./WeatherEffect.js')
const Config = require('../config/GameConfig.js')
const Hailstone = require('../entities/Hailstone.js')

class HailEffect extends WeatherEffect {
  constructor() {
    super('hail', '冰雹')
    this.hailstones = []        // 活跃冰雹实体
    this.spawnTimer = 0         // 生成计时器
    this.crackEffects = []      // 碎裂特效
  }

  onTrigger(gameCtx) {
    super.onTrigger(gameCtx)
    this.duration = this.getDuration(gameCtx.gameTime, gameCtx)
    this.hailstones = []
    this.crackEffects = []
  }

  getDuration(gameTime, gameCtx) {
    const H = Config.WEATHER.HAIL
    const t = Math.min(1, gameTime / H.DURATION_RAMP_TIME)
    // 气候适应在负面强度处结算，天气持续时间不变。
    return Math.round((H.MIN_DURATION + (H.MAX_DURATION - H.MIN_DURATION) * t))
  }

  update(gameCtx) {
    super.update(gameCtx)

    // 生成冰雹（sin曲线密度）
    // [v1.4.0] 风暴之眼：并发≥2 时生成间隔按 debuff 缩放倒数放大（密度降低，伤害不可缩放故降频率）
    const scale = this.isTamed(gameCtx) ? 1 : this.getDebuffScale(gameCtx)
    this.spawnTimer+=gameCtx.eliteWeatherPressure?1.5:1
    const interval = Math.max(
      Config.WEATHER.HAIL.SPAWN_INTERVAL_PEAK / Math.max(0.1, this.sinIntensity) / Math.max(0.2, scale),
      5
    )
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0
      if(this.hailstones.length<24)this._spawnHailstone(gameCtx.screenW)
    }

    // 更新冰雹
    for (let i = this.hailstones.length - 1; i >= 0; i--) {
      const h = this.hailstones[i]
      h.update()

      // 已驯化/免疫的冰雹不浪费风环充能。
      if (!this.isTamed(gameCtx) && !this.isDebuffImmune(gameCtx) &&
          gameCtx.interceptProjectile && gameCtx.interceptProjectile(h)) {
        this.hailstones.splice(i, 1)
        continue
      }
      // 碰撞检测
      if (h.checkCollision(gameCtx.bird)) {
        this._handleHailCollision(h, gameCtx)
        this.hailstones.splice(i, 1)
        continue
      }

      // 离屏销毁
      if (h.isOffscreen(gameCtx.screenH)) {
        this.hailstones.splice(i, 1)
      }
    }

    // 更新碎裂特效
    for (let i = this.crackEffects.length - 1; i >= 0; i--) {
      const c = this.crackEffects[i]
      for (const frag of c.fragments) {
        frag.x += frag.vx
        frag.y += frag.vy
        frag.vy += 0.2
        frag.life--
      }
      c.fragments = c.fragments.filter(f => f.life > 0)
      if (c.fragments.length === 0) {
        this.crackEffects.splice(i, 1)
      }
    }
  }

  _spawnHailstone(screenW) {
    const H = Config.WEATHER.HAIL
    const speed = H.MIN_SPEED + Random.random() * (H.MAX_SPEED - H.MIN_SPEED)
    const radius = H.MIN_RADIUS + Random.random() * (H.MAX_RADIUS - H.MIN_RADIUS)
    this.hailstones.push(new Hailstone(
      Random.random() * screenW,
      -10,
      speed,
      radius
    ))
  }

  /**
   * 处理冰雹碰撞
   * [v1.2.1] 碰撞优先级（与文档对齐，决策D5/D8）：冰晶护体 > 统一护盾 > HP扣血
   * [v1.4.0] §2.6 新节点：驯化冰雹（不伤人，10%掉exp）与羽盾（最前置）插入；
   *          冰雹链实际顺序：定风珠免疫 → 驯化 → 无敌/时间扭曲 → 羽盾 → 冰晶护体（D8 裁定优先于 §2.6 表内位置，
   *          冰晶转化是冰雹特有的资源化路径，保持"冰雹变护盾"玩家友好语义）→ 统一护盾 → HP → 凤凰
   */
  _tryConvertHail(hailstone,gameCtx) {
    const a=gameCtx.abilities,lv=a.owned.get('ice_crystal')||0
    if(!lv || a.iceCrystalCD>0 || a.shieldLayers>=a.maxShieldLayers)return false
    const before=a.shieldLayers
    a.addShieldLayer(1)
    // 无尽恢复间隔未放行时，不虚报护盾，也不白消耗冷却。
    if(a.shieldLayers<=before)return false
    a.iceCrystalCD=(20-3*(lv-1))*60
    this._addCrackEffect(hailstone.x,hailstone.y,'#64c8ff')
    gameCtx.addFloatingText(hailstone.x,hailstone.y-20,'冰晶转盾!','#64c8ff',35)
    return true
  }

  _handleHailCollision(hailstone, gameCtx) {
    const abilities = gameCtx.abilities
    // Victory settlement protection is independent of combat invincibility caps.
    if (gameCtx.isVictoryProtected && gameCtx.isVictoryProtected()) {
      this._addCrackEffect(hailstone.x, hailstone.y, '#ffffff')
      return
    }

    // [v1.4.0] 定风珠：免疫期冰雹不造成伤害（视觉碎裂保留，免疫判定在 debuff 应用点）
    if (this.isDebuffImmune(gameCtx)) {
      this._tryConvertHail(hailstone,gameCtx)
      this._addCrackEffect(hailstone.x, hailstone.y, '#ffffff')
      return
    }

    // [v1.4.0] 风暴驯化：冰雹→10% 概率掉 exp、不伤人（冰晶护体仍可转盾，恢复间隔与冷却照常）
    if (this.isTamed(gameCtx)) {
      this._tryConvertHail(hailstone,gameCtx)
      this._addCrackEffect(hailstone.x, hailstone.y, '#b8ff9e')
      if (Random.random() < Config.WEATHER.TAMED_HAIL_EXP_CHANCE &&
          typeof gameCtx.gainExp === 'function') {
        gameCtx.gainExp(Config.WEATHER.TAMED_HAIL_EXP_AMOUNT, 'tamed_hail')
        gameCtx.addFloatingText(hailstone.x, hailstone.y - 20, `+${Config.WEATHER.TAMED_HAIL_EXP_AMOUNT} EXP`, '#b8ff9e', 35)
      }
      return
    }

    // 无敌期不重复消耗防御资源，也不缩短已有保护时间。
    if (abilities.invincibleFrames > 0 || abilities.timeWarpActive > 0) {
      this._addCrackEffect(hailstone.x, hailstone.y, '#ffffff')
      return
    }

    // [v1.4.0] 羽盾：受击链最前置防御节点（挡 1 次伤害；铁羽破盾给无敌帧）
    if (typeof abilities.consumeFeatherShield === 'function' && abilities.consumeFeatherShield()) {
      this._addCrackEffect(hailstone.x, hailstone.y, '#fff2c8')
      gameCtx.addFloatingText(hailstone.x, hailstone.y - 20, '羽盾!', '#fff2c8', 30)
      return
    }

    // 冰晶护体：冰雹转为护盾
    // [v1.2.1] 护盾已满层时冰晶护体不触发也不进CD，走后续统一护盾链
    if(this._tryConvertHail(hailstone,gameCtx)) {
      if (typeof abilities.resetCombo === 'function') abilities.resetCombo()
      return
    }

    // 统一护盾
    if (abilities.shieldLayers > 0) {
      abilities.consumeShield()
      abilities.invincibleFrames = 30   // 设置无敌帧，防止同帧多次消耗
      gameCtx.bird.invincibleBlink = 20
      this._addCrackEffect(hailstone.x, hailstone.y, '#64c8ff')
      gameCtx.addFloatingText(hailstone.x, hailstone.y - 20, '冰雹!', '#a0d0ff', 30)
      return
    }

    // HP扣血
    if(gameCtx.recordDamage)gameCtx.recordDamage()
    const dead = abilities.takeDamage()
    gameCtx.damageFlash = 12
    gameCtx.shakeFrames = 4
    gameCtx.shakeIntensity = 2
    abilities.invincibleFrames = abilities.getInvincibleFrames(gameCtx.bossActive)
    gameCtx.bird.invincibleBlink = 30
    this._addCrackEffect(hailstone.x, hailstone.y, '#ff4444')
    gameCtx.addFloatingText(hailstone.x, hailstone.y - 20, '-1 HP', '#ff4444', 35)

    if (dead) {
      // 检查凤凰复活
      if (abilities.tryPhoenix()) {
        gameCtx.triggerPhoenixRevive()
      } else {
        gameCtx.triggerGameOver()
      }
    }
  }

  _addCrackEffect(x, y, color) {
    const fragments = []
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5
      const speed = 1.5 + Math.random() * 2
      fragments.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 15,
        maxLife: 15,
        color: color
      })
    }
    this.crackEffects.push({ fragments })
  }

  render(ctx, screenW, screenH) {
    FX.hail(ctx, this, screenW, screenH)
  }

  onExpire(gameCtx) {
    super.onExpire(gameCtx)
    // 已生成的冰雹继续下落直到离屏
  }
}

module.exports = HailEffect
