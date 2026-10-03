const A=require('./Assets'),P=require('./Pixel'),I=require('./Icons'),W=require('./World'),Config=require('../config/GameConfig'),C=P.C
function fallback(c,x,y,w,h,color){P.box(c,x-w/2,y-h/2,w,h,color);c.fillStyle=C.paper;c.fillRect(x-w*.2,y-h*.1,3,3);c.fillRect(x+w*.1,y-h*.1,3,3)}
function bird(c,b,layers){
 c.save();c.translate(Math.round(b.x),Math.round(b.y));c.rotate(b.rotation);c.scale(b.collisionScale,b.collisionScale)
 if(b.invincibleBlink>0&&Math.floor(b.invincibleBlink/4)%2===0)c.globalAlpha=.55
 if(!A.draw(c,'bird'+b.wingFrame,-19,-18,38,36))fallback(c,0,0,32,26,C.gold)
 c.restore()
 // One complete outlined circle per real shield layer (maximum currently 7).
 // No filled halo: the bird and projectiles remain visible through every layer.
 if(layers>0){c.save();const r=b.width/2*b.collisionScale+6
  for(let i=0;i<layers;i++){c.beginPath();c.arc(b.x,b.y,r+i*6,0,Math.PI*2);c.strokeStyle=C.ink;c.lineWidth=3.5;c.stroke();c.strokeStyle=i%2?C.paper:C.ice;c.lineWidth=1.8;c.stroke()}
  c.restore()
 }
}
function monster(c,m){
 const x=m.x+m.width/2,y=m.y,pulse=Math.sin(m.age*.17)*.035
 c.save();c.translate(x,y);c.scale(1+pulse,1-pulse)
 if(m.monsterType==='bat'){if(!A.draw(c,'bat',-m.width*.65,-m.height*.6,m.width*1.3,m.height*1.2))fallback(c,0,0,m.width,m.height,C.purple)}
 else{
  // Ordinary floater remains distinct from the larger elite jellyfish.
  const s=m.width/20;c.scale(s,s);P.box(c,-9,-8,18,15,'#6fa778','#456b61');c.fillStyle='#b9d686';c.fillRect(-6,-6,10,3)
  c.fillStyle=C.paper;c.fillRect(-5,-3,6,5);c.fillStyle=C.ink;c.fillRect(-4,-2,2,3)
  for(let k=-1;k<=1;k++)P.path(c,[[k*5,5],[k*5+Math.round(Math.sin(m.phase+k)*2),11]],'#456b61',2)
 }
 if(m.hitFlash){c.globalAlpha=.8;P.spark(c,0,0,7,C.paper)}c.restore()
 if(m.maxHp>1)P.bar(c,x-16,y-m.height*.65-9,32,7,m.hp/m.maxHp,C.red)
 if(m.venom)I.draw(c,'venom_thread',x,y+m.height*.65+5,10)
}
function elite(c,m){
 const x=m.x+m.width/2,y=m.y,phase=m.phase
 c.save();c.translate(x,y);c.rotate(Math.sin(phase)*.035)
 if(!A.draw(c,m.eliteKind,-30,-29,60,58))fallback(c,0,0,46,38,C.gold)
 if(m.hitFlash)P.spark(c,-8,0,9,C.paper);c.restore()
 if(m.eliteKind==='gunship'){for(const dy of [-20,-10]){c.fillStyle=C.gold;c.fillRect(Math.round(x-9-Math.sin(phase*4)*4),Math.round(y+dy),18,2)}}
 if(m.eliteKind==='stormcaller')P.ring(c,x,y,33,C.purple,.6,.75,phase)
 if(m.eliteKind==='prism'){P.spark(c,x,y-34,3,C.ice);P.spark(c,x,y+32,3,C.ice)}
 if(m.eliteKind==='bomber')for(let k=0;k<3;k++){c.fillStyle=C.green;c.globalAlpha=.5;c.fillRect(Math.round(x-15+k*14),Math.round(y+32+(phase*5+k*6)%13),2,2);c.globalAlpha=1}
 P.text(c,m.retreating?'撤离':m.name,x,y-40,10,C.paper,'center',true)
 P.bar(c,x-25,y+36,50,8,m.hp/m.maxHp,C.gold)
 P.bar(c,x-25,y+46,50,6,Math.max(0,1-m.age/m.stayFrames),C.muted)
}
function bossBody(c,b){
 // Match the original collision footprint; limbs are decorative overscan only.
 const size=Math.max(b.width,b.height)*1.18
 if(!A.draw(c,b.variant.theme,-size/2,-size/2,size,size))fallback(c,0,0,b.width,b.height,b.variant.colors.body)
 if(b._hitFlash>0)P.spark(c,-10,-5,9,C.paper)
 if(b.state==='recover'){P.brackets(c,-size/2-4,-size/2-4,size+8,size+8,C.gold);for(let k=0;k<3;k++)P.spark(c,-18+k*18,-size/2-8+Math.sin(b.stateT*.12+k)*2,2,C.gold)}
}
function boss(c,b){
 b.mechanics.render(c,b.screenW*Config.BIRD.X_RATIO)
 const x=b.x+b.width/2,y=b.y
 if(b.state==='windup')b._renderChargeWarning(c)
 for(let i=0;i<b._trail.length;i++){const t=b._trail[i];c.save();c.globalAlpha=.08+i*.02;A.draw(c,b.variant.theme,t.x-5,t.y-b.height/2,b.width+10,b.height);c.restore()}
 if(b.pendingSummon)P.ring(c,b.screenW-18,b.pendingSummon.y,22,C.gold,.8,.8,b.stateT*.03)
 if(b.phase===2)P.ring(c,x,y,b.width*.7,C.red,.7,.75,b.stateT*.025)
 c.save();c.translate(Math.round(x),Math.round(y))
 if(b.state==='windup'||b.state==='telegraph')c.scale(.96,1.04)
 if(b.state==='charging')c.scale(1.08,.94)
 if(b.state==='recover')c.rotate(Math.sin(b.stateT*.12)*.06)
 if(b.state==='dying'){c.rotate(b.stateT*.07);c.globalAlpha=Math.max(0,1-b.stateT/Config.BOSS.DEATH_SLOWMO_FRAMES)}
 bossBody(c,b);c.restore()
 if(b.phase2Flash>0){c.save();c.globalAlpha=b.phase2Flash/Config.BOSS.PHASE2_FLASH_FRAMES*.25;P.brackets(c,5,5,b.screenW-10,b.screenH-10,C.red);c.restore()}
}
function charge(c,b){const y=b.chargeY,h=b.height;c.save();c.fillStyle=C.red;c.globalAlpha=.13;c.fillRect(0,y-h/2,b.screenW,h);c.globalAlpha=1;P.path(c,[[0,y-h/2],[b.screenW,y-h/2]],C.red,2);P.path(c,[[0,y+h/2],[b.screenW,y+h/2]],C.red,2);for(let x=16;x<b.screenW;x+=28)P.path(c,[[x+5,y-5],[x,y],[x+5,y+5]],C.gold,2);c.restore()}
const itemLabels={missile:'导弹',health_pack:'回血',shield_pack:'护盾',exp_pack:'经验',speed_pack:'减速'}
function item(c,o){
 const r=o.radius*(1+Math.sin(o.pulsePhase)*.05);c.save()
 // A solid pickup frame separates helpful items from unframed hostile shots.
 P.box(c,o.x-r-5,o.y-r-5,r*2+10,r*2+10,C.panel,(I.spec[o.type]||I.spec.star).color)
 I.draw(c,o.type,o.x,o.y,28)
 const label=itemLabels[o.type];if(label){c.font='bold 9px sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=3;c.strokeStyle=C.ink;c.fillStyle=C.paper;c.strokeText(label,o.x,o.y+r+11);c.fillText(label,o.x,o.y+r+11)}
 c.restore()
}
function missile(c,m){c.save();for(let i=0;i<m.trail.length;i++){c.globalAlpha=(i+1)/m.trail.length*.5;const p=m.trail[i];c.fillStyle=i%2?C.gold:C.paper;c.fillRect(Math.round(p.x)-1,Math.round(p.y)-1,3,3)}c.globalAlpha=1;c.translate(Math.round(m.x),Math.round(m.y));c.rotate(m.angle)
 c.fillStyle=C.ink;c.fillRect(-9,-4,18,8);c.fillStyle=C.paper;c.fillRect(-7,-2,12,4);c.fillStyle=C.red;c.fillRect(5,-3,5,6);c.fillRect(10,-1,2,2);c.fillRect(-9,-6,4,3);c.fillRect(-9,3,4,3);c.fillStyle=C.gold;c.fillRect(-13-Math.floor(Math.sin(m._flamePhase)*2),-2,5,4);c.restore()}
function projectile(c,o,ice){
 c.save();for(let i=0;i<(o.trail||[]).length;i++){const t=o.trail[i];c.globalAlpha=.1+i*.05;c.fillStyle=ice?C.ice:C.gold;c.fillRect(Math.round(t.x)-1,Math.round(t.y)-1,3,3)}c.globalAlpha=1
 const r=o.radius;c.translate(Math.round(o.x),Math.round(o.y));c.rotate(ice?o.rotation:o.angle||0)
 if(ice){
  const pts=[[-r/2,-r],[r/2,-r],[r,-r/2],[r,r/2],[r/2,r],[-r/2,r],[-r,r/2],[-r,-r/2],[-r/2,-r]]
  c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.fillStyle=C.ice;c.fill();c.strokeStyle=C.ink;c.lineWidth=1.5;c.stroke();P.path(c,[[-r/2,-r/2],[0,0],[r/2,-r/2]],C.paper,1.5)
 }else{
  // Spiked hostile pellet, visibly unlike the white feather/arrow fired by the player.
  const pts=[[r,0],[r*.35,r*.35],[0,r],[-r*.35,r*.35],[-r,0],[-r*.35,-r*.35],[0,-r],[r*.35,-r*.35],[r,0]]
  c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.fillStyle=o.piercing?C.purple:o.color||C.red;c.fill();c.strokeStyle=C.ink;c.lineWidth=2;c.stroke();c.fillStyle=C.paper;c.fillRect(-1,-1,2,2)
 }
 c.restore()
}
function hazard(c,o){
 if(o.telegraphFrames!=null&&o.age<o.warn-o.telegraphFrames)return
 const warning=o.age<o.warn,color=o.piercing?C.purple:warning?C.gold:o.color||C.red
 c.save()
 const band=(x,y,w,h)=>{if(h<=0||w<=0)return;c.fillStyle=color;c.globalAlpha=warning? .1:.65;c.fillRect(x,y,w,h);c.globalAlpha=1;P.path(c,[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]],color,2)
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.globalAlpha=warning? .45:.3;for(let k=x-h;k<x+w;k+=20){P.path(c,[[k,y],[k+h,y+h]],color,2);if(o.piercing)P.path(c,[[k+h,y],[k,y+h]],color,2)}c.restore()}
 if(o.kind==='gate'){
  if(warning){band(0,130,o.screenW,Math.max(0,o.topHeight-130));band(0,o.bottomY,o.screenW,o.groundY-o.bottomY);P.brackets(c,3,o.topHeight,o.screenW-6,o.gap,C.green)}
  else{band(o.x,0,o.width,o.topHeight);band(o.x,o.bottomY,o.width,o.groundY-o.bottomY);P.path(c,[[o.x,o.topHeight],[o.x+o.width,o.topHeight]],C.paper,3);P.path(c,[[o.x,o.bottomY],[o.x+o.width,o.bottomY]],C.paper,3)}
 }else if(o.kind==='column'){
  band(o.x-o.radius,130,o.radius*2,Math.max(0,o.topHeight-130));band(o.x-o.radius,o.bottomY,o.radius*2,o.groundY-o.bottomY);P.brackets(c,o.x-28,o.topHeight,56,o.gap,C.green)
 }else if(o.kind==='beam'){band(0,o.y-o.radius,o.screenW,o.radius*2);if(!warning)P.path(c,[[0,o.y],[o.screenW,o.y]],C.paper,2)}
 else if(warning){c.globalAlpha=.7;c.setLineDash([4,7]);P.path(c,[[o.x,o.y],[o.x+o.vx*100,o.y+o.vy*100]],color,1);c.setLineDash([]);P.ring(c,o.x,o.y,o.grow?23:o.radius+4,color,1);P.ring(c,o.x,o.y,(o.grow?26:o.radius+7),color,.8,o.age/o.warn)}
 else{projectile(c,o,false);if(o.grow)P.ring(c,o.x,o.y,o.radius,color,.9)}
 // Piercing text is consolidated in the ground HUD; no opaque labels over targets.

 c.restore()
}
function mechanics(c,m,birdX){
 const b=m.boss,t=b.variant.theme;if(['entering','dying','leaving'].includes(b.state))return
 c.save()
 for(const n of m.nodes)if(n.hp>0){const x=n.x+15,y=n.y,active=n.kind!=='relay'||n.index===m.activeNode
  if(n.kind==='root'){P.path(c,[[x,y],[b.x-8,y],[b.x+b.width/2,b.y]],'#597f61',3);I.draw(c,'root',x,y,34)}
  else if(n.kind==='cocoon'){c.beginPath();c.ellipse(x,y,11,15,0,0,Math.PI*2);c.fillStyle='#645477';c.fill();c.strokeStyle=C.purple;c.lineWidth=2;c.stroke();for(let j=-8;j<=8;j+=8)P.path(c,[[x-8,y+j],[x+8,y+j+4]],'#ba9dc7',2);P.bar(c,x-12,y+19,24,6,n.age/420,C.purple)}
  else{P.box(c,x-13,y-13,26,26,active?'#497b89':'#354754',active?C.ice:C.edge);P.text(c,n.index+1,x,y,15,active?C.paper:C.muted,'center',true)}
  if(active)P.brackets(c,x-18,y-19,36,38,n.kind==='cocoon'?C.purple:C.green)
  P.bar(c,x-15,y-27,30,6,n.hp/n.maxHp,C.green)
 }
 if(['desert','glacier','volcano'].includes(t)){
  const y=t==='desert'?m.rockY:m.zoneY
  if(!m.weak){const half=t==='desert'?34:48;c.fillStyle=C.green;c.globalAlpha=.08;c.fillRect(birdX-28,y-half,56,half*2);c.globalAlpha=1;P.brackets(c,birdX-28,y-half,56,half*2,C.green)
   P.bar(c,birdX-24,y+half+4,48,7,t==='desert'?1:m.zoneTime/45,C.green);P.text(c,t==='desert'?'诱撞':t==='glacier'?'蓄热':'开阀',birdX,y-half-9,11,C.paper,'center',true)}
  if(t==='desert'){P.box(c,b.screenW*.52,y-25,18,50,'#977853',C.gold);P.path(c,[[b.screenW*.52+6,y-18],[b.screenW*.52+11,y],[b.screenW*.52+5,y+15]],C.ink,2)}
  else{I.draw(c,t==='glacier'?'flame':'valve',b.x-10,y,20);for(let i=0;i<3;i++)P.box(c,b.x+i*12,b.y+b.height/2+10,9,8,i<m.progress?C.gold:C.panel,C.edge)}
 }
 c.restore()
}
function combat(c,s){const b=s.game.bird;c.save();for(const shot of s.shots){c.save();c.translate(Math.round(shot.x),Math.round(shot.y));c.rotate(shot.angle);const color=({seed:C.green,sand:C.gold,echo:C.purple,frost:C.ice,revenge:C.red})[shot.source]||C.paper;c.fillStyle=color;c.globalAlpha=.3;c.fillRect(-20,-1,18,2);c.globalAlpha=1
 if(shot.source==='seed'){I.draw(c,'seed_bolt',0,0,14)}else{P.path(c,[[-8,3],[-2,0],[9,0]],C.ink,5);P.path(c,[[-8,3],[-2,0],[9,0]],color,3);P.path(c,[[4,-3],[9,0],[4,3]],color,2)}c.restore()}
 if(s.flash)P.spark(c,b.x+b.width/2,b.y,Math.max(2,s.flash/2),C.paper)
 const lv=s.level('orbit_guard');if(lv){
  const ready=s.guardCD<=0,angle=s.age*.06,r=Config.COMBAT.GUARD_RADIUS,x=b.x+Math.cos(angle)*r,y=b.y+Math.sin(angle)*r
  // A moving blade and short gold wake mean interception, never another shield circle.
  c.globalAlpha=ready?1:.35
  if(ready){c.beginPath();c.arc(b.x,b.y,r,angle-.5,angle);c.strokeStyle=C.gold;c.lineWidth=2;c.stroke()}
  I.draw(c,'feather_blade',x,y,18)
  if(!ready)P.bar(c,x-8,y+10,16,6,1-s.guardCD/Config.COMBAT.GUARD_CD[lv-1],C.gold)
 }c.restore()}

module.exports={bird,monster,elite,bossBody,boss,charge,item,missile,projectile,hazard,mechanics,combat,pipe:W.pipe}
