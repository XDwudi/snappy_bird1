/**
 * 1.8.0 六章进度：每章同时达到管数与最低有效时间后迎战。
 * 剧情战败只重赛，不跳章；六章分别获胜（生存或击杀）后进入无尽。
 * 无尽独立计时、随机Boss，章节/出场/选卡期间世界与难度钟冻结。
 */

const Config = require('../config/GameConfig.js')
const endlessScaling = require('./EndlessScaling.js')
const Logger = require('./GameLogger.js')

class ChapterSystem {
  /**
   * @param {Object} deps - 依赖注入（全部由 Game 提供）
   * @param {function():number} deps.getGameTime - 当前游戏时间（帧）
   * @param {function(number,number,string,string,number)} deps.addFloatingText - 浮动文字
   * @param {function(Object|null)} deps.setSpawnMods - 注入 SpawnSystem.setChapterModifiers
   * @param {function(boolean)} deps.setBossActive - 注入 SpawnSystem.setBossActive
   * @param {function(number)} deps.grantInvincible - 转场结束给无敌帧（帧数）
   * @param {function(boolean)} deps.setWeatherFrozen - [步骤C] 天气计时冻结开关（§4.7）
   * @param {function()} deps.spawnBoss - [步骤C] 出场演出 enter 阶段创建 Boss 实体（Game 侧）
   * @param {function()} deps.onChapterEnd - [步骤C] 本章终结钩子（回响消散等，转场前调用）
   * @param {function(number)} deps.onChapterEnter - [步骤C] 进入新章钩子（旅者/回响/章节之主，toIndex）
   * @param {number} deps.screenW - 逻辑屏幕宽度（浮动文字定位）
   * @param {number} deps.screenH - 逻辑屏幕高度
   */
  constructor(deps) {
    this._deps = deps
    this.endless = false
    this.endlessFrames = 0
    this.nextBossAt = 35 * 60
    this.endlessBossIndex = 0
    this.cleared = new Set()
    this.index = 0                 // 当前章节下标（CHAPTERS.LIST，0=Ch1）
    this.pipesPassed = 0           // 章内过管计数（过章清零）
    this.chapterTime = 0           // 章内计时（帧，过章清零）
    this._bossTriggered = false    // 本章 Boss 触发点已触发（每章一次）
    this._bossActive = false       // Boss 战进行中（出场演出结束→Boss 离场/死亡）
    this._bossIntro = null         // null | { phase:'vignette'|'gather'|'enter', frame }（§4.11 出场演出）
    this._bossDefeatCount = 0      // 本章失败次数；失败不会跳章
    this._awaitingRematch = false  // [步骤C] 等待 20 管后 Boss 回归
    this._bossReturnAt = 0         // [步骤C] 回归触发管数（章内计数）
    this._transition = null        // null | { phase:'flash'|'wipe'|'title', frame, toIndex }
    this._pipeLerp = null          // null | { frame, from, to }（from/to 为 {body,highlight,shadow}）
  }

  // ==================== 生命周期 ====================

  /** 重置到 Ch1（Game.start / backToReady 时调用）；注入第一章生成配置 */
  reset() {
    this.endless = false
    this.endlessFrames = 0
    this.nextBossAt = 35 * 60
    this.endlessBossIndex = 0
    this.cleared = new Set()
    this.index = 0
    this.pipesPassed = 0
    this.chapterTime = 0
    this._bossTriggered = false
    this._bossActive = false
    this._bossIntro = null
    this._bossDefeatCount = 0
    this._awaitingRematch = false
    this._bossReturnAt = 0
    this._transition = null
    this._pipeLerp = null
    this._deps.setSpawnMods(this.getMods())
    this._deps.setBossActive(false)
    if (this._deps.setWeatherFrozen) this._deps.setWeatherFrozen(false)
  }

  // ==================== 查询出口 ====================

  /** 当前章节配置 */
  getChapter() { return Config.CHAPTERS.LIST[this.index] }

  /** 章节难度修正（Game._getScrollSpeed/_getGapSize 每帧读取；Ch1 全零，加 0 精确无差） */
  getMods() { return this.endless ? endlessScaling(this.endlessFrames) : this.getChapter().mods }

  getBossIndex() { return this.endless ? this.endlessBossIndex : this.index }

  /** 章节视觉参数（Game 背景/地面/章节元素渲染读取） */
  getVisual() { return this.getChapter().visual }

  /** 转场进行中（Game.update 冻结世界判定） */
  isTransitioning() { return !!this._transition }

