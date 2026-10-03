/**
 * 生成管道、怪物、精英与道具。Game 通过回调接收实体。
 * v1.8.2：普通怪靠近管道出口；四种精英轮换，按章节/无尽时间成长。
 * 45秒保护期后按25秒周期尝试精英，最多同屏一只；Boss战暂停常规生成。
 * 参数由 ChapterSystem 注入，reset 清除局内计时。
 */

const Config = require('../config/GameConfig.js')
const Pipe = require('../entities/Pipe.js')
const EliteMonster = require('../entities/EliteMonster.js')
const Monster = require('../entities/Monster.js')
const Item = require('../entities/Item.js')
const Logger = require('./GameLogger.js')

class SpawnSystem {
  /**
   * @param {Object} deps - 依赖注入（全部由 Game 提供，SpawnSystem 不反查 Game 内部状态）
   * @param {number} deps.screenW - 逻辑屏幕宽度
   * @param {number} deps.screenH - 逻辑屏幕高度
   * @param {function():number} deps.getGameTime - 当前游戏时间（帧）
   * @param {function():Object} deps.getStats - 能力系统聚合属性（gapBonus 等）
   * @param {function():number} deps.getGapSize - 当前管道间隙（难度曲线+能力修正，由 Game._getGapSize 提供）
   * @param {function(string):number} deps.getOwnedLevel - 能力持有等级（supply_line 保底用）
   * @param {function():Array} deps.getPipes - 当前管道数组（怪物 y 避让用）
   * @param {function():number} deps.getMonsterCount - 当前同屏怪物数
   * @param {function():number} deps.getBirdY - [v1.5.0 D21] 小鸟当前 y（Boss 战保底导弹同高生成用）
   * @param {function(string):boolean} deps.hasItemType - [v1.5.0 D21] 场上是否存在某类型道具（保底供给查重用）
   * @param {function(Pipe)} deps.onSpawnPipe - 管道生成结果接线（Game push 进 this.pipes）
   * @param {function(Monster)} deps.onSpawnMonster - 怪物生成结果接线
   * @param {function(Item)} deps.onSpawnItem - 道具生成结果接线
   */
  constructor(deps) {
    this._deps = deps

    // 生成计时状态（原 Game.js 字段，语义不变）
    this._lastPipeCenter = null
    this._pipeDistance = 0    // [v1.3.0] 距上次生成管道的累计滚动距离(px)，替代旧 spawnTimer(帧)
    this._monsterDistance = 0 // [v1.3.0] 距上次生成怪物的累计滚动距离(px)
    this.itemSpawnTimer = 0   // [v1.1.1] 随机道具刷新计时器
    this.supplyLineTimer = 0  // [v1.4.0] 补给线保底道具计时器（与随机生成 itemSpawnTimer 独立）

    // [v1.5.0] Boss 战开关：true 时暂停管道/怪物生成（预留，默认 false）
    this._bossActive = false

    // [v1.5.0] 章节修正参数注入点（默认 null = 不覆写任何数值）
    // { pipeDistanceScale, monsterSpawnDistanceScale, monsterSpawnDistance,
    //   monsterMaxAlive, monsterHpMult, floaterTrackSpeed, batSineAmp, eliteChance }
    this._chapterMods = null

    // [v1.5.0] 精英怪 roll 状态（§5.1）：局内状态，随 reset 清零
    this._eliteTimer = 0      // 距上次 roll 的帧数（45s 保护期后开始计时）
    this._eliteCursor = 0
    this._eliteMisses = 0
    this._elitePending = false // true = 下一只怪物升级为精英

    // [v1.5.0 D21] Boss 战导弹保底供给计时（仅 bossActive 期间推进）
    this._bossSupplyTimer = 0
    this.bossSupplyCount = 0  // 本局保底供给已生成枚数（模拟器断言/遥测用，随 reset 清零）
  }

  // ==================== 生命周期 ====================

