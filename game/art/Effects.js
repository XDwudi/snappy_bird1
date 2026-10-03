const P=require('./Pixel'),I=require('./Icons'),C=P.C,Config=require('../config/GameConfig')
function effects(g){const c=g.ctx;c.save();for(const p of g.abilityEffects){const a=Math.max(0,p.life/p.maxLife),color='rgb('+p.color+')';c.globalAlpha=a
 if(p.kind==='ring')P.ring(c,p.x,p.y,p.size+(1-a)*26,color,.9)
 else if(p.kind==='cross')P.spark(c,p.x,p.y,Math.max(2,p.size),color)
 else{const size=Math.max(1,Math.round(p.size*a));c.fillStyle=color;c.fillRect(Math.round(p.x)-size/2,Math.round(p.y)-size/2,size,size);if(size>3){c.fillStyle=C.paper;c.fillRect(Math.round(p.x)-1,Math.round(p.y)-1,2,2)}}}c.restore()}
function near(g){const c=g.ctx;c.save();for(const e of g.nearMissEffects){if(e.flashLife>0){c.globalAlpha=e.flashLife/e.flashMaxLife;P.spark(c,e.x,e.y,10,C.paper)}
 for(const r of e.rings||[]){if(r.life>0){const n=1-r.life/r.maxLife;P.ring(c,e.x,e.y,r.radius+(r.maxRadius-r.radius)*n,C.gold,1-n)}}
 for(const s of e.sparkles||[]){c.globalAlpha=s.life/s.maxLife;P.spark(c,s.x,s.y,2,C.paper)}}c.restore()}
function auras(g){const c=g.ctx,a=g.abilitySystem,b=g.bird;c.save();const range=a.getStat('orbAttractRange');if(range>Config.ORB.ATTRACT_RANGE)P.ring(c,b.x,b.y,range,C.gold,.2,.7,g.frameCount*.01)
 if(a.owned.get('berserk')&&a.hp<=1)for(let k=0;k<5;k++){const theta=g.frameCount*.04+k*Math.PI*2/5;P.spark(c,b.x+Math.cos(theta)*23,b.y+Math.sin(theta)*23,2,C.red)}
 if(a.timeWarpActive>0){P.ring(c,b.x,b.y,42,C.purple,.55,.8,-g.frameCount*.015);for(let k=0;k<4;k++){const x=k%2?g.screenW-7:7,y=90+Math.floor(k/2)*(g.screenH-200);I.draw(c,'time_warp',x,y,12)}}
 if(a.owned.get('storm_child')&&a.weatherActive)P.ring(c,b.x,b.y,29,C.gold,.6,.6,g.frameCount*.04);c.restore()}
function phoenix(g){const c=g.ctx,a=g.phoenixAnim,b=g.bird;if(!a)return;const n=1-a.timer/a.maxTimer;c.save()
 if(a.phase==='pause'){c.fillStyle='rgba(23,43,62,.45)';c.fillRect(0,0,g.screenW,g.screenH);I.draw(c,'phoenix',b.x,b.y,48);P.text(c,'凤凰复活',g.screenW/2,b.y-58,24,C.gold,'center',true);P.ring(c,b.x,b.y,34,C.gold,.9,n)}
 else{const s=45*Math.sin(n*Math.PI);for(const sign of [-1,1])for(let k=0;k<5;k++){c.fillStyle=k%2?C.gold:C.red;c.globalAlpha=1-n;c.fillRect(Math.round(b.x+sign*(12+k*s/6)-3),Math.round(b.y-8-k*4),6,14+k*2)}for(const p of a.particles){c.globalAlpha=p.life/p.maxLife;P.spark(c,p.x,p.y,Math.max(1,p.size*(1-n)),p.color)}}c.restore()}
function floats(g){
 const c=g.ctx,top=(g._artHeaderBottom||g.safeTop+68)+10,bottom=g.screenH-Config.GROUND.HEIGHT-10,placed=[]
 const blockers=[],add=(x,y,w,h)=>blockers.push({x:x-5,y:y-5,w:w+10,h:h+10})
 add(g.bird.x-g.bird.width/2,g.bird.y-g.bird.height/2,g.bird.width,g.bird.height)
 for(const m of g.monsters)add(m.x,m.y-m.height/2,m.width,m.height)
 if(g.boss){const b=g.boss;add(b.x,b.y-b.height/2,b.width,b.height);for(const n of b.mechanics.nodes)if(n.hp>0)add(n.x,n.y-30,30,55)}
 const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y
 c.save()
 // Resolve notifications at draw time: do not move gameplay objects or change message lifetimes.
 for(const t of g.floatingTexts.slice(-6).reverse()){
  const label=t.text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]\uFE0F?/g,'')
  c.font='bold 12px sans-serif';const measured=c.measureText(label).width,size=Math.min(12,12*(g.screenW-24)/Math.max(1,measured));c.font='bold '+size+'px sans-serif'
  const w=c.measureText(label).width+6,h=17,x=Math.max(10+w/2,Math.min(g.screenW-10-w/2,t.x));let spot=null
  const blocked=blockers.concat(placed)
  for(const dx of [x,10+w/2,g.screenW-10-w/2]){
   for(let offset=0;offset<144;offset+=18){const y=Math.max(top,Math.min(bottom,t.y-offset)),r={x:dx-w/2,y:y-h/2,w,h}
    if(!blocked.some(b=>overlaps(r,b))){spot=r;break}
   }
   if(spot)break
  }
  if(!spot)continue
  placed.push(spot);c.globalAlpha=Math.min(1,t.life/t.maxLife/.6);c.textAlign='center';c.textBaseline='middle';c.lineWidth=3;c.strokeStyle=C.ink;c.fillStyle=t.color||C.paper
  c.strokeText(label,spot.x+w/2,spot.y+h/2);c.fillText(label,spot.x+w/2,spot.y+h/2)
 }
 g._artFloatingBounds=placed;c.restore()
}

