const Storage=require('../../utils/Storage')
const Random=require('./Random')
const Art=require('../art/GameArt')
const BuildSystem=require('../systems/BuildSystem')
const Rules=require('../config/BuildConfig')
const FX=require('../art/Effects')
/**
 * Game.js - 游戏主类 [v1.2.0]
 *
 * 职责：游戏主循环、状态机管理、实体协调、碰撞检测、渲染调度。
 * 集成经验系统、能力系统、经验球、道具系统、HP血条、擦边判定。
 * [v1.1.0] 新增：HP系统、道具系统、安全区适配、结算界面重设计、二段跳。
 * [v1.1.1] 优化：HUD重构(HP/等级/经验条独立显示)、能力视觉特效、随机道具刷新、结算双按钮。
 * [v1.1.2] 优化：系统日志(GameLogger)、弹力护甲平衡修复(有限次数+弹开不传送)、连击之心平衡修复。
 * [v1.1.3] 优化：经验球改为直接获取+文字提示、经验日志、道具前方生成、稀有度概率系统。
 * [v1.1.4] 优化：经验系统统一化(管道经验5→10,删除经验球经验,经验共鸣全经验生效)、浮动文字堆叠渐隐、擦边特效增强(多环+粒子+闪光)、道具图标视觉区分。
 * [v1.1.5] 优化：统一护盾系统(层数机制+视觉区分+弹力护甲改造为弹力护盾)、擦边触发优化(每帧检查+距离25px)、缩小射线间隙增大+管道缩回动画。
 * [v1.2.0] 新增：环境系统(风/雨/冰雹)、6个环境相关能力、凤凰复活动画、动画特效增强。
 * [v1.2.1] 修复：第二段难度缓坡、升级面板6卡两行排布、rAF双缺失setTimeout兜底、天气18s起+教学提示。
 * [v1.2.2] 修复：无敌期不累计combo+护盾消耗断连击(N1)、瞬移优先于时间扭曲(N4)、管道间隔ramp(N5)、
 *           升级面板跳过按钮(N6)、自愈/护盾/二段跳/风暴之子内联特效(N7)、磁吸锁定吸附(B1)、升级保护双保险(B2)。
 * [v1.2.3] 热修复：B2 延迟弹板安全区判定修复（P0：升级弹窗卡死不出现）+ 90帧保底超时强制弹板；
 *           移除 N6 跳过按钮（用户要求）。
 * [v1.3.0] 新增：怪物系统（蝙蝠怪/浮游怪，Obstacle 基类扩展+HP/受击接口）、导弹道具（弱追踪，
 *           怪物优先，可炸毁管道）；修复：管道生成从帧数制改为滚动距离制（减速期密度不变）。
 * [v1.4.0] 能力扩展包批次1（13卡：common×6+uncommon×7）：求生本能(HP=1补盾)、锐利目光(擦边缩碰撞箱)、
 *           拾荒者(击杀掉道具)、补给线(保底道具独立计时)、连击种子(断连保留带硬刹车)、管感(下一管高亮)、
 *           导弹挂架(MAX_ALIVE=3+lv挂钩+扇形多发)、铁喙(无敌帧反杀怪物/Boss免疫预留)、经验银行(溢出存取+
 *           10s生息+HUD小金库)、定风珠(天气过渡期debuff免疫)、镜面护盾(破盾冲击波3s刹车)、
 *           经验潮汐(天气期经验+25%/级)、羽舞(二段跳后擦边窗口+金色尾迹)。
 *           §2.6 受击链按表插入：铁喙(最前置,仅怪物)→护盾消耗(镜面冲击波)→HP扣减→求生本能补盾→凤凰。
 * [v1.4.0] 能力扩展包批次2（14卡：rare×8+epic×6）：火力覆盖(定时自动导弹,独立枪口闪光)、
 *           超载神盾(CD缩短+Lv3溢出转临时HP,HUD空心心形)、猎手标记(导弹加伤+连锁爆炸不二次连锁)、
 *           回响之翼(过管攒羽盾,受击链最前置,HUD羽毛图标)、风暴之眼(并发≥2生效)、蜂群链路(1.5s窗+1叠层硬顶)、
 *           铁羽(羽盾上限+1全局硬顶2层+破盾无敌,无回响灰显)、先知(⭐/🔗/⚠️标注)、
 *           导弹风暴(拾取改连发,刷新不叠加,同屏硬刹车)、风暴驯化(驯化天气+互斥标记)、
 *           血契(maxHp-1换增益,狂暴减半写死)、幻影舞步(90帧黄金窗只刷新不叠加+金色残影)、
 *           顿悟(200%双升每局限3)、时之晶(寄生时间扭曲冻结怪物)。
 *           §2.6 受击链批次2全量：羽盾(最前置)→弹力护盾→护盾层(镜面冲击波)→[冰雹特有:冰晶转化,D8]→
 *           超载溢出临时HP→HP扣减(血契修正)→求生本能→凤凰。
 *           旧卡质变：连击之心Lv3(无敌期过管+5exp)/缩小射线Lv5(间隙封顶+擦边窗口+10)/幸运光环Lv3(面板必含稀有+)。
 * [v1.5.0] 重构：生成决策（管道/道具/怪物的时机、位置、类型roll、保底计时）拆出至 systems/SpawnSystem.js，
 *           本类只保留"把生成结果放进数组"的接线（onSpawn* 回调）；行为逐帧等价，随机数消耗顺序不变。
 * [v1.5.0] 步骤B：章节系统核心（systems/ChapterSystem.js）——章内过管计数（40管/150s兜底触发点占位：
 *           记日志+浮动文字"Boss 逼近！"，Boss 本体步骤 C 接入）、转场演出（白闪→色带擦除→标题卡→60帧无敌，
 *           冻结语义同 UPGRADING）、§4.4 难度修正叠加（_getScrollSpeed/_getGapSize 注入点+SpawnSystem 生成参数，
 *           Ch1 全零修正零变化）、§4.2 章节视觉（背景/地面按 CHAPTERS 参数，Ch2 沙漠几何体元素，
 *           存量管道换色 30 帧 lerp）、HUD 章节进度（"Ch1 · 12/40"，≥35/40 脉冲）；
 *           精英怪（§5.1：金边/体型×1.3/HP×3/经验×5/必掉道具导弹权重×2，生成 roll 在 SpawnSystem）。
 * 框架无关——只依赖 Canvas 2D API，不直接调用微信SDK。
 */

const Config = require('../config/GameConfig.js')
const Bird = require('../entities/Bird.js')
// [v1.5.0] Pipe/Monster/Item 实体构造已随生成决策迁入 systems/SpawnSystem.js；
// Monster 在 Boss 召唤物（§4.8 P2 召唤走 Monster 工厂）处仍需直接构造
const Monster = require('../entities/Monster.js')
const Missile = require('../entities/Missile.js')   // [v1.3.0]
const Boss = require('../entities/Boss.js')         // [v1.5.0] 关底 Boss（Obstacle 子类，变体参数化）
const Feather = require('../entities/Feather.js')   // [v1.5.0] Boss 羽刃弹幕（Hailstone 改水平）
const Orb = require('../entities/Orb.js')
const CombatSystem = require('../systems/CombatSystem.js')
const SandWall = require('../entities/SandWall.js')
const ExpSystem = require('../systems/ExpSystem.js')
const AbilitySystem = require('../systems/AbilitySystem.js')
const WeatherSystem = require('../systems/WeatherSystem.js')
const SpawnSystem = require('../systems/SpawnSystem.js')   // [v1.5.0] 生成系统（管道/道具/怪物）
const ChapterSystem = require('../systems/ChapterSystem.js') // [v1.5.0] 章节系统（进度/转场/Boss流程/难度修正/视觉参数）
const AbilityRegistry = require('../abilities/AbilityRegistry.js')  // [v1.5.0] 大礼包自选面板 roll
const Logger = require('../systems/GameLogger.js')

class Game {
  /**
   * @param {Object} canvas - Canvas 节点
   * @param {CanvasRenderingContext2D} ctx - 2D 渲染上下文
   * @param {number} screenW - 逻辑屏幕宽度
   * @param {number} screenH - 逻辑屏幕高度
   * @param {Object} [safeArea] - 安全区 {top, bottom, left, right}
   */
  constructor(canvas, ctx, screenW, screenH, safeArea) {
    Art.init()
    this.canvas = canvas
    this.ctx = ctx
    this.screenW = screenW
    this.screenH = screenH

    // [v1.1.0] 安全区适配
    // safeArea.top/bottom 是 Y 坐标（从屏幕顶部算起）
    this.safeTop = (safeArea && safeArea.top != null) ? safeArea.top : Config.GAME.SAFE_AREA_TOP
    this.safeBottom = (safeArea && safeArea.bottom != null) ?
      safeArea.bottom : this.screenH - Config.GAME.SAFE_AREA_BOTTOM

    // 游戏状态
    this.state = Config.GAME.STATE.READY
    this.score = 0
    this._scoreRemainder = 0
    this.bestScore = 0

    // 实体
    this.bird = null
    this.pipes = []
    this.monsters = []            // [v1.3.0] 怪物列表（与 pipes 平行数组）
    this.missiles = []            // [v1.3.0] 导弹列表
    this.orbs = []
    this.items = []               // [v1.1.0] 道具列表
    this.clouds = []
    this.nearMissEffects = []
    this.floatingTexts = []       // [v1.1.0] 浮动文字（道具拾取提示）
    this.abilityEffects = []      // [v1.2.2] N7 能力内联特效粒子（自愈十字/护盾环/二段跳尾迹） [v1.3.0] 复用作爆炸粒子

    // 系统
    this.expSystem = new ExpSystem()
    this.abilitySystem = new AbilitySystem()
    this.build = new BuildSystem(this)
    this.weatherSystem = new WeatherSystem()   // [v1.2.0] 环境系统

    // [v1.5.0] 生成系统：管道/道具/怪物的生成决策（时机/位置/类型roll/保底计时）。
    // Game 只保留"把生成结果放进数组"的接线（onSpawn* 回调）。
    // 状态 _distanceSinceSpawn/_monsterDistance/itemSpawnTimer/supplyLineTimer 已迁入 SpawnSystem。
    const self = this
    this.spawnSystem = new SpawnSystem({
      screenW: this.screenW,
      screenH: this.screenH,
      getGameTime: function () { return self.gameTime },
      getStats: function () { return self.abilitySystem.getStats() },
      getGapSize: function () { return self._getGapSize() },
      getOwnedLevel: function (id) { return self.abilitySystem.owned.get(id) || 0 },
      getPipes: function () { return self.pipes },
      getMonsterCount: function () { return self.monsters.length },
      getEliteCount: function () { return self.monsters.filter(m=>m.elite&&m.hp>0).length },
      onHazard: function (h) { if(self.feathers.length<96)self.feathers.push(h) },
      // [v1.5.0 D21] Boss 战导弹保底供给：小鸟同高生成 + 场上查重
      getBirdY: function () { return self.bird.y },
      hasItemType: function (type) {
        for (const it of self.items) { if (it.type === type) return true }
        return false
      },
      onSpawnPipe: function (pipe) {
        // [v1.5.0] 章节换色（§4.2）：新管直接给当前章色（Ch1 返回 null=默认色，零变化）
        const cs = self.chapterSystem ? self.chapterSystem.getPipeColorSet() : null
        if (cs) pipe.setColorSet(cs)
        self.pipes.push(pipe)
      },
      onSpawnMonster: function (monster) {
        self.monsters.push(monster)
        if(monster.elite)self._addFloatingText(self.screenW/2,190,monster.name+' · '+monster.hint,'#ffdc87',100)
      },
      onSpawnItem: function (item) { self.items.push(item) }
    })

    // [v1.5.0] 章节系统（步骤 B：进度计数/转场演出/难度修正注入/视觉参数出口；
    // 步骤 C：Boss 全流程——出场演出 deps.spawnBoss、天气冻结、章节进/出钩子）。
    // 依赖全部经回调注入，ChapterSystem 不反查 Game 内部状态；默认 Ch1 全零修正、零随机消耗。
    this.chapterSystem = new ChapterSystem({
      screenW: this.screenW,
      screenH: this.screenH,
      getGameTime: function () { return self.gameTime },
      addFloatingText: function (x, y, text, color, life) { self._addFloatingText(x, y, text, color, life) },
      setSpawnMods: function (mods) { self.spawnSystem.setChapterModifiers(mods) },
      setBossActive: function (active) { self.spawnSystem.setBossActive(active) },
      grantInvincible: function (frames) {
        // §4.3 转场收尾：60 帧无敌恢复飞行（语义同 B2-② 恢复保护）
        self.abilitySystem.invincibleFrames = Math.max(self.abilitySystem.invincibleFrames, frames)
        self.bird.invincibleBlink = Math.max(self.bird.invincibleBlink, 30)
      },
      // [v1.5.0 步骤C] §4.7 Boss 战天气计时冻结（生效中天气保持当前强度）
      setWeatherFrozen: function (f) { self.weatherSystem.setFrozen(f) },
      // [v1.5.0 步骤C] 出场演出 enter 阶段：创建 Boss 实体（右侧飞入）
      spawnBoss: function () { self._spawnBoss() },
      // [v1.5.0 步骤C] 本章终结钩子（回响消散）与进新章钩子（旅者/回响/章节之主）
      onChapterEnd: function () { self._onChapterEnd() },
      onChapterEnter: function (toIndex) { self._onChapterEnter(toIndex) },
      onEndlessEnter: function () {
        const ab=self.abilitySystem
        ab.healHP(ab.maxHp);ab.addShieldLayer(ab.maxShieldLayers)
        ab.blessingTempHpCapBonus+=3;ab.grantTempHp(3)
        self._addFloatingText(self.screenW/2,self.screenH*.42,'通关补给 · 回满生命/护盾 · 临时HP+3','#caffbd',180)
      }
    })

    // [v1.5.0 步骤C] Boss 战状态
    this.boss = null               // Boss 实体（出场演出 enter 阶段创建，死亡演出后/离场出屏后清空）
    this.combat = new CombatSystem(this)
    this.feathers = []             // Boss 羽刃弹幕列表
    this._bossVictoryProtectionFrames = 0
    this._bossDyingFrames = 0      // 死亡演出慢动作剩余帧（§4.11：30 帧 0.5×，复用速度包）
    this._bossRewardPending = false // 大礼包结算中（面板链：自选卡→祝福→经验升级→转场）
    this._mechanicEventsSeen=0
    this.bossFightFrames = 0
    this._bossTimeAccumulator = 0
    this._bossClearMode = null
    this.bossClears = []
    this.bossBadges = []           // 本局已击败 Boss 徽章（章节 id，结算界面徽章行）
    this._panelMode = 'levelup'    // 面板模式：'levelup' | 'bossCard'（大礼包自选）| 'blessing'（祝福三选一）
    this._echoBoost = null         // R9 章节回响：{ id, from, to }（本章临时等级，章末按增量还原）

    // 计时器
    this.gameTime = 0
    this.frameCount = 0
    this.survivalTimer = 0
    this.pipesPassed = 0          // [v1.1.0] 通过管道计数

    // 地面滚动偏移
    this.groundOffset = 0

    // 屏幕震动
    this.shakeFrames = 0
    this.shakeIntensity = 0

    // [v1.1.0] 受击红屏
    this.damageFlash = 0

    // [v1.2.0] 凤凰复活动画状态
    this.phoenixAnim = null     // null | { phase: 'pause'|'revive', timer: N, maxTimer: N }

    // [v1.2.1] 教学提示标记（每局只提示一次）
    this._shieldHintShown = false  // "护盾可挡1次碰撞"
    this._ironBeakHintShown = false // [v1.4.0] 铁喙"无敌中，撞怪反击！"

    // [v1.4.0] 怪物击杀计数（§6.3 火力流击杀指标统计用）
    this.monsterKills = 0

    // [v1.4.0] 天气活跃状态跟踪（经验潮汐"潮汐退去"提示用）
    this._prevWeatherActive = false

    // [v1.2.0] 环境属性修饰器（每帧由WeatherSystem更新）
    this._weatherGravityBonus = 0
    this._weatherWindScroll = 0

    // 回调
    this.onScoreChange = null
    this.onGameOver = null
    this.onReady = null
    this.onExpChange = null
    this.onLevelUp = null

    // 动画
    this.rafId = null
    this.running = false

    // 升级选项缓存
    this._currentChoices = null
    // [v1.2.3] B2-③ 延迟弹板计时（帧）：pendingLevelUps>0 且未进安全区时累计，超 MAX_DELAY_FRAMES 强制弹板
    this._upgradeDelayFrames = 0

    this._init()
  }

