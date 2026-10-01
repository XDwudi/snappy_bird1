const assert=require('node:assert/strict')
const Game=require('../game/core/Game'), C=require('../game/config/GameConfig'), R=require('../game/abilities/AbilityRegistry')
const Elite=require('../game/entities/EliteMonster'), Hazard=require('../game/entities/BossHazard')
const scaling=require('../game/systems/EndlessScaling')
require('../game/systems/GameLogger').enabled=false
let n=0
const test=(name,fn)=>{fn();console.log('✓ '+name);n++}
const game=(w=375,h=667)=>{const g=new Game({},{},w,h,null);g.start();return g}
const fight=(ch,h=667)=>{const g=game(375,h);g.chapterSystem.index=ch;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.boss.update(g.bird);return g}
const give=(g,id,lv)=>{for(let i=0;i<lv;i++)g.abilitySystem.selectAbility(id)}
test('版本1.8.1；六Boss有18个不重复专属招式与六种机关',()=>{
 assert.equal(C.VERSION,'1.8.2') // 旧机制回归沿用当前版本
 const kinds=C.BOSS.VARIANTS.flatMap(b=>b.skills.map(s=>s.kind))
 assert.ok(kinds.filter(k=>kinds.filter(x=>x===k).length===1).length>=18)
 assert.equal(new Set(Array.from({length:6},(_,i)=>fight(i).boss.mechanics.label())).size,6)
})
test('古木双根护甲、破根真实反噬且机关不刷击杀/回血',()=>{
 const g=fight(0),b=g.boss,m=b.mechanics,hp=b.hp
 assert.equal(m.nodes.length,2);assert.equal(m.damageScale(),.45)
 for(const node of m.nodes)g.combat.damageTarget(node,100,'test')
 assert.ok(b.hp<hp);assert.equal(m.weak,240);assert.equal(g.monsterKills,0);assert.equal(g.combat.harvestKills,0)
 const after=b.hp;m.nodes[1].takeDamage(100);assert.equal(b.hp,after)
})
test('巨蝎只有成功诱撞才反噬；错位冲锋不会白送破绽',()=>{
 const g=fight(1),b=g.boss,m=b.mechanics,hp=b.hp
 b._setState('charging');b.x=g.screenW*.5;b.chargeY=m.rockY+80;m.update(g.bird);assert.equal(b.hp,hp)
 b.chargeY=m.rockY;m.update(g.bird);assert.ok(b.hp<hp);assert.equal(b.state,'recover');assert.ok(m.weak>0)
})
test('蛛卵击破阻止孵化；忽略的卵会孵化并出预警弹',()=>{
 const g=fight(2),b=g.boss,m=b.mechanics,hp=b.hp
 m.nodes[0].takeDamage(999);assert.ok(b.hp<hp)
 for(let i=0;i<421;i++)m.update(g.bird)
 assert.equal(g.monsters.length,1);assert.equal(g.feathers.length,2);assert.ok(g.feathers.every(p=>p.warn>=60))
})
test('冰像须三次交替蓄热，离开会损失蓄热；碎甲真实降防',()=>{
 const g=fight(3),m=g.boss.mechanics;assert.equal(m.damageScale(),.5)
 g.bird.y=m.zoneY;for(let i=0;i<20;i++)m.update(g.bird)
 g.bird.y=300;m.update(g.bird);assert.equal(m.zoneTime,18)
 m.zoneTime=0
 for(let phase=0;phase<3;phase++){g.bird.y=m.zoneY;for(let i=0;i<45;i++)m.update(g.bird)}
 assert.ok(m.weak>0);assert.equal(m.damageScale(),1.5)
})
test('地龙蓄热触发地火，开阀排热并造成反噬',()=>{
 const g=fight(4),m=g.boss.mechanics
 for(let i=0;i<4;i++)m.onAttack()
 assert.equal(g.feathers.length,1);assert.equal(g.feathers[0].warn,90)
 const hp=g.boss.hp;g.bird.y=m.zoneY;for(let i=0;i<45;i++)m.update(g.bird)
 assert.equal(m.heat,0);assert.ok(g.boss.hp<hp)
})
test('机核节点只能按序击破，全部击破才解除护甲',()=>{
 const g=fight(5),m=g.boss.mechanics
 const hp=m.nodes[1].hp;m.nodes[1].takeDamage(999);assert.equal(m.nodes[1].hp,hp)
 for(let i=0;i<3;i++){assert.equal(g._pickMissileTarget(),m.nodes[i]);m.nodes[i].takeDamage(999)}
 assert.equal(m.activeNode,3);assert.ok(m.weak>0)
})
test('机关最后一击也走唯一Boss胜利结算，无奖励重复',()=>{
 const g=fight(0),m=g.boss.mechanics;g.boss.hp=1
 for(const node of m.nodes)node.takeDamage(999)
 g._updateBossFight();g._updateBossFight();assert.equal(g.bossClears.length,1);assert.equal(g.bossClears[0].method,'kill')
})
test('磁轨三屏都留真实缺口，预警无伤且在固定X能上下躲避',()=>{
 for(const h of [568,667,844]){
  const g=fight(5,h),b=g.boss;b.attackIndex=1;b._beginAttack(g.bird)
  for(const rail of g.feathers){g.bird.y=rail.y;rail.age=rail.warn;assert.equal(rail.checkCollision(g.bird),false);g.bird.y=rail.topHeight-5;assert.equal(rail.checkCollision(g.bird),true);rail.age=0;assert.equal(rail.checkCollision(g.bird),false)}
 }
})
test('回血/回盾/临时生命跨来源共用无尽恢复间隔，重开清零',()=>{
 const g=game(),a=g.abilitySystem;give(g,'toughness',3);a.hp=1;a.shieldLayers=0;a.renewalInterval=300
 a.healHP(99);assert.equal(a.hp,2);a.addShieldLayer(99);a.grantTempHp(9);assert.equal(a.shieldLayers,0);assert.equal(a.tempHp,0)
 for(let i=0;i<300;i++)a.tickCooldowns(.2)
 a.addShieldLayer(99);assert.equal(a.shieldLayers,1);a.healHP(99);assert.equal(a.hp,2)
 g.start();assert.equal(a.renewalInterval,0);assert.equal(a.renewalCD,0)
})
test('无尽真实更新压缩时间扭曲/时之晶而不是只压缩受击无敌',()=>{
 const g=game(),s=g.chapterSystem;for(let i=0;i<6;i++)s.cleared.add(i);s.index=5;s.enterEndless();s.endlessFrames=10*3600
 const a=g.abilitySystem;a.invincibleFrames=999;a.timeWarpActive=999;a.timeCrystalFreezeFrames=999;g.update()
 const cap=scaling(10*3600).invincibleCap
 assert.ok(a.timeWarpActive<=cap&&a.timeCrystalFreezeFrames<=cap&&a.invincibleFrames<=cap);assert.ok(a.renewalInterval>0)
})
test('Boss固定一级礼包不再吃经验乘区或共鸣；祝福加算',()=>{
 const g=game();give(g,'exp_resonance',3);g.abilitySystem.blessingExpMult=100
 g._gainExp(g.expSystem.getExpNeeded(1),'boss_gift',{expMultiplier:100});assert.equal(g.expSystem.level,2)
 const h=game();h._applyBlessing('bless_growth');h._applyBlessing('bless_growth');assert.ok(Math.abs(h.abilitySystem.blessingExpMult-1.3)<.001)
})
test('无尽击杀不回满血，进入随机Boss不会送血盾',()=>{
 const g=game(),s=g.chapterSystem;for(let i=0;i<6;i++)s.cleared.add(i);s.index=5;s.enterEndless();g.abilitySystem.hp=1;g.abilitySystem.shieldLayers=0
 g._spawnBoss();assert.equal(g.abilitySystem.hp,1);assert.equal(g.abilitySystem.shieldLayers,0)
 g._bossClearMode='kill';g._startBossRewards();assert.equal(g.abilitySystem.hp,2);assert.equal(g.abilitySystem.shieldLayers,0)
})
test('血量始终图形，临时生命为黄色，最大容量下两行不越界',()=>{
 const g=game(320,568),fills=[],texts=[];let curves=0
 let color='';g.ctx=new Proxy({},{get:(_,key)=>key==='fillText'?(v)=>texts.push(v):key==='fill'?()=>fills.push(color):key==='bezierCurveTo'?()=>curves++:()=>{},set:(_,key,value)=>{if(key==='fillStyle')color=value;return true}})
 const a=g.abilitySystem;a.maxHp=6;a.hp=4;a.tempHp=11;a.blessingTempHpCapBonus=9;g._drawHPHearts(14,14,18,4)
 assert.equal(texts.length,0);assert.equal(curves,34);assert.equal(fills.filter(x=>x==='#ffd54a').length,11)
})
test('普通怪跟随管道出口高度，水平间隔保留绕行空间',()=>{
 const g=game();g.gameTime=4000;g.spawnSystem.spawnPipe();const p=g.pipes[0]
 g.spawnSystem._monsterDistance=10000;g.spawnSystem.updateMonsterSpawn(3)
 const m=g.monsters[0];assert.ok(Math.abs(m.baseY-(p.topHeight+p.gap/2))<=45.01);assert.ok(m.x>=p.x+p.width+95)
})
test('炮艇有伴飞/预警射击/撤离阶段，非Boss弹幕照常更新碰撞',()=>{
 const g=game(),shots=[]
 const e=new Elite(405,300,'bat',587,{elite:true,screenW:375,onHazard:h=>shots.push(h),getPipes:()=>[]});g.bird.y=300
 for(let i=0;i<250;i++)e.update(3,g.bird)
 assert.ok(e.x>g.bird.x+100&&e.x<375);assert.equal(shots.length,2);assert.ok(shots.every(h=>h.age<h.warn))
 const h=shots[0];g.feathers=[h];const before=h.age;g._updateBossFight();assert.ok(h.age>before)
 for(let i=0;i<800;i++)e.update(3,g.bird);assert.equal(e.isOffscreen(),true)
})
test('炮艇在玩家过管窗口暂缓射击；精英最多同时一只',()=>{
 const g=game();g.bird.y=300;const pipes=[{x:g.bird.x-15,width:30,topHeight:200,gap:200}],shots=[]
 const e=new Elite(300,300,'bat',587,{elite:true,screenW:375,onHazard:h=>shots.push(h),getPipes:()=>pipes})
 for(let i=0;i<300;i++)e.update(3,g.bird);assert.equal(shots.length,0)
 g.monsters=[e];g.gameTime=5000;g.spawnSystem._chapterMods={monsterMaxAlive:4,monsterSpawnDistance:10};g.spawnSystem._elitePending=true;g.spawnSystem.updateMonsterSpawn(20)
 assert.equal(g.monsters.filter(m=>m.elite).length,1)
})
test('唤天气灵提高并发上限，击杀快速驱散且只领奖一次',()=>{
 const g=game(),w=g.weatherSystem,ctx=g._buildGameCtx(),original=Math.random
 try{Math.random=()=>0;w.setElitePressure(true);for(let i=0;i<3;i++){w.triggerCooldown=0;w._tryTrigger(5000,ctx)}}finally{Math.random=original}
 assert.equal(w.activeEffects.length,3)
 const e=new Elite(260,300,'floater',587,{elite:true,eliteKind:'stormcaller',screenW:375});e.hp=0;g.monsters=[e]
 g._onMonsterKilled(e);const score=g.score;g._onMonsterKilled(e)
 assert.equal(g.score,score);assert.equal(g.monsterKills,1);assert.equal(w.elitePressure,false);assert.ok(w.activeEffects.every(f=>f.duration-f.elapsed<=180))
})
test('暂停冻结机关/精英/弹幕，重新开始清除全部局内状态',()=>{
 const g=fight(2);g.state='upgrading';const age=g.boss.mechanics.age;g.update();assert.equal(g.boss.mechanics.age,age)
 g.weatherSystem.setElitePressure(true);g.start();assert.equal(g.boss,null);assert.equal(g.monsters.length,0);assert.equal(g.feathers.length,0);assert.equal(g.weatherSystem.elitePressure,false)
})
test('经验递减曲线不会在阈值附近反向加速；随机强构筑仍有收益',()=>{
 const g=game(),a=g.abilitySystem
 let previous=0
 for(const raw of [1,2,3,3.01,3.5,4,10,30]){
  a.blessingExpMult=raw;const value=a.getStats().expMultiplier
  assert.ok(value<=raw+.0001);assert.ok(value>previous);previous=value
 }
})
test('时间扭曲下Boss与危险物同步减速，避免连招在前招未退场时提前叠加',()=>{
 const g=fight(0),b=g.boss;b._setState('telegraph');b.warnFrames=1000;g.abilitySystem.timeWarpActive=100
 const h=new Hazard({x:300,y:300,warn:1000});g.feathers=[h]
 for(let i=0;i<20;i++)g._updateBossFight()
 assert.equal(b.stateT,10);assert.equal(h.age,10)
})
test('高速弹幕和墙采用连续路径判定，不穿过小碰撞箱漏判',()=>{
 const bird={x:100,y:300,collisionWidth:8,collisionHeight:8}
 const bullet=new Hazard({x:130,y:300,vx:-60,warn:0});bullet.update();assert.equal(bullet.checkCollision(bird),true)
 const gate=new Hazard({kind:'gate',x:150,y:200,gap:100,vx:-100,warn:0});gate.update();assert.equal(gate.checkCollision(bird),true)
})
test('导弹对机关按实体中心瞄准和命中，不误用管道外部碰撞区',()=>{
 const Missile=require('../game/entities/Missile'),g=fight(0),node=g.boss.mechanics.nodes[0]
 const missile=new Missile(node.x+node.width/2,node.y,node)
 assert.equal(missile._targetPoint().y,node.y);assert.equal(missile.hitTest(node),true)
 const hp=node.hp;assert.equal(g._checkMissileHit(missile),true);assert.ok(node.hp<hp)
 missile.y=node.y+100;assert.equal(missile.hitTest(node),false)
})
console.log(`Total 1.8.1 suites: ${n}`)
