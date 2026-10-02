/**
 * ExpSystem.js - 经验与升级系统
 *
 * 职责：经验值管理、等级计算、升级阈值、进度查询。
 * 升级触发后通知 Game.js 暂停游戏并弹出选择面板。
 */

const Config = require('../config/GameConfig.js')

class ExpSystem {
  constructor() {
    this.reset()
  }

  reset() {
    this.exp = 0
    this.level = 1
    this.pendingLevelUps = 0  // 待处理的升级次数（一次获得大量经验可能跨级）

    // [v1.4.0] 顿悟（enlightenment）：由 Game 根据持卡情况调用 configureEnlighten 同步
    this.enlightenEnabled = false
    this.enlightenUsed = 0     // 本局已触发次数（每局限 ENLIGHTEN_MAX_PER_RUN=3 次，硬刹车）
  }

  /**
   * 计算升到下一级所需经验
   * 公式：前20级保持线性，之后叠加0.9×(level-20)²
   * @param {number} level - 当前等级
   * @returns {number}
   */
  getExpNeeded(level) {
    return Math.ceil(Config.EXP.BASE_EXP + (level - 1) * Config.EXP.EXP_INCREMENT +
      Config.EXP.LATE_CURVE * Math.pow(Math.max(0,level-Config.EXP.LATE_START_LEVEL),2))
  }

  /**
   * 添加经验
   * @param {number} amount - 基础经验值（未乘倍率）
   * @param {number} multiplier - 经验倍率
   * @returns {number} 实际增加的经验
   */
  addExp(amount, multiplier, allowEnlighten = true) {
    const actual = Math.round(amount * multiplier)
    this.exp += actual

    // 顿悟：一次入账足够支付当前级+下一级半价时连升两级，最多3次。
    // Boss定额礼包不触发折扣；普通逐级升级仍按原费用结算。
    if (allowEnlighten && this.enlightenEnabled && this.enlightenUsed < Config.EXP.ENLIGHTEN_MAX_PER_RUN) {
      const neededNow = this.getExpNeeded(this.level)
      const doubleCost=neededNow+Math.ceil(this.getExpNeeded(this.level+1)*Config.EXP.ENLIGHTEN_SECOND_LEVEL_COST)
      if (this.exp >= doubleCost) {
        this.exp -= doubleCost
        this.level += 2
        this.pendingLevelUps += 2
        this.enlightenUsed++
      }
    }

    // 检查升级
    while (this.exp >= this.getExpNeeded(this.level)) {
      this.exp -= this.getExpNeeded(this.level)
      this.level++
      this.pendingLevelUps++
    }

    return actual
  }

  /**
   * [v1.4.0] 同步顿悟开关（由 Game 在选卡后调用）
   * @param {number} lv - 顿悟等级（0=未持有）
   */
  configureEnlighten(lv) {
    this.enlightenEnabled = lv > 0
  }

  /**
   * 消费一个待处理升级
   * @returns {boolean} 是否有升级待处理
   */
  consumeLevelUp() {
    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps--
      return true
    }
    return false
  }

  /**
   * 是否有待处理的升级
   */
  hasPendingLevelUp() {
    return this.pendingLevelUps > 0
  }

  /**
   * 获取经验条进度（0~1）
   */
  getProgress() {
    const needed = this.getExpNeeded(this.level)
    return Math.min(this.exp / needed, 1)
  }

  /**
   * 获取经验条显示数据
   */
  getExpBarData() {
    const needed = this.getExpNeeded(this.level)
    return {
      level: this.level,
      current: this.exp,
      needed: needed,
      progress: this.exp / needed
    }
  }
}

module.exports = ExpSystem
