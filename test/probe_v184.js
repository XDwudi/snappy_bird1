// 固定装备对照：装备取自自然局，开战资源回满仅为隔离Boss机制，非自然通关率。
const path=require('path'),fs=require('fs')
const root=path.resolve(process.env.GAME_ROOT||path.join(__dirname,'..'))
const Game=require(path.join(root,'game/core/Game')),R=require(path.join(root,'game/abilities/AbilityRegistry'))
require(path.join(root,'game/systems/GameLogger')).enabled=false
const pilot=require('./sim_v184').pilot
const rng=s=>()=>{s=s*16807%2147483647;return(s-1)/2147483646}
function fight(sample,seed){
 const original=Math.random;Math.random=rng(seed);const random=rng(seed+113)
 const g=new Game({},{},375,667,null);g.start();g.chapterSystem.index=sample.chapter-1;g.abilitySystem.chapter=sample.chapter
 for(const [id,lv] of sample.cards)for(let i=0;i<Math.min(lv,R.get(id).maxLevel);i++)g.abilitySystem.selectAbility(id)
 g.abilitySystem.hp=g.abilitySystem.maxHp;g.abilitySystem.addShieldLayer(99)
 g.expSystem.level=sample.level;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam')
 const b=g.boss,p={last:-99,pending:-1,observe:0,target:300,daze:0};let armored=0,frames=0,minHp=g.abilitySystem.hp,maxHazards=0
 try{
 for(let i=0;i<210*60;i++){
  if(g.state==='gameover'||g.bossClears.length||!g.chapterSystem.isBossActive())break
  if(g.state==='upgrading'){g.selectAbility(g._currentChoices[0].id);continue}
  pilot(g,p,random);g.update();frames++;if(b.mechanics.damageScale()<1)armored++
  minHp=Math.min(minHp,g.abilitySystem.hp);maxHazards=Math.max(maxHazards,g.feathers.length)
 }
 return {chapter:sample.chapter,level:sample.level,cards:sample.cards,seconds:Math.round(frames/6)/10,method:g.bossClears.length?g.bossClears[0].method:'defeat',remainingHp:b.hp,armorPercent:Math.round(armored/frames*100),breaks:b.mechanics.completed,minPlayerHp:minHp,maxHazards}
 }finally{Math.random=original}
}
if(require.main===module){
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/audits/v184/natural-before.json')))
 const samples=data.rows.flatMap(r=>r.entries),rows=[]
 for(let ch=1;ch<=6;ch++){
  const entries=samples.filter(e=>e.chapter===ch).slice(0,12)
  for(let i=0;i<entries.length;i++)rows.push(fight(entries[i],20261101+i*7919))
 }
 const summary={};for(let ch=1;ch<=6;ch++){const rs=rows.filter(r=>r.chapter===ch),kills=rs.filter(r=>r.method==='kill');summary[ch]={runs:rs.length,kills:kills.length,survival:rs.filter(r=>r.method==='survival').length,defeat:rs.filter(r=>r.method==='defeat').length,medianKillSeconds:kills.length?kills.map(r=>r.seconds).sort((a,b)=>a-b)[Math.floor(kills.length/2)]:null,meanArmorPercent:rs.length?Math.round(rs.reduce((a,r)=>a+r.armorPercent,0)/rs.length):null}}
 console.log(JSON.stringify({summary,rows},null,2))
}
module.exports={fight}
