const assert = require('node:assert/strict')
const Game = require('../game/core/Game.js')
const Config = require('../game/config/GameConfig.js')
const Boss = require('../game/entities/Boss.js')
const Monster = require('../game/entities/Monster.js')
const Wall = require('../game/entities/SandWall.js')
const Feather = require('../game/entities/Feather.js')
const Registry = require('../game/abilities/AbilityRegistry.js')
require('../game/systems/GameLogger.js').enabled = false
let count = 0
function test(name, f) { f(); count++; console.log('✓ ' + name) }
function game() { const g = new Game({}, {}, 375, 667, null); g.start(); return g }
function select(g,id,n=1) { for(let i=0;i<n;i++) g.abilitySystem.selectAbility(id) }
function boss(ch=0,w=375,h=667) {
  const shots=[], walls=[]
  const b=new Boss(ch,w,h,Config.CHAPTERS.LIST[ch].mods.bossHp,{
    onHazard(p){shots.push(p)},onSummon(){},onFireFeather(...a){shots.push(a)},onSandWall(...a){walls.push(a)},onPhase2(){}
  })
  b.x=b.homeX;b._setState('roam');return {b,shots,walls}
}
test('73张卡保留旧卡退休约束，先知和前置表均可解析',()=>{
  assert.equal(Registry.getAll().length,73)
  for(const id of ['exp_bank','double_jump','feather_dance']) assert.equal(Registry.get(id),null)
  for(const pair of [...Config.ABILITY.ORACLE_SYNERGY_PAIRS,...Config.ABILITY.ORACLE_ANTI_PAIRS]) {
    assert.equal(pair.length,2);for(const id of pair)assert.ok(Registry.get(id),id)
  }
  for(const a of Config.ABILITY.ORACLE_ARCHETYPES)for(const id of [...a.core,...a.support])assert.ok(Registry.get(id),id)
  for(const [id,req] of Object.entries(Config.ABILITY.PREREQUISITES))assert.ok(Registry.get(id)&&Registry.get(req))
})
test('反复快速点击始终使用普通拍翅，不隐式改变力度',()=>{
  const g=game();for(let f=0;f<30;f++){g.frameCount=f;g.flap();assert.equal(g.bird.velocity,g.bird.flapForce)}
})
test('两章满血存活半程也进入P2，演出不计攻击时间',()=>{
  for(let ch=0;ch<2;ch++){
    const {b}=boss(ch);b.combatAge=b.variant.survivalFrames/2-1;b.update({x:112,y:300})
    assert.equal(b.phase,2);assert.equal(b.hp,b.maxHp)
    b.startLeaving();const age=b.combatAge;b.update();assert.equal(b.combatAge,age)
  }
})
// 1.8.0 的36招/墙/连协几何验证见 test_v180.js；这里保留旧伤害链回归。
test('普通弹幕预警期间不伤人，P2不扩大已经生成的预警',()=>{
  const {b,shots}=boss();const bird={x:112,y:300,collisionWidth:24,collisionHeight:17}
  b._beginAttack(bird);const count=shots.length;b._enterPhase2();assert.equal(shots.length,count)
  for(const p of shots)assert.equal(p.checkCollision({...bird,x:p.x,y:p.y}),false)
})
test('破绽+1伤害，独立武器门防止新武器吞导弹，同批反击不多算',()=>{
  const {b}=boss();b._setState('recover');const hp=b.hp
  b.takeDamage(4);b.takeDamage(2,'blade');b.takeDamage(2,'revenge');b.takeDamage(2,'revenge')
  assert.equal(b.hp,hp-5-3-3)
  for(let i=0;i<45;i++)b.update();b.takeDamage(2,'revenge');assert.equal(b.hp,hp-14)
})
test('直射羽刃确实击杀小怪、发经验且有界回收',()=>{
  const g=game();select(g,'feather_blade');g.bird.y=300
  const m=new Monster(g.bird.x+50,300,'bat',587);g.monsters=[m]
  for(let i=0;i<15;i++)g.combat.update()
  assert.equal(m.hp,0);assert.equal(g.monsterKills,1);assert.ok(g.expSystem.exp>0)
  g.combat.fire(1,2,Array(100).fill(0));assert.ok(g.combat.shots.length<=12)
  g.abilitySystem.owned.delete('feather_blade');for(let i=0;i<150;i++)g.combat.update();assert.equal(g.combat.shots.length,0)
})
test('风环只挡一枚再冷却、不挡沙墙、满级4秒恢复',()=>{
  const g=game();select(g,'orbit_guard',3)
  const f=new Feather(g.bird.x+20,g.bird.y,Math.PI,3,'#fff')
  assert.equal(g.combat.intercept(f),true);assert.equal(g.combat.guardCD,240)
  assert.equal(g.combat.intercept(f),false);assert.equal(g.combat.shots.length,1)
  for(let i=0;i<240;i++)g.combat.update()
  assert.equal(g.combat.intercept(new Wall(g.bird.x,587,g.bird.y,140)),false)
  assert.equal(g.combat.intercept(f),true)
})
test('逆羽只在真实消耗防御时触发，无敌/连续碰撞不能刷射击',()=>{
  const g=game();select(g,'revenge_pulse',2);g.abilitySystem.shieldLayers=1
  g._handleCollision();g._drainAbilityFx();assert.equal(g.combat.shots.length,3)
  g._handleCollision();g._drainAbilityFx();assert.equal(g.combat.shots.length,3)
  g.combat.clearShots();g.abilitySystem.invincibleFrames=0;g._handleCollision();g._drainAbilityFx();assert.equal(g.combat.shots.length,0)
  for(let i=0;i<240;i++)g.combat.update()
  g.abilitySystem.addShieldLayer(1);g.abilitySystem.consumeShield();g._drainAbilityFx();assert.equal(g.combat.shots.length,3)
})
test('受伤反击在冰雹链生效，击败后下一章仍可触发',()=>{
  const Hail=require('../game/weather/HailEffect.js')
  const g=game();select(g,'revenge_pulse');const h=new Hail()
  h._handleHailCollision({x:g.bird.x,y:g.bird.y},g._buildGameCtx());g._drainAbilityFx()
  assert.equal(g.combat.shots.length,3)
  g._bossClearMode='kill';g._bossDyingFrames=0;g.combat.revengeCD=0;g.combat.clearShots();g.combat.retaliate()
  assert.equal(g.combat.shots.length,3)
})
test('Boss无管道时，时间扭曲/时之晶仍会响应弹幕，冷却不重复触发',()=>{
  const g=game();select(g,'time_warp');select(g,'time_crystal')
  g._spawnBoss();g.boss._setState('roam');g.chapterSystem.startBossFight()
  g.feathers.push(new Feather(g.bird.x+30,g.bird.y,Math.PI,3,'#fff'))
  g._checkActiveAbilities();assert.equal(g.abilitySystem.timeWarpActive,60);assert.equal(g.abilitySystem.timeCrystalFreezeFrames,60)
  const x=g.feathers[0].x;g._updateBossFight();assert.equal(g.feathers[0].x,x)
  g.abilitySystem.timeWarpActive=0;g.abilitySystem.timeCrystalFreezeFrames=0
  g._checkActiveAbilities();assert.equal(g.abilitySystem.timeWarpActive,0)
})
test('暂停冻结新技能，重新开始清掉弹丸和冷却',()=>{
  const g=game();select(g,'feather_blade');g.combat.update();g.combat.guardCD=100;g.state='upgrading'
  const before=JSON.stringify(g.combat.shots);const cd=g.combat.bladeCD
  for(let i=0;i<20;i++)g.update()
  assert.equal(JSON.stringify(g.combat.shots),before);assert.equal(g.combat.bladeCD,cd)
  g.start();assert.equal(g.combat.shots.length,0);assert.equal(g.combat.guardCD,0)
})
test('新增武器击杀Boss仍只结算一次双通关奖励',()=>{
  const g=game();g._spawnBoss();g.boss._setState('recover');g.boss.x=g.bird.x+25;g.boss.y=g.bird.y;g.boss._syncBox();g.boss.hp=2
  g.chapterSystem._bossTriggered=true;g.chapterSystem.startBossFight();g.combat.fire();g.combat.update()
  assert.equal(g.bossClears.length,1);assert.equal(g.bossClears[0].method,'kill');assert.equal(g.combat.shots.length,0)
  g._onBossVictory('survival');assert.equal(g.bossClears.length,1)
})
console.log(count+' 项 v1.7.0 机制通过')
