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
    const P = require('../art/Pixel'), A = require('../art/Assets')
    ctx.save(); ctx.imageSmoothingEnabled = false
    for (const [y, h] of [[0, this.topHeight], [this.bottomY, this.groundY-this.bottomY]]) {
      ctx.save(); ctx.beginPath(); ctx.rect(this.x,y,this.width,h); ctx.clip()
      P.box(ctx,this.x,y,this.width,h,'#b18153','#e8bc81')
      if(A.images.materials)for(let dy=y;dy<y+h;dy+=100)ctx.drawImage(A.images.materials,640,110,256,402,this.x+2,dy,this.width-4,100)
      for(let dy=y+10;dy<y+h;dy+=24){ctx.fillStyle=P.C.gold;ctx.fillRect(Math.round(this.x+5+(Math.sin(this.age*.22+dy)+1)*5),dy,3,3)}
      ctx.restore()
    }
    P.path(ctx,[[this.x,this.topHeight],[this.x+this.width,this.topHeight]],P.C.green,2)
    P.path(ctx,[[this.x,this.bottomY],[this.x+this.width,this.bottomY]],P.C.green,2)
    ctx.restore()
  }
}
module.exports = SandWall