  /** 重置全部生成计时状态（Game.start / backToReady 时调用） */
  reset() {
    this._lastPipeCenter = null
    this._pipeDistance = 0    // [v1.3.0]
    this._monsterDistance = 0 // [v1.3.0]
    this.itemSpawnTimer = 0   // [v1.1.1]
    this.supplyLineTimer = 0  // [v1.4.0]
    this._eliteTimer = 0      // [v1.5.0] 精英 roll 计时（局内状态）
    this._elitePending = false // [v1.5.0]
    this._eliteCursor = 0
    this._eliteMisses = 0
    this._bossSupplyTimer = 0 // [v1.5.0 D21] Boss 战导弹保底供给
    this.bossSupplyCount = 0  // [v1.5.0 D21]
    // 注：_bossActive / _chapterMods 是跨局配置，不随局内重置清零（由 ChapterSystem 管理）
  }

  // ==================== [v1.5.0] 预留开关（仅接口，无章节逻辑） ====================

  /**
   * [v1.5.0] Boss 战开关：暂停管道/怪物的生成与距离累计（道具生成不受影响）。
   * 语义：暂停期间距离不累计，Boss 结束后从暂停点继续，不补偿性连发。
   * @param {boolean} active
   */
  setBossActive(active) {
    this._bossActive = !!active
    this._lastPipeCenter = null
    this._pipeDistance = 0
    // [v1.5.0 D21] 进战即供第一枚（计时器预置满，下个生成帧即生成——无卡输出链零启动延迟；
    // 火力流因此也快 ~1 发，已计入数值闭环口径），战斗结束清零、下一场同样即供
    this._bossSupplyTimer = active ? Config.BOSS.MISSILE_SUPPLY_INTERVAL_FRAMES : 0
  }

  /**
   * [v1.5.0] 章节修正参数注入点：章节系统可覆写生成距离/怪物上限等。
   * 传 null 恢复默认。仅支持白名单字段，未知字段忽略。
   * @param {Object|null} mods - { pipeDistanceScale, monsterSpawnDistanceScale, monsterMaxAlive }
   */
  setChapterModifiers(mods) {
    this._chapterMods = mods || null
  }

  // ==================== 每帧生成更新 ====================

  /**
   * 每帧生成决策主入口（Game.update 内调用，调用顺序与原四处散点完全一致：
   * 管道 → 怪物 → 随机道具计时 → 补给线保底，保证随机数消耗顺序不变）
   * @param {number} scrollSpeed - 当前滚动速度（px/帧）
   */
  update(scrollSpeed) {
    // [v1.3.0] 管道生成改为距离制：累计滚动距离达标才生成
    // 修复减速 bug：速度包/时间扭曲只影响移动速度，不再改变管道空间密度
    // [v1.5.0] bossActive：Boss 战期间暂停管道生成与距离累计
    if (!this._bossActive) {
      this._pipeDistance += scrollSpeed
      if (this._pipeDistance >= this.getSpawnDistance()) {  // [v1.2.2] N5 距离随时间收紧
        this.spawnPipe()
        this._pipeDistance = 0
      }

      // [v1.3.0] 怪物生成（45s 新手保护后，同样按滚动距离节奏）
      this.updateMonsterSpawn(scrollSpeed)

      // [v1.5.0] 精英怪 roll（§5.1）：45s 保护期后每 25s 一次，命中则下一只升级为精英；
      // 首次 roll 在 70s（SPAWN_DELAY+ELITE_ROLL_INTERVAL），此前不消耗随机数
      this.updateEliteRoll()
    }

    // [v1.1.1] 随机道具刷新（独立于管道通过；Boss 战期间照常，供补给）
    // [v1.5.0] 道具率加成（狩猎祝福/战利品陈列，stats.itemSpawnBonus，缺省 0 零变化）
    this.itemSpawnTimer++
    if (this.itemSpawnTimer >= Config.ITEM.RANDOM_SPAWN_INTERVAL) {
      const spawnChance = Config.ITEM.RANDOM_SPAWN_CHANCE + (this._deps.getStats().itemSpawnBonus || 0)
      if (Math.random() < spawnChance) {
        this.spawnRandomItem()
      }
      this.itemSpawnTimer = 0
    }

    // [v1.4.0] 补给线：保底道具计时（与随机生成独立）
    this.updateSupplyLine()

    // [v1.5.0 D21] Boss 战导弹保底供给（仅 bossActive 期间推进；零随机消耗——
    // 位置取小鸟同高，类型固定 missile，仅 Item 构造器脉冲相位消耗 1 次 Math.random）
    this.updateBossMissileSupply()
  }

