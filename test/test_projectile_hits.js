const assert=require('node:assert/strict')
const Game=require('../game/core/Game'),Monster=require('../game/entities/Monster'),Elite=require('../game/entities/EliteMonster'),Missile=require('../game/entities/Missile'),Pipe=require('../game/entities/Pipe'),MathUtil=require('../game/core/MathUtil')
require('../game/systems/GameLogger').enabled=false
let count=0
function test(name,fn){fn();count++;console.log('✓ '+name)}
function game(){const g=new Game({},{},375,667,null);g.start();g.bird.y=300;g.combat.bladeCD=999;return g}
function elite(x=200,y=300){return new Elite(x,y,'bat',587,{elite:true,screenW:375,eliteHp:20,eliteKind:'gunship'})}
function shot(x,y,source='blade',pierce=1){return{x,y,angle:0,damage:2,bossDamage:3,source,life:1,hits:new Set(),pierce}}

test('精英可见上下边缘：羽刃与导弹实际扣血，不扩大撞鸟判定',()=>{
 for(const offset of [-25,25]){
  const g=game(),m=elite();g.monsters=[m];g.combat.shots=[shot(210,300+offset)];g.combat.update()
  assert.equal(m.hp,18);assert.equal(g.combat.shots.length,0);assert.ok(m.hitFlash>0)
  const missile=new Missile(220,300+offset,null);assert.ok(g._checkMissileHit(missile));assert.equal(m.hp,17)
  m.age=100;assert.equal(m._doCheckCollision({x:223,y:325,collisionWidth:2,collisionHeight:2}),false)
 }
})
test('蝙蝠翼缘与浮游触须能中弹，离开可见范围仍会落空',()=>{
 for(const type of ['bat','floater']){const g=game(),m=new Monster(200,300,type,587,{hpMult:10});g.monsters=[m]
 const y=type==='bat'?315:319;g.combat.shots=[shot(210,y)];const hp=m.hp;g.combat.update();assert.equal(m.hp,hp-2)
 assert.equal(g.combat.hit(shot(215,345),m),false)
 }
})
test('高速交错：导弹与移动怪物两帧端点都未重叠仍命中',()=>{
 const g=game(),m=new Monster(130,300,'bat',587);m._projectileX=160;m._projectileY=300;g.monsters=[m]
 const missile=new Missile(151,300,null);missile.update(2.5)
 assert.ok(missile.previousX+8<160);assert.ok(missile.x-8>m.x+m.width)
 assert.ok(g._checkMissileHit(missile));assert.ok(m.hp<=0);assert.equal(g.monsterKills,1)
})
test('怪物斜向移动穿过弹道会命中，平行错开的轨迹不会误中',()=>{
 const m=new Monster(150,350,'bat',587);m._projectileX=150;m._projectileY=250
 const s=shot(180,300);s.previousX=120;s.previousY=300
 assert.notEqual(MathUtil.projectileHitTime(s,m,5,4),Infinity)
 s.y=420;s.previousY=420;assert.equal(MathUtil.projectileHitTime(s,m,5,4),Infinity)
})
test('非穿透弹击中路上最近目标，不按怪物数组顺序穿过前排',()=>{
 const g=game(),near=new Monster(200,300,'floater',587,{hpMult:10}),far=new Monster(222,300,'floater',587,{hpMult:10})
 // Both move through the shot in this frame; the near target is encountered first.
 near._projectileX=230;far._projectileX=235;near._projectileY=far._projectileY=300
 g.monsters=[far,near];g.combat.shots=[shot(224,300)];g.combat.update()
 assert.equal(near.hp,18);assert.equal(far.hp,20)
})
test('沙矛同帧穿过多个目标逐个扣血，各目标只结算一次',()=>{
 const g=game(),a=new Monster(200,300,'floater',587,{hpMult:10}),b=new Monster(202,300,'floater',587,{hpMult:10})
 g.monsters=[b,a];g.combat.shots=[shot(205,300,'sand',3)];g.combat.update()
 assert.equal(a.hp,18);assert.equal(b.hp,18);assert.equal(g.combat.shots[0].pierce,1)
 g.combat.update();assert.equal(a.hp,18);assert.equal(b.hp,18)
})
test('核心与派生弹命中保留伤害，毒丝/雷链仅绑定冰枪',()=>{
 for(const source of ['blade','seed','sand','frost','frost_shell','wind','echo','revenge','reflect']){
  const g=game(),m=elite(),other=elite(280,400);g.monsters=[m,other];g.abilitySystem.chapter=6;g.abilitySystem.selectAbility('frost_lance');g.combat.cooldowns.frost_lance=999;g.abilitySystem.selectAbility('venom_thread');g.abilitySystem.selectAbility('storm_chain')
  g.combat.shots=[shot(210,325,source)];g.combat.update();assert.equal(m.hp,18,source);assert.equal(!!m.venom,source==='frost',source);assert.equal(other.hp,source==='frost'?17:20,source);if(source==='frost')assert.equal(m.frostFrames,120)
 }
})
test('Boss和机关可命中，Boss下一批弹不被旧门限吞掉',()=>{
 const g=game();g._spawnBoss();g.chapterSystem.startBossFight();const b=g.boss;b.x=b.homeX;b._setState('roam');b._syncBox();b.mechanics.cycleStart()
 const n=b.mechanics.nodes[0],before=n.hp;g.combat.shots=[shot(n.x-5,n.y)];g.combat.update();assert.equal(n.hp,before-2)
 g.combat.shots=[shot(b.x+20,b.y)];const hp=b.hp;g.combat.update();assert.ok(b.hp<hp)
 const after=b.hp;g.combat.shots=[shot(b.x+20,b.y)];g.combat.update();assert.ok(b.hp<after)
})
test('导弹路径穿管体命中，穿缺口不误炸管道',()=>{
 const p=new Pipe(150,200,180,587),s=new Missile(230,150,null);s.previousX=100;s.previousY=150
 assert.ok(s.hitTest(p));s.y=s.previousY=290;assert.equal(s.hitTest(p),false)
})
test('真实Game帧刷新目标运动快照，冻结不会复用上一帧位移',()=>{
 const g=game(),m=elite(220,300);g.monsters=[m];g.abilitySystem.invincibleFrames=500
 g.update();assert.equal(m._projectileX,220)
 const x=m.x,y=m.y;g.abilitySystem.timeCrystalFreezeFrames=100;g.update()
 assert.equal(m._projectileX,x);assert.equal(m._projectileY,y);assert.equal(m.x,x);assert.equal(m.y,y)
})
console.log(count+' projectile hit tests passed')
