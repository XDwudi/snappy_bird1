const assert=require('node:assert/strict')
const Game=require('../game/core/Game'),C=require('../game/config/GameConfig'),R=require('../game/abilities/AbilityRegistry')
const cast=require('../game/entities/BossPatterns')
require('../game/systems/GameLogger').enabled=false
let count=0
const test=(name,fn)=>{fn();count++;console.log('✓ '+name)}
const game=()=>{const g=new Game({},{},375,667,null);g.start();return g}
const fight=(ch=0,h=667)=>{const g=new Game({},{},375,h,null);g.start();g.chapterSystem.index=ch;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.boss.update(g.bird);return g}
const give=(g,id,lv=1)=>{for(let i=0;i<lv;i++)g.abilitySystem.selectAbility(id)}
test('1.8.4六Boss不增加血量，生存通关与章节时限保留',()=>{
 assert.equal(C.VERSION,'1.8.5');assert.deepEqual(C.CHAPTERS.LIST.map(c=>c.mods.bossHp),[135,235,410,680,1120,1750])
 assert.deepEqual(C.BOSS.VARIANTS.map(b=>b.survivalFrames),[6000,7080,8160,9240,10320,11400])
})
test('古木每根3HP，分段破甲；破根12秒强攻后仍永久易伤且不复生',()=>{
 const g=fight(),b=g.boss,m=b.mechanics,hp=b.hp
 assert.equal(m.nodes[0].hp,3);m.nodes[0].takeDamage(3);assert.equal(m.damageScale(),.75)
 m.nodes[1].takeDamage(3);assert.equal(m.weak,720);assert.equal(m.damageScale(),1.75);assert.equal(b.phase,2)
 assert.equal(b.hp,hp-Math.round(hp*.2));assert.equal(m.nextCycle,Infinity)
 for(let i=0;i<2000;i++)m.update(g.bird)
 assert.equal(m.damageScale(),1.25);assert.ok(m.nodes.every(n=>!n.hp));assert.equal(m.cycle,1);assert.equal(g.monsterKills,0)
})
test('风暴按序断路后10秒强攻、永久失防，不重复刷节点',()=>{
 const g=fight(5),m=g.boss.mechanics
 for(const n of m.nodes)n.takeDamage(999)
 assert.equal(m.weak,600)
 for(let i=0;i<2000;i++)m.update(g.bird)
 assert.equal(m.activeNode,3);assert.equal(m.damageScale(),1);assert.equal(m.cycle,1);assert.ok(m.label().includes('永久'))
})
test('机关直伤跨越半血立即进入P2，不等额外弹丸命中',()=>{
 const g=fight(2),b=g.boss;b.hp=b.maxHp*.51;b.mechanics.strike(.055);b.update(g.bird,1);assert.equal(b.phase,2)
})
test('冰/火机关96px窗口匹配自然拍翅，累计蓄能，离开缓慢回退',()=>{
 for(const ch of [3,4]){const g=fight(ch),m=g.boss.mechanics
 g.bird.y=m.zoneY+44;for(let i=0;i<20;i++)m.update(g.bird);assert.equal(m.zoneTime,20)
 g.bird.y=m.zoneY+60;m.update(g.bird);assert.equal(m.zoneTime,19)
 for(let step=0;step<3;step++){g.bird.y=m.zoneY;for(let i=0;i<45;i++)m.update(g.bird)}
 assert.ok(m.weak>440);assert.equal(m.completed,1)
 }
})
test('冰川每次碎甲永久降低后续护甲，仍有8秒输出窗口',()=>{
 const g=fight(3),m=g.boss.mechanics
 for(let i=0;i<4;i++){m.breakArmor(0,480);m.weak=0;assert.ok(Math.abs(m.damageScale()-Math.min(1,.65+.1*(i+1)))<1e-9)}
})
test('六Boss二阶段完整轮换每组连协，无招式被索引跳过',()=>{
 for(let ch=0;ch<6;ch++){const g=fight(ch),b=g.boss;b.phase=2;const actual=[]
 for(let j=0;j<b.variant.combos.length;j++){b._beginAttack(g.bird);actual.push(b.skill.kind);while(b.comboQueue.length){b._finishAttack(g.bird);actual.push(b.skill.kind)}}
 assert.deepEqual(actual,b.variant.combos.flatMap(combo=>combo.map(i=>b.variant.skills[i].kind)))
 }
})
test('二阶段主题招式增加压力，后期区域攻击仍有完整90帧穿盾提示',()=>{
 for(const [ch,kind] of [[0,'vine_steps'],[1,'pincer'],[2,'web_lattice'],[3,'ice_bounce'],[4,'lava_arcs'],[5,'gate']]){
 const g=fight(ch),b=g.boss;g.feathers=[];b.phase=1;cast(b,g.bird,{kind});const first=g.feathers.length
 g.feathers=[];b.phase=2;cast(b,g.bird,{kind});assert.ok(g.feathers.length>first,kind)
 for(const h of g.feathers)if(h.piercing)assert.ok(h.telegraphFrames>=90&&h.warn>=90)
 }
})
test('新增换位门在三屏留下真实可穿缺口，延迟招式不提前碰撞',()=>{
 for(const height of [568,667,844])for(const [ch,kind] of [[2,'web_lattice'],[3,'gate'],[5,'gate']]){
 const g=fight(ch,height),b=g.boss;b.phase=2;g.feathers=[];cast(b,g.bird,{kind})
 for(const h of g.feathers){assert.ok(h.gap>=110);assert.ok(h.topHeight>=100&&h.bottomY<=b.groundY-20);g.bird.y=h.y;h.x=g.bird.x;h.age=h.warn;assert.equal(h.checkCollision(g.bird),false);h.age=0;g.bird.y=h.topHeight;assert.equal(h.checkCollision(g.bird),false)}
 }
})
test('派生卡全部抽卡入口检查武器前置；连击种子只保留一级有效等级',()=>{
 const empty=new Map(),ids=C.ABILITY.WEAPON_PREREQUISITES.concat('combo_seed','nomad','chapter_echo')
 for(let i=0;i<100;i++){
 const cards=R.rollChoices(empty,6,70,6).concat(R.rollBossRewardChoices(empty,70,6)||[])
 for(const card of [R.rollRarePlus(empty,[],70,6),R.rollEpic(empty,[],70,6)])if(card)cards.push(card)
 assert.ok(cards.every(c=>!ids.includes(c.id)))
 }
 for(const id of ['shadow_echo','venom_thread','storm_chain'])assert.equal(R._meetsPrerequisite(R.get(id),new Map([['magma_core',1]]),6),false)
 assert.equal(R.get('combo_seed').maxLevel,1)
 for(const id of C.ABILITY.WEAPON_PREREQUISITES)assert.equal(R._meetsPrerequisite(R.get(id),new Map([['seed_bolt',1]]),6),true)
})
test('羽刃每级实际提高直射伤害，顺风三级有效提速且不改变拍翅',()=>{
 for(let lv=1;lv<=3;lv++){const g=game();give(g,'feather_blade',lv);g.combat.update();assert.equal(g.combat.shots[0].damage,lv);assert.equal(g.combat.shots[0].bossDamage,lv+1)}
 const g=game();give(g,'tailwind',3);assert.ok(Math.abs(g.abilitySystem.getStat('weaponCadence')-.82)<.001);assert.equal(g.abilitySystem.getStat('flapForceMultiplier'),1)
})
test('高频命中持续续毒仍每秒跳伤，不会无限重置时钟',()=>{
 const g=game();give(g,'venom_thread',2);const ticks=[]
 const target={x:180,y:300,width:40,topHeight:280,bottomY:320,hp:1000,maxHp:1000,takeDamage(n,source){this.hp-=n;if(source==='venom')ticks.push(g.combat.age);return false}}
 g.monsters=[target];g.bird.y=300
 for(let i=0;i<190;i++){if(i%15===0){g.combat.fire(1,1,[0],'test');g.combat.shots[g.combat.shots.length-1].x=176}g.combat.update()}
 assert.equal(ticks.length,3);assert.equal(ticks[1]-ticks[0],60);assert.equal(ticks[2]-ticks[1],60)
})
test('天雷链路对单体Boss生效，1秒冷却且不会递归',()=>{
 const g=fight(1),b=g.boss;give(g,'storm_chain',2);g.bird.y=b.y;const before=b.hp
 g.combat.fire(1,1,[0],'test');g.combat.shots[0].x=b.x;g.combat.shots[0].y=b.y;g.combat.update()
 assert.equal(before-b.hp,5);assert.equal(g.combat.chainCD,60)
 const after=b.hp;g.combat.fire(1,1,[0],'other');g.combat.shots[0].x=b.x;g.combat.shots[0].y=b.y;g.combat.update();assert.equal(after-b.hp,1)
})
test('无风也能触发御风双刃，有风才进一步加速',()=>{
 const g=game();give(g,'wind_rider',1);g.combat.update();assert.equal(g.combat.shots.length,2);assert.equal(g.combat.cooldowns.wind_rider,420)
})
console.log('v1.8.4: '+count+' tests passed')
