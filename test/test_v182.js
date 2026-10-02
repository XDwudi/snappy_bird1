const assert=require('node:assert/strict')
const Game=require('../game/core/Game'),C=require('../game/config/GameConfig'),Hazard=require('../game/entities/BossHazard'),Elite=require('../game/entities/EliteMonster')
const cast=require('../game/entities/BossPatterns'),scaling=require('../game/systems/EndlessScaling')
require('../game/systems/GameLogger').enabled=false
let n=0;const test=(name,fn)=>{fn();n++;console.log('✓ '+name)}
const game=(w=375,h=667)=>{const g=new Game({},{},w,h,null);g.start();return g}
const fight=(ch,w=375,h=667)=>{const g=game(w,h);g.chapterSystem.index=ch;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.boss.update(g.bird);return g}
test('1.8.2 六章开战上限、生存时长、HP递增，后期压力同步提高',()=>{
 assert.equal(C.VERSION,'1.8.3')
 for(let i=0;i<6;i++){const ch=C.CHAPTERS.LIST[i],b=C.BOSS.VARIANTS[i];assert.ok(ch.maxFrames>ch.minFrames);assert.ok(b.survivalFrames>=6000);if(i)assert.ok(ch.mods.bossHp>C.CHAPTERS.LIST[i-1].mods.bossHp)}
})
test('不通过任何管道也按上限开战，仅触发一次；选卡和暂停不累计',()=>{
 for(let ch=0;ch<6;ch++){
  const g=game(),s=g.chapterSystem;s.index=ch;s.chapterTime=s.getChapter().maxFrames-1
  g.state='upgrading';g.update();assert.equal(s.chapterTime,s.getChapter().maxFrames-1)
  g.state='playing';s.update();assert.ok(s.isBossIntro());assert.equal(s.pipesPassed,0)
  const intro=s._bossIntro;s.update();assert.equal(s._bossIntro,intro)
 }
})
test('通过数达标仍需最低时间；重赛20管或35秒，先到即触发',()=>{
 const g=game(),s=g.chapterSystem;s.pipesPassed=999;s.chapterTime=s.getChapter().minFrames-2
 s.update();assert.equal(s.isBossIntro(),false);s.update();assert.equal(s.isBossIntro(),true)
 s._bossIntro=null;s.startBossFight();s.onBossDefeat();s.chapterTime=s._bossReturnDeadline-1;s.update();assert.ok(s.isBossIntro());assert.equal(s._awaitingRematch,false)
 const h=game(),r=h.chapterSystem;r._bossTriggered=true;r.onBossDefeat();for(let i=0;i<C.BOSS.DEFEAT_RETURN_PIPES;i++)r.onPipePassed();assert.ok(r.isBossIntro())
})
test('第二关砂瀑三屏均为横移缺口，可在固定X上下躲开，缺口不跟踪',()=>{
 for(const [w,h] of [[320,568],[375,667],[430,844]])for(const y of [145,h-110]){
  const g=fight(1,w,h);g.feathers=[];g.bird.y=y;cast(g.boss,g.bird,{kind:'sandfall'})
  assert.equal(g.feathers.length,3)
  let previous=null
  for(const f of g.feathers){assert.equal(f.kind,'gate');assert.ok(f.vx<0);assert.ok(f.topHeight>=130);assert.ok(f.bottomY<=h-80);if(previous!==null)assert.ok(Math.abs(f.y-previous)<=48);previous=f.y
   f.x=g.bird.x;f.age=f.warn;g.bird.y=f.y;assert.equal(f.checkCollision(g.bird),false);g.bird.y=f.topHeight-5;assert.equal(f.checkCollision(g.bird),true)
  }
 }
})
test('穿盾预告至少1.5秒，预警不伤人；紫色攻击只在第四章及之后',()=>{
 for(let ch=0;ch<6;ch++){
  const g=fight(ch);for(const skill of g.boss.variant.skills){g.feathers=[];cast(g.boss,g.bird,skill)
   for(const f of g.feathers)if(f.piercing){assert.ok(ch>=3);assert.ok(f.warn>=90);assert.equal(f.color,'#ff66df');f.age=0;assert.equal(f.checkCollision(g.bird),false)}
  }
 }
 const g=fight(5);cast(g.boss,g.bird,{kind:'rail_switch'});assert.ok(g.feathers.some(f=>f.piercing))
})
test('穿盾扣黄色临时生命后才扣红心；护盾羽盾保留；无敌仍有效',()=>{
 const g=game(),a=g.abilitySystem;a.hp=a.maxHp;a.tempHp=1;a.shieldLayers=2;a.featherShield=1;a.invincibleFrames=0
 const hp=a.hp,p={type:'feather',piercing:true};g._handleCollision(p)
 assert.equal(a.tempHp,0);assert.equal(a.hp,hp);assert.equal(a.shieldLayers,2);assert.equal(a.featherShield,1)
 g._handleCollision(p);assert.equal(a.hp,hp)
 a.invincibleFrames=0;g._handleCollision(p);assert.equal(a.hp,hp-1);assert.equal(a.shieldLayers,2)
})
test('普通攻击仍先消耗护盾，风环不会吞掉穿盾区域招式',()=>{
 const g=game(),a=g.abilitySystem;a.shieldLayers=2;const hp=a.hp;g._handleCollision({type:'feather'});assert.equal(a.shieldLayers,1);assert.equal(a.hp,hp)
 a.selectAbility('orbit_guard');const f=new Hazard({kind:'beam',piercing:true,y:g.bird.y,warn:0});assert.equal(g.combat.intercept(f),false)
})
test('多轮弹幕密度随章节和阶段增加，危险物退场后才连协',()=>{
 const counts=[]
 for(const ch of [0,2,4,5]){const g=fight(ch);g.feathers=[];g.boss.phase=2;const warning=cast(g.boss,g.bird,{kind:'split'});counts.push(g.feathers.length)
  for(const f of g.feathers)assert.ok(g.boss.attackDuration+warning>=f.warn+Math.max(f.life,f.split?166:0))
  assert.ok(g.feathers.length<96)
 }
 assert.ok(counts[3]>counts[1]&&counts[1]>counts[0])
})
test('生命危险边框只在剩1心时出现，恢复和重开即解除',()=>{
 const g=game();let strokes=0,texts=[];g.ctx=new Proxy({},{get:(_,k)=>k==='fillRect'?()=>strokes++:k==='fillText'?t=>texts.push(t):()=>{},set:()=>true})
 g.abilitySystem.hp=2;g._drawDangerBorder();assert.equal(strokes,0)
 g.abilitySystem.hp=1;g._drawDangerBorder();assert.ok(strokes>0);assert.ok(texts.includes('生命危险'))
 strokes=0;g.start();g._drawDangerBorder();assert.equal(strokes,0)
})
test('精英早期6HP，后期96HP，无尽继续成长，伴飞窗口也增长',()=>{
 let prev=0
 for(let ch=0;ch<6;ch++){const mods=C.CHAPTERS.LIST[ch].mods;const e=new Elite(400,300,'floater',587,{elite:true,screenW:375,eliteTier:ch,eliteHp:mods.eliteHp});assert.ok(e.hp>prev);prev=e.hp;assert.equal(e.stayFrames,720+ch*60)}
 assert.equal(C.CHAPTERS.LIST[0].mods.eliteHp,6);assert.ok(scaling(5*3600).eliteHp>96)
})
test('精英轮换四种，无连续漏刷；重开清除轮换与保底',()=>{
 const g=game(),s=g.spawnSystem;g.gameTime=5000;s.setChapterModifiers(C.CHAPTERS.LIST[2].mods)
 const kinds=new Set()
 for(let i=0;i<6;i++){s._elitePending=true;s._monsterDistance=9999;g.monsters=[];s.updateMonsterSpawn(3);kinds.add(g.monsters[0].eliteKind)}
 assert.equal(kinds.size,4)
 const random=Math.random;try{Math.random=()=>.999;s._elitePending=false;for(let i=0;i<C.MONSTER.ELITE_ROLL_INTERVAL*2;i++)s.updateEliteRoll();assert.ok(s._elitePending)}finally{Math.random=random}
 s.reset();assert.equal(s._eliteCursor,0);assert.equal(s._eliteMisses,0)
})
test('棱镜和水母技能不同，有预警、有限寿命、过管时暂停出招',()=>{
 for(const kind of ['prism','bomber']){const shots=[],bird={x:112,y:300};const e=new Elite(260,300,'bat',587,{elite:true,screenW:375,eliteTier:2,eliteKind:kind,onHazard:h=>shots.push(h),getPipes:()=>[]})
  for(let i=0;i<250;i++)e.update(3,bird);assert.ok(shots.length);assert.ok(shots.every(h=>h.warn>=75&&h.life<200));assert.equal(!!shots[0].grow,kind==='bomber')
 }
})
test('Boss导弹3秒补给；旧道具被拾取立即补发；离开战斗不发',()=>{
 const g=fight(0),s=g.spawnSystem;g.items=[];s.setBossActive(true);s.updateBossMissileSupply();assert.equal(s.bossSupplyCount,1)
 for(let i=0;i<180;i++)s.updateBossMissileSupply();assert.equal(s.bossSupplyCount,1)
 g.items=[];s.updateBossMissileSupply();assert.equal(s.bossSupplyCount,2)
 s.setBossActive(false);g.items=[];for(let i=0;i<400;i++)s.updateBossMissileSupply();assert.equal(s.bossSupplyCount,2)
})
test('每Boss有独立两行教学、即时机关进度、无横向操作误导',()=>{
 for(let ch=0;ch<6;ch++){const g=fight(ch),b=g.boss;assert.equal(b.variant.guide.length,2);assert.ok(b.mechanics.label().length);for(const s of b.variant.skills)assert.ok(!(s.hint||'').includes('侧移'))}
})
test('延迟波次未到预警窗口不绘制，避免未来安全框干扰当前路线',()=>{
 let draws=0;const ctx=new Proxy({},{get:()=>()=>draws++,set:()=>true})
 const f=new Hazard({kind:'column',warn:180,telegraphFrames:90});f.render(ctx);assert.equal(draws,0)
 f.age=90;f.render(ctx);assert.ok(draws>0)
})
test('精英出场提供一枚导弹机会，场上已有导弹时不会堆叠',()=>{
 const g=game(),s=g.spawnSystem;g.gameTime=5000
 for(let i=0;i<2;i++){g.monsters=[];s._elitePending=true;s._monsterDistance=99999;s.updateMonsterSpawn(3)}
 assert.equal(g.items.filter(i=>i.type==='missile').length,1)
})
console.log('Total 1.8.2 suites: '+n)
