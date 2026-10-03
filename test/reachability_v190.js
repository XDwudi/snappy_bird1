const fs=require('node:fs'),assert=require('node:assert/strict'),Game=require('../game/core/Game')
require('../game/systems/GameLogger').enabled=false
const results=[]
for(const [w,h] of [[320,568],[375,667],[390,844],[430,932]])for(const initial of ['high','low'])for(const velocity of [-5,8]){
 const g=new Game({},{},w,h,null);g.start();g.chapterSystem._applyNextChapter(3);g.chapterSystem._transition=null;g._spawnBoss();g.boss._setState('roam');const m=g.boss.mechanics;m.cycleStart();const b=g.bird;b.y=initial==='high'?170:h-160;b.velocity=velocity
 let taps=0,last=-99,completedAt=null,bounds=true
 for(let f=0;f<900;f++){
  const target=m.zoneY;if(f-last>=12&&b.velocity>-3&&b.y>target+30){b.flap();last=f;taps++}
  b.update();m.update(b);bounds=bounds&&b.y>100&&b.y<h-95
  if(m.completed){completedAt=f/60;break}
 }
 assert.ok(completedAt!=null,`${w} ${initial} ${velocity} no warm-stream completion`);assert.ok(bounds)
 // Switch through the two valve heights with the same fixed flap; every target is reachable.
 const visits=[];for(const target of [m.heights()[0],m.heights()[2]]){let reached=false;for(let f=0;f<180;f++){if(f%12===0&&b.velocity>-3&&b.y>target+30)b.flap();b.update();if(Math.abs(b.y-target)<32){reached=true;break}}visits.push(reached)}assert.ok(visits.every(Boolean))
 results.push({screen:[w,h],initial,velocity,warmCompletedSeconds:completedAt,taps,valveHeightsReachable:visits})
}
fs.writeFileSync('docs/audits/v190/reachability.json',JSON.stringify({protocol:'Fixed flap physics, no hazards. Reachability of mechanic routes only; does not prove every composed barrage is avoidable.',results},null,2)+'\n');console.log(results.length+' physical route checks passed')
