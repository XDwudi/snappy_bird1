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
    // 1.8.1 专属招式：同一预警实体驱动实际轨迹，机关状态提供反击路线。
    case 'return_seed':
      for(const dy of [-.30,0,.30])bolt(boss.x,boss.y,angle+dy,speed*.75,{returnAt:55,life:170})
      duration=175;break
    case 'vine_steps':
    case 'frost_steps': {
      const ys=skill.kind==='vine_steps'?[g-60,190,g-125]:[190,g-75,260]
      ys.forEach((y,i)=>emit({kind:'beam',y,radius:20,warn:warn+i*65,life:32}))
      duration=172;break
    }
    case 'seed_mines':
      for(let i=0;i<3;i++)emit({x:w*.27+i*55,y:clamp(aim+(i-1)*80,165,g-40),radius:10,grow:true,life:100})
      duration=110;break
    case 'tail_mines':
      for(const offset of [-70,0,70])emit({x:bird.x+25,y:clamp(aim+offset,160,g-35),radius:13,warn:warn+Math.abs(offset),life:32})
      duration=115;break
    case 'sand_funnel':
      for(let i=0;i<4;i++) {
        bolt(w-15,150+i*24,Math.PI-.6,speed,{warn:warn+i*15})
        bolt(w-15,g-30-i*24,Math.PI+.6,speed,{warn:warn+i*15})
      }
      duration+=45;break
    case 'sandfall':
      for(let i=0;i<3;i++)for(const dx of [-16,16])bolt(w*.24+i*w*.27+dx,120,Math.PI/2,speed,{warn:warn+i*32,radius:6})
      duration=Math.ceil(g/speed)+70;break
    case 'web_lattice':
      for(let i=0;i<2;i++)emit({kind:'gate',x:w,y:clamp(aim+(i?38:-38),210,g-100),gap:138,width:18,vx:-speed*.8,warn:warn+i*105,life:Math.ceil(w/(speed*.8))+40})
      duration=Math.ceil(w/(speed*.8))+150;break
    case 'egg_spiral': {
      const nests=boss.mechanics.nodes.filter(n=>n.hp>0)
      for(const n of nests.length?nests:[boss])for(const offset of [-.25,0,.25])bolt(n.x,n.y,Math.atan2(aim-n.y,bird.x-n.x)+offset,speed*.9)
      break
    }
    case 'spider_legs':
      for(let i=0;i<4;i++)bolt(w-35,i%2?g-35:145,i%2?Math.PI+.45:Math.PI-.45,speed,{warn:warn+i*24,radius:9})
      duration+=72;break
    case 'ice_bounce':
      for(const dy of [-.55,.55])bolt(boss.x,boss.y,Math.PI+dy,speed,{bounce:true,life:180})
      break
    case 'mirror_cross':
      for(const y of [165,g-35])for(const d of [-.12,.12])bolt(w-15,y,Math.atan2(aim-y,bird.x-w)+d,speed,{split:true})
      duration+=45;break
    case 'lava_arcs':
      for(let i=0;i<3;i++)emit({x:boss.x,y:boss.y,vx:-speed*.75,vy:-4-i*.5,gravity:.075,warn:warn+i*28,radius:9,life:150})
      duration=200;break
    case 'magma_bomb':
      for(const offset of [-.18,.18])bolt(boss.x,boss.y,angle+offset,speed*.7,{radius:14,split:true})
      duration+=60;break
    case 'vent_burst':
      for(const x of [w*.22,w*.62])for(const d of [-.2,.2])bolt(x,g-8,-Math.PI/2+d,speed,{radius:8,warn:warn+(x>w/2?45:0)})
      duration=Math.ceil(g/speed)+70;break
    case 'polarity':
      for(const y of [aim-65,aim+65])for(const offset of [-.1,.1])bolt(w-15,clamp(y,150,g-30),Math.PI+offset,speed)
      break
    case 'rail_switch':
      for(let i=0;i<3;i++)emit({kind:'column',x:bird.x,y:clamp(aim+(i%2?-55:55),215,g-90),gap:140,radius:17,warn:warn+i*75,life:30})
      duration=195;break
    case 'orbit_discharge':
      for(let i=0;i<8;i++){const a=Math.PI*2*i/8;bolt(w*.65,(g+130)/2,a,speed*.8,{warn:warn+i*8,radius:7})}
      duration+=60;break
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