  /** [步骤C] Boss 出场演出进行中（Game.update 冻结世界判定，语义同转场） */
  isBossIntro() { return !!this._bossIntro }

  /** [步骤C] Boss 战进行中（Game 读：战败语义/受击链 Boss 分支/血条 HUD） */
  isBossActive() { return this._bossActive }

  /**
   * HUD 章节进度数据（§4.5："Ch1 · 12/40"，≥35/40 脉冲）
   * @returns {{id:number, name:string, pipes:number, target:number, pulse:boolean}}
   */
  getHudData() {
    const target = this.getChapter().triggerPipes
    return {
      endless: this.endless, seconds: Math.floor(this.endlessFrames / 60),
      rematch:this._awaitingRematch, remainingPipes:Math.max(0,this._bossReturnAt-this.pipesPassed),
      remaining: Math.max(0, Math.ceil((this.getChapter().minFrames - this.chapterTime) / 60)),
      id: this.getChapter().id,
      name: this.getChapter().name,
      pipes: Math.min(this.pipesPassed, target),
      target: target,
      pulse: this.pipesPassed >= target - 5
    }
  }

  /**
   * 存量管道当前应使用的颜色组（§4.3 换色 lerp 30 帧）。
   * @returns {Object|null} { body, highlight, shadow }；Ch1 且非 lerp 中返回 null（Pipe 用默认色，零变化）
   */
  getPipeColorSet() {
    if (this._pipeLerp) {
      const t = Math.min(1, this._pipeLerp.frame / Config.CHAPTERS.PIPE_COLOR_LERP_FRAMES)
      return this._lerpPipeSet(this._pipeLerp.from, this._pipeLerp.to, t)
    }
    return this.index > 0 ? this.getVisual().pipe : null
  }

  /** 转场渲染状态（Game._drawChapterTransition 读取） */
  getTransitionRenderState() {
    const tr = this._transition
    if (!tr) return null
    const toChapter = Config.CHAPTERS.LIST[tr.toIndex]
    return {
      phase: tr.phase,
      frame: tr.frame,
      toVisual: toChapter.visual,
      title: toChapter.title,
      subtitle: toChapter.subtitle || '难度提升'
    }
  }

  // ==================== 每帧推进（PLAYING 帧，世界未冻结时由 Game 调用） ====================

  update() {
    this.chapterTime++
    this._advancePipeLerp()
    if (this.endless) {
      this.endlessFrames++
      if (this.endlessFrames % 60 === 0) this._deps.setSpawnMods(this.getMods())
      if (!this._bossActive && !this._bossIntro && this.endlessFrames >= this.nextBossAt) {
        this.endlessBossIndex = Math.floor(Math.random() * Config.BOSS.VARIANTS.length)
        this._triggerBossPoint('endless')
      }
    } else if (!this._bossTriggered && this.chapterTime >= this.getChapter().minFrames &&
        this.pipesPassed >= this.getChapter().triggerPipes) {
      this._triggerBossPoint('progress')
    }
  }

  /** 章内过管计数（Game._onPipePass 调用）；同时满足本章管数/最短时间后触发；战败后 20 管触发回归战 */
  onPipePassed() {
    this.pipesPassed++
    if (!this.endless && !this._bossTriggered && this.chapterTime >= this.getChapter().minFrames && this.pipesPassed >= this.getChapter().triggerPipes) {
      this._triggerBossPoint('pipes')
    } else if (this._awaitingRematch && this.pipesPassed >= this._bossReturnAt) {
      // [步骤C] §4.10 方案A：一战失败后再过 20 管，Boss 满血回归一次
      this._awaitingRematch = false
      this._triggerBossPoint('rematch')
    }
  }

  // ==================== [v1.5.0 步骤C] Boss 流程 ====================

  /**
   * Boss 战开始（出场演出收尾时调用）：暂停管道/怪物生成（道具照常），冻结天气计时（§4.7）。
   */
  startBossFight() {
    this._bossActive = true
    this._deps.setBossActive(true)
    if (this._deps.setWeatherFrozen) this._deps.setWeatherFrozen(true)
    Logger.info('Chapter', 'Boss 战开始', { chapter: this.getChapter().id, boss: this._getBossVariant().name })
  }

