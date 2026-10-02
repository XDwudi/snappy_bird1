const Art=require('../art/Entities')
/**
 * Pipe.js - 管道障碍实体 [v1.1.0] 继承 Obstacle 基类
 *
 * 负责：管道移动、碰撞检测、像素风格渲染（上下成对+帽）。
 * 继承 Obstacle，未来扩展（MovingPipe 等）只需继承同一基类。
 */

const Config = require('../config/GameConfig.js')
const Obstacle = require('./Obstacle.js')

class Pipe extends Obstacle {
  /**
   * @param {number} x - 左上角X
   * @param {number} topHeight - 上管道高度
   * @param {number} gap - 管道间隙
   * @param {number} groundY - 地面顶部Y坐标
   */
  constructor(x, topHeight, gap, groundY) {
    super(x, topHeight, gap, groundY, Config.PIPE.WIDTH)
    this.type = 'pipe'
    // [v1.3.0] 管道可被导弹炸毁（HP=1），为 Boss 铺垫统一受击接口
    this.destructible = true
    this.hp = 1
    this.maxHp = 1
    // [v1.5.0] 章节换色（§4.2/§4.3）：null = 用 VISUAL 默认色（Ch1 零变化）；
    // { body, highlight, shadow } = 章节色或转场 lerp 中间色
    this.colorSet = null
  }

  /**
   * [v1.5.0] 设置章节管道色（ChapterSystem 换色/lerp 时由 Game 接线调用）
   * @param {Object|null} cs - { body, highlight, shadow }；null 恢复默认
   */
  setColorSet(cs) {
    this.colorSet = cs || null
  }

  // update() 和 checkCollision() 继承基类默认实现

  /**
   * 渲染管道（像素风格）
   */
  _doRender(ctx) {
    Art.pipe(ctx, this)
  }
}

module.exports = Pipe
