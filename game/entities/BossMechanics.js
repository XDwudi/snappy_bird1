const Art=require('../art/Entities'),Hazard=require('./BossHazard'),Random=require('../core/Random')
class BossMechanics{
 constructor(boss){this.boss=boss;this.age=0;this.nodes=[];this.weak=0;this.cycle=0;this.progress=0;this.heat=0;this.zoneY=220;this.zoneTime=0;this.completed=0;this.activeNode=0;this.rockY=220;this.notice=0;this.nextCycle=1;this.exitGrace=48;this.valves=[];this.events=[];this.cancelEruption=false}
 heights(){const lo=155,hi=Math.max(lo+100,this.boss.groundY-65),span=hi-lo;return [lo+span*.25,lo+span*.5,lo+span*.75]}
 node(y,kind,index=0){const b=this.boss,m=this,hp=Math.ceil((kind==='root'?5:kind==='cocoon'?5:7)*Math.sqrt(b.power)),n={x:b.screenW*.59,y,width:30,height:30,topHeight:y-15,bottomY:y+15,hp,maxHp:hp,kind,index,isMechanic:true,destructible:true,type:'mechanic',age:0,
  takeDamage(damage,source){if(this.hp<=0||(kind==='relay'&&index!==m.activeNode)||(kind==='relay'&&['magma','singularity','chain','reaction'].includes(source)))return false;this.hp=Math.max(0,this.hp-damage);if(!this.hp)m.destroy(this);return this.hp===0}}
  this.nodes.push(n);return n
 }
 event(type){this.events.push({type,frame:this.age});if(this.events.length>24)this.events.shift();this.notice=100}
 destroy(n){const b=this.boss;this.event(n.kind+'_'+n.index)
  if(n.kind==='root'){this.strike(.07);if(this.nodes.every(x=>x.hp<=0)){this.completed++;this.weak=360;this.nextCycle=Infinity}}
  if(n.kind==='cocoon')this.strike(.045)
  if(n.kind==='relay'){this.activeNode++;this.strike(.04);if(this.activeNode>=3){this.completed++;this.weak=360;this.nextCycle=Infinity}}
 }
 strike(fraction){const b=this.boss;b.hp=Math.max(0,b.hp-Math.max(1,Math.round(b.maxHp*fraction)));b._hitFlash=12}
 breakArmor(fraction,frames){this.strike(fraction);this.weak=frames;this.completed++;this.event('break');this.nextCycle=this.age+frames+120;this.progress=0;this.zoneTime=0}
 cycleStart(){const b=this.boss,[high,mid,low]=this.heights();this.cycle++;this.nextCycle=Infinity
  switch(b.variant.theme){
   case 'meadow':this.node(high,'root',0);this.node(low,'root',1);break
   case 'desert':this.rockY=this.cycle%2?high:low;break
   case 'night':this.nodes=[];this.node(b.phase===2?mid:high,'cocoon',0);this.node(low,'cocoon',1);break
   case 'glacier':this.zoneY=mid;this.nextZoneY=this.cycle%2?low:high;this.zoneTime=0;this.exitGrace=48;break
   case 'volcano':this.valves=[{y:high,kind:'cool',inside:false},{y:low,kind:'overload',inside:false}];this.valveStage='warning';this.valveUntil=this.age+90;this.valveChosen=false;break
   case 'storm':{const templates=[[mid,high,low],[high,mid,low],[low,mid,high]],ys=templates[Math.floor(Random.random()*templates.length)];ys.forEach((y,i)=>this.node(y,'relay',i));break}
  }
 }
 update(bird){const b=this.boss;if(['entering','dying','leaving'].includes(b.state))return
  this.age++;if(this.weak>0)this.weak--;if(this.notice>0)this.notice--;if(this.age>=this.nextCycle)this.cycleStart()
  const theme=b.variant.theme
  if(theme==='night'){
   for(const n of this.nodes)if(n.hp>0&&++n.age>=(n.hatchAt||(n.hatchAt=b.phase===2?(n.index?480:360):420))){n.hp=0;this.event(n.index?'seeker_hatch':'block_hatch')
    if(n.index===0)b._deps.onHazard(new Hazard({kind:'beam',y:n.y,radius:24,warn:90,life:60,screenW:b.screenW,color:'#d698eb'}))
    else for(const offset of [-.15,.15])b._deps.onHazard(new Hazard({x:n.x,y:n.y,vx:-2.8,vy:offset*5,target:bird,turnFrames:48,warn:90,life:180,screenW:b.screenW,color:'#a2b6ff'}))
   }
   if(this.nodes.length&&this.nodes.every(n=>n.hp<=0)&&this.nextCycle===Infinity)this.nextCycle=this.age+240
  }
  if(theme==='desert'&&b.state==='charging'&&Math.abs(b.chargeY-this.rockY)<40&&b.x<b.screenW*.55&&!this.weak){this.breakArmor(.12,240);b.x=b.homeX;b.comboQueue=[];b._setState('recover')}
  if(theme==='glacier'&&!this.weak){
   // A continuous reachable path; brief exits preserve progress, longer exits decay rather than reset.
   const [high,mid,low]=this.heights();this.zoneY=mid+Math.sin(this.age/300)*(low-high)*.38;this.nextZoneY=mid+Math.sin((this.age+120)/300)*(low-high)*.38
   const half=b.phase===2?40:48
   if(Math.abs(bird.y-this.zoneY)<half){this.zoneTime++;this.exitGrace=48}else if(this.exitGrace>0)this.exitGrace--;else this.zoneTime=Math.max(0,this.zoneTime-.35)
   if(this.zoneTime>=180)this.breakArmor(.12,240)
  }
  if(theme==='volcano'){
   if(this.valveStage==='warning'&&this.age>=this.valveUntil){this.valveStage='open';this.valveUntil=this.age+120}
   if(this.valveStage==='open'&&this.age>=this.valveUntil){this.valveStage='closed';this.nextCycle=this.age+240}
   for(const v of this.valves){const inside=Math.abs(bird.y-v.y)<32
    if(this.valveStage==='open'&&!this.valveChosen&&inside&&!v.inside&&!bird.teleportGrace){this.valveChosen=true;this.valveStage='closed';this.nextCycle=this.age+360;this.event(v.kind)
     if(v.kind==='cool'){this.heat=Math.max(0,this.heat-2);this.cancelEruption=true;this.strike(.035)}
     else{this.weak=300;this.heat++;b._deps.onHazard(new Hazard({kind:'beam',y:v.y,radius:22,warn:90,life:40,screenW:b.screenW,color:'#ff8a47'}))}
    }v.inside=inside
   }
  }
 }
 onAttack(){if(this.boss.variant.theme!=='volcano')return;this.heat=Math.min(4,this.heat+1);if(this.heat>=4){if(this.cancelEruption){this.cancelEruption=false;this.event('eruption_cancelled')}else{const b=this.boss;b._deps.onHazard(new Hazard({kind:'beam',y:b.groundY-42,radius:28,warn:100,life:45,screenW:b.screenW,color:'#ff7b44'}))}this.heat=1}}
 damageScale(){if(this.weak>0)return 1.5;const t=this.boss.variant.theme;if(t==='meadow')return this.completed?1.25:.55+.2*this.nodes.filter(n=>n.hp<=0).length;if(t==='glacier')return Math.min(1.25,.65+.2*this.completed);if(t==='storm')return Math.min(1.25,.4+this.activeNode*.28);return 1}
 label(){const t=this.boss.variant.theme;if(this.weak)return '破绽 '+Math.ceil(this.weak/60)+'秒 · 集中火力'
  return {meadow:this.completed?'双根已断 · 永久易伤':'上根减种子 / 下根减地刺',desert:this.boss.state==='windup'?(this.boss.stateT<this.boss.warnFrames-60?'正在追踪 · 引向石柱':'已锁定 · 立即离开红带'):'石柱是诱撞目标 · 并非安全区',night:'上卵封路 / 下卵追踪 · 7秒孵化',glacier:'沿暖流蓄热 '+Math.floor(this.zoneTime/180*100)+'% · 碎冰'+this.completed+'层',volcano:'冷却阀消热 / 超载阀增伤 · '+(this.valveStage==='open'?'开放'+Math.ceil((this.valveUntil-this.age)/60)+'秒':'等待预告')+' · 热'+this.heat+'/4',storm:this.activeNode>=3?'三路永久断开':'攻击亮节点 '+(this.activeNode+1)+'/3 · 虚框是下一路'}[t]
 }
 render(ctx,birdX){Art.mechanics(ctx,this,birdX)}
}
module.exports=BossMechanics