  /**
   * Boss 战结束（胜利）：恢复生成/天气；本章终结钩子（回响消散）；
   * 有下一章时启动转场演出（§4.3）。战败不走这里——走 onBossDefeat。
   * @param {boolean} win
   */
  endBossFight(win) {
    this._bossActive = false
    this._deps.setBossActive(false)
    if (this._deps.setWeatherFrozen) this._deps.setWeatherFrozen(false)
    Logger.info('Chapter', 'Boss 战结束', { chapter: this.getChapter().id, win: !!win })
    if (win) {
      if (this.endless) {
        this.nextBossAt = this.endlessFrames + this.getMods().bossInterval
        return
      }
      this.cleared.add(this.index)
      if (this._deps.onChapterEnd) this._deps.onChapterEnd()
      if (this.index + 1 < Config.CHAPTERS.LIST.length) {
        this._startTransition()
      } else if (this.cleared.size === Config.CHAPTERS.LIST.length) {
        this.enterEndless()
      }
    }
  }

  /**
   * [步骤C] 玩家战败（§4.10 方案A，D1/D19）：Boss 长鸣离场（实体动作在 Game 侧）。
   * 一战失败：章内进度保留，20 管后 Boss 满血回归一次（返回 'rematch'）；
   * 后续战败也重复再挑战，只有生存/击杀胜利才能推进。
   * @returns {string} 'rematch'
   */
  onBossDefeat() {
    this._bossActive = false
    this._deps.setBossActive(false)
    if (this._deps.setWeatherFrozen) this._deps.setWeatherFrozen(false)
    this._bossDefeatCount++
    Logger.warn('Chapter', 'Boss 战失败（方案A）', {
      chapter: this.getChapter().id, defeatCount: this._bossDefeatCount, pipes: this.pipesPassed
    })
    this._awaitingRematch = true
    this._bossReturnAt = this.pipesPassed + Config.BOSS.DEFEAT_RETURN_PIPES
    return 'rematch'
  }

  enterEndless() {
    if (this.cleared.size !== Config.CHAPTERS.LIST.length || this.endless) return false
    this.endless = true
    if(this._deps.onEndlessEnter)this._deps.onEndlessEnter()
    this.endlessFrames = 0
    this.nextBossAt = 35 * 60
    this._bossTriggered = false
    this._deps.setSpawnMods(this.getMods())
    this._deps.grantInvincible(120)
    this._deps.addFloatingText(this._deps.screenW / 2, this._deps.screenH * 0.35,
      '六章通关 · 无尽模式！得分×2', '#b6f6ff', 180)
    return true
  }

  /**
   * [步骤C] 出场演出推进（§4.11，世界冻结期由 Game.update 调用）：
   * 暗角收拢30帧 → "雷云聚集……"1s → Boss 右侧飞入至70%（60帧，deps.spawnBoss 在 enter 起点创建实体）
   * → startBossFight（血条展开由 HUD 读 isBossActive）
   */
  updateBossIntro() {
    const intro = this._bossIntro
    if (!intro) return
    intro.frame++
    this._advancePipeLerp()
    const B = Config.BOSS
    if (intro.phase === 'vignette' && intro.frame >= B.INTRO_VIGNETTE_FRAMES) {
      intro.phase = 'gather'
      intro.frame = 0
      // "雷云聚集……"（变体文案：Ch2 为"沙暴逼近……"）
      this._deps.addFloatingText(this._deps.screenW / 2, this._deps.screenH * 0.35,
        this._getBossVariant().gatherText, '#c0d8f0', B.INTRO_GATHER_FRAMES)
    } else if (intro.phase === 'gather' && intro.frame >= B.INTRO_GATHER_FRAMES) {
      intro.phase = 'enter'
      intro.frame = 0
      this._deps.spawnBoss()  // Boss 实体进入 entering 态，自飞入 60 帧
    } else if (intro.phase === 'enter' && intro.frame >= B.INTRO_ENTER_FRAMES) {
      this._bossIntro = null
      this.startBossFight()
    }
  }

  /** 出场演出渲染状态（Game._drawBossIntro 读取）：null | { phase, frame, gatherText } */
  getBossIntroRenderState() {
    const intro = this._bossIntro
    if (!intro) return null
    return { phase: intro.phase, frame: intro.frame, gatherText: this._getBossVariant().gatherText }
  }

  /** 当前章 Boss 变体配置（越界防御：回落到最后一个已实装变体） */
  _getBossVariant() {
    const V = Config.BOSS.VARIANTS
    return V[this.getBossIndex()] || V[V.length - 1]
  }

  // ==================== 内部：触发点 / 转场 ====================