  // ==================== 管道生成 ====================

  /**
   * [v1.3.0] 管道生成间隔改距离制：返回当前生成间隔（滚动像素）。
   * [v1.2.2] N5 ramp 同步改距离版：120s起从300px线性收紧，至300s达275px下限。
   * 与帧数制无关——减速期空间密度保持不变。
   * [v1.5.0] 章节注入点：pipeDistanceScale 按比例缩放最终间隔（默认不覆写）。
   * @returns {number} 当前生成间隔（px）
   */
  getSpawnDistance() {
    const P = Config.PIPE
    const gameTime = this._deps.getGameTime()
    let dist
    if (gameTime <= P.SPAWN_RAMP_START) {
      dist = P.SPAWN_DISTANCE
    } else {
      const t = Math.min(1, (gameTime - P.SPAWN_RAMP_START) / P.SPAWN_RAMP_TIME)
      dist = Math.round(P.SPAWN_DISTANCE + (P.SPAWN_DISTANCE_MIN - P.SPAWN_DISTANCE) * t)
    }
    // [v1.5.1] 前期减压：开局间隔 +EARLY_EASE_SPAWN_BONUS，90s 内线性回归 0（叠加制）
    const easeT = Config.GAME.EARLY_EASE_RAMP_TIME
    if (gameTime < easeT) {
      dist += Math.round(Config.GAME.EARLY_EASE_SPAWN_BONUS * (1 - gameTime / easeT))
    }
    // [v1.5.0] 章节覆写（预留）：仅在显式注入时生效，默认路径零变化
    if (this._chapterMods && this._chapterMods.pipeDistanceScale != null) {
      dist = Math.round(dist * this._chapterMods.pipeDistanceScale)
    }
    return dist
  }

  /**
   * 管道实体生成：间隙由 Game._getGapSize（难度曲线+能力修正）决定，
   * 本系统只决策生成位置（topHeight roll）并产出实体。
   */
  spawnPipe() {
    const stats = this._deps.getStats()
    // [v1.1.5] 管道以基础间隙生成，动画缩回至最终间隙(baseGap + gapBonus)
    const finalGap = this._deps.getGapSize()  // 含 gapBonus 的最终间隙
    const gapBonus = Math.min(stats.gapBonus || 0, Math.max(0, finalGap - 80))
    const baseGap = finalGap - gapBonus       // 不含 gapBonus 的基础间隙
    const groundY = this._deps.screenH - Config.GROUND.HEIGHT
    const minTop = Config.PIPE.MIN_TOP
    const minCenter = minTop + finalGap / 2
    const maxCenter = groundY - Config.PIPE.MIN_BOTTOM - finalGap / 2
    const P = Config.PIPE
    const t = Math.min(1, this._deps.getGameTime() / P.CENTER_STEP_RAMP)
    const step = P.CENTER_STEP_START + (P.CENTER_STEP_END - P.CENTER_STEP_START) * t
    const previous = this._lastPipeCenter == null ? this._deps.getBirdY() : this._lastPipeCenter
    const anchor = Math.max(minCenter, Math.min(maxCenter, previous))
    const low = Math.max(minCenter, anchor - step)
    const high = Math.min(maxCenter, anchor + step)
    const center = low + Math.random() * (high - low)
    this._lastPipeCenter = center
    // 缩小射线围绕同一中心展开，不把整个间隙向上偏移。
    const topHeight = center - baseGap / 2
    // 以基础间隙生成，shrinkBonus 驱动缩回动画
    const pipe = new Pipe(this._deps.screenW + 10, topHeight, baseGap, groundY)
    pipe.shrinkBonus = gapBonus
    this._deps.onSpawnPipe(pipe)
  }

  // ==================== [v1.3.0] 怪物生成 ====================

