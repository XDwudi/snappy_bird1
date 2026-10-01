const assert=require('node:assert/strict')
const Game=require('../game/core/Game')
const C=require('../game/config/GameConfig')
const R=require('../game/abilities/AbilityRegistry')
const Hazard=require('../game/entities/BossHazard')
const Monster=require('../game/entities/Monster')
const scaling=require('../game/systems/EndlessScaling')
require('../game/systems/GameLogger').enabled=false
let n=0
const test=(name,fn)=>{fn();console.log('✓ '+name);n++}
const game=(w=375,h=667)=>{const g=new Game({},{},w,h,null);g.start();return g}
const give=(g,id,lv=1)=>{for(let i=0;i<lv;i++)g.abilitySystem.selectAbility(id)}
const fight=(g,ch)=>{g.chapterSystem.index=ch;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');return g.boss}
const endless=g=>{const s=g.chapterSystem;s.index=5;for(let i=0;i<6;i++)s.cleared.add(i);s.enterEndless();g.abilitySystem.chapter=6}
test('六章递增、六种非鸟形象、各六招且组合可解析',()=>{
 assert.equal(C.CHAPTERS.LIST.length,6);assert.equal(new Set(C.BOSS.VARIANTS.map(b=>b.theme)).size,6)
 for(let i=0;i<6;i++){
  const c=C.CHAPTERS.LIST[i],b=C.BOSS.VARIANTS[i]
  assert.equal(b.skills.length,6);assert.equal(new Set(b.skills.map(s=>s.kind)).size,6)
  assert.ok(b.combos.every(a=>a.length>=2&&a.every(k=>k>=0&&k<6)))
  if(i)for(const key of ['triggerPipes','minFrames'])assert.ok(c[key]>C.CHAPTERS.LIST[i-1][key])
  if(i)assert.ok(c.mods.bossHp>C.CHAPTERS.LIST[i-1].mods.bossHp)
 }
})
test('进度需同时满足时间和管数；失败不跳章；六章真实通关才无尽',()=>{
 const g=game(),s=g.chapterSystem
 s.pipesPassed=60;s.update();assert.equal(s.isBossIntro(),false)
 s.chapterTime=C.CHAPTERS.LIST[0].minFrames;s.update();assert.equal(s.isBossIntro(),true)
 s._bossIntro=null;s.onBossDefeat();s.onBossDefeat();assert.equal(s.index,0);assert.equal(s._transition,null)
 assert.equal(s.enterEndless(),false)
 for(let i=0;i<6;i++){s.index=i;s.endBossFight(true);if(i<5){assert.ok(s._transition);s._applyNextChapter(i+1);s._transition=null}}
 assert.equal(s.endless,true);assert.equal(s.cleared.size,6)
 s.reset();assert.equal(s.endless,false);assert.equal(s.cleared.size,0)
})
test('73张卡所有抽卡路径均遵守章节与前置；每关都有新卡',()=>{
 assert.equal(R.getAll().length,73)
 for(let ch=1;ch<=6;ch++)for(let trial=0;trial<60;trial++) {
  const owned=new Map();const cards=[...R.rollChoices(owned,6,50,ch),R.rollEpic(owned,[],50,ch),R.rollRarePlus(owned,[],50,ch),...(R.rollBossRewardChoices(owned,50,ch)||[])].filter(Boolean)
  for(const card of cards){assert.ok(card.unlockChapter<=ch,card.id);assert.ok(!C.ABILITY.PREREQUISITES[card.id],card.id)}
 }
 for(let ch=1;ch<=6;ch++)assert.ok(R.getAll().filter(a=>a.unlockChapter===ch).length>=2)
 const g=game();g.chapterSystem._applyNextChapter(3);assert.equal(g.abilitySystem.chapter,4)
})
test('三种屏幕、36招都可完整执行、预警无伤、P2至少两招连协',()=>{
 for(const [w,h] of [[320,568],[375,667],[390,844]])for(let ch=0;ch<6;ch++) {
  for(let idx=0;idx<6;idx++) {
   const g=game(w,h),b=fight(g,ch);b.attackIndex=idx;b._beginAttack(g.bird)
   for(const p of g.feathers)assert.equal(p.checkCollision({x:p.x,y:p.y,collisionWidth:24,collisionHeight:17}),false)
   assert.ok(b.warnFrames>=42)
   for(let f=0;f<600&&b.state!=='recover';f++){
    b.update(g.bird);for(const p of g.feathers)p.update();g.feathers=g.feathers.filter(p=>!p.isOffscreen(w,h))
   }
   assert.equal(b.state,'recover',ch+':'+idx)
  }
  const g=game(w,h),b=fight(g,ch);b._enterPhase2();b._beginAttack(g.bird)
  const size=b.comboLength;assert.ok(size>=2)
  for(let f=0;f<1800&&b.state!=='recover';f++)b.update(g.bird)
  assert.equal(b.comboStep,size);assert.equal(b.state,'recover')
 }
})
test('所有屏幕墙的安全缺口与碰撞一致；固定线不会跟踪玩家',()=>{
 for(const h of [568,667,844])for(let ch=0;ch<6;ch++) {
  const g=game(375,h),b=fight(g,ch);const i=b.variant.skills.findIndex(a=>a.kind==='gate');if(i<0)continue
  b.attackIndex=i;b._beginAttack(g.bird);const wall=g.feathers[0]
  assert.ok(wall.topHeight>=130);assert.ok(wall.bottomY<=h-80)
  wall.age=wall.warn;wall.x=g.bird.x;g.bird.y=wall.y;assert.equal(wall.checkCollision(g.bird),false)
  g.bird.y=wall.topHeight;assert.equal(wall.checkCollision(g.bird),true)
 }
 const p=new Hazard({kind:'beam',y:300,warn:60});assert.equal(p.checkCollision({x:1,y:300,collisionHeight:20}),false)
 for(let i=0;i<60;i++)p.update();assert.equal(p.checkCollision({x:1,y:300,collisionHeight:20}),true)
})
test('六关均保留击杀/生存通关，奖励只结算一次',()=>{
 for(let ch=0;ch<6;ch++)for(const method of ['kill','survival']){
  const g=game(),b=fight(g,ch);g._onBossVictory(method);g._onBossVictory(method)
  assert.equal(g.bossClears.length,1);assert.equal(g.bossBadges.length,method==='kill'?1:0)
  assert.equal(g._getBossSurvivalFrames(),C.BOSS.VARIANTS[ch].survivalFrames)
 }
})
test('派系按不同卡计数，2/4件属性实际变化',()=>{
 const g=game();const before=g.abilitySystem.getStats().gapBonus
 give(g,'sand_lance',3);assert.equal(g.abilitySystem.getFactions()[0].tier,0)
 give(g,'dune_cache');assert.equal(g.abilitySystem.getStats().gapBonus,before+6)
 give(g,'boss_slayer');give(g,'nomad');assert.equal(g.abilitySystem.getStats().gapBonus,before+12)
})
test('新武器实际伤害、穿透、多段独立命中与收割奖励不重复',()=>{
 const g=game();g.bird.y=300;give(g,'sand_lance',2)
 const a=new Monster(160,300,'floater',587),b=new Monster(220,300,'floater',587);g.monsters=[a,b]
 for(let i=0;i<25;i++)g.combat.update()
 assert.ok(a.hp<=0&&b.hp<=0);assert.equal(g.monsterKills,2)
 g._onMonsterKilled(a);assert.equal(g.monsterKills,2)
 g.combat.fire(1,2,Array(200).fill(0));assert.ok(g.combat.shots.length<=12)
})
test('毒丝三次跳伤后失效；寒晶只清普通弹幕；无伤预警不被提前反射',()=>{
 const g=game(),b=fight(g,4);b.venom={remaining:180,tick:60,damage:2};const hp=b.hp
 for(let i=0;i<180;i++){g.combat.updateCampaign();for(const k of Object.keys(b._weaponGates))b._weaponGates[k]=0}
 assert.equal(b.hp,hp-6);assert.equal(b.venom,null)
 give(g,'frost_shell');give(g,'orbit_guard')
 const p=new Hazard({x:g.bird.x,y:g.bird.y,warn:0}),wall=new Hazard({kind:'gate',x:g.bird.x,y:g.bird.y,warn:0})
 g.feathers=[p,wall];g.combat.updateCampaign();assert.deepEqual(g.feathers,[wall])
 assert.equal(g.combat.intercept(new Hazard({x:g.bird.x,y:g.bird.y,warn:60})),false)
})
test('无尽随机Boss同级数值、时间递增、刷新间隔、死亡不兜底',()=>{
 const g=game();endless(g);g.chapterSystem.endlessFrames=36000
 for(let idx=0;idx<6;idx++){
  g.chapterSystem.endlessBossIndex=idx;g._spawnBoss()
  assert.equal(g.boss.maxHp,scaling(36000).bossHp);assert.equal(g.boss.variant.bulletSpeed,C.BOSS.VARIANTS[5].bulletSpeed)
  assert.equal(g.boss.difficultyTier,5);assert.equal(g.boss.survivalFrames,9000)
 }
 const hp0=scaling(0).bossHp;assert.ok(scaling(72000).bossHp>hp0*30)
 g.abilitySystem.hp=0;g._onBossDefeat();assert.equal(g.state,'gameover')
})
test('无尽所有得分入口统一×2；Boss奖励不无限叠祝福',()=>{
 const a=game(),b=game();endless(b)
 let notifications=0;b.onScoreChange=()=>notifications++
 for(const g of [a,b])for(const p of [1,C.EXP.SCORE_NEAR_MISS,C.EXP.SCORE_PER_ORB,5,100])g._addScore(p)
 assert.equal(b.score,a.score*2)
 const before=b.score;b._startBossRewards();assert.equal(b.score-before,200);assert.equal(b._bossRewardPending,false)
 assert.ok(b.chapterSystem.nextBossAt>b.chapterSystem.endlessFrames)
})
test('满池后等级/突破无上限，大量升级无递归溢出；重开清零',()=>{
 const g=game();endless(g)
 for(const d of R.getAll())g.abilitySystem.owned.set(d.id,d.maxLevel)
 g.expSystem.pendingLevelUps=20000;g._triggerLevelUp()
 assert.equal(g.abilitySystem.breakthroughLevel,19990);assert.equal(g.expSystem.pendingLevelUps,0)
 assert.ok(Number.isFinite(g.abilitySystem.getStats().weaponBonus))
 g.expSystem.level=10000;g.expSystem.addExp(g.expSystem.getExpNeeded(10000),1);assert.equal(g.expSystem.level,10001)
 g.start();assert.equal(g.abilitySystem.breakthroughLevel,0);assert.equal(g.abilitySystem.chapter,1)
})
test('升级/暂停冻结无尽钟和攻击；场景重开清空危险物',()=>{
 const g=game();endless(g);fight(g,5);g.boss._beginAttack(g.bird)
 g.state='upgrading';const time=g.chapterSystem.endlessFrames,age=g.boss.stateT
 for(let i=0;i<100;i++)g.update()
 assert.equal(g.chapterSystem.endlessFrames,time);assert.equal(g.boss.stateT,age)
 g.start();assert.equal(g.feathers.length,0);assert.equal(g.boss,null)
})
test('输出回充护盾只在真实伤害触发，有冷却、不超过上限、时间成本上升',()=>{
 const g=game();endless(g);g.abilitySystem.shieldLayers=0
 g.combat.chargeEndless(20);assert.equal(g.abilitySystem.shieldLayers,1)
 g.abilitySystem.shieldLayers=0;g.combat.chargeEndless(20);assert.equal(g.abilitySystem.shieldLayers,0)
 g.combat.endlessGuardCD=0;g.chapterSystem.endlessFrames=36000;g.combat.chargeEndless(1)
 assert.equal(g.abilitySystem.shieldLayers,0)
})
test('召唤、反射、冰枪、暗影、收割和管道补盾具备实际效果',()=>{
 const g=game();give(g,'seed_harvest',3);g.abilitySystem.hp=1
 for(let i=0;i<3;i++)g.combat.onKill();assert.equal(g.abilitySystem.hp,2)
 give(g,'dune_cache',3);g.abilitySystem.shieldLayers=0
 for(let i=0;i<7;i++)g.combat.onPipe();assert.equal(g.abilitySystem.shieldLayers,1)
 give(g,'shadow_echo',2);g.combat.clearShots();for(let i=0;i<4;i++)g.combat.fire()
 assert.ok(g.combat.shots.some(s=>s.source==='echo'))
 const h=game();h.bird.y=300;give(h,'frost_lance');const m=new Monster(160,300,'floater',587,{hpMult:8});h.monsters=[m]
 for(let i=0;i<10;i++)h.combat.update();assert.equal(m.frostFrames,120);assert.ok(m.hp<m.maxHp)
 const b=fight(g,0);b.attackIndex=5;b._beginAttack(g.bird)
 for(let i=0;i<b.warnFrames;i++)b.update(g.bird)
 assert.ok(g.monsters.some(x=>x.type==='monster'))
})
test('处决、熔核与雷链伤害生效；全场坍缩包含身后目标',()=>{
 const g=game();give(g,'cinder_execution',2);let b=fight(g,5);b.hp=100;b.mechanics.activeNode=3 // 火力算式独立于1.8.1机核护甲，机关另测
 g.combat.damageTarget(b,10,'test');assert.equal(b.hp,84)
 give(g,'singularity');const m=new Monster(10,200,'floater',587,{hpMult:10});g.monsters=[m];const hp=m.hp
 g.combat.updateCampaign();assert.ok(m.hp<hp)
 const h=game();give(h,'storm_chain',2);h.bird.y=300;const a=new Monster(170,300,'bat',587),c=new Monster(200,390,'bat',587);h.monsters=[a,c]
 h.combat.fire();for(let i=0;i<10;i++)h.combat.update();assert.ok(a.hp<=0&&c.hp<=0);assert.equal(h.monsterKills,2)
})
test('无尽实际管道/擦边/球/生存/礼包入口翻倍、光束可触发时间扭曲',()=>{
 const a=game(),b=game();endless(b)
 let notifications=0;b.onScoreChange=()=>notifications++
 for(const g of [a,b]) {
  g._onPipePass({x:0,topHeight:100,gap:200,bottomY:300})
  g._collectOrb();g.bird.y=300
  g._checkNearMiss({x:0,topHeight:280,bottomY:500})
 }
 assert.equal(b.score,2*a.score);assert.equal(notifications,3)
 const c=game();give(c,'time_warp');c.bird.y=300;c.feathers=[new Hazard({kind:'beam',y:300,warn:60,age:55})]
 c._checkActiveAbilities();assert.ok(c.abilitySystem.timeWarpActive>0)
})
test('完整六章奖励/转场链进入无尽，重赛不能冒领章节通关',()=>{
 const g=game()
 for(let ch=0;ch<6;ch++) {
  assert.equal(g.chapterSystem.index,ch)
  g.chapterSystem.pipesPassed=C.CHAPTERS.LIST[ch].triggerPipes
  g.chapterSystem.chapterTime=C.CHAPTERS.LIST[ch].minFrames
  g.chapterSystem.update()
  for(let i=0;i<C.BOSS.INTRO_VIGNETTE_FRAMES+C.BOSS.INTRO_GATHER_FRAMES+C.BOSS.INTRO_ENTER_FRAMES;i++)g.update()
  assert.ok(g.chapterSystem.isBossActive())
  g._onBossVictory(ch%2?'kill':'survival')
  for(let i=0;i<32&&g.state==='playing';i++){g.bird.y=300;g.bird.velocity=0;g.update()}
  for(let i=0;i<150&&g.state==='upgrading';i++)g.selectAbility(g._currentChoices[0].id)
  for(let i=0;i<160&&g.chapterSystem.isTransitioning();i++)g.update()
 }
 assert.equal(g.chapterSystem.endless,true);assert.equal(g.chapterSystem.cleared.size,6)
 assert.equal(g.abilitySystem.chapter,6);assert.equal(g.bossClears.length,6)
})
test('后段压缩+满缩小射线的管道初始间隙仍为正；最终缺口不越界',()=>{
 const g=game(320,568);endless(g);give(g,'shrink_ray',5);g.chapterSystem.endlessFrames=25*3600;g.gameTime=200000
 for(let i=0;i<100;i++){
  g.spawnSystem.spawnPipe();const p=g.pipes.pop();assert.ok(p.origGap>=80)
  for(let f=0;f<60;f++)p.update(0)
  assert.ok(p.topHeight>=C.PIPE.MIN_TOP-1);assert.ok(p.bottomY<=488-C.PIPE.MIN_BOTTOM+1)
 }
})

test('凤凰升级只增加总次数，无尽过管防御积累遵守压缩速率',()=>{
 const g=game();give(g,'phoenix');g.abilitySystem.phoenixUsed=1;give(g,'phoenix')
 assert.equal(g.abilitySystem.phoenixUsed,1)
 give(g,'echo_wing');give(g,'combo_heart');g.abilitySystem.tickCooldowns(.25)
 for(let i=0;i<4;i++){g.abilitySystem.onPipePassEchoWing();g.abilitySystem.onPipePass()}
 assert.equal(g.abilitySystem.echoWingPipes,1);assert.equal(g.abilitySystem.comboCount,1)
})
test('短屏夹击在上下边缘仍保留130px安全走廊',()=>{
 for(const h of [568,667,844])for(const y of [140,h-100]){
  const g=game(320,h),b=fight(g,1);g.bird.y=y;b.attackIndex=2;b._beginAttack(g.bird)
  const lines=g.feathers.filter(p=>p.kind==='beam').sort((a,b)=>a.y-b.y)
  assert.equal(lines.length,2);assert.equal(lines[1].y-lines[0].y-lines[0].radius-lines[1].radius,130)
 }
})
console.log(`Total 1.8.0 suites: ${n}`)
