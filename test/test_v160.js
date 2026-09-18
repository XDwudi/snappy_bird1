// 真实 Game 状态机回归；不依赖微信网络，不替代真机手感测试。
const assert = require('node:assert/strict')
const Game = require('../game/core/Game.js')
const Config = require('../game/config/GameConfig.js')
const Ability = require('../game/systems/AbilitySystem.js')
const Hail = require('../game/weather/HailEffect.js')
const Missile = require('../game/entities/Missile.js')
require('../game/systems/GameLogger.js').enabled = false
let passed = 0
function test(name, fn) { fn(); passed++; console.log('✓ ' + name) }
function make(h = 667) {
  const g = new Game({}, {}, 375, h, null)
  g.start()
  return g
}
function select(a, id, n = 1) { for (let i=0;i<n;i++) a.selectAbility(id); a.invalidateStats() }
function fight(chapter = 0) {
  const g = make()
  g.chapterSystem.index = chapter
  g._spawnBoss()
  g.boss._setState('roam')
  g.chapterSystem._bossTriggered = true
  g.chapterSystem.startBossFight()
  return g
}
function safeTick(g) { g.bird.y = 300; g.bird.velocity = 0; g.abilitySystem.invincibleFrames = 100; g.update() }
function rewards(g) {
  for (let i=0;i<Config.BOSS.DEATH_SLOWMO_FRAMES+1;i++) safeTick(g)
  assert.equal(g.state, Config.GAME.STATE.UPGRADING)
  let guard=0
  while(g.state === Config.GAME.STATE.UPGRADING && guard++<40) {
    assert.ok(g._currentChoices && g._currentChoices.length)
    g.selectAbility(g._currentChoices[0].id)
  }
  assert.ok(guard<40, '奖励面板不可软锁')
}
test('无连击之心不会获得无敌；持卡按阈值触发', () => {
  const a = new Ability()
  for(let i=0;i<10;i++) a.onPipePass()
  assert.equal(a.invincibleFrames,0)
  select(a,'combo_heart'); a.comboCount=0
  for(let i=0;i<a.getStat('comboThreshold');i++) a.onPipePass()
  assert.equal(a.invincibleFrames,180)
})
test('护盾爆发满盾时兑现超载临时生命', () => {
  const a=new Ability(); select(a,'aegis_overdrive',3);select(a,'shield_burst')
  a.shieldLayers=a.maxShieldLayers;a.shieldBurstTimer=1;a.tickCooldowns()
  assert.equal(a.tempHp,1)
})
test('冰雹无敌期不连耗护盾；Boss 致命冰雹走战败保护', () => {
  const g=fight(); const a=g.abilitySystem;select(a,'toughness',2)
  a.shieldLayers=3;a.invincibleFrames=100
  const hail=new Hail(); const hit=()=>hail._handleHailCollision({x:g.bird.x,y:g.bird.y},g._buildGameCtx())
  hit();hit();assert.equal(a.shieldLayers,3);assert.equal(a.invincibleFrames,100)
  a.shieldLayers=0;a.invincibleFrames=0;a.hp=1;hit()
  assert.equal(a.hp,1);assert.equal(g.state,'playing');assert.equal(g.chapterSystem.isBossActive(),false)
  assert.equal(g.bossClears.length,0)
})
test('回响增减同步 HP 和护盾上限，不重复领取即时奖励', () => {
  const g=make();select(g.abilitySystem,'vitality');select(g.abilitySystem,'chapter_echo')
  const hp=g.abilitySystem.hp;g._applyChapterEcho()
  assert.equal(g.abilitySystem.maxHp,4);assert.equal(g.abilitySystem.hp,hp)
  g._revertChapterEcho();assert.equal(g.abilitySystem.maxHp,3)
  const h=make();select(h.abilitySystem,'toughness');select(h.abilitySystem,'chapter_echo')
  h._applyChapterEcho();select(h.abilitySystem,'toughness');h._revertChapterEcho()
  assert.equal(h.abilitySystem.owned.get('toughness'),2);assert.equal(h.abilitySystem.maxShieldLayers,3)
})
test('左飞导弹离屏回收',()=>{
  const m=new Missile(100,300,null,Math.PI)
  for(let i=0;i<100;i++)m.update(1)
  assert.equal(m.isOffscreen(375,667),true)
})
test('第一章注入减压怪物配置，重开仍生效',()=>{
  const g=make();assert.equal(g.spawnSystem._chapterMods.monsterMaxAlive,1)
  g.chapterSystem.index=1;g.start();assert.equal(g.spawnSystem._chapterMods.monsterSpawnDistance,650)
})
test('随机管道相邻高度受限，短屏/长屏/缩小射线不越界',()=>{
  for(const h of [568,667,844]) {
    const g=make(h);select(g.abilitySystem,'shrink_ray',5)
    for(const frame of [0,3600,5400,10800,18000]) {
      g.gameTime=frame;g.spawnSystem._lastPipeCenter=null
      let previous=null
      for(let i=0;i<100;i++) {
        g.spawnSystem.spawnPipe();const p=g.pipes.pop()
        const center=p.topHeight+p.gap/2; const finalGap=g._getGapSize()
        assert.ok(center-finalGap/2>=Config.PIPE.MIN_TOP-1e-8)
        assert.ok(center+finalGap/2<=h-Config.GROUND.HEIGHT-Config.PIPE.MIN_BOTTOM+1e-8)
        if(previous!=null)assert.ok(Math.abs(center-previous)<=Config.PIPE.CENTER_STEP_END+1e-8)
        previous=center
      }
    }
  }
})
for(const chapter of [0,1])test(`第${chapter+1}章生存倒计时、暂停、奖励和转场`,()=>{
  const g=fight(chapter), limit=Config.BOSS.VARIANTS[chapter].survivalFrames
  g.bossFightFrames=limit-1;g.state='upgrading';g.update();assert.equal(g.bossFightFrames,limit-1)
  g.state='playing';g.phoenixAnim={phase:'pause',timer:20,maxTimer:20};g.update()
  assert.equal(g.bossFightFrames,limit-1);g.phoenixAnim=null
  g.chapterSystem._bossIntro={phase:'vignette',frame:0};g.update()
  assert.equal(g.bossFightFrames,limit-1);g.chapterSystem._bossIntro=null
  safeTick(g)
  assert.equal(g._bossClearMode,'survival');assert.equal(g.bossClears.length,1)
  assert.ok(g.boss.hp>0);assert.equal(g.bossBadges.length,0);assert.equal(g.abilitySystem.bossesDefeated,0)
  g._onBossVictory();assert.equal(g.bossClears.length,1)
  rewards(g);assert.equal(g.chapterSystem.isBossActive(),false)
  assert.equal(g.chapterSystem.isTransitioning(),chapter===0)
  g.start();assert.equal(g.bossClears.length,0);assert.equal(g.bossFightFrames,0);assert.equal(g._bossClearMode,null)
})
test('击杀提前通关且只计一次战利品和奖励',()=>{
  const g=fight();g.boss.hp=0;g.bossFightFrames=600;g._onBossVictory();g._onBossVictory('survival')
  assert.equal(g.bossClears[0].method,'kill');assert.equal(g.bossBadges.length,1)
  assert.equal(g.abilitySystem.bossesDefeated,1);rewards(g)
  assert.equal(g.bossClears.length,1)
})
test('致命受击不会在同帧获得生存通关；回归战重置计时',()=>{
  const g=fight();g.bossFightFrames=g._getBossSurvivalFrames()-1
  g.abilitySystem.hp=1;g.abilitySystem.invincibleFrames=0;g.bird.y=666;g.update()
  assert.equal(g.chapterSystem.isBossActive(),false);assert.equal(g.bossClears.length,0)
  g._spawnBoss();assert.equal(g.bossFightFrames,0);assert.equal(g._bossClearMode,null)
})
test('Boss 入场清除存量管道和怪物，结算演出免受伤害',()=>{
  const g=make();g.spawnSystem.spawnPipe();g.monsters.push({});g._spawnBoss()
  assert.equal(g.pipes.length,0);assert.equal(g.monsters.length,0)
  g.chapterSystem.startBossFight();g._onBossVictory('survival')
  const hp=g.abilitySystem.hp;g._handleCollision();assert.equal(g.abilitySystem.hp,hp)
})
test('银行保留本金并生息，不吞正常经验或压制顿悟',()=>{
  const Exp=require('../game/systems/ExpSystem.js')
  const e=new Exp();e.configureBank(3);e.addExp(100,1)
  assert.equal(e.bankBalance,15);assert.ok(e.tickBankInterest()>0)
  const balance=e.bankBalance;e.addExp(e.getExpNeeded(e.level),1)
  assert.equal(e.lastBankWithdraw,Math.floor(balance));assert.ok(e.lastBankDeposit>0)
  for(let amount=1;amount<=1000;amount++) {
    const normal=new Exp(),bank=new Exp()
    normal.configureEnlighten(1);bank.configureEnlighten(1);bank.configureBank(3)
    normal.addExp(amount,1);bank.addExp(amount,1)
    assert.equal(bank.level,normal.level);assert.equal(bank.exp,normal.exp)
    assert.equal(bank.enlightenUsed,normal.enlightenUsed)
  }
  e.reset();assert.equal(e.bankBalance,0);assert.equal(e.bankDepositRate,0)
})
test('满级雨衣积水和重力修正不变成负数',()=>{
  const Rain=require('../game/weather/RainEffect.js')
  const g=make();select(g.abilitySystem,'raincoat',3)
  const r=new Rain();r.onTrigger(g._buildGameCtx())
  for(let i=0;i<120;i++) {const ctx=g._buildGameCtx();r.update(ctx);assert.ok(r.rainLevel>=0);assert.ok(ctx.gravityModifier>=0)}
})
test('Canvas 各主要状态渲染可执行，HUD 显示血量与生存目标',()=>{
  const texts=[]
  const ctx=new Proxy({}, {get(o,k) {
    if(k in o)return o[k]
    if(k==='measureText')return text=>({width:String(text).length*7})
    if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}})
    if(k==='fillText')return text=>texts.push(String(text))
    return ()=>{}
  },set(o,k,v){o[k]=v;return true}})
  const g=new Game({},ctx,375,667,null);g.render();g.start();g.render()
  g._spawnBoss();g.boss._setState('roam');g.chapterSystem.startBossFight();g.render()
  assert.ok(texts.some(t=>t.includes('再坚持 45 秒')))
  assert.ok(texts.some(t=>t.includes('36/36')))
  g._onBossVictory('survival');g.render();rewards(g);g.render()
  g.state='gameover';g.render();assert.ok(texts.some(t=>t.includes('Ch1 生存')))
})
console.log(`${passed} 项机制回归通过`)
