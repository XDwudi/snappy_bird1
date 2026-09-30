// 实际 Game.update 模拟；可见危险物驱动的脚本飞行，不代表真人胜率。
const Game=require('../game/core/Game'), R=require('../game/abilities/AbilityRegistry'), C=require('../game/config/GameConfig')
require('../game/systems/GameLogger').enabled=false
const realRandom=Math.random
function rng(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646}}
function pilot(g,p,noise=12){
 if(g.frameCount-p.flap<8 || g.phoenixAnim)return
 const b=g.bird,ground=g.screenH-80
 const pipe=g.pipes.filter(x=>x.x+x.width>b.x-12).sort((a,b)=>a.x-b.x)[0]
 let target=ground*.55
 if(pipe)target=pipe.topHeight+pipe.gap/2
 else if(g.boss){
  let best=Infinity
  for(let y=155;y<ground-35;y+=16){
   const mechanic=g.boss.mechanics
   const node=mechanic.nodes.find(n=>n.hp>0&&(n.kind!=='relay'||n.index===mechanic.activeNode))
   const objective=node?node.y:['glacier','volcano'].includes(g.boss.variant.theme)?mechanic.zoneY:g.boss.variant.theme==='desert'?mechanic.rockY:g.boss.y
   let cost=Math.abs(y-b.y)*.08+Math.abs(y-objective)*.09
   if(['windup','charging'].includes(g.boss.state)&&Math.abs(y-g.boss.chargeY)<70)cost+=600
   for(const f of g.feathers){
    if(f.kind==='column'){if(Math.abs(f.x-b.x)<f.radius+20&&(y<f.topHeight+20||y>f.bottomY-20))cost+=500;continue}
    if(f.grow){if(Math.hypot(f.x-b.x,f.y-y)<42)cost+=300;continue}
    if(f.kind==='gate') {if(y<f.topHeight+35||y>f.bottomY-35)cost+=600;continue}
    if(f.kind==='beam'){if(Math.abs(y-f.y)<f.radius+42)cost+=500;continue}
    const delay=Math.max(0,(f.warn||0)-(f.age||0))
    if(delay>85)continue
    const cross=f.vx<0?(f.x-b.x)/-f.vx:0
    if(cross>=0&&cross<95){const fy=f.y+f.vy*cross;if(Math.abs(y-fy)<38)cost+=180}
    if(Math.abs(f.x-b.x)<45&&Math.abs(y-(f.y+f.vy*15))<50)cost+=200
   }
   if(cost<best){best=cost;target=y}
  }
 }
 target+=Math.sin(g.frameCount*.017+p.offset)*noise
 const predict=b.y+b.velocity*2+.5*b.gravity*4
 if(predict>target+8&&b.velocity>-3){g.flap();p.flap=g.frameCount}
}
const builds={
 balanced:{vitality:3,toughness:3,bounce_shield:3,regeneration:2,agile:2,slow_world:2,shrink_ray:3,echo_wing:2,iron_feather:1,phoenix:1,feather_blade:2,seed_bolt:2,sand_lance:2,frost_lance:1,seed_harvest:2,dune_cache:2,orbit_guard:2,revenge_pulse:1,singularity:1,magma_core:1,venom_thread:1},
 offense:{vitality:2,toughness:2,bounce_shield:2,agile:2,shrink_ray:2,regeneration:1,phoenix:1,feather_blade:3,seed_bolt:3,sand_lance:3,frost_lance:3,shadow_echo:2,venom_thread:2,magma_core:2,cinder_execution:2,singularity:2,storm_chain:2,orbit_guard:2,seed_harvest:2},
 fortress:{vitality:3,toughness:3,bounce_shield:3,regeneration:3,agile:3,slow_world:3,shrink_ray:4,echo_wing:3,iron_feather:3,phoenix:2,thick_skin:2,physique:3,time_warp:3,teleport:3,ice_crystal:2,combo_heart:3,seed_harvest:3,dune_cache:3,orbit_guard:3,frost_shell:3,singularity:1,seed_bolt:2}
}
builds.complete=Object.fromEntries(R.getAll().filter(a=>!['blood_pact','light_feather','tailwind','berserk'].includes(a.id)).map(a=>[a.id,a.maxLevel]))
function inject(g,build){for(const [id,lv] of Object.entries(build))for(let i=0;i<Math.min(lv,R.get(id).maxLevel);i++)g.abilitySystem.selectAbility(id);g.abilitySystem.hp=g.abilitySystem.maxHp;g.abilitySystem.addShieldLayer(99)}
function run(mode,seed,build='balanced',chapter=0){
 Math.random=rng(seed)
 const g=new Game({},{},375,667,null);g.start();const p={flap:-99,offset:seed};let reached=false,firstClear=null,maxHazards=0
 if(mode==='endless'){
  inject(g,builds[build]);g.expSystem.level=50;g.chapterSystem.index=5;g.abilitySystem.chapter=6
  for(let i=0;i<6;i++)g.chapterSystem.cleared.add(i)
  // 六次章节礼物的保守混合：三次活力、两次成长、一次狩猎。
  for(const gift of ['bless_vitality','bless_growth','bless_vitality','bless_growth','bless_hunt','bless_vitality'])g._applyBlessing(gift)
  g.gameTime=1800*60;g.chapterSystem.enterEndless()
 }else if(mode==='boss'){
  const deck=Object.fromEntries(Object.entries(builds[build]).filter(([id])=>R.get(id).unlockChapter<=chapter+1))
  inject(g,deck);g.chapterSystem.index=chapter;g.abilitySystem.chapter=chapter+1;g.gameTime=6000;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam')
 }
 const limit=mode==='endless'?25*60:mode==='boss'?140:180
 for(let f=0;f<limit*60+5000;f++){
  if(g.state==='gameover')break
  if(mode==='endless'&&g.chapterSystem.endlessFrames>=limit*60)break
  if(mode==='boss'&&(!g.chapterSystem.isBossActive()||g.bossClears.length))break
  if(mode==='early'&&g.gameTime>=limit*60)break
  let guard=0
  while(g.state==='upgrading'&&guard++<100){const choices=g._currentChoices;if(!choices || !choices.length)break;g.selectAbility(choices[Math.floor(Math.random()*choices.length)].id)}
  if(g.state==='playing')pilot(g,p,mode==='endless'?18:12)
  g.update();maxHazards=Math.max(maxHazards,g.feathers.length)
  if(g.chapterSystem.isBossActive())reached=true
  if(g.bossClears.length&&firstClear===null)firstClear=g.bossClears[0]
 }
 const r={seconds:Math.round((mode==='endless'?g.chapterSystem.endlessFrames:mode==='boss'?g.bossFightFrames:g.gameTime)/6)/10,dead:g.state==='gameover',reached,clear:(firstClear && firstClear.method)||null,level:g.expSystem.level,maxHazards}
 Math.random=realRandom;return r
}
if(require.main===module){
 const mode=process.argv[2]||'endless',runs=Number(process.argv[3]||12),output={mode,runs,groups:{}}
 for(const build of mode==='early'?['balanced']:Object.keys(builds)){
  const chapters=mode==='boss'?[0,1,2,3,4,5]:[0]
  for(const ch of chapters){
   const rows=Array.from({length:runs},(_,i)=>run(mode,20260930+i*7919,build,ch));const sorted=rows.map(r=>r.seconds).sort((a,b)=>a-b)
   output.groups[build+(mode==='boss'?'_ch'+(ch+1):'')]={min:sorted[0],median:sorted[Math.floor(runs/2)],max:sorted[runs-1],dead:rows.filter(r=>r.dead).length,within5to20:rows.filter(r=>r.dead&&r.seconds>=300&&r.seconds<=1200).length,reached:rows.filter(r=>r.reached).length,kills:rows.filter(r=>r.clear==='kill').length,survival:rows.filter(r=>r.clear==='survival').length,maxHazards:Math.max(...rows.map(r=>r.maxHazards))}
  }
 }
 console.log(JSON.stringify(output,null,2))
}
module.exports={run,pilot,builds}