  /**
   * Boss 触发点：浮动文字"Boss 逼近！" + 启动出场演出（§4.11 暗角收拢起）。
   * 演出收尾 startBossFight() 才置 bossActive（此时 Boss 实体已就位，无软锁窗口）。
   */
  _triggerBossPoint(reason) {
    this._bossTriggered = true
    this._bossIntro = { phase: 'vignette', frame: 0 }   // [步骤C] 出场演出启动（世界冻结，语义同转场）
    this._deps.addFloatingText(this._deps.screenW / 2, this._deps.screenH * 0.3,
      'Boss 逼近！', '#ff4444', 90)
    Logger.info('Chapter', 'Boss 触发点', {
      chapter: this.getChapter().id, reason: reason,
      pipes: this.pipesPassed, chapterTimeSec: Math.round(this.chapterTime / 60)
    })
  }

  /** 转场开始（§4.3）：白闪 → 色带擦除 → 标题卡 → 60帧无敌恢复飞行 */
  _startTransition() {
    this._transition = { phase: 'flash', frame: 0, toIndex: this.index + 1 }
    Logger.info('Chapter', '章节转场开始', { from: this.getChapter().id, to: this.index + 2 })
  }

  /**
   * 转场计时推进（世界冻结期由 Game.update 调用，其余更新全停）。
   * 章节切换（修正注入/计数清零/管道换色 lerp 启动）在擦除完成的瞬间生效，
   * 标题卡期间背景已是新章视觉。
   */
  updateTransition() {
    const T = Config.CHAPTERS.TRANSITION
    const tr = this._transition
    if (!tr) return
    tr.frame++
    this._advancePipeLerp()
    if (tr.phase === 'flash' && tr.frame >= T.FLASH_FRAMES) {
      tr.phase = 'wipe'
      tr.frame = 0
    } else if (tr.phase === 'wipe' && tr.frame >= T.WIPE_FRAMES) {
      this._applyNextChapter(tr.toIndex)
      tr.phase = 'title'
      tr.frame = 0
    } else if (tr.phase === 'title' && tr.frame >= T.TITLE_FRAMES) {
      this._transition = null
      // §4.3 收尾：60 帧无敌恢复飞行
      this._deps.grantInvincible(T.INVINCIBLE_FRAMES)
      Logger.info('Chapter', '转场结束，恢复飞行（60帧无敌）', { chapter: this.getChapter().id })
    }
  }

  /** 章节切换生效：下标前进 + 章内状态清零 + 难度修正注入 + 存量管道换色 lerp 启动 */
  _applyNextChapter(toIndex) {
    const fromVisual = this.getVisual()
    this.index = toIndex
    this.pipesPassed = 0
    this.chapterTime = 0
    this._bossTriggered = false
    // [步骤C] 跨章清 Boss 流程状态（战败计数/回归等待不带入下一章）
    this._bossActive = false
    this._bossIntro = null
    this._bossDefeatCount = 0
    this._awaitingRematch = false
    this._bossReturnAt = 0
    const mods = this.getMods()
    // §4.4 生成参数注入（速度/间隙加算由 Game 侧读 getMods()，不在此处）
    this._deps.setSpawnMods(mods)
    // §4.3 存量管道颜色 lerp 30 帧平滑过渡（新管由 Game 生成接线处直接给新章色）
    this._pipeLerp = { frame: 0, from: fromVisual.pipe, to: this.getVisual().pipe }
    // [步骤C] 进入新章钩子（旅者补给/章节回响/章节之主首面板保底）
    if (this._deps.onChapterEnter) this._deps.onChapterEnter(toIndex)
    Logger.info('Chapter', '进入新章节', { chapter: this.getChapter().id, name: this.getChapter().name })
  }

  /** 管道换色 lerp 帧推进（正常 update 与转场冻结期都推进） */
  _advancePipeLerp() {
    if (!this._pipeLerp) return
    this._pipeLerp.frame++
    if (this._pipeLerp.frame >= Config.CHAPTERS.PIPE_COLOR_LERP_FRAMES) {
      this._pipeLerp = null  // 到位后 getPipeColorSet 返回目标色（index>0 分支）
    }
  }

  // ==================== 内部：颜色 lerp（#rrggbb 线性插值） ====================

  _hexToRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ]
  }

  _lerpColor(fromHex, toHex, t) {
    const a = this._hexToRgb(fromHex)
    const b = this._hexToRgb(toHex)
    const c = []
    for (let i = 0; i < 3; i++) c.push(Math.round(a[i] + (b[i] - a[i]) * t))
    return 'rgb(' + c[0] + ', ' + c[1] + ', ' + c[2] + ')'
  }

  _lerpPipeSet(from, to, t) {
    return {
      body: this._lerpColor(from.body, to.body, t),
      highlight: this._lerpColor(from.highlight, to.highlight, t),
      shadow: this._lerpColor(from.shadow, to.shadow, t)
    }
  }
}

module.exports = ChapterSystem
