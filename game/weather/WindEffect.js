const Random=require('../core/Random')
const FX=require('../art/Effects')
/**
 * WindEffect.js - 风环境效果 [v1.2.0新增]
 *
 * 给玩家施加随机方向的力，力量曲线：小→大→小（sin曲线）。
 * 垂直风影响小鸟velocity，水平风影响世界滚动速度。
 * 视觉：风向粒子线条 + 小鸟周围风向箭头。
 */

const WeatherEffect = require('./WeatherEffect.js')
const Config = require('../config/GameConfig.js')

class WindEffect extends WeatherEffect {
  constructor() {
    super('wind', '风')
    this.isVertical = false      // 垂直风 or 水平风
    this.direction = 1           // 方向：1=下/右, -1=上/左
    this.currentForce = 0        // 当前风力
    this.particles = []          // 风向粒子
    this._particleTimer = 0
  }

  onTrigger(gameCtx) {
    super.onTrigger(gameCtx)
    this.isVertical = Random.random() < 0.5
    this.direction = Random.random() < 0.5 ? 1 : -1
    this.duration = this.getDuration(gameCtx.gameTime, gameCtx)
    this.particles = []
  }

  getDuration(gameTime, gameCtx) {
    const W = Config.WEATHER.WIND
    const t = Math.min(1, gameTime / W.DURATION_RAMP_TIME)
    // 气候适应在负面强度处结算，天气持续时间不变。
    return Math.round((W.MIN_DURATION + (W.MAX_DURATION - W.MIN_DURATION) * t))
  }

  update(gameCtx) {
    super.update(gameCtx)

    // sin曲线风力
    const rawForce = Config.WEATHER.WIND.MAX_FORCE * this.sinIntensity * this.direction

    // 能力修饰
    const windReaderLv = gameCtx.abilities.owned.get('wind_reader') || 0

    // 御风者改为攻击，不再把向上/向下吹视为必然有利的助推。
    let force=rawForce*Math.max(0,1-.3*windReaderLv)*this.getDebuffScale(gameCtx)
    if(this.isTamed(gameCtx)||this.isDebuffImmune(gameCtx))force=0

    this.currentForce = force

    // 应用风力
    if (this.isVertical) {
      gameCtx.verticalWindForce = (gameCtx.verticalWindForce || 0)+force
    } else {
      // [v1.2.1] 水平风系数 0.3→1.5（配置化），玩法影响与视觉强度对齐
      gameCtx.windScrollModifier += force * Config.WEATHER.WIND.HORIZONTAL_FACTOR
    }

    // 生成风向粒子
    this._particleTimer++
    if (this._particleTimer >= 3) {
      this._particleTimer = 0
      this._spawnParticle(gameCtx.screenW, gameCtx.screenH)
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      if (this.isVertical) {
        p.y += force * 20 + p.speed * this.direction
      } else {
        p.x += force * 20 + p.speed * this.direction
      }
      p.life--
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  _spawnParticle(screenW, screenH) {
    const intensity = this.sinIntensity
    if (intensity < 0.05) return

    if (this.isVertical) {
      this.particles.push({
        x: Math.random() * screenW,
        y: this.direction > 0 ? -20 : screenH + 20,
        speed: 2 + Math.random() * 3,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        length: 15 + Math.random() * 20
      })
    } else {
      this.particles.push({
        x: this.direction > 0 ? -20 : screenW + 20,
        y: Math.random() * screenH * 0.7,
        speed: 2 + Math.random() * 3,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        length: 15 + Math.random() * 20
      })
    }
  }

  render(ctx, screenW, screenH, gameCtx) {
    FX.wind(ctx, this, screenW, screenH, gameCtx)
  }

  onExpire(gameCtx) {
    super.onExpire(gameCtx)
    this.particles = []
  }
}

module.exports = WindEffect