  // ==================== 初始化 ====================

  _init() {
    const birdX = this.screenW * Config.BIRD.X_RATIO
    const birdY = this.screenH * 0.45
    this.bird = new Bird(birdX, birdY)
    this._initClouds()
  }

  _initClouds() {
    this.clouds = []
    for (let i = 0; i < Config.CLOUD.COUNT; i++) {
      this.clouds.push(this._createCloud(Math.random() * this.screenW))
    }
  }

  _createCloud(x) {
    const { CLOUD } = Config
    return {
      x: x,
      y: CLOUD.MIN_Y + Math.random() * (this.screenH * CLOUD.MAX_Y_RATIO - CLOUD.MIN_Y),
      size: CLOUD.MIN_SIZE + Math.random() * (CLOUD.MAX_SIZE - CLOUD.MIN_SIZE),
      speed: CLOUD.MIN_SPEED + Math.random() * (CLOUD.MAX_SPEED - CLOUD.MIN_SPEED)
    }
  }

  // ==================== 游戏控制 ====================

  start(restoring=false) {
    Logger.info('Game', '游戏开始', { screenW: this.screenW, screenH: this.screenH })
    Random.seed(Date.now());if(!restoring)Storage.clearRun()
    this._lastTick=null;this._clockAccumulator=0
    this.state = Config.GAME.STATE.PLAYING
    this.score = 0
    this._scoreRemainder = 0
    this.gameTime = 0
    this.spawnSystem.reset()      // [v1.5.0] 生成计时状态（管道/怪物距离、道具/补给线计时器）统一由 SpawnSystem 重置
    this.frameCount = 0
    this.survivalTimer = 0
    this.pipesPassed = 0
    this.pipes = []
    this.monsters = []            // [v1.3.0]
    this.missiles = []            // [v1.3.0]
    this.orbs = []
    this.items = []
    this.nearMissEffects = []
    this.floatingTexts = []
    this.abilityEffects = []      // [v1.2.2] N7
    this._upgradeDelayFrames = 0  // [v1.2.3] B2-③ 重开时清零延迟计时，防状态泄漏
    this.shakeFrames = 0
    this.damageFlash = 0
    this.phoenixAnim = null       // [v1.2.0] 重置凤凰动画
    this._shieldHintShown = false // [v1.2.1] 重置教学提示
    this._ironBeakHintShown = false // [v1.4.0] 重置铁喙教学提示
    this._prevWeatherActive = false // [v1.4.0] 经验潮汐提示跟踪
    this.monsterKills = 0         // [v1.4.0] 怪物击杀计数
    // [v1.5.0 步骤C] Boss 战状态清零
    this.boss = null
    this.combat = new CombatSystem(this)
    this.feathers = []
    this._bossVictoryProtectionFrames = 0
    this._bossDyingFrames = 0
    this._bossRewardPending = false
    this._mechanicEventsSeen=0
    this.bossFightFrames = 0
    this._bossClearMode = null
    this.bossClears = []
    this.bossBadges = []
    this._panelMode = 'levelup'
    this._echoBoost = null

    this.expSystem.reset()
    this.abilitySystem.reset()
    this.build.reset()
    this._nextChoiceAt=0;this._trainingSpawned=false;this._trainingRewarded=false;this.victory=false
    this._lastDamage=null;this.timings={flight:0,boss:0,reading:0,performance:0,pause:0,endless:0}
    this.weatherSystem.reset()    // [v1.2.0] 环境系统重置
    this.chapterSystem.reset()    // [v1.5.0] 章节系统重置（回 Ch1，生成修正清零）

    const birdX = this.screenW * Config.BIRD.X_RATIO
    const birdY = this.screenH * 0.45
    this.bird.reset(birdX, birdY)

    this.abilitySystem.selectAbility('feather_blade')
    if (this.onScoreChange) this.onScoreChange(this.score)
    if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())
  }

  flap() {
    if (this.state === Config.GAME.STATE.PLAYING) {
      this.bird.flap()
      // [v1.2.0] 通知环境系统拍翅事件（雨效果甩水）
      this.weatherSystem.onFlap()
    } else if (this.state === Config.GAME.STATE.READY) {
      this.start()
      this.bird.flap()
    }
  }

  restart() {
    this.start()
  }

  backToReady() {
    Logger.info('Game', '返回首页')
    this.state = Config.GAME.STATE.READY
    this.score = 0
    this._scoreRemainder = 0
    this.pipes = []
    this.monsters = []            // [v1.3.0]
    this.missiles = []            // [v1.3.0]
    this.spawnSystem.reset()      // [v1.5.0] 生成计时状态统一由 SpawnSystem 重置
    this.orbs = []
    this.items = []
    this.nearMissEffects = []
    this.floatingTexts = []
    this.abilityEffects = []      // [v1.2.2] N7
    this._upgradeDelayFrames = 0  // [v1.2.3] B2-③ 重开时清零延迟计时，防状态泄漏
    this.shakeFrames = 0
    this.damageFlash = 0
    this.phoenixAnim = null       // [v1.2.0] 重置凤凰动画
    this._shieldHintShown = false // [v1.2.1] 重置教学提示
    this._ironBeakHintShown = false // [v1.4.0]
    this._prevWeatherActive = false // [v1.4.0] 经验潮汐提示跟踪
    this.monsterKills = 0         // [v1.4.0] 怪物击杀计数
    // [v1.5.0 步骤C] Boss 战状态清零
    this.boss = null
    this.combat = new CombatSystem(this)
    this.feathers = []
    this._bossVictoryProtectionFrames = 0
    this._bossDyingFrames = 0
    this._bossRewardPending = false
    this._mechanicEventsSeen=0
    this.bossFightFrames = 0
    this._bossClearMode = null
    this.bossClears = []
    this.bossBadges = []
    this._panelMode = 'levelup'
    this._echoBoost = null

    this.expSystem.reset()
    this.abilitySystem.reset()
    this.build.reset()
    this._nextChoiceAt=0;this._trainingSpawned=false;this._trainingRewarded=false;this.victory=false
    this._lastDamage=null;this.timings={flight:0,boss:0,reading:0,performance:0,pause:0,endless:0}
    this.weatherSystem.reset()    // [v1.2.0] 环境系统重置
    this.chapterSystem.reset()    // [v1.5.0] 章节系统重置（回 Ch1）

    const birdX = this.screenW * Config.BIRD.X_RATIO
    const birdY = this.screenH * 0.45
    this.bird.reset(birdX, birdY)

    if (this.onReady) this.onReady()
    if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())
  }

  // ==================== 升级流程 ====================

  // ==================== 主循环 ====================

  /**
   * [v1.4.0] 风暴驯化（chaos_dice）：获得时驯化当前天气；无天气活跃则置 tamedPending 等下一种
   * 并发时取最早触发的效果（activeEffects[0]，确定性，不用随机——保留史诗命运感但不引入额外随机源）
   */
  _applyChaosDiceTaming() {
    const ws = this.weatherSystem
    if (ws.tamedWeather) return  // maxLevel=1，理论不会二次获得，防御
    if (ws.activeEffects.length > 0) {
      ws.tamedWeather = ws.activeEffects[0].type
      const tamedNames = { wind: '风', rain: '雨', hail: '冰雹' }
      this._addFloatingText(this.screenW / 2, this.screenH * 0.3,
        `风暴驯化：${tamedNames[ws.tamedWeather] || ws.tamedWeather}!`, '#7fff7f', 90)
      Logger.info('Weather', '风暴驯化生效', { type: ws.tamedWeather })
    } else {
      ws.tamedPending = true
      this._addFloatingText(this.screenW / 2, this.screenH * 0.3, '风暴驯化：等待下一种天气…', '#7fff7f', 90)
      Logger.info('Weather', '风暴驯化挂起（当前无天气）')
    }
  }

  loop() {
    if (this.running) return
    this.running = true
    this._tick()
  }

  _tick() {
    if (!this.running) return
    try {
      this.advanceClock(Date.now())
      this.render()
    } catch (e) {
      console.error('[Game] 游戏循环异常:', e)
      Logger.error('Game', '游戏循环异常', { msg: e.message, stack: e.stack })
    }
    if (typeof this.canvas.requestAnimationFrame === 'function') {
      this.rafId = this.canvas.requestAnimationFrame(() => this._tick())
    } else if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(() => this._tick())
    } else {
      // [v1.2.1] rAF双缺失兜底：setTimeout(~60fps)维持循环，避免静默终止
      if (!this._rafFallbackWarned) {
        this._rafFallbackWarned = true
        Logger.warn('Game', 'requestAnimationFrame不可用，改用setTimeout(16ms)兜底')
      }
      this.rafId = setTimeout(() => this._tick(), 16)
    }
  }

  destroy() {
    this.running = false
    if (this.rafId) {
      if (typeof this.canvas.cancelAnimationFrame === 'function') {
        this.canvas.cancelAnimationFrame(this.rafId)
      } else if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.rafId)
      } else {
        clearTimeout(this.rafId)  // [v1.2.1] 兜底计时器清理
      }
      this.rafId = null
    }
  }

  // ==================== 更新逻辑 ====================

  update() {
    if(this._suspended)return
    this._countTime()
    this.frameCount++
    Logger.setFrame(this.frameCount)  // [v1.1.2] 更新日志帧计数

    if (this.shakeFrames > 0) this.shakeFrames--
    if (this.damageFlash > 0) this.damageFlash--

    this._updateNearMissEffects()
    this._updateFloatingTexts()   // [v1.1.0] 浮动文字
    this._updateAbilityEffects()  // [v1.2.2] N7 能力内联特效

    // [v1.2.0] 凤凰复活动画更新
    if (this.phoenixAnim) {
      this._updatePhoenixAnim()
      return  // 动画期间暂停其他更新
    }

    if (this.state === Config.GAME.STATE.GAME_OVER) return
    if (this.state === Config.GAME.STATE.UPGRADING) return

    // [v1.5.0] 章节转场（§4.3）：UPGRADING 同款暂停语义——世界冻结
    // （gameTime/实体/生成/碰撞全停），只推进转场计时与存量管道换色 lerp
    if (this.chapterSystem.isTransitioning()) {
      this.chapterSystem.updateTransition()
      this._applyChapterPipeColors()  // 换色 lerp 在冻结期照常推进（30 帧播完）
      return
    }

    // [v1.5.0 步骤C] Boss 出场演出（§4.11：暗角收拢30→雷云聚集60→飞入60）：
    // 同款世界冻结；enter 阶段 Boss 实体飞入动画在冻结期推进（纯演出，无碰撞判定）
    if (this.chapterSystem.isBossIntro()) {
      this.chapterSystem.updateBossIntro()
      this._applyChapterPipeColors()
      if (this.boss) this.boss.update(this.bird)
      return
    }

    this._updateClouds()
    this.groundOffset = (this.groundOffset + Config.GAME.SCROLL_SPEED) % Config.GROUND.SCROLL_TILE

    if (this.state === Config.GAME.STATE.READY) {
      this.bird.updateHover(this.frameCount)
      return
    }

    if (this.state !== Config.GAME.STATE.PLAYING) return

    if (this._bossVictoryProtectionFrames > 0) this._bossVictoryProtectionFrames--
    this.gameTime++
    if(this._teleportGrace>0)this._teleportGrace--;this.bird.teleportGrace=this._teleportGrace||0
    this._updateTraining()

    // [v1.2.0] 环境属性修饰器重置
    this._weatherGravityBonus = 0
    this._weatherWindScroll = 0

    // [v1.2.0] 环境系统更新
    const gameCtx = this._buildGameCtx()
    this.weatherSystem.setElitePressure(this.monsters.some(m=>m.hp>0&&m.eliteKind==='stormcaller'&&m.age>90&&!m.retreating))
    this.weatherSystem.update(this.gameTime, gameCtx)

    // [v1.2.0] 环境系统可能触发游戏结束或凤凰复活，需检查状态
    if (this.state !== Config.GAME.STATE.PLAYING || this.phoenixAnim) return

    // 读取环境系统输出的属性修饰
    this.bird.windForce = gameCtx.verticalWindForce
    this._weatherGravityBonus = gameCtx.gravityModifier
    this._weatherWindScroll = gameCtx.windScrollModifier
    if (gameCtx.damageFlash > 0) this.damageFlash = gameCtx.damageFlash
    if (gameCtx.shakeFrames > 0) {
      this.shakeFrames = gameCtx.shakeFrames
      this.shakeIntensity = gameCtx.shakeIntensity
    }

    // [v1.2.0] 通知能力系统环境活跃状态
    const weatherActiveNow = this.weatherSystem.activeEffects.length > 0
    this.abilitySystem.setWeatherContext(this.weatherSystem.activeEffects.map(e=>e.type),this.weatherSystem.tamedWeather)
    this.abilitySystem.personalWind=this.combat.windWindow>0
    this.abilitySystem.invalidateStats()
    this.abilitySystem.setWeatherActive(weatherActiveNow)
    // [v1.4.0] 风暴之眼：同步天气并发数（≥2 时 debuff 缩放+经验倍率在 getStats/getWeatherDebuffScale 结算）
    this.abilitySystem.setWeatherConcurrent(this.weatherSystem.activeEffects.length)
    // [v1.4.0] 经验潮汐：天气结束后浮动文字"潮汐退去"提示（N7 静默教训）
    if (!weatherActiveNow && this._prevWeatherActive &&
        (this.abilitySystem.owned.get('exp_tide') || 0) > 0) {
      this._addFloatingText(this.bird.x, this.bird.y - 35, '潮汐退去', '#7eb8e0', 50)
    }
    this._prevWeatherActive = weatherActiveNow

    // 能力系统更新：无尽同一补给闸门覆盖技能、道具和战斗结算。
    this.abilitySystem.renewalInterval=this.chapterSystem.endless?this.chapterSystem.getMods().renewalInterval:0
    this.abilitySystem.tickCooldowns(this.chapterSystem.endless
      ? this.chapterSystem.getMods().recoveryRate : (this.chapterSystem.isBossActive() ? .8 : 1))
    if (this.chapterSystem.endless) {
      const cap=this.chapterSystem.getMods().invincibleCap
      this.abilitySystem.invincibleFrames=Math.min(this.abilitySystem.invincibleFrames,cap)
      this.abilitySystem.timeWarpActive=Math.min(this.abilitySystem.timeWarpActive,cap)
      this.abilitySystem.timeCrystalFreezeFrames=Math.min(this.abilitySystem.timeCrystalFreezeFrames,cap)
    }
    this._applyAbilityStatsToBird()
    this._drainAbilityFx()        // [v1.2.2] N7 取出能力系统的特效事件

    // [v1.2.1] 首次获得护盾教学提示（道具/能力/冰晶护体等所有来源统一覆盖，每局只提示一次）
    if (!this._shieldHintShown && this.abilitySystem.shieldLayers > 0) {
      this._shieldHintShown = true
      this._addFloatingText(this.bird.x, this.bird.y - 45, '每圈护盾可挡1次碰撞', '#3498db', 90)
    }

    // [v1.2.0] 应用环境重力加成（雨效果）
    if (this._weatherGravityBonus > 0) {
      this.bird.gravity = Config.BIRD.GRAVITY * this.abilitySystem.getStat('gravityMultiplier') * (1 + this._weatherGravityBonus)
    }

    // 小鸟物理
    this.bird.update()

    // 滚动速度（含能力修饰 + 速度包减速）——[v1.3.0] 提前计算，生成节奏改按滚动距离
    const scrollSpeed = this._getScrollSpeed()

    // [v1.5.0] 生成决策统一入口：管道（距离制）→ 怪物（45s保护+距离节奏）→ 随机道具计时 → 补给线保底。
    // 调用顺序与原四处散点完全一致，随机数消耗顺序不变；实体经 onSpawn* 回调回到 Game 数组。
    this.spawnSystem.update(scrollSpeed)

    // [v1.5.0] 章节进度推进（管数+最短时间 / 无尽时钟）+ 存量管道换色 lerp（§4.3，30帧）
    this.chapterSystem.update()
    this._applyChapterPipeColors()

    // [v1.4.0] 幻影舞步：黄金窗口期小鸟金色残影（视觉承诺必须兑现，N7 教训）
    if (this.abilitySystem.phantomWindowFrames > 0 && this.frameCount % 2 === 0) {
      this.abilityEffects.push({
        kind: 'dot',
        x: this.bird.x - 8 - Math.random() * 6,
        y: this.bird.y + (Math.random() - 0.5) * 10,
        vx: -0.8 - Math.random() * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        life: 22,
        maxLife: 22,
        size: 2.5,
        color: '255, 240, 150'  // 亮金残影
      })
    }

    // 主动技能预判
    this._checkActiveAbilities()

    // Snapshot once per live frame, including frozen targets (no stale movement sweep).
    for (const target of this.pipes.concat(this.combat.targets())) {
      target._projectileX = target.x
      target._projectileY = target.y
    }

    // 管道更新与碰撞
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i]
      pipe.update(scrollSpeed)

      if (pipe.isOffscreen()) {
        this.pipes.splice(i, 1)
        continue
      }

      if (pipe.checkCollision(this.bird)) {
        if (this._handleCollision(pipe)) return
        continue
      }

      // [v1.1.5] 擦边检测：每帧检查（小鸟在管道x范围内时），不再只在通过后检查
      if (!pipe.nearMissTriggered) {
        const birdRight = this.bird.x + this.bird.collisionWidth / 2
        const birdLeft = this.bird.x - this.bird.collisionWidth / 2
        if (birdRight > pipe.x && birdLeft < pipe.x + pipe.width) {
          this._checkNearMiss(pipe)
        }
      }

      if (!pipe.passed && pipe.x + pipe.width < this.bird.x - this.bird.collisionWidth / 2) {
        pipe.passed = true
        this._onPipePass(pipe)
      }
    }

    // 经验球更新
    const attractRange = this.abilitySystem.getStat('orbAttractRange')
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i]
      orb.update(scrollSpeed, this.bird, attractRange)

      if (orb.checkCollect(this.bird)) {
        this._collectOrb()
        this.orbs.splice(i, 1)
        continue
      }

      if (orb.isOffscreen()) {
        this.orbs.splice(i, 1)
      }
    }

    // [v1.1.0] 道具更新
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]
      item.update(scrollSpeed, this.bird, attractRange)

      if (item.checkCollect(this.bird)) {
        this._collectItem(item)
        this.items.splice(i, 1)
        continue
      }

      if (item.isOffscreen()) {
        this.items.splice(i, 1)
      }
    }

    // [v1.3.0] 怪物更新与碰撞（受击链与管道同级）
    if (this._updateMonsters(scrollSpeed) || this.phoenixAnim) return

    // [v1.5.0 步骤C] Boss 与羽刃弹幕更新（出场/战斗/死亡演出/战败离场全流程）
    if (this._updateBossFight() || this.phoenixAnim) return

    if (this.state !== Config.GAME.STATE.PLAYING) return
    // [v1.3.0] 导弹更新与命中
    this.combat.update()
    this._updateMissiles(scrollSpeed)

    // 地面碰撞
    const groundY = this.screenH - Config.GROUND.HEIGHT
    if (this.bird.y + this.bird.collisionHeight / 2 >= groundY) {
      this.bird.y = groundY - this.bird.collisionHeight / 2
      this.bird.velocity = -3  // [v1.1.0] 小弹起防止持续碰撞
      if (this._handleCollision()) return
    }
    // 天花板碰撞
    if (this.bird.y - this.bird.collisionHeight / 2 <= 0) {
      this.bird.y = this.bird.collisionHeight / 2
      this.bird.velocity = 0
      if (this._handleCollision()) return
    }

    // 胜负在本帧所有伤害结算后判定，致命受击不会同时获得生存通关。
    if (this.boss && this.chapterSystem.isBossActive() && !this._bossClearMode &&
        !this.phoenixAnim && this.abilitySystem.hp > 0) {
      this.bossFightFrames++
      if (this.bossFightFrames >= this._getBossSurvivalFrames()) this._onBossVictory('survival')
    }

    // 存活时间得分
    this.survivalTimer++
    if (this.survivalTimer >= Config.EXP.SCORE_SURVIVAL_INTERVAL) {
      this.survivalTimer = 0
      this._addScore(1)
    }

    // 升级检查
    // [v1.5.0] 大礼包结算期间（_bossRewardPending）不走这里：升级面板由面板链
    // （selectAbility→_afterUpgrade→_triggerLevelUp）驱动，防同帧 _triggerLevelUp 踩踏 bossCard 面板
    if (((this.expSystem.hasPendingLevelUp() && this.build.canReleaseGrowth()) || this.build.refund>0) && this.gameTime >= this._nextChoiceAt && !this._bossRewardPending && this._bossDyingFrames <= 0) {
      // [v1.2.2] B2-① 延后弹板：等小鸟飞出管道间隙再进UPGRADING，避免"过管瞬间弹板、关板即撞下一管"
      // [v1.2.3] B2-③ 保底超时：安全区迟迟不满足时累计延迟帧，超 MAX_DELAY_FRAMES(90帧=1.5s) 强制弹板，
      //           保证任何情况下升级弹窗必出现（v1.2.2 线上 P0：安全区恒不成立导致弹窗卡死）
      this._upgradeDelayFrames++
      if (this._isUpgradeSafeZone() || this._upgradeDelayFrames >= Config.UPGRADE.MAX_DELAY_FRAMES) {
        if (this._upgradeDelayFrames >= Config.UPGRADE.MAX_DELAY_FRAMES && !this._isUpgradeSafeZone()) {
          Logger.warn('LevelUp', '延迟弹板超时，强制弹出', { delayFrames: this._upgradeDelayFrames })
        }
        this._upgradeDelayFrames = 0
        this._triggerLevelUp()
      }
    } else {
      this._upgradeDelayFrames = 0  // [v1.2.3] 无待处理升级时清零，防标志位泄漏
    }
  }

  /**
   * [v1.5.0] 存量管道换色应用（§4.3）：lerp 中逐帧插值，到位后维持章节色。
   * Ch1 默认路径 getPipeColorSet() 返回 null，不触碰任何管道，零变化。
   * 正常 update 与转场冻结期都会调用（换色 lerp 在冻结期照常播完）。
   */
  _applyChapterPipeColors() {
    const pipeColorSet = this.chapterSystem.getPipeColorSet()
    if (!pipeColorSet) return
    for (const p of this.pipes) p.setColorSet(pipeColorSet)
  }

  /**
   * [v1.2.2] B2-① 判断当前是否处于安全区（小鸟不在任何管道间隙中）
   * [v1.2.3] 修复：只判定与小鸟横向区间相交（含安全边距）的管道。
   * v1.2.2 要求小鸟越过"所有"管道的右边缘，但小鸟 x 坐标固定、管道持续从屏幕右侧生成，
   * 前方永远存在尚未到达的管道，安全区恒不成立 → 升级弹窗卡死不出现（线上 P0）。
   * 现改为：仅当小鸟正在穿越某管道（横向区间相交±边距）时视为不安全；
   * 前方远处的管道不参与判定（弹出后面板冻结+关板45帧无敌已覆盖该风险）。
   * @returns {boolean}
   */
  _isUpgradeSafeZone() {
    const margin = Config.UPGRADE.SAFE_MARGIN_PX
    const birdLeft = this.bird.x - this.bird.collisionWidth / 2
    const birdRight = this.bird.x + this.bird.collisionWidth / 2
    for (const pipe of this.pipes) {
      // 管道横向区间 [pipe.x, pipe.x+width] 与小鸟区间（±安全边距）相交 → 小鸟在间隙中，不安全
      if (pipe.x + pipe.width + margin > birdLeft && pipe.x - margin < birdRight) return false
    }
    return true
  }

  // [v1.5.0] 管道生成间隔 ramp（原 _getSpawnDistance）已迁入 systems/SpawnSystem.js → getSpawnDistance()

  _updateClouds() {
    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed
      if (cloud.x + cloud.size < -20) {
        cloud.x = this.screenW + cloud.size
        cloud.y = Config.CLOUD.MIN_Y + Math.random() * (this.screenH * Config.CLOUD.MAX_Y_RATIO - Config.CLOUD.MIN_Y)
      }
    }
  }

  _updateNearMissEffects() {
    for (let i = this.nearMissEffects.length - 1; i >= 0; i--) {
      const e = this.nearMissEffects[i]
      e.life--
      // [v1.1.4] 更新多环
      if (e.rings) {
        for (const ring of e.rings) {
          ring.life--
        }
      }
      // [v1.1.4] 更新粒子
      if (e.sparkles) {
        for (const sp of e.sparkles) {
          sp.x += sp.vx
          sp.y += sp.vy
          sp.vy += 0.1  // 轻微重力
          sp.life--
        }
        e.sparkles = e.sparkles.filter(s => s.life > 0)
      }
      // [v1.1.4] 闪光衰减
      if (e.flashLife > 0) e.flashLife--
      if (e.life <= 0) this.nearMissEffects.splice(i, 1)
    }
  }

  // [v1.1.0] 浮动文字更新 [v1.1.4] 带速度衰减的向上移动渐隐
  _updateFloatingTexts() {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i]
      t.y += t.vy
      // [v1.1.4] 速度衰减：末段减速，配合alpha渐隐更自然
      if (t.vyDecay) {
        t.vy = Math.min(t.vy + t.vyDecay, 0)  // vy为负，向0靠近=减速
      }
      t.life--
      if (t.life <= 0) this.floatingTexts.splice(i, 1)
    }
  }

  // ==================== [v1.2.2] N7 能力内联特效 ====================
  // 轻量实现：粒子数组+浮动文字，与擦边特效同风格，不引入EffectManager

  /**
   * [v1.2.2] N7 取出AbilitySystem的特效事件并生成内联特效
   * （自愈=绿色十字粒子+"+1HP"文字；护盾获得=蓝色闪光环）
   */
  _drainAbilityFx() {
    const fx = this.abilitySystem.fxEvents
    if (!fx || fx.length === 0) return

    for (const ev of fx) {
      if (ev.type === 'retaliate') {
        if (this.abilitySystem.hp > 0 && !this.phoenixAnim) this.combat.retaliate()
      } else if (ev.type === 'regen') {
        // 自愈：绿色十字粒子从小鸟身上向外扩散
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4
          const speed = 1 + Math.random() * 1.5
          this.abilityEffects.push({
            kind: 'cross',
            x: this.bird.x,
            y: this.bird.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,  // 略向上飘
            life: 30,
            maxLife: 30,
            size: 3 + Math.random() * 2,
            color: '94, 226, 112'  // 绿色
          })
        }
        this._addFloatingText(this.bird.x, this.bird.y - 35, '+1 HP', '#5ee270', 45)
      } else if (ev.type === 'shield') {
        // 护盾获得：蓝色闪光环从小鸟扩散
        this.abilityEffects.push({
          kind: 'ring',
          x: this.bird.x,
          y: this.bird.y,
          vx: 0,
          vy: 0,
          life: 24,
          maxLife: 24,
          size: this.bird.width * 0.6,  // 起始半径
          color: '100, 200, 255'        // 蓝色
        })
      } else if (ev.type === 'survivor') {
        // [v1.4.0] 求生本能：HP=1 补盾提示（特效环已由 addShieldLayer 的 shield 事件提供）
        this._addFloatingText(this.bird.x, this.bird.y - 40, '求生本能!', '#ffd700', 50)
      } else if (ev.type === 'mirror_shock') {
        // [v1.4.0] 镜面护盾：破盾冲击波 AoE 结算
        this._triggerMirrorShock()
      } else if (ev.type === 'barrage_fire') {
        // [v1.4.0] 火力覆盖：定时自动导弹——独立枪口闪光（橙白小闪点），不用道具拾取特效（防误认来源）
        this.abilityEffects.push({
          kind: 'ring',
          x: this.bird.x + this.bird.width / 2 + 4,
          y: this.bird.y,
          vx: 0,
          vy: 0,
          life: 12,
          maxLife: 12,
          size: 4,
          color: '255, 230, 160'  // 枪口闪光（亮橙白）
        })
        this._fireMissile({ silent: true })  // 自动导弹不弹"拾取发射"文字
        Logger.info('Missile', '火力覆盖自动发射', { lv: this.abilitySystem.owned.get('missile_barrage') })
      } else if (ev.type === 'storm_fire') {
        // [v1.4.0] 导弹风暴：连发节拍（同屏 MAX_ALIVE 上限在 _fireMissile 硬刹车）
        this._fireMissile({ silent: true })
      } else if (ev.type === 'temp_hp') {
        // [v1.4.0] 超载神盾质变：溢出护盾转临时HP 提示
        this._addFloatingText(this.bird.x, this.bird.y - 40, '超载:临时生命+1!', '#ffd54a', 50)
      } else if (ev.type === 'temp_hp_break') {
        // [v1.4.0] 临时HP被消耗提示
        this._addFloatingText(this.bird.x, this.bird.y - 40, '临时生命-1', '#ffd54a', 40)
      } else if (ev.type === 'feather_shield') {
        // [v1.4.0] 回响之翼：羽盾获得（羽毛色环+提示）
        this.abilityEffects.push({
          kind: 'ring',
          x: this.bird.x,
          y: this.bird.y,
          vx: 0,
          vy: 0,
          life: 24,
          maxLife: 24,
          size: this.bird.width * 0.6,
          color: '255, 242, 200'  // 羽毛白金色
        })
        this._addFloatingText(this.bird.x, this.bird.y - 40, '羽盾+1!', '#fff2c8', 45)
      } else if (ev.type === 'feather_break') {
        // [v1.4.0] 羽盾破裂抵挡提示（铁羽无敌帧已在 consumeFeatherShield 结算）
        this._addFloatingText(this.bird.x, this.bird.y - 40, '羽盾挡下!', '#fff2c8', 45)
      }
    }

    fx.length = 0
  }

  /**
   * [v1.4.0] 镜面护盾冲击波：半径 (100+40*(lv-1))px 内怪物受 1 伤害
   * 对 Boss 无效（isBoss 分支）；触发频率由 AbilitySystem.mirrorShockCD(3s) 硬刹车
   */
  _triggerMirrorShock() {
    const lv = this.abilitySystem.owned.get('mirror_shield') || 0
    if (lv <= 0) return
    const radius = Config.SHIELD.MIRROR_SHOCK_RADIUS_BASE +
      Config.SHIELD.MIRROR_SHOCK_RADIUS_PER_LV * (lv - 1)
    const bx = this.bird.x
    const by = this.bird.y

    let hits = 0
    for (const m of this.monsters) {
      if (m.hp <= 0 || m.isBoss) continue
      const dx = m.x + m.width / 2 - bx
      const dy = m.y - by
      if (dx * dx + dy * dy <= radius * radius) {
        m.takeDamage(1)
        hits++
        if (m.hp <= 0) this._onMonsterKilled(m)  // 尸体由 _updateMonsters 回收
      }
    }

    // 冲击波视觉：青白色扩散环
    this.abilityEffects.push({
      kind: 'ring',
      x: bx,
      y: by,
      vx: 0,
      vy: 0,
      life: 24,
      maxLife: 24,
      size: radius * 0.4,
      color: '200, 240, 255'
    })
    this._addFloatingText(bx, by - 35, '镜面冲击!', '#c8f0ff', 40)
    Logger.info('Shield', '镜面冲击波结算', { radius: radius, hits: hits })
  }

  /**
   * [v1.2.2] N7 能力特效粒子更新（在状态判断前调用，升级面板期间也能播完）
   */
  _updateAbilityEffects() {
    for (let i = this.abilityEffects.length - 1; i >= 0; i--) {
      const p = this.abilityEffects[i]
      p.x += p.vx
      p.y += p.vy
      p.life--
      if (p.life <= 0) this.abilityEffects.splice(i, 1)
    }
  }

  // ==================== 能力属性注入 ====================

  _applyAbilityStatsToBird() {
    const stats = this.abilitySystem.getStats()
    this.bird.gravity = Config.BIRD.GRAVITY * stats.gravityMultiplier
    this.bird.flapForce = Config.BIRD.FLAP_FORCE * stats.flapForceMultiplier
    this.bird.descentGravityMultiplier=stats.descentGravityMultiplier
    this.bird.maxFallSpeed=Config.BIRD.MAX_FALL_SPEED*stats.maxFallSpeedMultiplier
    if (this.bird.collisionScale !== stats.collisionScale) {
      this.bird.collisionScale = stats.collisionScale
      this.bird.updateCollisionBox()
    }
  }

  // [v1.2.0] 构建环境系统所需的游戏上下文
  _buildGameCtx() {
    return {
      gameTime: this.gameTime,
      bird: this.bird,
      screenW: this.screenW,
      screenH: this.screenH,
      abilities: this.abilitySystem,
      bossActive: this.chapterSystem.isBossActive(),
      isVictoryProtected: () => this._isVictoryProtected(),
      interceptProjectile: projectile => this.combat.intercept(projectile),
      weather: this.weatherSystem,  // [v1.4.0] 风暴驯化状态查询（isTamed）
      verticalWindForce: 0,
      gravityModifier: 0,           // 输出：重力增加比例（由效果写入）
      windScrollModifier: 0,        // 输出：风力滚动速度修饰（由效果写入）
      addFloatingText: (x, y, text, color, life) => this._addFloatingText(x, y, text, color, life),
      // [v1.4.0] 驯化冰雹掉 exp 的统一经验入口（含倍率/共鸣/顿悟全链路）
      gainExp: (amount, source) => this._gainExp(amount, source, this.abilitySystem.getStats()),
      triggerPhoenixRevive: () => this._startPhoenixRevive(),
      recordDamage: () => {this._lastDamage={source:'冰雹',frame:this.gameTime}},
      triggerGameOver: () => {
        if (this.chapterSystem.isBossActive() && this.abilitySystem.maxHp > 1) this._onBossDefeat()
        else this._gameOver()
      },
      damageFlash: 0,
      shakeFrames: 0,
      shakeIntensity: 0
    }
  }

  // ==================== 速度计算 ====================

  _getScrollSpeed() {
    const stats = this.abilitySystem.getStats()
    const base = Config.GAME.SCROLL_SPEED
    let ramp = Math.min(this.gameTime / Config.GAME.SPEED_RAMP_TIME, 1) * Config.GAME.SPEED_RAMP_MAX
    // [v1.6.0] 第二段缓坡：90秒至210秒继续增加速度
    if (this.gameTime > Config.GAME.SPEED_RAMP2_START) {
      ramp += Math.min(
        (this.gameTime - Config.GAME.SPEED_RAMP2_START) / Config.GAME.SPEED_RAMP2_TIME, 1
      ) * Config.GAME.SPEED_RAMP2_MAX
    }
    let speed = (base + ramp) * stats.scrollSpeedMultiplier

    // 时间扭曲减速
    if (this.abilitySystem.timeWarpActive > 0) {
      speed *= 0.5
    }

    // [v1.1.0] 速度包减速
    speed *= this.abilitySystem.getSpeedPackMultiplier()

    // [v1.2.0] 风力影响滚动速度
    speed += this._weatherWindScroll

    // [v1.5.0] 章节难度修正（§4.4 叠加制）：滚动速度加算（Ch1=+0，加 0 精确无差）
    speed += this.chapterSystem.getMods().scrollSpeedAdd

    return Math.max(0.5, Math.min(this.chapterSystem.endless ? 30 : Infinity, speed))
  }

  _getGapSize() {
    const stats = this.abilitySystem.getStats()
    const gapScale=this.chapterSystem.endless ? this.chapterSystem.getMods().gapBonusScale : 1
    const base = Config.PIPE.GAP + stats.gapBonus * gapScale
    let reduction = Math.min(this.gameTime / Config.GAME.GAP_RAMP_TIME, 1) * Config.GAME.GAP_RAMP_MAX
    // [v1.6.0] 第二段缓坡：90秒至210秒继续缩小间隙
    if (this.gameTime > Config.GAME.GAP_RAMP2_START) {
      reduction += Math.min(
        (this.gameTime - Config.GAME.GAP_RAMP2_START) / Config.GAME.GAP_RAMP2_TIME, 1
      ) * Config.GAME.GAP_RAMP2_MAX
    }
    // [v1.5.1] 前期减压：开局间隙 +EARLY_EASE_GAP_BONUS，90s 内线性回归 0（叠加制，
    // 回归点之后与现值精确无差）
    const easeT = Config.GAME.EARLY_EASE_RAMP_TIME
    const ease = this.gameTime < easeT
      ? Config.GAME.EARLY_EASE_GAP_BONUS * (1 - this.gameTime / easeT) : 0
    // [v1.5.0] 章节难度修正（§4.4 叠加制）：间隙加算（Ch1=+0，精确无差；Ch2=-10）
    const availableGap = this.screenH - Config.GROUND.HEIGHT - Config.PIPE.MIN_TOP - Config.PIPE.MIN_BOTTOM
    return Math.min(availableGap, Math.max(
      base - reduction + ease + this.chapterSystem.getMods().gapAdd,
      (this.chapterSystem.endless ? 80 : Config.PIPE.MIN_GAP + this.chapterSystem.getMods().gapAdd) + stats.gapBonus * (this.chapterSystem.endless ? 0.15 : 0.5)
    ))
  }

  // [v1.5.0] 管道生成（_spawnPipe）、怪物生成（_updateMonsterSpawn/_pickMonsterY）
  // 已迁入 systems/SpawnSystem.js → spawnPipe() / updateMonsterSpawn() / pickMonsterY()

  /**
   * [v1.3.0] 怪物更新与小鸟碰撞（走 _handleCollision 统一受击链，与管道同级）
   * [v1.4.0] 时之晶：冻结期怪物停止移动/追踪，但不取消碰撞判定
   *           （铁喙协同建立在受击链不变上："冻结期碰瓷零风险"）
   * @param {number} scrollSpeed - 当前滚动速度（减速对怪物同步生效）
   * @returns {boolean} true=游戏结束或复活，本帧应停止
   */
  _updateTraining() {
    if(this.gameTime===1)this._addFloatingText(this.screenW/2,this.screenH*.35,'点击拍翅 · 飞到目标高度','#b6f6ff',180)
    if(!this._trainingSpawned&&this.gameTime>=480&&this.chapterSystem.index===0&&!this.chapterSystem.isBossActive()){
      this._trainingSpawned=true
      const m=new Monster(this.screenW*.7,this.bird.y,'floater',this.screenH-80)
      m.hp=m.maxHp=2;m.training=true;m._trainingAge=0
      m.update=function(){this._trainingAge++;this._hitFlash=Math.max(0,(this._hitFlash||0)-1);if(this._trainingAge>900)this.hp=0}
      m.checkCollision=()=>false;this.monsters.push(m)
    }
    if(this.gameTime===1800)this._addFloatingText(this.screenW/2,this.screenH*.35,'靠近边缘有额外经验；优先安全通过','#b6f6ff',180)
    if(this.gameTime===2700)this._addFloatingText(this.screenW/2,this.screenH*.35,'古木双根：拆上根减飞种，拆下根减根须','#b6f6ff',180)
  }

  _updateMonsters(scrollSpeed) {
    // [v1.4.0] 时之晶冻结：怪物/弹幕（v1.5.0）冻结，鸟可动；友方导弹不冻结
    const frozen = this.abilitySystem.timeCrystalFreezeFrames > 0
    const monsters = this.monsters
    for (let i = monsters.length - 1; i >= 0; i--) {
      const monster = monsters[i]
      if (!frozen) {
        const slow=monster.frostFrames>0?0.5:1
        if(monster.frostFrames>0)monster.frostFrames--
        monster.update(scrollSpeed*slow,this.bird,slow)
      }

      if (monster.isOffscreen() || monster.hp <= 0) {
        monsters.splice(i, 1)
        continue
      }

      if (monster.checkCollision(this.bird)) {
        if (this._handleCollision(monster)) return true
        if (this.phoenixAnim) return true
        if (this.monsters !== monsters) break
      }
    }
    return false
  }

  // ==================== [v1.5.0 步骤C] Boss 战 ====================

  /**
   * Boss 实体创建（ChapterSystem 出场演出 enter 阶段回调）：
   * 变体 = 当前章节下标；HP 单一事实源 = CHAPTERS.mods.bossHp
   */
  _spawnBoss() {
    this.combat.clearShots()
    this._mechanicEventsSeen=0
    this.bossFightFrames = 0
    this._bossClearMode = null
    this.pipes = []
    this.monsters = []
    this.feathers = []
    const idx = this.chapterSystem.getBossIndex()
    const hp = this.chapterSystem.getMods().bossHp
    const self = this
    this.boss = new Boss(idx, this.screenW, this.screenH, hp, {
      onHazard: function (hazard) { if(self.feathers.length<96)self.feathers.push(hazard) },
      onFireFeather: function (x, y, angle, speed, color) {
        self.feathers.push(new Feather(x, y, angle, speed, color))
      },
      onSandWall: function (y, gap) { self.feathers.push(new SandWall(self.screenW, self.screenH - Config.GROUND.HEIGHT, y, gap)) },
      onSummon: function (type, x, y) { self._spawnBossMinion(type, x, y) },
      onPhase2: function (boss) { self._onBossPhase2(boss) }
    })
    if (this.chapterSystem.endless) {
      // 无尽随机只改变形象/招式：基础数值统一使用第六章，不能抽到弱版第一章。
      const final=Config.BOSS.VARIANTS[5]
      this.boss.variant=Object.assign({},this.boss.variant,{
        restFrames:final.restFrames,recoverFrames:final.recoverFrames,warnFrames:final.warnFrames,
        bulletSpeed:final.bulletSpeed,gateGap:final.gateGap,combos:[[0,2,1],[3,4,5],[1,3,5],[5,0,4]]
      })
      this.boss.power=this.chapterSystem.getMods().bossPower
      this.boss.difficultyTier=5
      this.boss.survivalFrames=150*60
      this.boss._enterPhase2()
    }
    Logger.info('Boss', 'Boss 出场' , { name: this.boss.name, hp: hp, chapter: idx + 1 })
  }

  /**
   * Boss 召唤物（§4.8 P2：每 15s 召唤，走 Monster 工厂）：
   * 参数沿用当前章节修正（HP/追踪/振幅），不占普通怪物生成节奏（bossActive 期间普通生成已停）
   */
  _spawnBossMinion(type, x, y) {
    if (this.monsters.length >= 5) return
    const mods = this.chapterSystem.getMods()
    const groundY = this.screenH - Config.GROUND.HEIGHT
    const monster = new Monster(x, y, type, groundY, {
      hpMult: mods.monsterHpMult,
      trackSpeed: mods.floaterTrackSpeed,
      sineAmp: mods.batSineAmp
    })
    this.monsters.push(monster)
    Logger.info('Boss', 'Boss 召唤小怪', { type: type, x: Math.round(x), y: Math.round(y) })
  }

  /** P1→P2 阶段切换演出（§4.8：闪电粒子爆闪 30 帧 + 提示；血条变红由 HUD 读 boss.phase） */
  _onBossPhase2(boss) {
    this._spawnExplosion(boss.x + boss.width / 2, boss.y, '255, 255, 160', 20)
    this._addFloatingText(this.screenW / 2, this.screenH * 0.3, boss.name + ' · 连协解放！', '#ff3b3b', 75)
    Logger.info('Boss', 'Boss 进入 P2 暴怒', { name: boss.name, hp: boss.hp })
  }

  /**
   * Boss 战每帧更新：弹幕（时之晶冻结停移动不停碰撞，与怪物同语义）→ Boss 本体 →
   * 接触碰撞（统一受击链，铁喙/镜面对 Boss 无效）→ 死亡演出计时 → 离场回收
   * @returns {boolean} true=游戏结束
   */
  _updateBossFight() {
    const boss = this.boss
    // 死亡演出慢动作（§4.11：30 帧 0.5×，复用速度包比例；弹幕同步减速保持视觉一致）
    const timeScale = (this._bossDyingFrames > 0 || this.abilitySystem.timeWarpActive > 0) ? Config.ITEM.SPEED_PACK_SLOWDOWN : 1
    const frozen = this.abilitySystem.timeCrystalFreezeFrames > 0  // 时之晶：怪物/弹幕冻结（卡面承诺）

    // 羽刃弹幕：命中即消（走统一受击链；被格挡/护盾/无敌减免同样消耗弹幕）
    // 局部引用快照：受击链可能触发战败/胜利并整体重置 this.feathers（新数组），
    // 继续遍历旧快照安全（命中 splice 只影响快照，新数组从此为空）
    const feathers = this.feathers
    for (let i = feathers.length - 1; i >= 0; i--) {
      const f = feathers[i]
      if(!frozen||f.piercing||['beam','column','gate'].includes(f.kind))f.update(timeScale)
      if (this.combat.intercept(f)) { feathers.splice(i, 1); continue }
      this.combat.onAvoid(f)
      if (f.checkCollision(this.bird)) {
        feathers.splice(i, 1)
        if (this._handleCollision(f)) return true
        if (this.feathers !== feathers) break  // 战败/胜利已清场，放弃旧快照遍历
        continue
      }
      if (f.isOffscreen(this.screenW, this.screenH)) feathers.splice(i, 1)
    }

    if (!boss) return false
    // Boss 本体（dying 也继续 update 做坠落演出；leaving 同理加速离场）
    if(this.chapterSystem.endless) boss.power=this.chapterSystem.getMods().bossPower
    {
      this._bossTimeAccumulator=(this._bossTimeAccumulator||0)+timeScale*(frozen?.75:1)
      if(this._bossTimeAccumulator>=1){this._bossTimeAccumulator-=1;boss.update(this.bird,this.bossFightFrames+1);const e=boss.mechanics.events,before=this._mechanicEventsSeen||0;if(e.length>before){this._mechanicEventsSeen=e.length;const names={cool:'选择冷却阀，降低热量',overload:'选择超载阀，强攻窗口打开',break:'成功破解机关'};this.build.record('mechanic',names[e[e.length-1].type]||'成功处理 '+boss.mechanics.label())}}
    }
    if (boss.hp <= 0 && !this._bossClearMode) this._onBossVictory('kill')

    // 本体接触伤害 1（entering/dying/leaving 态 Boss 内部已豁免碰撞）
    if (boss.checkCollision(this.bird)) {
      if (this._handleCollision(boss)) return true
    }

    // 死亡演出收尾 → 大礼包结算
    if (this._bossDyingFrames > 0) {
      this._bossDyingFrames--
      if (this._bossDyingFrames <= 0) {
        this.boss = null
        this._startBossRewards()
      }
      return false
    }

    // 战败离场出屏回收
    if (boss.state === 'leaving' && boss.isOffscreen()) this.boss = null
    return false
  }

  /**
   * 玩家战败（§4.10 方案A，D1/D19）：Boss 战期间 HP 归零不结束游戏——
   * 本击已走完整受击链（C7 格挡/羽盾/护盾可减免，减免则不构成战败）；
   * HP 钳 1（"扣 1 HP"的代价 = 这最后 1 HP 被战败保护兜住），Boss 长鸣离场、章内进度保留、
   * 每次战败后20管满血回归，只有胜利推进；无尽模式无战败保护。
   * 边界：maxHp===1（血契流）无血可扣不兜底，由调用方继续走正常 gameover（方案原文"战败=死"）；
   * 凤凰复活优先于战败判定（保有凤凰=战斗继续）。
   * @returns {boolean} false=局继续
   */
  _onBossDefeat() {
    if (this.chapterSystem.endless) { this._gameOver(); return true }
    this.abilitySystem.hp = 1
    this.abilitySystem.invalidateStats()
    this.abilitySystem.invincibleFrames = Math.max(
      this.abilitySystem.invincibleFrames, Config.BOSS.DEFEAT_INVINCIBLE_FRAMES)
    this.bird.invincibleBlink = Math.max(this.bird.invincibleBlink, 40)
    this._addFloatingText(this.screenW / 2, this.screenH * 0.3, '战败……' + (this.boss ? this.boss.name : 'Boss') + ' 暂时退却', '#cccccc', 90)
    this.abilitySystem.fxEvents = this.abilitySystem.fxEvents.filter(ev => ev.type !== 'retaliate')
    if (this.boss) this.boss.startLeaving()
    this.monsters = []
    const result = this.chapterSystem.onBossDefeat()
    this.combat.clearShots()
    this.feathers = []  // 弹幕清空（战败公平性，回归战从零开局）
    this._addFloatingText(this.screenW / 2, this.screenH * 0.3 + 26, '再过 20 管它将满血回归！', '#ffaa00', 90)
    Logger.warn('Boss', 'Boss 战战败结算（方案A）', { result: result, hp: this.abilitySystem.hp })
    return false
  }

  /**
   * Boss 击杀（导弹 takeDamage 归零）：§4.11 死亡演出——爆炸粒子环（半径120px）+
   * 慢动作 30 帧（复用速度包 0.5×）→ 大礼包面板（_bossDyingFrames 倒计时在 _updateBossFight）
   */
  _getBossSurvivalFrames() {
    return this.boss ? this.boss.survivalFrames : Config.BOSS.VARIANTS[this.chapterSystem.getBossIndex()].survivalFrames
  }

  _onBossVictory(method = 'kill') {
    const boss = this.boss
    if (!boss || this._bossClearMode || this._bossDyingFrames > 0 ||
        !this.chapterSystem.isBossActive() || this.abilitySystem.hp <= 0) return
    this._bossClearMode = method
    this.build.record('boss',this.boss.name+(method==='kill'?' · 击败':' · 坚持获胜')+(this.abilitySystem.hp===1?' · 一血完成':''))
    this.bossClears.push({ chapter: this.chapterSystem.getBossIndex()+1, endless:this.chapterSystem.endless, method: method, frames: this.bossFightFrames })
    if (method === 'kill') boss.startDying()
    else boss.startLeaving()
    this.monsters = []
    // Separate settlement protection: endless caps only apply to combat abilities.
    this._bossVictoryProtectionFrames = Config.BOSS.DEATH_SLOWMO_FRAMES + 2
    this._addFloatingText(this.screenW / 2, this.screenH * 0.4,
      method === 'kill' ? '击败 Boss！' : '生存通关！', '#ffd700', 90)
    this._bossDyingFrames = Config.BOSS.DEATH_SLOWMO_FRAMES
    // 爆炸粒子环（半径 120px，两圈密粒）
    this._spawnExplosionRing(boss.x + boss.width / 2, boss.y, Config.BOSS.EXPLOSION_RING_RADIUS)
    // 慢动作：复用速度包（世界 0.5×；弹幕同步在 _updateBossFight 读 _bossDyingFrames）
    this.abilitySystem.setSpeedPack(Config.BOSS.DEATH_SLOWMO_FRAMES)
    this.combat.clearShots()
    this.feathers = []  // 弹幕清空
    // R10 战利品陈列叠层 + 结算徽章（先叠层，大礼包经验可吃到陈列加成——越早拿越强）
    if (method === 'kill') {
      this.abilitySystem.setBossesDefeated(this.abilitySystem.bossesDefeated + 1)
      const badge=this.chapterSystem.getBossIndex()+1
      if(!this.bossBadges.includes(badge))this.bossBadges.push(badge)
    }
    this.shakeFrames = Math.max(this.shakeFrames, 10)
    this.shakeIntensity = 5
    Logger.info('Boss', 'Boss 通关', { method: method, frames: this.bossFightFrames, name: boss.name, chapter: this.chapterSystem.getChapter().id,
      kills: this.abilitySystem.bossesDefeated })
  }

  /** §4.11 爆炸粒子环：半径 120px 圆环两圈（外金内白） */
  _spawnExplosionRing(x, y, radius) {
    for (let ring = 0; ring < 2; ring++) {
      const n = 18
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n
        const speed = (radius / 24) * (ring === 0 ? 1 : 0.6)
        this.abilityEffects.push({
          kind: 'dot',
          x: x, y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 30, maxLife: 30,
          size: ring === 0 ? 4 : 2.5,
          color: ring === 0 ? '255, 200, 60' : '255, 255, 255'
        })
      }
    }
  }

  // ==================== [v1.5.0 步骤C] 章节进出钩子（联动卡） ====================

  /**
   * 进入新章钩子（ChapterSystem._applyNextChapter 回调，转场冻结期执行）：
   * U9 旅者补给 / R9 章节回响 / E7 章节之主首面板保底标记
   * @param {number} toIndex - 新章节下标（≥1，Ch1 不经过此钩子=旅者第 2 章起生效）
   */
  _onChapterEnter(toIndex) {
    this.abilitySystem.chapter=toIndex+1
    const owned = this.abilitySystem.owned
    const stats = this.abilitySystem.getStats()

    // U9 旅者：+lv 层护盾 +20exp/级（第 2 章起生效）
    const nomadLv = owned.get('nomad') || 0
    if (nomadLv > 0) {
      this.abilitySystem.addShieldLayer(nomadLv)
      this._gainExp(Config.ABILITY.NOMAD_EXP_PER_LV * nomadLv, 'nomad', stats)
      this._addFloatingText(this.screenW / 2, this.screenH * 0.45, '旅者补给！', '#9b59b6', 75)
      Logger.info('Ability', '旅者补给', { lv: nomadLv, chapter: toIndex + 1 })
    }

    // R9 章节回响：随机已持卡临时 +lv 级（本章有效）
    this._applyChapterEcho()

    // E7 章节之主：本章首次升级面板必含 1 张史诗（getChoices 消耗标记）
    this.abilitySystem.chapterFirstPanelDue = true
  }

  /** 本章终结钩子（胜利转场前）：回响消散（按增量还原，不动玩家本章自购的等级） */
  _onChapterEnd() {
    this._revertChapterEcho()
  }

  /**
   * R9 章节回响（chapter_echo）：进新章随机 1 张已持卡临时 +lv 级（本章有效，不超 maxLevel；
   * 满级重随机 ≤3 次——全部重试失败则本章无回响）。回响不含自身（防语义套娃）。
   * 注：临时等级只改 owned 数值（stats 全链路生效）；selectAbility 的选卡副作用
   * （活力回血/坚韧补盾等一次性效果）不因回响触发——回响是"体验卡"而非"真获得"。
   */
  _refreshEchoStats() {
    this.abilitySystem.refreshDerivedStats()
    this.expSystem.configureEnlighten(this.abilitySystem.owned.get('enlightenment') || 0)
  }

  _applyChapterEcho() {
    const echoLv = this.abilitySystem.owned.get('chapter_echo') || 0
    if (echoLv <= 0) return
    this._revertChapterEcho(true)  // 防御：旧回响先静默消散
    const list = this.abilitySystem.getOwnedList().filter(o => o.def && o.def.id !== 'chapter_echo')
    if (list.length === 0) return
    let chosen = null
    for (let i = 0; i < Config.ABILITY.ECHO_REROLL_MAX; i++) {
      const c = list[Math.floor(Random.random() * list.length)]
      if (c.level < c.def.maxLevel) { chosen = c; break }  // 满级重随机
    }
    if (!chosen) {
      Logger.info('Ability', '章节回响：重试耗尽（已持卡全满级），本章无回响')
      return
    }
    const to = Math.min(chosen.def.maxLevel, chosen.level + echoLv)  // 不超 maxLevel
    if (to === chosen.level) return
    this._echoBoost = { id: chosen.def.id, from: chosen.level, to: to }
    this.abilitySystem.owned.set(chosen.def.id, to)
    this._refreshEchoStats()
    this._addFloatingText(this.screenW / 2, this.screenH * 0.45 + 24,
      '回响：' + chosen.def.name + ' 临时+' + (to - chosen.level) + '级！', '#c8b6ff', 75)
    Logger.info('Ability', '章节回响生效', { id: chosen.def.id, from: chosen.level, to: to })
  }

  /**
   * R9 回响消散：按增量还原（若玩家本章真实选购过该卡，只摘除回响增量，不动自购等级）
   * @param {boolean} [silent] - true=不弹"回响消散"（换章叠加防御路径）
   */
  _revertChapterEcho(silent) {
    if (!this._echoBoost) return
    const boost = this._echoBoost
    const cur = this.abilitySystem.owned.get(boost.id) || 0
    this.abilitySystem.owned.set(boost.id, Math.max(boost.from, cur - (boost.to - boost.from)))
    this._refreshEchoStats()
    if (!silent) {
      this._addFloatingText(this.screenW / 2, this.screenH * 0.4, '回响消散', '#c8b6ff', 60)
    }
    Logger.info('Ability', '回响消散', { id: boost.id, restoredTo: this.abilitySystem.owned.get(boost.id) })
    this._echoBoost = null
  }

  /**
   * [v1.3.0] 怪物被击杀：爆炸粒子 + 击杀经验（浮动文字 +10）
   * [v1.4.0] 拾荒者：击杀怪物 20%/级 掉随机道具（权重沿用 TYPE_WEIGHTS）
   * [v1.5.0] 精英怪（§5.1）：经验 ×5（10→50）+ 必掉 1 个随机道具（导弹权重×2，与拾荒者独立）
   */
  _onMonsterKilled(monster) {
    if (monster._killRewarded) return
    monster._killRewarded=true
    if(monster.training){if(!this._trainingRewarded){this._trainingRewarded=true;this._gainExp(35,'training',this.abilitySystem.getStats());this.build.record('training','对准高度，羽刃命中！')}return}
    this.combat.onKill()
    this._addScore(monster.elite?25:3)
    const tint = monster.elite ? '255, 215, 0' : (monster.monsterType === 'bat' ? '176, 116, 238' : '110, 244, 166')
    this._spawnExplosion(monster.x + monster.width / 2, monster.y, tint, 12)
    this.abilityEffects.push({ kind: 'ring', x: monster.x + monster.width / 2, y: monster.y,
      vx: 0, vy: 0, life: 16, maxLife: 16, size: monster.width / 3, color: tint })
    const stats = this.abilitySystem.getStats()
    const isElite = !!monster.elite
    const killExp = isElite ? Config.MONSTER.KILL_EXP * Config.MONSTER.ELITE_EXP_MULT : Config.MONSTER.KILL_EXP
    this._gainExp(killExp, isElite ? 'elite_kill' : 'monster_kill', stats)
    this.monsterKills++  // [v1.4.0] §6.3 火力流击杀指标统计

    // [v1.5.0] 精英必掉：怪物位置掉 1 个随机道具（导弹权重×2）+ 高价值目标提示
    if (isElite) {
      if(monster.eliteKind==='stormcaller')this.weatherSystem.dispelElite()
      this.spawnSystem.spawnEliteDrop(monster.x + monster.width / 2, monster.y)
      this._addFloatingText(monster.x + monster.width / 2, monster.y - 30, '精英击杀!', Config.MONSTER.ELITE_BORDER_COLOR, 55)
    }

    // [v1.4.0] 拾荒者掉落（同屏怪物≤2 + 生成距离450px 天然限速，无需额外刹车）
    const scavLv = this.abilitySystem.owned.get('scavenger') || 0
    if (scavLv > 0 && Random.random() < Config.MONSTER.SCAVENGER_CHANCE_PER_LV * scavLv) {
      this.spawnSystem.spawnRandomItem()  // [v1.5.0] 生成决策迁入 SpawnSystem
      Logger.info('Item', '拾荒者掉落道具', { lv: scavLv })
    }

    Logger.info('Monster', '击杀怪物', { type: monster.monsterType, elite: isElite, exp: killExp })
  }

  // ==================== [v1.3.0] 导弹系统 ====================

  /**
   * [v1.3.0] 拾取导弹道具：从小鸟位置发射 1 枚导弹（拾取即触发）
   * [v1.4.0] 导弹挂架（missile_rack）：每次发射 +lv 枚扇形（"发射事件"级拦截，不区分导弹来源）
   * 实现坑已规避：MAX_ALIVE 先与挂架等级挂钩（3+lv），否则扇形瞬间占满上限、满级卡无效
   * [v1.4.0] opts.silent：自动来源（火力覆盖/导弹风暴连发）不弹"🚀 发射!"拾取文字
   * @param {Object} [opts] - { silent: boolean }
   */
  _fireMissile(opts) {
    const rackLv = this.abilitySystem.owned.get('missile_rack') || 0
    const maxAlive = Config.MISSILE.MAX_ALIVE + rackLv + (this.build.hasEvolution('missile')?1:0)  // [v1.4.0] 上限与挂架等级挂钩（同屏硬刹车）
    const count = 1 + rackLv+(this.build.hasEvolution('missile')?1:0)
    const batch=++this.combat.batch
    const target = this._pickMissileTarget()

    let fired = 0
    for (let i = 0; i < count; i++) {
      if (this.missiles.length >= maxAlive) break
      // 扇形角度：以水平向右为中心对称展开，步长 RACK_FAN_STEP
      const angleOffset = (i - rackLv / 2) * Config.MISSILE.RACK_FAN_STEP
      const missile = new Missile(this.bird.x + this.bird.width / 2, this.bird.y, target, angleOffset)
      missile.batch=batch
      this.missiles.push(missile)
      fired++
    }
    if (fired <= 0) return
    if(this.build.hasEvolution('missile')||this.build.specialization==='missile')this.build.record('missile','齐射 ×'+fired)

    if (!(opts && opts.silent)) {
      this._addFloatingText(
        this.bird.x, this.bird.y - 30,
        fired > 1 ? `🚀 发射x${fired}!` : '🚀 发射!',
        '#e67e22', 45
      )
    }
    Logger.info('Missile', '发射导弹', {
      count: fired,
      rackLv: rackLv,
      targetType: target ? target.type : 'none',
      x: Math.round(this.bird.x),
      y: Math.round(this.bird.y)
    })
  }

  /**
   * [v1.3.0] 导弹目标选择：存活怪物中最近者优先；无怪物选最近 destructible 管道；无目标直飞
   * @returns {Object|null}
   */
  _pickMissileTarget() {
    const chosen=this.combat.chooseTarget();if(chosen)return chosen
    // [v1.5.0] Boss 绝对优先（在场且可受击时全部火力锁定 Boss——章节高潮的火力聚焦）
    if (this.boss && this.boss.hp > 0 && this.boss.state !== 'entering' &&
        this.boss.state !== 'dying' && this.boss.state !== 'leaving') {
      return this.boss
    }

    let best = null
    let bestDist = Infinity

    // 怪物优先（曼哈顿距离最近）
    for (const m of this.monsters) {
      if (m.hp <= 0) continue
      const d = Math.abs(m.x - this.bird.x) + Math.abs(m.y - this.bird.y)
      if (d < bestDist) { bestDist = d; best = m }
    }
    if (best) return best

    // 无怪物：选小鸟前方最近的可破坏管道
    bestDist = Infinity
    for (const p of this.pipes) {
      if (!p.destructible || p.hp <= 0) continue
      if (p.x + p.width < this.bird.x) continue
      const d = p.x - this.bird.x
      if (d < bestDist) { bestDist = d; best = p }
    }
    return best
  }

  /**
   * [v1.3.0] 导弹更新与命中处理（速度随世界缩放，减速同步生效）
   * @param {number} scrollSpeed - 当前滚动速度
   */
  _updateMissiles(scrollSpeed) {
    const speedFactor = scrollSpeed / Config.GAME.SCROLL_SPEED
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i]
      missile.update(speedFactor)

      if (missile.isOffscreen(this.screenW, this.screenH)) {
        this.missiles.splice(i, 1)
        continue
      }

      if (this._checkMissileHit(missile)) {
        this.missiles.splice(i, 1)
      }
    }
  }

  /**
   * [v1.8.6] 导弹命中检测：所有可受弹对象按首次接触时间结算；锁定优先级只影响追踪
   * [v1.4.0] 猎手标记：导弹伤害 +lv，击杀触发连锁爆炸（硬规则：连锁击杀不再二次连锁）；
   *           蜂群链路：命中后 1.5s 窗内下一发 +1（叠层上限 1+lv 硬封顶，窗破清零）
   * @param {Missile} missile
   * @returns {boolean} true=命中（导弹销毁）
   */
  _checkMissileHit(missile) {
    const hunterLv = this.abilitySystem.owned.get('hunter_mark') || 0
    const linkLv = this.abilitySystem.owned.get('missile_link') || 0
    // 本次伤害 = 基础 + 猎手标记 + 蜂群链路当前叠层
    const damage = Config.MISSILE.DAMAGE + hunterLv + this.abilitySystem.missileLinkStacks

    const candidates = this.combat.targets().filter(t=>!t.isBoss ||
      !['entering','dying','leaving'].includes(t.state)).concat(
      this.pipes.filter(p=>p.destructible && p.hp>0))
    let target = null, firstTime = Infinity
    for (const candidate of candidates) {
      const time = missile.hitTime(candidate)
      if (time < firstTime) { firstTime = time; target = candidate }
    }
    if (!target) return false
    if (target.isMechanic) {
      target.takeDamage(damage);this._spawnExplosion(target.x,target.y,'180,240,180',8)
      if(this.boss && this.boss.hp<=0)this._onBossVictory('kill')
      return true
    }
    let killedMonster = null

    // Boss 命中保留猎手标记/屠龙者及同来源受击间隔，
    // 蜂群链路叠层对 Boss 不加成——防叠层秒杀 30HP 设计目标，D19）
    // [v1.5.0 D21] 对 Boss 伤害 ×MISSILE_DAMAGE_MULT（保底输出链与火力流共享）；
    // 受击间隔门在 Boss.takeDamage 内收敛同批多发（防弹幕级 DPS 秒杀）；
    // 每次命中（含被门挡下）都爆爆炸粒子+受击白闪，命中反馈可见、不"白打"
    if (target === this.boss) {
      const slayerLv = this.abilitySystem.owned.get('boss_slayer') || 0
      // [v1.5.0 D21] 系数只乘基础导弹伤害，猎手/屠龙者加成保持 1:1 flat（不削卡）：
      // 无卡 3/发、成型火力 6/发、满配 7/发——保底链与火力流的差距由命中频次拉开
      const bossDamage = Config.MISSILE.DAMAGE * Config.BOSS.MISSILE_DAMAGE_MULT + hunterLv + slayerLv
      this._spawnExplosion(missile.x, missile.y, '255, 200, 60', 8)
      const beforeHP = this.boss.hp
      this.combat.damageTarget(this.boss,bossDamage+(this.build.specialization==='missile'?1:0)+(this.build.apex===0&&this.build.specialization==='missile'?1:0)+(this.build.breakthroughs.missile_barrage||0),'missile',missile.batch)
      if(this.build.specialization==='missile'&&this.build.apex===1&&this.boss&&this.boss.hp>0)this.combat.fire(1,2,[0],'missile_after')


      // 蜂群链路命中 Boss 只续窗不叠层（火力转移到召唤物时保留节奏）
      if (linkLv > 0) {
        this.abilitySystem.missileLinkWindow = Config.MISSILE.LINK_WINDOW_FRAMES
      }
      if (this.boss.hp <= 0) {
        Logger.info('Boss', '导弹击杀 Boss', { name: this.boss.name, damage: bossDamage })
        this._onBossVictory()
      } else {
        Logger.debug('Missile', '命中 Boss', { hp: this.boss.hp, damage: bossDamage })
      }
      return true
    }

    if (target.type === 'monster') {
      this._damageObstacle(target, damage)
      if (target.hp <= 0) {
        killedMonster = target
        this._onMonsterKilled(target)
        const index = this.monsters.indexOf(target)
        if (index >= 0) this.monsters.splice(index, 1)
      } else {
        Logger.info('Missile', '命中怪物', { type: target.monsterType, hp: target.hp, damage })
      }
    } else {
      this._damageObstacle(target, damage)
      if (target.hp <= 0) {
        this._onPipeDestroyed(target)
        const index = this.pipes.indexOf(target)
        if (index >= 0) this.pipes.splice(index, 1)
      }
    }

    // [v1.4.0] 蜂群链路：任何命中都续窗+叠层（硬封顶 1+lv）
    if (linkLv > 0) {
      this.abilitySystem.missileLinkStacks = Math.min(
        this.abilitySystem.missileLinkStacks + 1, 1 + linkLv)
      this.abilitySystem.missileLinkWindow = Config.MISSILE.LINK_WINDOW_FRAMES
    }

    // [v1.4.0] 猎手标记：击杀连锁爆炸（半径 50+10*lv px）
    if (killedMonster && hunterLv > 0) {
      this._chainExplode(killedMonster, hunterLv)
    }
    return true
  }

  /**
   * [v1.4.0] 猎手标记连锁爆炸：击杀点 (50+10*lv)px 内其他怪物受 1 伤害
   * 硬规则（防指数回路）：连锁爆炸造成的击杀**不再**触发二次连锁——本函数内不递归调用自身；
   * 对 Boss 无效（isBoss 分支，v1.5.0 预留）
   */
  _chainExplode(center, hunterLv) {
    const radius = Config.MISSILE.HUNTER_CHAIN_BASE_RADIUS +
      Config.MISSILE.HUNTER_CHAIN_RADIUS_PER_LV * hunterLv
    const cx = center.x + center.width / 2
    const cy = center.y
    let chainKills = 0
    for (const m of this.monsters) {
      if (m.hp <= 0 || m.isBoss) continue
      const dx = m.x + m.width / 2 - cx
      const dy = m.y - cy
      if (dx * dx + dy * dy <= radius * radius) {
        m.takeDamage(1)
        if (m.hp <= 0) {
          chainKills++
          this._onMonsterKilled(m)  // 连锁击杀给经验/掉落，但不再触发连锁；尸体由 _updateMonsters 回收
        }
      }
    }
    this._spawnExplosion(cx, cy, '255, 200, 60', 10)
    Logger.info('Missile', '猎手标记连锁爆炸', { radius: radius, chainKills: chainKills })
  }

  /**
   * [v1.3.0] 障碍物受击 + 可选小半径 AoE（默认 AOE_RADIUS=0 不生效）
   * @param {Obstacle} target - 直接命中的目标
   * @param {number} damage - 伤害值
   */
  _damageObstacle(target, damage) {
    const before=target.hp
    target.takeDamage(damage)
    if(target.type==='monster') this.combat.chargeEndless(Math.max(0,before-Math.max(0,target.hp)))

    const radius = Config.MISSILE.AOE_RADIUS
    if (radius <= 0) return
    // AoE：对爆炸点周围其他可破坏障碍物造成同等伤害（不连锁触发 AoE）
    const tx = target.x + target.width / 2
    const ty = target.type === 'monster' ? target.y : target.topHeight + target.gap / 2
    for (const m of this.monsters) {
      if (m === target || m.hp <= 0) continue
      if (Math.abs(m.x + m.width / 2 - tx) <= radius && Math.abs(m.y - ty) <= radius) {
        m.takeDamage(damage)
      }
    }
  }

  /**
   * [v1.3.0] 管道被导弹炸毁：清除管道给通路 + 爆炸粒子 + 轻震屏
   */
  _onPipeDestroyed(pipe) {
    const cx = pipe.x + pipe.width / 2
    const cy = pipe.topHeight + pipe.gap / 2
    this._spawnExplosion(cx, cy, '140, 220, 80', 14)
    this.shakeFrames = Math.max(this.shakeFrames, 6)
    this.shakeIntensity = 3
    Logger.info('Missile', '炸毁管道', { x: Math.round(pipe.x), gapY: Math.round(cy) })
  }

  /**
   * [v1.3.0] 爆炸粒子（复用 abilityEffects 粒子数组，总量设上限避免性能问题）
   * @param {number} x - 爆炸中心X
   * @param {number} y - 爆炸中心Y
   * @param {string} color - 'r, g, b' 格式
   * @param {number} count - 粒子数
   */
  _spawnExplosion(x, y, color, count) {
    if (this.abilityEffects.length > 80) return  // 粒子上限保护
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
      const speed = 2 + Math.random() * 3
      this.abilityEffects.push({
        kind: 'dot',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 24,
        maxLife: 24,
        size: 2.5 + Math.random() * 2.5,
        color: color
      })
    }
  }

  // [v1.5.0] 随机道具生成（_spawnRandomItem/_rollItemType）与补给线保底（_updateSupplyLine，
  // 属道具生成职责）已迁入 systems/SpawnSystem.js → spawnRandomItem() / rollItemType() / updateSupplyLine()

  // ==================== 通过管道处理 ====================

  _addScore(points) {
    // Keep fractional pipe gains across awards; UI/storage continue to receive integers.
    const total = this._scoreRemainder + points * (this.chapterSystem.endless ? 2 : 1)
    const whole = Math.floor(total + 1e-9)
    this._scoreRemainder = Math.max(0, total - whole)
    this.score += whole
    if (this.onScoreChange) this.onScoreChange(this.score)
  }

  _onPipePass(pipe) {
    this.combat.onPipe()
    const stats = this.abilitySystem.getStats()

    // 得分
    const points = stats.scoreMultiplier
    this._addScore(points)

    // [v1.1.0] 管道计数
    this.pipesPassed++
    Logger.debug('Pipe', '通过管道', { pipesPassed: this.pipesPassed, score: this.score })

    // [v1.5.0] 章节进度：章内过管计数（与本章最短时间共同决定Boss触发）
    this.chapterSystem.onPipePassed()

    // [v1.1.4] 经验：只给通过管道经验（5→10），不再给经验球经验
    this._gainExp(Config.EXP.PIPE_PASS_EXP, 'pipe_pass', stats)

    // 连击
    if(!this.build.hasEvolution('graze'))this.abilitySystem.onPipePass()

    // [v1.4.0] 连击之心 Lv3 质变：无敌期间每过 1 管 +5exp（不延长无敌，奖励改经验不碰生存边）
    // 注：onPipePass 在无敌期不累计 combo（N1 修复），本经验奖励是 Lv3 的替代收益出口
    if ((this.abilitySystem.owned.get('combo_heart') || 0) >= 3 &&
        this.abilitySystem.invincibleFrames > 0) {
      this._gainExp(Config.ABILITY.COMBO_HEART_L3_EXP, 'combo_heart_l3', stats)
    }

    // [v1.4.0] 回响之翼：过管攒羽盾（上限 1+铁羽，全局硬顶 2）
    this.abilitySystem.onPipePassEchoWing()

    // [v1.1.0] 生成道具 [v1.1.3] 修复：在小鸟前方生成（右侧），不在后方（管道位置）
    // [v1.5.0] 掉落决策（25% 概率+位置+类型 roll）迁入 SpawnSystem，随机数消耗顺序不变
    this.spawnSystem.maybeSpawnItemOnPipePass()
  }

  // [v1.5.0] 道具类型权重随机（_rollItemType）已迁入 systems/SpawnSystem.js → rollItemType()

  // [v1.1.5] 擦边检测：每帧检查（小鸟在管道x范围内时），距离增大25px，防重复触发
  _checkNearMiss(pipe) {
    const birdTop = this.bird.y - this.bird.collisionHeight / 2
    const birdBottom = this.bird.y + this.bird.collisionHeight / 2
    const distToTopPipe = birdTop - pipe.topHeight
    const distToBottomPipe = pipe.bottomY - birdBottom
    const minDist = Math.min(distToTopPipe, distToBottomPipe)

    // [v1.4.0] 缩小射线 Lv5 质变：间隙封顶 Lv4，改擦边判定窗口 +10px
    const shrinkLv = this.abilitySystem.owned.get('shrink_ray') || 0
    const shrinkBonus = shrinkLv >= 3 ? Config.ABILITY.SHRINK_RAY_L5_NEAR_MISS_BONUS : 0

    // [v1.4.0] 幻影舞步：黄金窗（90帧）内擦边判定 ×2、经验 ×(2+lv)；
    // 硬规则：窗内擦边只刷新窗口、不叠加倍率（防指数回路）；窗口期金色残影在 update() 生成
    const phantomLv = this.abilitySystem.owned.get('phantom_edge') || 0
    const phantomActive = phantomLv > 0 && this.abilitySystem.phantomWindowFrames > 0

    let windowSize = Config.EXP.NEAR_MISS_DISTANCE + shrinkBonus
    if (phantomActive) windowSize *= 2

    if (minDist < windowSize && minDist > 0) {
      if(this._teleportGrace>0)return
      this.combat.onGraze()
      pipe.nearMissTriggered = true  // [v1.1.5] 防止同一管道重复触发
      const stats = this.abilitySystem.getStats()
      // 幻影舞步：窗内擦边经验 ×(2+lv)（独立乘区，走统一 _gainExp 保持共鸣/顿悟链路）
      this._gainExp(Config.EXP.NEAR_MISS_EXP, 'near_miss', stats, phantomActive ? (2 + phantomLv) : 1)
      if (phantomLv > 0) {
        this.abilitySystem.phantomWindowFrames = Config.ABILITY.PHANTOM_WINDOW_FRAMES  // 只刷新不叠加
      }
      this._addScore(Config.EXP.SCORE_NEAR_MISS)

      // [v1.4.0] 锐利目光：擦边后 60 帧碰撞箱 -15%/级（只改判定不改手感；
      // 生效时小鸟描边金色一闪——复用擦边粒子通道，否则玩家无感知，N7 教训）
      const edgeLv = this.abilitySystem.owned.get('edge_focus') || 0
      if (edgeLv > 0) {
        this.abilitySystem.edgeFocusFrames = Config.ABILITY.EDGE_FOCUS_FRAMES
        this.abilityEffects.push({
          kind: 'ring',
          x: this.bird.x,
          y: this.bird.y,
          vx: 0,
          vy: 0,
          life: 18,
          maxLife: 18,
          size: this.bird.width * 0.5,
          color: '255, 215, 0'  // 金色
        })
      }

      // [v1.1.4] 增强擦边特效：多环扩散 + 粒子爆发 + 闪光
      const effect = {
        x: this.bird.x,
        y: this.bird.y,
        rings: [
          { radius: 10, maxRadius: 55, life: 30, maxLife: 30, lineWidth: 3 },
          { radius: 8, maxRadius: 40, life: 24, maxLife: 24, lineWidth: 2 },
          { radius: 5, maxRadius: 25, life: 18, maxLife: 18, lineWidth: 4 }
        ],
        sparkles: [],
        flashLife: 12,
        flashMaxLife: 12,
        life: 30,
        maxLife: 30
      }

      // 生成8个粒子向外爆发
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4
        const speed = 2.5 + Math.random() * 2.5
        effect.sparkles.push({
          x: this.bird.x,
          y: this.bird.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 25,
          maxLife: 25
        })
      }

      this.nearMissEffects.push(effect)

      // [v1.1.4] 擦边浮动文字——向上偏移
      this._addFloatingText(this.bird.x, this.bird.y - 45, '擦边!', '#ffd700', 45)
    }
  }

  // [v1.1.4] 统一经验获取方法——所有经验来源都通过此方法，确保经验共鸣对所有经验生效
  // [v1.4.0] extraMult：幻影舞步黄金窗等来源的独立乘区（默认 1，不影响存量调用）
  _gainExp(baseExp, source, stats, extraMult) {
    let exp = baseExp
    let doubled = false

    // Boss礼包是固定额度，不再吃共鸣或经验倍率，防一次奖励连升几十级。
    const fixed=source==='boss_gift'||source==='endless_boss'
    if (!fixed && this.abilitySystem.checkExpResonance()) {
      exp = baseExp * 2
      doubled = true
    }

    const multiplied = this.expSystem.addExp(exp, fixed?1:stats.expMultiplier * (extraMult || 1), !fixed)

    // 浮动文字——堆叠不重叠
    const text = `+${multiplied} EXP${doubled?' 共鸣!':''}`
    const color = doubled ? '#9b59b6' : '#ffd700'
    this._addFloatingText(this.bird.x, this.bird.y - 30, text, color, 50)

    Logger.info('Exp', '获得经验', {
      source: source,
      base: baseExp,
      doubled: doubled,
      multiplied: multiplied,
      level: this.expSystem.level
    })

    if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())
  }

  // ==================== 经验球拾取 ====================

  _collectOrb() {
    const stats = this.abilitySystem.getStats()
    this._gainExp(Config.EXP.ORB_EXP, 'orb', stats)
    this._addScore(Config.EXP.SCORE_PER_ORB)
  }

  // [v1.1.0] 道具拾取
  _collectItem(item) {
    Logger.info('Item', '拾取道具', { type: item.type, x: item.x, y: item.y })
    switch (item.type) {
      case 'exp_pack': {
        const expGain = Config.ITEM.EXP_PACK_MIN +
          Math.floor(Random.random() * (Config.ITEM.EXP_PACK_MAX - Config.ITEM.EXP_PACK_MIN + 1))
        const stats = this.abilitySystem.getStats()
        this._gainExp(expGain, 'exp_pack', stats)
        break
      }
      case 'health_pack': {
        if (this.abilitySystem.hp < this.abilitySystem.maxHp) {
          if(this.abilitySystem.healHP(1)>0)this._addFloatingText(this.bird.x, this.bird.y - 30, '+1 HP', '#e74c3c', 50)
          else this._addFloatingText(this.bird.x, this.bird.y - 30, '补给冷却中', '#ffe0a0', 35)
        } else {
          // 满血时转化为分数
          this._addScore(5)
          this._addFloatingText(this.bird.x, this.bird.y - 30, '+' + (this.chapterSystem.endless ? 10 : 5) + ' 分', '#e74c3c', 50)
        }
        break
      }
      case 'shield_pack': {
        // [v1.1.5] 统一护盾：添加1层护盾（不超过最大层数）
        const a=this.abilitySystem,before=a.shieldLayers,temp=a.tempHp
        const gained=a.addShieldLayer(1)
        const text=a.shieldLayers>before?'护盾+1 · 现'+a.shieldLayers+'层':a.tempHp>temp?'满盾转临时生命':gained===0&&a.canReceiveShield()?'补给冷却中':'护盾已满'
        this._addFloatingText(this.bird.x, this.bird.y - 30, text, '#a4deef', 50)
        break
      }
      case 'speed_pack': {
        this.abilitySystem.setSpeedPack(Config.ITEM.SPEED_PACK_DURATION)
        this._addFloatingText(this.bird.x, this.bird.y - 30, '减速!', '#1abc9c', 50)
        break
      }
      case 'missile': {
        // [v1.3.0] 导弹：拾取即发射（弱追踪，怪物优先）
        // [v1.4.0] 导弹风暴：拾取改 (4+lv)s 连发（每秒2枚，AbilitySystem 计时 fx 节拍）；
        // 期间再拾取刷新时长（不叠加）；连发期间道具权重不变（防自喂养回路）
        const stormLv = this.abilitySystem.owned.get('missile_storm') || 0
        if (stormLv > 0) {
          this.abilitySystem.missileStormFrames =
            (Config.MISSILE.STORM_BASE_SEC + Config.MISSILE.STORM_SEC_PER_LV * stormLv) * 60
          this.abilitySystem._missileStormTick = 0
          this._addFloatingText(this.bird.x, this.bird.y - 42, '导弹风暴!', '#e67e22', 55)
        }
        this._fireMissile()
        break
      }
    }
  }

  // [v1.1.0] 添加浮动文字 [v1.1.4] 堆叠不重叠 + 向上移动渐隐
  _addFloatingText(x, y, text, color, life) {
    // [v1.1.4] 检查附近的浮动文字数量，向上偏移避免叠加
    let stackCount = 0
    for (const t of this.floatingTexts) {
      if (Math.abs(t.x - x) < 40 && Math.abs(t.y - y) < 30) {
        stackCount++
      }
    }
    const yOffset = stackCount * 18

    this.floatingTexts.push({
      x: x,
      y: y - yOffset,
      text: text,
      color: color,
      life: life,
      maxLife: life,
      vy: -1.5,              // 向上移动速度
      vyDecay: 0.02          // [v1.1.4] 速度衰减使末段减速
    })
  }

  // ==================== 碰撞处理 [v1.1.0] HP系统 ====================

  _isVictoryProtected() {
    return this._bossVictoryProtectionFrames > 0 || this._bossRewardPending
  }

  /**
   * 碰撞事件处理：无敌 > 时间扭曲 > 羽盾 > 统一护盾(弹力护盾优先) > 扣血(临时HP优先) > 凤凰 > 死亡
   * [v1.1.5] 统一护盾系统：shieldLayers > 0时消耗一层，
   *           若拥有弹力护盾则弹开，否则仅抵挡。
   * [v1.4.0] §2.6 受击链新节点：铁喙（怪物碰撞的无敌帧反杀分支，最前置，仅怪物）；
   *           羽盾（回响之翼/铁羽，最前置防御节点，破盾给无敌帧）；
   *           镜面护盾（护盾层消耗时冲击波，挂在 consumeShield 内）；
   *           超载神盾（临时HP先于HP扣减，挂在 takeDamage 内）；
   *           血契（maxHp 修正，挂在 _recalcMaxHp）；
   *           求生本能（HP 扣减后补盾，挂在 takeDamage 内，凤凰之前）
   * @param {Object} [pipe] - 碰撞的管道/怪物对象（用于判断弹开方向），地面/天花板碰撞时不传
   * @returns {boolean} true=游戏结束, false=继续
   */
  _handleCollision(pipe) {
    if (this._isVictoryProtected()) return false
    if(pipe && pipe.training)return false
    // [v1.4.0] 铁喙：受击无敌帧期间撞怪反杀且免伤（对管道无效；对 Boss 免疫，isBoss 分支预留）
    if (pipe && pipe.type === 'monster' && !pipe.isBoss &&
        this.abilitySystem.invincibleFrames > 0) {
      const beakLv = this.abilitySystem.owned.get('iron_beak') || 0
      if (beakLv > 0) {
        pipe.takeDamage(beakLv)
        this._addFloatingText(pipe.x + pipe.width / 2, pipe.y - 20, '铁喙反杀!', '#ffaa00', 40)
        Logger.info('Monster', '铁喙反杀', { type: pipe.monsterType, damage: beakLv, hp: pipe.hp })
        if (pipe.hp <= 0) {
          this._onMonsterKilled(pipe)  // 尸体由 _updateMonsters 的 hp<=0 分支回收
        }
        this.bird.invincibleBlink = 20
        return false  // 免伤
      }
    }

    // 无敌状态
    if (this.abilitySystem.invincibleFrames > 0) {
      Logger.debug('Collision', '无敌中，忽略碰撞', { invincibleFrames: this.abilitySystem.invincibleFrames })
      this.bird.invincibleBlink = 20
      return false
    }

    // 时间扭曲激活中
    if (this.abilitySystem.timeWarpActive > 0) {
      Logger.debug('Collision', '时间扭曲中，忽略碰撞')
      this.bird.invincibleBlink = 20
      return false
    }

    const piercing=!!(pipe && pipe.piercing)
    // 穿盾保留厚皮、受击无敌、时间扭曲与凤凰；只跳过羽盾和普通护盾。
    // [v1.5.0] C7 厚皮（thick_skin）：0.3/级概率格挡怪系伤害（怪物/召唤物/Boss本体/羽刃弹幕；
    // 管道/地面/天花板不格挡——C7 是"怪系生存卡"）。位置：时间扭曲之后、羽盾之前（廉价概率节点前置，
    // 保住稀缺的羽盾/护盾层）。格挡成功断连击（与羽盾 N1 同语义，受击链内被命中即断）
    if (pipe && (pipe.type === 'monster' || pipe.type === 'boss' || pipe.type === 'feather')) {
      const thickLv = this.abilitySystem.owned.get('thick_skin') || 0
      if (thickLv > 0 && Random.random() < Config.ABILITY.THICK_SKIN_BLOCK_PER_LV * thickLv) {
        this.abilitySystem.resetCombo()
        this.bird.invincibleBlink = 20
        this.shakeFrames = 4
        this.shakeIntensity = 2
        this._addFloatingText(this.bird.x, this.bird.y - 30, '厚皮格挡!', '#cd7f32', 40)
        Logger.info('Ability', '厚皮格挡', { lv: thickLv, source: pipe.type })
        return false
      }
    }

    // [v1.4.0] 羽盾（回响之翼/铁羽）：§2.6 受击链最前置防御节点——挡 1 次伤害；
    // 铁羽：破羽盾给 30 帧/级无敌（consumeFeatherShield 内结算）；消耗断连击（N1 同语义）
    if (!piercing && this.abilitySystem.consumeFeatherShield()) {
      this.bird.invincibleBlink = 20
      this.shakeFrames = 4
      this.shakeIntensity = 2
      return false
    }

    // [v1.1.5] 统一护盾——消耗一层护盾
    if (!piercing && this.abilitySystem.shieldLayers > 0) {
      const hasBounceShield = (this.abilitySystem.owned.get('bounce_shield') || 0) > 0
      this.abilitySystem.consumeShield()

      if (hasBounceShield) {
        // [v1.1.5] 弹力护盾——向碰撞反方向弹出
        if (pipe) {
          // 管道碰撞：根据小鸟在管道间隙中的位置判断弹开方向
          const gapCenter = pipe.topHeight + pipe.gap / 2
          if (this.bird.y < gapCenter) {
            // 小鸟偏上——向下弹
            this.bird.velocity = Math.abs(this.bird.flapForce) * Config.SHIELD.BOUNCE_VEL_DOWN
          } else {
            // 小鸟偏下——向上弹
            this.bird.velocity = this.bird.flapForce * Config.SHIELD.BOUNCE_VEL_UP
          }
        } else {
          // 地面/天花板碰撞
          if (this.bird.y < this.screenH * 0.12) {
            this.bird.velocity = Math.abs(this.bird.flapForce) * Config.SHIELD.BOUNCE_VEL_DOWN
          } else {
            this.bird.velocity = this.bird.flapForce * Config.SHIELD.BOUNCE_VEL_UP
          }
        }
        this.bird.invincibleBlink = 20
        this.abilitySystem.invincibleFrames = 20
        this.shakeFrames = 4
        this.shakeIntensity = 2
        this._addFloatingText(this.bird.x, this.bird.y - 25, '弹开 · 剩'+this.abilitySystem.shieldLayers+'层盾', '#3498db', 35)
        Logger.info('Collision', '弹力护盾弹开', { shieldLayers: this.abilitySystem.shieldLayers })
      } else {
        // 普通护盾抵挡
        this.bird.invincibleBlink = 30
        this.abilitySystem.invincibleFrames = 60
        this.shakeFrames = 6
        this.shakeIntensity = 3
        this._addFloatingText(this.bird.x, this.bird.y-30, '护盾抵挡 · 剩'+this.abilitySystem.shieldLayers+'层', '#a4deef', 40)
        Logger.info('Collision', '护盾抵挡', { shieldLayers: this.abilitySystem.shieldLayers })
      }
      return false
    }

    // [v1.1.0] 扣血
    this.combat.grazeCharge=Math.min(this.combat.grazeCharge,this.abilitySystem.owned.get('combo_seed')?2:0)
    this._lastDamage={source:pipe?(pipe.piercing?'穿盾区域':pipe.isBoss?'Boss碰撞':pipe.type==='monster'?'怪物碰撞':pipe.type==='feather'?'敌方弹幕':'管道边缘'):(this.bird.y<this.screenH*.2?'天花板':'地面'),frame:this.gameTime}
    const dead = this.abilitySystem.takeDamage()
    this.damageFlash = 15   // 红屏闪烁
    this.shakeFrames = 8
    this.shakeIntensity = 4
    this.bird.invincibleBlink = 30
    this.abilitySystem.invincibleFrames = this.abilitySystem.getInvincibleFrames(this.chapterSystem.isBossActive())

    if (dead) {
      // 凤凰复活
      if (this.abilitySystem.tryPhoenix()) {
        this._startPhoenixRevive()
        return false
      }

      // [v1.5.0] Boss 战战败保护（方案A，D19）：致死一击已走完整受击链（上方格挡/羽盾/护盾
      // 均未拦住），HP 真归零时不 gameover——HP 钳 1 + 无敌 120 帧 + Boss 长鸣离场，20 管后满血回归。
      // 边界：maxHp===1（血契流）无血可扣不兜底（方案原文"战败=死"）；凤凰优先（上方已判）。
      if (this.chapterSystem.isBossActive() && this.abilitySystem.maxHp > 1) {
        return this._onBossDefeat()
      }

      // 真正死亡
      this._gameOver()
      return true
    }

    // 存活但受伤
    Logger.info('Collision', '受到伤害', { hp: this.abilitySystem.hp, maxHp: this.abilitySystem.maxHp })
    this._addFloatingText(this.bird.x, this.bird.y - 20, piercing?'穿盾受伤！':'受伤！', piercing?'#ff66df':'#ff4444', 40)
    return false
  }

  _checkActiveAbilities() {
    const birdRight = this.bird.x + this.bird.collisionWidth / 2

    for (const pipe of this.pipes) {
      if (pipe.x > birdRight || pipe.x + pipe.width < this.bird.x - this.bird.collisionWidth / 2 - 30) {
        continue
      }

      const birdTop = this.bird.y - this.bird.collisionHeight / 2
      const birdBottom = this.bird.y + this.bird.collisionHeight / 2
      const distToTop = birdTop - pipe.topHeight
      const distToBottom = pipe.bottomY - birdBottom
      const minDist = Math.min(distToTop, distToBottom)

      if (minDist < 8 && minDist > 0) {
        // [v1.2.2] N4 瞬移（史诗）优先判定，解除时间扭曲对瞬移的遮蔽；
        // 二者独立CD，各自可触发
        if (this.abilitySystem.tryTeleport()) {
          this._teleportGrace=30
          this.bird.y = pipe.topHeight + pipe.gap / 2
          this.bird.velocity = 0
          this.bird.invincibleBlink = 30
          this.abilitySystem.invincibleFrames = 30  // [v1.1.2] 瞬移后给实际无敌帧防止立即再碰撞
          return
        }

        if (this._activateTimeWarp()) return
      }
    }
    // Boss 清场后没有管道；让时间扭曲/时之晶也能响应真正临近的怪物和弹幕。
    if (this.abilitySystem.invincibleFrames > 0 || this.abilitySystem.timeWarpActive > 0) return
    const b = this.bird
    const threatened = this.feathers.some(f => f.age < (f.warn || 0)-8 ? false : f.kind === 'beam'
      ? f.age >= f.warn - 8 && Math.abs(b.y-f.y) < f.radius+20
      : f.isSandWall
      ? f.x < b.x + 45 && f.x + f.width > b.x - 20 && (b.y - 20 < f.topHeight || b.y + 20 > f.bottomY)
      : Math.hypot(f.x - b.x, f.y - b.y) < 45) ||
      this.monsters.some(m => m.hp > 0 && Math.hypot(m.x + m.width / 2 - b.x, m.y - b.y) < 55) ||
      (this.boss && this.boss.isCharging() && Math.abs(this.boss.x - b.x) < 85 && Math.abs(this.boss.y - b.y) < 55)
    if (threatened) this._activateTimeWarp()
  }

  // 管道和怪系威胁共用触发与时之晶派生效果。
  _activateTimeWarp() {
    if (!this.abilitySystem.tryTimeWarp()) return false
    const lv = this.abilitySystem.owned.get('time_crystal') || 0
    if (lv > 0) this.abilitySystem.timeCrystalFreezeFrames = Math.round(
      lv * 45)
    this._addFloatingText(this.bird.x, this.bird.y - 40,
      lv > 0 ? '时之晶·冻结!' : '时间扭曲!', '#aee6ff', 50)
    return true
  }

  // 凤凰复活动画
  _startPhoenixRevive() {
    this.phoenixAnim = {
      phase: 'pause',      // 'pause' → 'revive' → null
      timer: 60,           // 暂停60帧(1s)
      maxTimer: 60,
      particles: []
    }
    Logger.info('Ability', '凤凰复活动画开始', { phoenixUsed: this.abilitySystem.phoenixUsed })
  }

  _updatePhoenixAnim() {
    const anim = this.phoenixAnim
    if (!anim) return

    anim.timer--

    if (anim.phase === 'pause') {
      // 暂停阶段：等待计时结束
      if (anim.timer <= 0) {
        // 进入复活动画阶段
        anim.phase = 'revive'
        anim.timer = 30
        anim.maxTimer = 30

        // 重置小鸟到屏幕中间
        const birdX = this.screenW * Config.BIRD.X_RATIO
        const birdY = this.screenH * 0.45
        this.bird.reset(birdX, birdY)
        this.bird.invincibleBlink = 60
        this.abilitySystem.invincibleFrames = 120

        // 生成火凤凰粒子
        for (let i = 0; i < 20; i++) {
          const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3
          const speed = 2 + Math.random() * 3
          anim.particles.push({
            x: birdX,
            y: birdY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30,
            maxLife: 30,
            size: 3 + Math.random() * 4,
            color: Math.random() < 0.5 ? '#ff6600' : '#ffaa00'
          })
        }
      }
    } else if (anim.phase === 'revive') {
      // 复活动画阶段：更新粒子
      for (let i = anim.particles.length - 1; i >= 0; i--) {
        const p = anim.particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.95
        p.vy *= 0.95
        p.life--
        if (p.life <= 0) {
          anim.particles.splice(i, 1)
        }
      }

      if (anim.timer <= 0) {
        // 动画结束，恢复游戏
        this.phoenixAnim = null
        this._addFloatingText(this.bird.x, this.bird.y, '复活!', '#ff6600', 60)
        Logger.info('Ability', '凤凰复活完成')
      }
    }
  }

  _drawPhoenixAnim() {
    FX.phoenix(this)
  }

  // ==================== 游戏结束 ====================

  _gameOver() {
    Logger.warn('Game', '游戏结束', {
      score: this.score,
      bestScore: this.bestScore,
      level: this.expSystem.level,
      pipesPassed: this.pipesPassed,
      gameTime: this.gameTime,
      abilities: this.abilitySystem.getOwnedList().map(a => `${a.def.id}:L${a.level}`)
    })
    Storage.clearRun()
    this.report={version:'1.9.0',victory:this.victory,score:this.score,specialization:this.build.route()?.name||'尚未专精',components:[...this.abilitySystem.owned].filter(([id])=>Rules.components.includes(id)).map(([id,level])=>({name:AbilityRegistry.get(id).name,level})),evolutions:this.build.evolutions.map(id=>Rules.evolutions.find(e=>e.id===id).name),chapters:this.chapterSystem.cleared.size,highlight:this.build.events.slice(-1)[0]?.text||'坚持飞行 '+Math.floor(this.gameTime/60)+'秒',cause:this.victory?'六章胜利':this._lastDamage?.source||'本次旅程结束',timings:{...this.timings}}
    Storage.saveReport(this.report)
    this.state = Config.GAME.STATE.GAME_OVER
    this.shakeFrames = 12
    this.shakeIntensity = 6
    this.damageFlash = 20
    this.abilitySystem.resetCombo()

    if (this.score > this.bestScore) {
      this.bestScore = this.score
    }
    if (this.onGameOver) {
      this.onGameOver(this.score, this.bestScore, this.expSystem.level, this.abilitySystem.getOwnedList())
    }
  }

  // ==================== 渲染逻辑 ====================

  render() {
    const ctx = this.ctx

    let shakeX = 0, shakeY = 0
    if (this.shakeFrames > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity
      shakeY = (Math.random() - 0.5) * this.shakeIntensity
    }

    ctx.save()
    ctx.translate(shakeX, shakeY)

    this._drawBackground()
    this._drawClouds()
    this._drawChapterScenery()   // [v1.5.0] 章节背景元素（Ch2 沙漠：太阳/沙丘/热浪；Ch1 无新增，零变化）

    // [v1.1.0] 速度包边框特效
    if (this.abilitySystem.speedPackFrames > 0) {
      this._drawSpeedPackBorder()
    }

    for (const pipe of this.pipes) pipe.render(ctx)
    this._drawPipeSense()   // [v1.4.0] 管感：高亮下一根管道间隙
    // HUD under combat entities: even an enemy/player entering the header stays visible.
    ctx.save()
    ctx.translate(-shakeX, -shakeY)
    this._drawHUD()
    ctx.restore()

    const weatherGameCtx = this._buildGameCtx()
    weatherGameCtx.artTop = Art.layout(this).headerBottom
    weatherGameCtx.artFrame = this.frameCount
    this.weatherSystem.render(ctx, this.screenW, this.screenH, weatherGameCtx, 'ambient')

    for (const monster of this.monsters) monster.render(ctx)   // [v1.3.0]
    if (this.boss) this.boss.render(ctx)                       // [v1.5.0] Boss 本体（含冲锋预警/阶段变色）
    for (const f of this.feathers) f.render(ctx)               // [v1.5.0] Boss 羽刃弹幕
    for (const missile of this.missiles) missile.render(ctx)   // [v1.3.0]
    for (const orb of this.orbs) orb.render(ctx)
    for (const item of this.items) item.render(ctx)   // [v1.1.0]

    this._drawNearMissEffects()

    // [v1.1.1] 能力光环特效（磁吸/狂暴/时间扭曲）
    this._drawAbilityAuras()

    // [v1.2.2] N7 能力内联特效（自愈十字/护盾环/二段跳尾迹）
    this._drawAbilityEffects()

    // Physical hail remains in the foreground; ambient rain/wind are below targets.
    this.weatherSystem.render(ctx, this.screenW, this.screenH, weatherGameCtx, 'hazards')

    // [v1.1.5] 统一护盾：传递护盾层数给Bird渲染
    const shieldLayers = this.abilitySystem.shieldLayers
    this.bird.render(ctx, shieldLayers)
    this.combat.render(ctx)

    this._drawGround()
    ctx.restore()

    // [v1.2.0] 凤凰复活动画渲染（在震动恢复后，覆盖层之前）
    if (this.phoenixAnim) {
      this._drawPhoenixAnim()
    }

    // [v1.1.0] 受击红屏
    if (this.damageFlash > 0) {
      FX.damage(this)
    }

    this._drawDangerBorder()

    // [v1.1.0] 浮动文字
    this._drawFloatingTexts()

    // Status and inventory stay in the ground strip, outside the combat field.
    Art.footer(this)

    // [v1.5.0] 章节转场演出覆盖层（§4.3：白闪/色带擦除/标题卡，覆盖世界与 HUD）
    if (this.chapterSystem.isTransitioning()) {
      this._drawChapterTransition()
    }

    // [v1.5.0] Boss 出场演出覆盖层（§4.11：暗角收拢30帧，gather/enter 阶段保持半暗角聚焦）
    if (this.chapterSystem.isBossIntro()) {
      this._drawBossIntro()
    }

    // 状态覆盖层
    if (this.state === Config.GAME.STATE.READY) {
      this._drawReadyOverlay()
    } else if (this.state === Config.GAME.STATE.UPGRADING) {
      this._drawUpgradeOverlay()
    } else if (this.state === Config.GAME.STATE.GAME_OVER) {
      this._drawGameOverOverlay()
    }
  }

  _drawDangerBorder() {
    FX.danger(this)
  }

  _drawBackground() {
    Art.background(this)
  }

  _drawClouds() {
    // Clouds are painted into the six chapter background tiles.
  }

  // [v1.5.0] 章节像素背景与轻量环境粒子
  _drawChapterScenery() {
    Art.scenery(this)
  }

  /**
   * [v1.5.0] 章节转场演出（§4.3）：白闪10帧 → 色带擦除60帧（新章底色从左推入）
   * → 标题卡90帧（"第二章 · 沙漠" + 副标）。转场期间世界冻结（update 只推进转场计时）。
   */
  _drawChapterTransition() {
    Art.transition(this)
  }

  /**
   * [v1.5.0] Boss 出场演出覆盖层（§4.11）：暗角收拢 30 帧（四周黑色径向压迫）
   * → gather/enter 阶段保持半强度暗角聚焦战场；"雷云聚集……"文案由 ChapterSystem 浮动文字呈现。
   */
  _drawBossIntro() {
    Art.intro(this)
  }

  /**
   * [v1.5.0] Boss 血条（§4.9）：顶部居中宽 60% 高 10px，金色描边；
   * P2 填充变红 + 名称后缀"·怒"。entering/dying 期血条照常显示（演出可见性）。
   * @param {number} cx - 中心 X
   * @param {number} cy - 中心 Y
   */
  _drawBossHPBar(cx, cy) {
    Art.bossHP(this, cx, cy)
  }

  // [v1.1.0] 速度包边框特效
  _drawSpeedPackBorder() {
    FX.speed(this)
  }

  /**
   * [v1.4.0] 管感（pipe_sense）：高亮下一根管道间隙
   * Lv1 间隙金色轮廓；Lv2 追加间隙中心 ±30px 半透明安全区渐亮带。
   * 高亮必须淡（alpha ≤0.35，取 SENSE_ALPHA=0.3），浓了会遮蔽擦边金环的视觉优先级；
   * 安全区宽度固定 ±30px，不随等级扩大（避免变成"自动驾驶线"）。
   * 纯信息卡、零数值。
   */
  _drawPipeSense() {
    FX.sense(this)
  }

  // [v1.1.4] 增强擦边特效：多环扩散 + 粒子爆发 + 中心闪光
  _drawNearMissEffects() {
    FX.near(this)
  }

  // [v1.1.1] 能力光环特效
  _drawAbilityAuras() {
    FX.auras(this)
  }

  /**
   * [v1.2.2] N7 能力内联特效渲染（粒子/扩散环，与擦边特效同风格）
   */
  _drawAbilityEffects() {
    FX.effects(this)
  }

  // [v1.1.0] 浮动文字渲染 [v1.1.4] 渐隐效果优化
  _drawFloatingTexts() {
    FX.floats(this)
  }

  _drawGround() {
    Art.ground(this)
  }

  // ==================== HUD 渲染 [v1.1.1] 重构布局 ====================

  _drawHUD() {
    Art.hud(this)
  }

  // [v1.1.1] HP 心形渲染——固定两行像素心形
  // [v1.4.0] 超载神盾：临时HP 以黄色实心心形接在普通红心之后
  _drawHPHearts(x, y, size, gap) {
    Art.heartHUD(this, x, y, size)
  }

  // ==================== 触摸交互 ====================

  handleTouchStart(x, y) { Art.touchStart(this, x, y) }
  handleTouchMove(x, y) { Art.touchMove(this, x, y) }
  handleTouchEnd(x, y) { Art.touchEnd(this, x, y) }
  handleTouchCancel() { this._choiceGesture = null }

  handleTouch(x, y) {
    if (this.state === Config.GAME.STATE.READY) {
      const b=this._resumeBounds
      if(b&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){this.resumeRun();return}
      this.flap()
    } else if (this.state === Config.GAME.STATE.PLAYING) {
      this.flap()
    } else if (this.state === Config.GAME.STATE.UPGRADING) {
      if (this._cardBounds) {
        for (const card of this._cardBounds) {
          if (x >= card.x && x <= card.x + card.w &&
              y >= card.y && y <= card.y + card.h) {
            this._choiceSelected=card.id;this._choiceSelectedAt=Date.now()
            return
          }
        }
      }
    } else if (this.state === Config.GAME.STATE.GAME_OVER) {
      // [v1.1.1] 仅按钮可交互，点击其他区域无效
      if (this._restartBtnBounds) {
        const b = this._restartBtnBounds
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          this.restart()
          return
        }
      }
      if (this._homeBtnBounds) {
        const b = this._homeBtnBounds
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          this.backToReady()
          return
        }
      }
      // 点击其他区域不做任何操作
    }
  }

  // ==================== 覆盖层渲染 ====================

  _drawReadyOverlay() {
    Art.ready(this)
  }

  _drawUpgradeOverlay() {
    Art.upgrade(this)
  }

  /**
   * [v1.4.0] 选牌灰显：缺前置卡的能力灰显提示（仍可点选，只是无效——保住构筑主权）
   * [v1.5.1] 改读 Config.ABILITY.PREREQUISITES 单一事实源（原硬编码两卡）；
   *           依赖卡前置未持有时已不进抽卡池（AbilityRegistry 统一过滤），
   *           本灰显仅作兜底（如未来新增直发面板旁路抽卡池的路径），正常路径不再触达。
   * 铁羽需回响之翼（无则羽盾来源不存在）；时之晶需时间扭曲（寄生同一触发点，无则无触发位）
   * @returns {string|null} 灰显原因
   */
  _getCardGreyReason(id) {
    const prereq = Config.ABILITY.PREREQUISITES[id]
    if (!prereq) return null
    if (this.abilitySystem.owned.get(prereq) > 0) return null
    const def = AbilityRegistry.get(prereq)
    return '需' + (def ? def.name : prereq)
  }

  /**
   * [v1.4.0] 风暴驯化互斥（D7）：已驯化天气对应的作废卡加"已驯化"标记（冰晶/顺风耳/雨衣）
   */
  _isCardTamedMutex(id) {
    const tamed = this.weatherSystem.tamedWeather
    if (!tamed) return false
    const mutex = Config.ABILITY.TAMED_MUTEX[tamed]
    return !!mutex && mutex.indexOf(id) >= 0
  }

  _drawCard(x, y, w, h, def, currentLevel, extras) {
    Art.card(this.ctx, { x, y, w, h }, def, currentLevel, extras || {})
  }

  // [v1.1.0] 结算界面重设计
  _drawGameOverOverlay() {
    Art.gameover(this)
  }


}

Object.assign(Game.prototype, require('../systems/Progression'),require('../systems/RunClock'))
module.exports = Game
