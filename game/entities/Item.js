const Art=require('../art/Entities')
/**
 * Item.js - 道具实体 [v1.1.0新增, v1.1.4图标区分]
 *
 * 继承 Collectible，支持4种道具类型：
 * - exp_pack: 经验包（随机15~30经验）
 * - health_pack: 血包（恢复1HP）
 * - shield_pack: 护盾包（1层护盾，5秒）
 * - speed_pack: 速度包（3秒全局减速50%）
 * - missile: 导弹 [v1.3.0]（拾取即发射，弱追踪，怪物优先）
 *
 * [v1.1.4] 道具图标视觉区分：每种道具有独特形状，玩家一眼识别效果。
 * 道具受磁吸能力影响，拾取后触发对应效果。
 */

const Config = require('../config/GameConfig.js')
const Collectible = require('./Collectible.js')

class Item extends Collectible {
  /**
   * @param {number} x - 初始中心X
   * @param {number} y - 初始中心Y
   * @param {string} type - 道具类型
   */
  constructor(x, y, type) {
    super(x, y, Config.ITEM.RADIUS)
    this.type = type
    this.color = Config.ITEM.COLORS[type] || '#888888'
  }

  /**
   * 渲染道具 [v1.1.4] 每种道具独特图标
   */
  render(ctx) {
    Art.item(ctx, this)
  }
}

module.exports = Item