  /**
   * [v1.3.0] 怪物生成：45s 新手保护期后，按滚动距离节奏生成，同时最多 MAX_ALIVE 只
   * [v1.5.0] 章节注入点：monsterSpawnDistance（绝对值，优先）/ monsterSpawnDistanceScale /
   *           monsterMaxAlive / monsterHpMult / floaterTrackSpeed / batSineAmp 可覆写（默认不覆写）；
   *           _elitePending 时本只升级为精英（§5.1）
   * @param {number} scrollSpeed - 当前滚动速度
   */
  updateMonsterSpawn(scrollSpeed) {
    const M = Config.MONSTER
    if (this._deps.getGameTime() < M.SPAWN_DELAY) return
    const maxAlive = (this._chapterMods && this._chapterMods.monsterMaxAlive != null)
      ? this._chapterMods.monsterMaxAlive : M.MAX_ALIVE
    if (this._deps.getMonsterCount() >= maxAlive) return
    this._monsterDistance += scrollSpeed
    // [v1.5.0] 章节覆写：绝对距离优先（§4.4 表为绝对值 450/400/360/320），比例兜底
    let spawnDist = M.SPAWN_DISTANCE
    if (this._chapterMods) {
      if (this._chapterMods.monsterSpawnDistance != null) {
        spawnDist = this._chapterMods.monsterSpawnDistance
      } else if (this._chapterMods.monsterSpawnDistanceScale != null) {
        spawnDist = M.SPAWN_DISTANCE * this._chapterMods.monsterSpawnDistanceScale
      }
    }
    if (this._monsterDistance < spawnDist) return
    this._monsterDistance = 0

    const type = Math.random() < M.BAT_WEIGHT ? 'bat' : 'floater'
    const groundY = this._deps.screenH - Config.GROUND.HEIGHT
    const y = this.pickMonsterY()
    // [v1.5.0] 生成参数组装：章节修正（HP/追踪/振幅）+ 精英升级；默认路径 opts=null 零变化
    let opts = null
    if (this._chapterMods) {
      opts = {
        hpMult: this._chapterMods.monsterHpMult,
        trackSpeed: this._chapterMods.floaterTrackSpeed,
        sineAmp: this._chapterMods.batSineAmp
      }
    }
    if (this._elitePending && !(this._deps.getEliteCount && this._deps.getEliteCount())) {
      this._elitePending = false
      opts = opts || {}
      opts.elite = true
      const tier=this._chapterMods ? this._chapterMods.eliteTier || 0 : 0
      const kinds=tier>=2?['gunship','stormcaller','prism','gunship','stormcaller','bomber']:['gunship','stormcaller']
      opts.eliteKind=kinds[this._eliteCursor++ % kinds.length]
      opts.eliteTier=tier
      opts.eliteHp=this._chapterMods && this._chapterMods.eliteHp
      opts.screenW=this._deps.screenW
      opts.onHazard=this._deps.onHazard
      opts.getPipes=this._deps.getPipes
    }
    const anchor=this._deps.getPipes().slice().sort((a,b)=>b.x-a.x)[0]
    const spawnX=anchor && !(opts && opts.elite)?Math.max(this._deps.screenW+30,anchor.x+anchor.width+95):this._deps.screenW+30
    if(!(opts&&opts.elite))opts=Object.assign({},opts,{sineAmp:18})
    const Factory=opts&&opts.elite?EliteMonster:Monster
    const monster = new Factory(spawnX, y, type, groundY, opts)
    this._deps.onSpawnMonster(monster)
    if(monster.elite && !this._deps.hasItemType('missile')) {
      const supplyY=Math.max(150,Math.min(groundY-35,this._deps.getBirdY()))
      this._deps.onSpawnItem(new Item(this._deps.screenW*.6,supplyY,'missile'))
    }
    Logger.info('Monster', '生成怪物', {
      type: type, x: monster.x, y: monster.y, gameTime: this._deps.getGameTime(),
      elite: monster.elite, hp: monster.hp
    })
  }

