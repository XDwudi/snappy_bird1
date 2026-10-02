// Offline Canvas CPU sample; this is not WeChat device FPS or startup acceptance.
const fs=require('fs'),path=require('path'),{performance}=require('perf_hooks')
const {createCanvas,loadImage}=require('@napi-rs/canvas')
const Game=require('../game/core/Game'),A=require('../game/art/Assets'),Hazard=require('../game/entities/BossHazard')
require('../game/systems/GameLogger').enabled=false
async function main(){
 for(const key of Object.keys(A.files))A.images[key]=await loadImage(path.resolve(__dirname,'..',A.files[key]))
 const rows=[]
 for(const [w,h] of [[320,568],[375,667],[390,844]]){
  const c=createCanvas(w,h),g=new Game(c,c.getContext('2d'),w,h,null);g.start();g.chapterSystem._applyNextChapter(5);g.chapterSystem._transition=null;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.boss.mechanics.cycleStart()
  for(let i=0;i<80;i++)g.feathers.push(new Hazard({x:20+i%10*30,y:200+Math.floor(i/10)*30,vx:-2,vy:0,warn:0,age:120,radius:6,screenW:w,groundY:h-80}))
  for(const type of ['rain','wind','hail'])g.weatherSystem._triggerEffect(type,g._buildGameCtx())
  for(let i=0;i<200;i++)g.weatherSystem.update(5000,g._buildGameCtx())
  g._spawnExplosion(w/2,h/2,'255,200,60',80)
  for(let i=0;i<10;i++)g.render()
  const samples=[];for(let i=0;i<120;i++){const t=performance.now();g.render();samples.push(performance.now()-t)}samples.sort((a,b)=>a-b)
  rows.push({size:w+'x'+h,samples:120,medianMs:+samples[60].toFixed(2),p95Ms:+samples[114].toFixed(2),hazards:g.feathers.length,effects:g.abilityEffects.length})
 }
 const result={scope:'Offline @napi-rs/canvas CPU render sample; 1x pixels; no WeChat/device FPS or startup claim',node:process.version,platform:process.platform,arch:process.arch,rows}
 fs.writeFileSync(path.resolve(__dirname,'../docs/audits/v183/render-timing.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2))
}
main().catch(e=>{console.error(e);process.exitCode=1})