function damage(g){const c=g.ctx;c.save();c.globalAlpha=Math.min(1,g.damageFlash/20)*.35;c.fillStyle=C.red;for(const inset of [0,6,12]){c.fillRect(inset,inset,g.screenW-inset*2,3);c.fillRect(inset,g.screenH-inset-3,g.screenW-inset*2,3);c.fillRect(inset,inset,3,g.screenH-inset*2);c.fillRect(g.screenW-inset-3,inset,3,g.screenH-inset*2)}c.restore()}
function danger(g){if(g.abilitySystem.hp!==1||!['playing','upgrading'].includes(g.state))return;const c=g.ctx;c.save();c.globalAlpha=.6+.15*Math.sin(g.frameCount*.045);P.brackets(c,2,2,g.screenW-4,g.screenH-4,C.red);c.fillStyle=C.red;c.fillRect(0,0,2,g.screenH);c.fillRect(g.screenW-2,0,2,g.screenH);c.restore()}
function speed(g){const c=g.ctx;c.save();c.globalAlpha=Math.min(1,g.abilitySystem.speedPackFrames/60)*.7;P.brackets(c,5,5,g.screenW-10,g.screenH-10,C.ice);c.restore()}
function sense(g){const lv=g.abilitySystem.owned.get('pipe_sense')||0;if(!lv)return;let next=null;for(const p of g.pipes)if(p.x+p.width>g.bird.x-g.bird.collisionWidth/2&&(!next||p.x<next.x))next=p;if(!next)return;const c=g.ctx;c.save();c.globalAlpha=.65;P.brackets(c,next.x,next.topHeight,next.width,next.gap,C.gold);if(lv>=2){c.fillStyle=C.green;c.globalAlpha=.1;c.fillRect(next.x,next.topHeight+next.gap/2-30,next.width,60)}c.restore()}
function rain(c,e,w,h,g){c.save();c.fillStyle=C.ice;c.globalAlpha=.4;for(const d of e.drops){c.fillRect(Math.round(d.x),Math.round(d.y),1,Math.round(d.length*.7));c.fillRect(Math.round(d.x)-1,Math.round(d.y+d.length*.7),1,3)}if(g&&g.bird){const b=g.bird;for(const s of e.splashParticles){c.globalAlpha=s.life/s.maxLife*.7;P.spark(c,b.x+s.x,b.y+s.y,1,C.ice)}for(let k=0;k<Math.floor(e.rainLevel/20);k++){c.globalAlpha=.7;c.fillStyle=C.ice;c.fillRect(Math.round(b.x-10+k*5),Math.round(b.y+16),2,3)}}c.restore()}
function wind(c,e,w,h,g){c.save();for(const p of e.particles){c.globalAlpha=p.life/p.maxLife*.35*e.sinIntensity;const x=Math.round(p.x),y=Math.round(p.y);if(e.isVertical)P.path(c,[[x,y],[x,y-e.direction*p.length],[x+3,y-e.direction*p.length-3]],C.paper,1);else P.path(c,[[x,y],[x-e.direction*p.length,y],[x-e.direction*p.length-3,y+3]],C.paper,1)}if(g&&g.bird&&Math.abs(e.currentForce)>.001){const b=g.bird,sgn=Math.sign(e.currentForce),x=b.x+32,y=b.y; c.globalAlpha=.7;P.path(c,[[x,y-7*sgn],[x,y+7*sgn],[x-4,y+3*sgn]],C.ice,2)}c.restore()}
function hail(c,e){c.save();for(const h of e.hailstones)h.render(c);for(const fx of e.crackEffects)for(const p of fx.fragments){c.globalAlpha=p.life/p.maxLife;c.fillStyle=p.color;c.fillRect(Math.round(p.x),Math.round(p.y),3,3)}c.restore()}
module.exports={effects,near,auras,phoenix,floats,damage,danger,speed,sense,rain,wind,hail}
