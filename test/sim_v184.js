// 有限观察/操作误差模型；自然经验与实际候选卡，不代表真人通关率。
const path=require('path')
const root=path.resolve(process.env.GAME_ROOT||path.join(__dirname,'..'))
const Game=require(path.join(root,'game/core/Game'))
require(path.join(root,'game/systems/GameLogger')).enabled=false
const rng=s=>()=>{s=s*16807%2147483647;return(s-1)/2147483646}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n))
const weapons=['feather_blade','seed_bolt','sand_lance','frost_lance','magma_core','singularity','missile_storm','missile_barrage']
function choose(g,policy,random){
 const choices=g._currentChoices,owned=g.abilitySystem.owned
 if(policy==='random')return choices[Math.floor(random()*choices.length)].id
 const priority=policy==='economy'?['greed','exp_resonance','double_score','lucky','magnet','supply_line','light_feather','oracle']:['seed_bolt','feather_blade','vitality','toughness','shrink_ray','sand_lance','orbit_guard','regeneration','magnet','greed','venom_thread','frost_lance','magma_core','missile_storm','singularity','shadow_echo','tailwind']
 return choices.map(a=>({id:a.id,score:(a.id==='bless_vitality'?30:0)+(priority.includes(a.id)?24-priority.indexOf(a.id):0)+(policy==='coherent'&&weapons.includes(a.id)&&owned.has(a.id)?10:0)+random()*6})).sort((a,b)=>b.score-a.score)[0].id
}
function observe(g,p,random){
 const b=g.bird,ground=g.screenH-80
 const pipe=g.pipes.filter(x=>x.x+x.width>b.x-12).sort((a,b)=>a.x-b.x)[0]
 const err=(random()-.5)*24
 if(pipe){p.target=pipe.topHeight+pipe.gap/2+err;return}
 let objective=ground*.55
 const boss=g.boss
 if(boss){
  const m=boss.mechanics,n=m.nodes.find(n=>n.hp>0&&(n.kind!=='relay'||n.index===m.activeNode))
  objective=n?n.y:['glacier','volcano'].includes(boss.variant.theme)?m.zoneY:boss.variant.theme==='desert'&&!['charging','windup'].includes(boss.state)?m.rockY:boss.y
 }
 // 道具是可见目标；不读取发射计时器或未来出生点。
 const item=g.items.find(i=>i.type==='missile'&&i.x>b.x-30&&i.x<g.screenW*.85)
 if(item)objective=item.y
 let best=Infinity
 for(let y=155;y<ground-40;y+=24){
  let cost=Math.abs(y-objective)*.13+Math.abs(y-b.y)*.07
  if(boss&&['windup','charging'].includes(boss.state)&&Math.abs(y-boss.chargeY)<75)cost+=600
  for(const f of g.feathers){
   if(f.telegraphFrames!=null&&f.age<f.warn-f.telegraphFrames)continue
   if(f.age<f.warn-90)continue
   if(f.kind==='gate'||f.kind==='column'){
    if(f.kind==='column'&&Math.abs(f.x-b.x)>f.radius+20)continue
    if(y<f.topHeight+32||y>f.bottomY-32)cost+=550
   }else if(f.kind==='beam'){if(Math.abs(y-f.y)<f.radius+38)cost+=500}
   else{
    // 仅按可见位置/速度粗略预判，不看追踪、反弹、分裂的内部参数。
    const cross=f.vx<0?(f.x-b.x)/-f.vx:0
    if(cross>=0&&cross<65&&Math.abs(y-(f.y+f.vy*cross))<36)cost+=180
    if(Math.abs(f.x-b.x)<45&&Math.abs(y-f.y)<40)cost+=260
   }
  }
  for(const m of g.monsters)if(Math.abs(m.x-b.x)<90&&Math.abs(y-m.y)<45)cost+=150
  if(cost<best){best=cost;p.target=y+err}
 }
}
function pilot(g,p,random){
 const now=g.frameCount,b=g.bird
 if(g.phoenixAnim)return
 if(now<p.daze)return
 if(random()<.03/600){p.daze=now+18;p.pending=-1;return}
 if(now>=p.observe){observe(g,p,random);p.observe=now+8+Math.floor(random()*5)}
 if(p.pending>=0&&now>=p.pending){g.flap();p.last=now;p.pending=-1}
 if(p.pending>=0||now-p.last<12)return
 const delay=6+Math.floor(random()*5)
 const predicted=b.y+b.velocity*8+.5*b.gravity*64
 if(predicted>p.target+10&&b.velocity>-3){p.pending=now+delay}
}
function run(seed,policy,limit=2200){
 const oldRandom=Math.random;Math.random=rng(seed);const random=rng(seed+113)
 const g=new Game({},{},375,667,null);g.start()
 const p={last:-99,pending:-1,observe:0,target:300,daze:0}
 const entries=[],picks=[],battles=[];let lastBoss=null,active=null,maxHazards=0
 try{
 for(let f=0;f<limit*60+15000&&g.state!=='gameover';f++){
  let guard=0
  while(g.state==='upgrading'&&guard++<100){if(!g._currentChoices||!g._currentChoices.length)break;const id=choose(g,policy,random);picks.push(id);g.selectAbility(id)}
  if(g.gameTime>=limit*60||g.chapterSystem.endlessFrames>=300*60)break
  if(g.state==='playing')pilot(g,p,random)
  g.update();maxHazards=Math.max(maxHazards,g.feathers.length)
  if(g.boss!==lastBoss){
   if(active){active.remainingHp=lastBoss.hp;active.seconds=Math.round(active.frames/6)/10;battles.push(active);active=null}
   lastBoss=g.boss
   if(lastBoss){active={chapter:g.chapterSystem.index+1,level:g.expSystem.level,frames:0,armored:0,breaks:0};entries.push({chapter:active.chapter,level:active.level,seconds:Math.round(g.gameTime/60),cards:Array.from(g.abilitySystem.owned.entries())})}
  }
  if(active){active.frames++;if(g.boss.mechanics.damageScale()<1)active.armored++;active.breaks=g.boss.mechanics.completed}
 }
 if(active){active.remainingHp=lastBoss.hp;active.seconds=Math.round(active.frames/6)/10;battles.push(active)}
 return {seed,policy,seconds:Math.round(g.gameTime/60),dead:g.state==='gameover',chapter:g.chapterSystem.index+1,level:g.expSystem.level,clears:g.bossClears,entries,battles,picks,maxHazards}
 }finally{Math.random=oldRandom}
}
if(require.main===module){const runs=Number(process.argv[2]||8),limit=Number(process.argv[3]||2200);const rows=[];for(const policy of ['coherent','random','economy'])for(let i=0;i<runs;i++)rows.push(run(20261002+i*7919,policy,limit));const summary={};for(const policy of ['coherent','random','economy']){const rs=rows.filter(r=>r.policy===policy);summary[policy]={runs:rs.length,medianSeconds:rs.map(r=>r.seconds).sort((a,b)=>a-b)[Math.floor(rs.length/2)],reached:rs.filter(r=>r.entries.length).length,kills:rs.reduce((n,r)=>n+r.clears.filter(c=>c.method==='kill').length,0),survival:rs.reduce((n,r)=>n+r.clears.filter(c=>c.method==='survival').length,0),chapters:rs.map(r=>r.chapter),levels:rs.map(r=>r.level)}}console.log(JSON.stringify({summary,rows},null,2))}
module.exports={run,pilot,choose}
