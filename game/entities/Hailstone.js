const Art=require('../art/Entities')
/**
 * Hailstone.js - 冰雹实体 [v1.2.0新增]
 *
 * 从屏幕顶部掉落，触碰玩家造成1点伤害。
 * 走碰撞优先级链：统一护盾 > 冰晶护体 > HP扣血。
 */

class Hailstone {
  /**
   * @param {number} x - 初始X
   * @param {number} y - 初始Y
   * @param {number} speed - 下落速度
   * @param {number} radius - 半径
   */
  constructor(x, y, speed, radius) {
    this.x = x
    this.y = y
    this.vy = speed
    this.radius = radius
    this.rotation = 0
    this.rotationSpeed = (Math.random() - 0.5) * 0.2
    this.alive = true
    this.trail = []             // 尾迹
  }

  update() {
    // 记录尾迹
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > 5) this.trail.shift()

    this.y += this.vy
    this.rotation += this.rotationSpeed
  }

  /**
   * 与小鸟的碰撞检测
   * @param {Object} bird
   * @returns {boolean}
   */
  checkCollision(bird) {
    const dx = this.x - bird.x
    const dy = this.y - bird.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const collisionRadius = Math.max(bird.collisionWidth, bird.collisionHeight) / 2
    return dist < this.radius + collisionRadius
  }

  /**
   * 是否离开屏幕底部
   */
  isOffscreen(screenH) {
    return this.y > screenH + 20
  }

  render(ctx) {
    Art.projectile(ctx, this, true)
  }
}

module.exports = Hailstone