  /**
   * [v1.5.0] 精英怪 roll（§5.1）：45s 保护期（与怪物 SPAWN_DELAY 相同）后每 25s roll 一次，
   * 命中（25%，章节可覆写）则把下一只怪物升级为精英。
   * 计时暂停语义与怪物生成一致：Boss 战期间（bossActive）不累计（调用点在 bossActive 块内）。
   */
  updateEliteRoll() {
    const M = Config.MONSTER
    if (this._deps.getGameTime() < M.SPAWN_DELAY) return
    this._eliteTimer++
    if (this._eliteTimer < M.ELITE_ROLL_INTERVAL) return
    this._eliteTimer = 0
    const chance = (this._chapterMods && this._chapterMods.eliteChance != null)
      ? this._chapterMods.eliteChance : M.ELITE_CHANCE
    if (Math.random() < chance || ++this._eliteMisses >= 2) {
      this._eliteMisses=0
      this._elitePending = true
      Logger.info('Monster', '精英预警：下一只怪物升级为精英', { gameTime: this._deps.getGameTime(), chance: chance })
    }
  }

  /** 管道出口附近的高度；与 spawnX 的95px间隔配套，不直接堵在管道内。 */
  pickMonsterY() {
    const groundY=this._deps.screenH-Config.GROUND.HEIGHT
    const pipe=this._deps.getPipes().slice().sort((a,b)=>b.x-a.x)[0]
    if(pipe) {
      const side=Math.random()<.5?-1:1
      return Math.max(150,Math.min(groundY-40,pipe.topHeight+pipe.gap/2+side*Math.min(45,pipe.gap*.2)))
    }
    return Math.max(150,Math.min(groundY-40,this._deps.getBirdY()+ (Math.random()<.5?-55:55)))
  }

  // ==================== 道具生成 ====================

  /** [v1.1.1] 随机道具生成（不依赖管道通过）：位置 roll + 类型 roll */
  spawnRandomItem() {
    const groundY = this._deps.screenH - Config.GROUND.HEIGHT
    const minY = Config.PIPE.MIN_TOP + 30
    const maxY = groundY - 30
    const itemY = minY + Math.random() * (maxY - minY)
    const itemX = this._deps.screenW + 20
    const itemType = this.rollItemType()
    this._deps.onSpawnItem(new Item(itemX, itemY, itemType))
  }

  /**
   * [v1.1.0] 过管道具掉落决策（25% 概率，小鸟前方生成）
   * 原 _onPipePass 内联块，随机数消耗顺序不变：chance → x 偏移 → y → 类型
   * [v1.5.0] 道具率加成（狩猎祝福 +8pp/层、战利品陈列 +5pp/级/Boss，经 stats.itemSpawnBonus 注入；
   * 缺省 0 零变化，随机消耗数不变——概率 roll 恒为 1 次）
   */
  maybeSpawnItemOnPipePass() {
    // [v1.1.0] 生成道具 [v1.1.3] 修复：在小鸟前方生成（右侧），不在后方（管道位置）
    const stats = this._deps.getStats()
    const chance = Config.ITEM.SPAWN_CHANCE + (stats.itemSpawnBonus || 0)
    if (Math.random() < chance) {
      const itemX = this._deps.screenW + 20 + Math.random() * 40  // [v1.1.3] 前方生成
      const groundY = this._deps.screenH - Config.GROUND.HEIGHT
      const minY = Config.PIPE.MIN_TOP + 30
      const maxY = groundY - 30
      const itemY = minY + Math.random() * (maxY - minY)
      const itemType = this.rollItemType()
      this._deps.onSpawnItem(new Item(itemX, itemY, itemType))
    }
  }

  /**
   * [v1.1.0] 道具类型权重随机
   * [v1.5.0] weightMults：按类型加权（精英必掉的导弹权重×2，§5.1）；缺省零变化
   * [v1.5.0] §4.7 Boss 战期间导弹权重上调 20/125→40/145（=missile×2，与调用方加权叠乘，
   *          如精英必掉期 ×2→×4）；bossActive=false 默认路径零变化
   * @param {Object} [weightMults] - { 类型: 倍率 }
   */
  rollItemType(weightMults) {
    const weights = Config.ITEM.TYPE_WEIGHTS
    const types = Object.keys(weights)
    const bossMult = this._bossActive ? Config.BOSS.ITEM_MISSILE_WEIGHT_MULT : 1
    const multOf = (t) => ((weightMults && weightMults[t]) || 1) * (t === 'missile' ? bossMult : 1)
    let total = 0
    for (const t of types) total += weights[t] * multOf(t)

    let r = Math.random() * total
    for (const t of types) {
      r -= weights[t] * multOf(t)
      if (r <= 0) return t
    }
    return types[0]
  }

