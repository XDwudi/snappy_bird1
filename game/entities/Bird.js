const Art=require('../art/Entities')
/**
 * Bird.js - 小鸟实体
 * 
 * 负责：物理运动（重力/拍翅）、旋转动画、翅膀动画、像素风格渲染。
 * 物理参数（gravity/flapForce/maxFallSpeed）由 Game.js 通过属性注入，
 * 支持能力系统动态修改。
 */

const Config = require('../config/GameConfig.js')

class Bird {
  /**
   * @param {number} x - 初始中心X
   * @param {number} y - 初始中心Y
   */
  constructor(x, y) {
    this.reset(x, y)
  }

  /**
   * 重置到初始状态
   */
  reset(x, y) {
    this.x = x
    this.y = y
    this.velocity = 0
    this.rotation = 0
    this.wingFrame = 0
    this.wingTimer = 0
    this.width = Config.BIRD.WIDTH
    this.height = Config.BIRD.HEIGHT

    // 物理参数（可被能力系统修改）
    this.gravity = Config.BIRD.GRAVITY
    this.flapForce = Config.BIRD.FLAP_FORCE
    this.maxFallSpeed = Config.BIRD.MAX_FALL_SPEED
    this.descentGravityMultiplier = 1
    this.windForce = 0

    // 碰撞箱缩放（可被灵巧能力修改）
    this.collisionScale = 1.0
    this.collisionWidth = this.width * Config.BIRD.COLLISION_RATIO
    this.collisionHeight = this.height * Config.BIRD.COLLISION_RATIO

    // 无敌闪烁
    this.invincibleBlink = 0
  }

  /**
   * 更新碰撞箱尺寸（灵巧能力改变时调用）
   */
  updateCollisionBox() {
    this.collisionWidth = this.width * Config.BIRD.COLLISION_RATIO * this.collisionScale
    this.collisionHeight = this.height * Config.BIRD.COLLISION_RATIO * this.collisionScale
  }

  /**
   * 拍翅——施加瞬间上升速度
   */
  flap() {
    this.velocity = this.flapForce
    this.wingFrame = 0
    this.wingTimer = 0
  }


  /**
   * 物理更新（游玩态）
   */
  update() {
    // 重力
    const gravity=this.gravity*(this.velocity>=0?this.descentGravityMultiplier:1)
    // 阵风不能抵消重力；固定拍翅力度，满级组合不会单击冲顶。
    const wind=Math.max(-gravity*.25,Math.min(gravity*.35,this.windForce))
    this.velocity += gravity+wind
    if (this.velocity > this.maxFallSpeed) {
      this.velocity = this.maxFallSpeed
    }

    // 位置更新
    this.y += this.velocity

    // 旋转：上升时朝上，下落时逐渐朝下
    const { BIRD } = Config
    if (this.velocity < 0) {
      this.rotation = BIRD.ROTATION_UP
    } else {
      this.rotation = Math.min(this.rotation + BIRD.ROTATION_SPEED, BIRD.ROTATION_DOWN_MAX)
    }

    // 翅膀动画
    this.wingTimer++
    if (this.wingTimer >= BIRD.WING_ANIM_SPEED) {
      this.wingTimer = 0
      this.wingFrame = (this.wingFrame + 1) % 3
    }

    // 无敌闪烁计时
    if (this.invincibleBlink > 0) {
      this.invincibleBlink--
    }
  }

  /**
   * 悬停动画（准备态）
   */
  updateHover(frameCount) {
    this.y += Math.sin(frameCount * 0.08) * 0.6
    this.rotation = 0

    this.wingTimer++
    if (this.wingTimer >= Config.BIRD.WING_ANIM_SPEED) {
      this.wingTimer = 0
      this.wingFrame = (this.wingFrame + 1) % 3
    }
  }

  /**
   * 渲染小鸟（像素风格）
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} shieldLayers - [v1.1.5] 当前护盾层数（0=无护盾，N=N层圆圈）
   */
  render(ctx, shieldLayers) {
    Art.bird(ctx, this, shieldLayers)
  }
}

module.exports = Bird
