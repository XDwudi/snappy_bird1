const assert=require('node:assert/strict')
const Game=require('../game/core/Game'),C=require('../game/config/GameConfig'),R=require('../game/abilities/AbilityRegistry')
const Exp=require('../game/systems/ExpSystem'),Wind=require('../game/weather/WindEffect'),Rain=require('../game/weather/RainEffect'),Hail=require('../game/weather/HailEffect')
require('../game/systems/GameLogger').enabled=false
let n=0;const test=(name,fn)=>{fn();n++;console.log('✓ '+name)}
const game=()=>{const g=new Game({},{},375,667,null);g.start();return g}
const give=(g,id,lv)=>{for(let i=0;i<lv;i++)g.abilitySystem.selectAbility(id)}
const apex=g=>{g._applyAbilityStatsToBird();g.bird.y=350;g.bird.velocity=0;g.flap();let min=350;for(let i=0;i<200;i++){g.bird.update();min=Math.min(min,g.bird.y);if(g.bird.velocity>=0)break}return 350-min}
test('所有轻羽/顺风等级与强化、狂暴、风暴叠加均不扩大无风单击高度',()=>{
 const base=apex(game())
 for(let light=0;light<=5;light++)for(let tail=0;tail<=5;tail++)for(const weather of [false,true]){
  const g=game();give(g,'light_feather',light);give(g,'tailwind',tail);give(g,'berserk',3);give(g,'storm_child',3)
  g.abilitySystem.allBuffLevel=10;g.abilitySystem.hp=1;g.abilitySystem.setWeatherActive(weather)
  assert.ok(Math.abs(apex(g)-base)<.001)
 }
})
test('轻羽减缓下落，保持正重力和落速上限；逆风下起跳仍小于100px',()=>{
 const g=game();give(g,'light_feather',5);g._applyAbilityStatsToBird();g.bird.windForce=-999
 assert.ok(apex(g)<100)
 g.bird.windForce=0;g.bird.velocity=0;g.bird.update();assert.ok(g.bird.velocity>0&&g.bird.velocity<C.BIRD.GRAVITY)
 for(let i=0;i<100;i++)g.bird.update();assert.equal(g.bird.velocity,9)
})
test('狂暴/天气开关不会骤变飞行参数；重新开始恢复下落与风状态',()=>{
 const g=game();give(g,'berserk',3);give(g,'storm_child',3);give(g,'light_feather',5)
 g.abilitySystem.hp=1;g.abilitySystem.setWeatherActive(true);g._applyAbilityStatsToBird();const force=g.bird.flapForce
 g.abilitySystem.hp=2;g.abilitySystem.setWeatherActive(false);g._applyAbilityStatsToBird();assert.equal(g.bird.flapForce,force)
 g.bird.windForce=-1;g.start();assert.equal(g.bird.windForce,0);assert.equal(g.bird.descentGravityMultiplier,1)
})
test('经验曲线前20级保持不变，后期递增且等级无上限',()=>{
 const e=new Exp();for(let lv=1;lv<=20;lv++)assert.equal(e.getExpNeeded(lv),18+12*(lv-1))
 assert.equal(e.getExpNeeded(40),846);assert.equal(e.getExpNeeded(60),2166);assert.equal(e.getExpNeeded(100),6966)
 for(const lv of [200,1000,10000])assert.ok(e.getExpNeeded(lv)>e.getExpNeeded(lv-1))
})
test('同等后期收入减少连升；固定Boss奖励仍正好升一级',()=>{
 const g=game(),e=g.expSystem;e.level=60;g._gainExp(1000,'test',g.abilitySystem.getStats());assert.equal(e.level,60)
 e.exp=0;g._gainExp(e.getExpNeeded(e.level),'boss_gift',{expMultiplier:999});assert.equal(e.level,61);assert.equal(e.exp,0)
})
test('经验增益加算，高配仍有收益但不指数叠乘；狂暴不再加速经验',()=>{
 const g=game(),a=g.abilitySystem;give(g,'greed',2);give(g,'exp_tide',2);a.setWeatherActive(true)
 const before=a.getStats().expMultiplier;give(g,'berserk',3);a.hp=1;assert.equal(a.getStats().expMultiplier,before)
 a.blessingExpMult=99;const high=a.getStats().expMultiplier;assert.ok(high<=6);assert.ok(high>before)
})
test('顿悟大额经验第二级半价，三次用尽恢复正常，Boss礼包不触发',()=>{
 const e=new Exp();e.level=60;e.configureEnlighten(1);const cost=e.getExpNeeded(60)+Math.ceil(e.getExpNeeded(61)*.5)
 e.addExp(cost,1);assert.equal(e.level,62);assert.equal(e.exp,0);assert.equal(e.enlightenUsed,1)
 for(let i=0;i<2;i++){const cost=e.getExpNeeded(e.level)+Math.ceil(e.getExpNeeded(e.level+1)*.5);e.addExp(cost,1)}
 assert.equal(e.enlightenUsed,3);assert.equal(e.level,66)
 e.addExp(e.getExpNeeded(66)+Math.ceil(e.getExpNeeded(67)*.5),1);assert.equal(e.level,67)
 const g=game();g.expSystem.level=60;g.expSystem.exp=g.expSystem.getExpNeeded(60)-1;g.expSystem.configureEnlighten(1)
 g._gainExp(g.expSystem.getExpNeeded(60),'boss_gift',{expMultiplier:99});assert.equal(g.expSystem.level,61);assert.equal(g.expSystem.enlightenUsed,0)
})
test('气候适应不缩短三种天气，减负与天气增益可共存',()=>{
 for(const Type of [Wind,Rain,Hail]){const g=game(),ctx=g._buildGameCtx(),w=new Type();const duration=w.getDuration(20000,ctx)
  give(g,'climate_adapt',3);assert.equal(w.getDuration(20000,ctx),duration);assert.ok(Math.abs(w.getDebuffScale(ctx)-.55)<.001)
  give(g,'eye_of_storm',2);g.abilitySystem.setWeatherConcurrent(3);assert.ok(Math.abs(w.getDebuffScale(ctx)-.33)<.001)
 }
})
test('顺风耳减风不会减弱御风者双刃；御风者不会翻转或增强垂直风',()=>{
 const g=game();give(g,'wind_rider',3);const w=new Wind(),ctx=g._buildGameCtx();w.onTrigger(ctx);w.isVertical=true;w.direction=-1;w.elapsed=w.duration/2
 w.update(ctx);const force=w.currentForce;assert.ok(force<0);assert.equal(g.bird.velocity,0)
 give(g,'wind_reader',3);w.elapsed=w.duration/2;w.update(ctx);assert.ok(Math.abs(w.currentForce)<Math.abs(force)*.11)
 g.weatherSystem.activeEffects=[w];g.combat.updateCampaign();assert.equal(g.combat.shots.filter(s=>s.source==='wind').length,2)
 assert.equal(g.combat.shots[0].bossDamage,4)
})
test('驯化风不再推玩家；顺风耳与雨衣转为有效武器节奏',()=>{
 for(const [type,id] of [['wind','wind_reader'],['rain','raincoat']]){
  const g=game(),a=g.abilitySystem;a.setWeatherContext([type],type);const before=a.getStats().weaponCadence
  give(g,id,3);assert.ok(a.getStats().weaponCadence<before)
  a.setWeatherContext([],type);assert.ok(a.getStats().weaponCadence>=before)
  if(type==='wind'){const w=new Wind(),ctx=g._buildGameCtx();g.weatherSystem.tamedWeather='wind';w.onTrigger(ctx);w.isVertical=true;w.elapsed=w.duration/2;w.update(ctx);assert.equal(w.currentForce,0)}
 }
})
test('驯化冰雹/定风珠免疫仍可冰晶转盾，满盾不浪费CD',()=>{
 for(const mode of ['tame','immune']){
  const g=game(),a=g.abilitySystem,h=new Hail(),ctx=g._buildGameCtx();give(g,'ice_crystal',2);a.shieldLayers=0
  if(mode==='tame')g.weatherSystem.tamedWeather='hail';else a.weatherImmuneUntil=100
  h._handleHailCollision({x:100,y:300},ctx);assert.equal(a.shieldLayers,1);assert.ok(a.iceCrystalCD>0)
  a.iceCrystalCD=0;a.shieldLayers=a.maxShieldLayers;h._handleHailCollision({x:100,y:300},ctx);assert.equal(a.iceCrystalCD,0)
 }
})
test('无尽转盾被恢复间隔拒绝时不虚报、不浪费冷却，仍有伤害出口',()=>{
 const g=game(),a=g.abilitySystem,h=new Hail(),ctx=g._buildGameCtx();give(g,'ice_crystal',2)
 a.shieldLayers=0;a.renewalInterval=300;a.renewalCD=200;const hp=a.hp
 h._handleHailCollision({x:100,y:300},ctx);assert.equal(a.shieldLayers,0);assert.equal(a.iceCrystalCD,0);assert.equal(a.hp,hp-1)
})
test('驯化冰雹不因气候适应/风暴之眼减少资产密度',()=>{
 const count=defense=>{const g=game(),a=g.abilitySystem,ctx=g._buildGameCtx(),h=new Hail();g.weatherSystem.tamedWeather='hail'
  if(defense){give(g,'climate_adapt',3);give(g,'eye_of_storm',2);a.setWeatherConcurrent(3)}
  h.onTrigger(ctx);let count=0;h._spawnHailstone=()=>count++
  for(let i=0;i<600;i++){h.elapsed=h.duration/2;h.update(ctx)}
  assert.equal(g._isCardTamedMutex('ice_crystal'),false);return count
 }
 assert.ok(count(false)>0);assert.equal(count(true),count(false))
})
test('新节奏对实际羽刃发射生效，仍受间隔下限控制',()=>{
 const count=boost=>{const g=game();give(g,'feather_blade',3);let shots=0;g.combat.fire=()=>shots++
  if(boost){give(g,'tailwind',5);give(g,'berserk',3);give(g,'storm_child',3);g.abilitySystem.hp=1;g.abilitySystem.setWeatherActive(true)}
  for(let i=0;i<600;i++)g.combat.update();assert.ok(g.abilitySystem.getStats().weaponCadence>=.45);return shots}
 assert.ok(count(true)>count(false))
})
test('Boss强化保留穿盾完整预警、可破机关与击杀/生存两条通路',()=>{
 assert.deepEqual(C.CHAPTERS.LIST.map(c=>c.mods.bossHp),[135,235,410,680,1120,1750])
 const g=game();g.chapterSystem.index=5;g._spawnBoss();g.boss.phase=2;g.boss._setState('roam');g.boss.attackIndex=0;g.boss._beginAttack(g.bird)
 assert.ok(g.feathers.length>0&&g.feathers.length<96);assert.ok(g.feathers.every(h=>!h.piercing||h.warn>=90))
})
test('实际Game更新叠加阵风、轻羽和天气强化仍保持可控的单击轨迹',()=>{
 const g=game();for(const id of ['light_feather','tailwind','berserk','storm_child','wind_rider'])give(g,id,9)
 g.abilitySystem.allBuffLevel=10;g.abilitySystem.hp=1;g.bird.y=350
 const ctx=g._buildGameCtx();g.weatherSystem._triggerEffect('wind',ctx);const wind=g.weatherSystem.activeEffects[0]
 wind.isVertical=true;wind.direction=-1;wind.elapsed=wind.duration/2
 g.update();g.bird.y=350;g.flap();let low=350
 for(let i=0;i<30;i++){g.update();low=Math.min(low,g.bird.y);assert.ok(Number.isFinite(g.bird.velocity))}
 assert.ok(350-low<100);assert.equal(g.bird.flapForce,-8)
})
console.log('Total balance suites: '+n)