  /**
   * [v1.5.0] 精英怪必掉（§5.1）：在怪物被击杀位置掉落 1 个随机道具（导弹权重×2）。
   * 与拾荒者掉落独立（可叠加）；由 Game._onMonsterKilled 的 elite 分支调用。
   * @param {number} x - 掉落位置X（怪物中心）
   * @param {number} y - 掉落位置Y（怪物中心）
   */
  spawnEliteDrop(x, y) {
    const itemType = this.rollItemType({ missile: Config.MONSTER.ELITE_MISSILE_WEIGHT_MULT })
    this._deps.onSpawnItem(new Item(x, y, itemType))
    Logger.info('Item', '精英怪必掉道具', { type: itemType, x: Math.round(x), y: Math.round(y) })
  }

  /**
   * [v1.4.0] 补给线（supply_line）：每 (75-15*(lv-1))s 保底生成 1 个随机道具
   * 保底计时与随机生成（itemSpawnTimer / 过管25%）完全独立；
   * 权重沿用 rollItemType（TYPE_WEIGHTS，不含导弹倾斜），防"保底导弹流"变最优解
   */
  updateSupplyLine() {
    const lv = this._deps.getOwnedLevel('supply_line')
    if (lv <= 0) return
    this.supplyLineTimer++
    const interval = (Config.ITEM.SUPPLY_LINE_BASE_SEC -
      Config.ITEM.SUPPLY_LINE_REDUCTION_SEC * (lv - 1)) * 60
    if (this.supplyLineTimer >= interval) {
      this.supplyLineTimer = 0
      this.spawnRandomItem()
      Logger.info('Item', '补给线保底道具', { lv: lv, intervalSec: interval / 60 })
    }
  }

  /**
   * [v1.5.0 D21] Boss 战导弹保底供给：战斗期间每 MISSILE_SUPPLY_INTERVAL_FRAMES 检查一次，
   * 场上无导弹道具则在玩家前方（与小鸟同高，右屏缘外 20px）生成 1 枚导弹道具。
   * 与随机生成/补给线完全独立；场上已有导弹道具则保持就绪，拾取后补发（不囤积）。
   * 依据：§4.9"无卡玩家能赢"的可达成化——无卡对 Boss 唯一伤害源是道具导弹，
   * 随机供给约 1 枚/48s 与 30HP 差 2 个数量级（D20）；保底节拍把无卡输出链确定性化。
   */
  updateBossMissileSupply() {
    if (!this._bossActive) return
    this._bossSupplyTimer++
    if (this._bossSupplyTimer < Config.BOSS.MISSILE_SUPPLY_INTERVAL_FRAMES) return
    this._bossSupplyTimer = 0
    // 场上只保留一枚；已有道具时保持就绪，拾取后立即补给，不再空等整个周期。
    if (this._deps.hasItemType('missile')) { this._bossSupplyTimer=Config.BOSS.MISSILE_SUPPLY_INTERVAL_FRAMES; return }
    const groundY = this._deps.screenH - Config.GROUND.HEIGHT
    const minY = Config.PIPE.MIN_TOP + 30
    const maxY = groundY - 30
    // 与小鸟同高生成（磁吸+滚动收敛≈必拾取）；钳制进合法 y 区间
    const itemY = Math.max(minY, Math.min(maxY, this._deps.getBirdY()))
    this._deps.onSpawnItem(new Item(this._deps.screenW + 20, itemY, 'missile'))
    this.bossSupplyCount++
    Logger.info('Item', 'Boss 战保底导弹供给', { y: Math.round(itemY), count: this.bossSupplyCount })
  }
}

module.exports = SpawnSystem
