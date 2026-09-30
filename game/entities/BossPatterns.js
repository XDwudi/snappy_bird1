const Hazard=require('./BossHazard.js')
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n))
// 发招时一次锁定目标；招式中途进入 P2 不偷偷扩大已预告的攻击。
module.exports=function cast(boss,bird,skill) {
  const w=boss.screenW,g=boss.groundY,c=boss.variant
  const tier=boss.difficultyTier, power=boss.power
  const speed=c.bulletSpeed*Math.min(4.5,power)
  const warn=Math.max(42,c.warnFrames-Math.floor((power-1)*8))
  const aim=clamp(bird.y,155,g-45)
  const emit=o=>boss._deps.onHazard(new Hazard(Object.assign({color:c.bulletColor,screenW:w,
    groundY:g,warn,life:Math.ceil((w+100)/speed)+50,onSpawn:boss._deps.onHazard},o)))
  const angle=Math.atan2(aim-boss.y,bird.x-boss.x)
  const bolt=(x,y,a,s=speed,extra={})=>emit(Object.assign({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s},extra))
  let duration=Math.ceil((w+100)/speed)+60
  switch(skill.kind) {
    case 'fan': {
      const count=3+Math.floor(tier/2)+(boss.phase===2?2:0)+Math.min(6,Math.max(0,Math.floor((power-2)*2)))
      for(let i=0;i<count;i++)bolt(boss.x,boss.y,angle+(i-(count-1)/2)*.22)
      break
    }
    case 'burst':
      for(let i=0;i<3;i++)bolt(boss.x,boss.y,angle+(i-1)*.13,speed+0.3,{warn:warn+i*22})
      duration+=44;break
    case 'gate': {
      const gap=Math.max(100,c.gateGap-(power-1)*12-(boss.phase===2?8:0))
      const center=clamp(aim+(boss.attackIndex%2? -34:34),135+gap/2,g-22-gap/2)
      emit({kind:'gate',x:w,y:center,gap,width:26,vx:-speed,vy:0,life:Math.ceil((w+60)/speed)})
      duration=Math.ceil((w+60)/speed);break
    }
    case 'beam': emit({kind:'beam',y:aim,radius:18+tier,life:40});duration=50;break
    case 'pincer': {
      const center=clamp(aim,230,g-105)
      for(const sign of [-1,1]) emit({kind:'beam',y:center+sign*85,radius:20,life:52})
      duration=62;break
    }
    case 'rain':
    case 'columns':
      for(let i=0;i<4;i++)bolt(w*.2+i*w*.19,125,Math.PI/2+.18,speed,{warn:warn+i*18,radius:skill.kind==='columns'?10:7})
      duration=Math.ceil(g/speed)+65;break
    case 'eruption':
      for(let i=0;i<5;i++)bolt(w*.35+i*w*.15,g-12,-Math.PI/2-.2,speed,{warn:warn+i*14,radius:8})
      duration=Math.ceil(g/speed)+65;break
    case 'spiral':
      for(let i=0;i<7+Math.min(6,Math.max(0,Math.floor((power-2)*2)));i++)bolt(boss.x,boss.y,Math.PI-.6+i*.2,speed,{warn:warn+i*9})
      duration+=54;break
    case 'seek':
      for(const offset of [-48,48])bolt(boss.x,clamp(boss.y+offset,145,g-25),Math.PI,speed,
        {target:bird,turnFrames:36,radius:8})
      break
    case 'split':
      for(const offset of [-.23,.23])bolt(boss.x,boss.y,angle+offset,speed,{split:true,radius:10})
      duration+=40;break
    case 'summon':
      // 出现位置不在玩家身上，警告期后入场；最多少量召唤物。
      boss.pendingSummon={at:warn,y:clamp(aim-70,150,g-45)}
      duration=145;break
    case 'dash':
      boss.chargeY=aim;boss._windupStartY=boss.y;boss._setState('windup')
      return warn
  }
  boss.attackDuration=duration
  return warn
}
