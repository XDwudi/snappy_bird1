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
    onFireFeather(...a){shots.push(a)},onSandWall(...a){walls.push(a)},onPhase2(){}
  })
  b.x=b.homeX;b._setState('roam');return {b,shots,walls}
}
test('61张卡去掉三张旧卡，先知和前置表均可解析',()=>{
  assert.equal(Registry.getAll().length,61)
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
test('叶刃先预警后发射，瞄准锁定不跟随玩家',()=>{
  const {b,shots}=boss();b._beginAttack({x:112,y:300});const angle=b.aimAngle
  assert.equal(b.state,'telegraph')
  for(let i=0;i<Config.BOSS.WARN_FRAMES-1;i++)b.update({x:112,y:450})
  assert.equal(shots.length,0);assert.equal(b.aimAngle,angle)
  b.update();assert.equal(shots.length,3)
})
test('预警中转P2不改变已预告的弹幕；长屏俯冲落点与警示带一致',()=>{
  const {b,shots}=boss();b._beginAttack({x:112,y:300});b._enterPhase2()
  for(let i=0;i<Config.BOSS.WARN_FRAMES;i++)b.update()
  assert.equal(shots.length,3)
  for(const y of [140,699]) {
    const {b}=boss(0,390,844);b.y=y===140?690:140;b.attackIndex=1;b._beginAttack({x:117,y})
    for(let i=0;i<Config.BOSS.DIVE_WARN_FRAMES;i++)b.update()
    assert.equal(b.state,'charging');assert.equal(b.y,b.chargeY)
  }
})
test('草地俯冲预警完整、返程无伤害、随后出现破绽',()=>{
  const {b}=boss();b.attackIndex=1;b._beginAttack({x:112,y:300})
  const bird={x:b.x+45,y:b.y,collisionWidth:24,collisionHeight:17}
  assert.equal(b.state,'windup');assert.equal(b.checkCollision(bird),false)
  for(let i=0;i<Config.BOSS.DIVE_WARN_FRAMES;i++)b.update(bird)
  assert.equal(b.state,'charging');assert.equal(b.y,b.chargeY)
  let guard=0;while(b.state!=='recover'&&guard++<150){b.update(bird);if(b.state==='return')assert.equal(b.checkCollision({ ...bird,x:b.x+45,y:b.y }),false)}
  assert.equal(b.state,'recover')
})
test('沙墙在三种屏幕均保留缺口，预警与碰撞一致',()=>{
  for(const [w,h] of [[320,568],[375,667],[390,844]])for(const phase of [1,2])for(const y of [40,300,h-90]){
    const {b,walls}=boss(1,w,h);b.phase=phase;b._beginAttack({x:w*.3,y})
    assert.equal(b.action,'wall');assert.ok(b.wallCenter-b.wallGap/2>=140)
    assert.ok(b.wallCenter+b.wallGap/2<=h-80-25)
    for(let i=0;i<Config.BOSS.WALL_WARN_FRAMES;i++)b.update()
    assert.deepEqual(walls,[[b.wallCenter,b.wallGap]])
    const wall=new Wall(100,h-80,...walls[0]);const bird={x:110,y:b.wallCenter,collisionWidth:24,collisionHeight:17}
    assert.equal(wall.checkCollision(bird),false)
    bird.y=wall.topHeight;assert.equal(wall.checkCollision(bird),true)
  }
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
