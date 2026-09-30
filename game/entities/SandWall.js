// 沙墙的可见实体与碰撞共用同一个缺口；风环不拦截环境墙。
const Config = require('../config/GameConfig.js')
class SandWall {
  constructor(x, groundY, center, gap) {
    this.x = x
    this.width = Config.BOSS.WALL_WIDTH
    this.groundY = groundY
    this.topHeight = center - gap / 2
    this.bottomY = center + gap / 2
    this.gap = gap
    this.type = 'feather' // 复用怪系防御判定
    this.isSandWall = true
    this.age = 0
  }
  update(scale = 1) { this.x -= Config.BOSS.WALL_SPEED * scale; this.age += scale }
  checkCollision(b) {
    return b.x + b.collisionWidth / 2 > this.x && b.x - b.collisionWidth / 2 < this.x + this.width &&
      (b.y - b.collisionHeight / 2 < this.topHeight || b.y + b.collisionHeight / 2 > this.bottomY)
  }
  isOffscreen() { return this.x + this.width < -20 }
  render(ctx) {
    ctx.save()
    ctx.fillStyle = '#bd7734'
    ctx.fillRect(this.x, 0, this.width, this.topHeight)
    ctx.fillRect(this.x, this.bottomY, this.width, this.groundY - this.bottomY)
    ctx.fillStyle = '#f9cb79'
    for (let y = 0; y < this.groundY; y += 18) {
      if (y + 8 > this.topHeight && y < this.bottomY) continue
      const dx = 4 + (Math.sin(this.age * 0.22 + y) + 1) * 6
      ctx.fillRect(this.x + dx, y, 8, 5)
    }
    ctx.fillStyle = '#caffbd'
    ctx.fillRect(this.x - 3, this.topHeight - 3, this.width + 6, 3)
    ctx.fillRect(this.x - 3, this.bottomY, this.width + 6, 3)
    ctx.restore()
  }
}
module.exports = SandWall
