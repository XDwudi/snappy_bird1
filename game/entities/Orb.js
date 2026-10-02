const Icons=require('../art/Icons')
/**
 * Orb.js - 经验球实体 [v1.1.0] 继承 Collectible 基类
 *
 * 负责：沿管道间隙路径生成、跟随世界滚动、磁吸小鸟、拾取判定、像素风渲染。
 * 继承 Collectible，与 Item 共享统一的 update/checkCollect/isOffscreen 接口。
 */

const Config = require('../config/GameConfig.js')
const Collectible = require('./Collectible.js')

class Orb extends Collectible {
  /**
   * @param {number} x - 初始中心X
   * @param {number} y - 初始中心Y
   */
  constructor(x, y) {
    super(x, y, Config.ORB.RADIUS)
  }

  /**
   * 渲染经验球
   */
  render(ctx) {
    Icons.draw(ctx, 'exp_pack', this.x, this.y, this.radius * 2.6)
  }
}

module.exports = Orb
