const Hazard=require('./BossHazard.js')
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n))
// 发招时一次锁定目标；招式中途进入 P2 不偷偷扩大已预告的攻击。
module.exports=function cast(boss,bird,skill) {
  const w=boss.screenW,g=boss.groundY,c=boss.variant
  const tier=boss.difficultyTier, power=boss.power
  const speed=c.bulletSpeed*Math.min(4.5,power)*(1+Math.min(.25,boss.combatAge/(150*60)))
  const warn=Math.max(42,c.warnFrames-Math.floor((power-1)*8))
  const aim=clamp(bird.y,155,g-45)
  let lastEnd=0
  const emit=o=>{
    const h=new Hazard(Object.assign({color:c.bulletColor,screenW:w,
      groundY:g,warn,life:Math.ceil((w+100)/speed)+50,onSpawn:boss._deps.onHazard},o))
    h.telegraphFrames=h.piercing?Math.max(90,warn):warn
    lastEnd=Math.max(lastEnd,h.warn+Math.max(h.life,h.split?166:0))
    boss._deps.onHazard(h)
  }
  // 穿盾仅用于明确标记的后期区域招式，完整90帧预警；不临时改变普通弹。
  const piercing=tier>=3 && ['frost_steps','beam','vent_burst','rail_switch','gate'].includes(skill.kind)
  boss.piercingAttack=piercing
  const dangerWarn=piercing?Math.max(90,warn):warn
  const waves=1+Math.floor(tier/2)+(boss.phase===2?1:0)+(tier>=3&&boss.phase===2?1:0)
  const angle=Math.atan2(aim-boss.y,bird.x-boss.x)
  const bolt=(x,y,a,s=speed,extra={})=>{
    for(let wave=0;wave<waves;wave++)emit(Object.assign({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s},extra,
      {warn:(extra.warn==null?warn:extra.warn)+wave*(tier>=3?36:42)}))
  }
  let duration=Math.ceil((w+100)/speed)+60
  switch(skill.kind) {
    // 1.8.1 专属招式：同一预警实体驱动实际轨迹，机关状态提供反击路线。
    case 'return_seed':
      for(const dy of (boss.mechanics.nodes.some(n=>n.kind==='root'&&n.index===0&&n.hp<=0)?[0]:[-.30,0,.30]))bolt(boss.x,boss.y,angle+dy,speed*.75,{returnAt:55,life:170})
      duration=175;break
    case 'vine_steps':
    case 'frost_steps': {
      const ys=skill.kind==='vine_steps'?[g-60,190,g-125]:[190,g-75,260]
      if(skill.kind==='vine_steps'&&boss.mechanics.nodes.some(n=>n.kind==='root'&&n.index===1&&n.hp<=0))ys.splice(1)
      if(boss.phase===2)ys.push(skill.kind==='vine_steps'?210:g-115)
      ys.forEach((y,i)=>emit({kind:'beam',y,radius:20,warn:dangerWarn+i*78,life:32,piercing}))
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
    case 'sandfall': {
      // 固定横坐标不能横躲垂直弹：改为横向沙幕，三次缺口只移动48px。
      const center=clamp(aim,235,g-110)
      for(let i=0;i<3;i++)emit({kind:'gate',x:w,y:center+(i%2?24:-24),gap:154,
        width:18,vx:-speed*.85,warn:warn+i*100,life:Math.ceil((w+50)/(speed*.85))})
      break
    }
    case 'web_lattice':
      for(let i=0;i<(boss.phase===2?3:2);i++)emit({kind:'gate',x:w,y:clamp(aim+(i%2?30:-30),210,g-100),gap:148,width:18,vx:-speed*.8,warn:warn+i*105,life:Math.ceil(w/(speed*.8))+40})
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
      for(const dy of (boss.phase===2?[-.55,0,.55]:[-.55,.55]))bolt(boss.x,boss.y,Math.PI+dy,speed,{bounce:true,life:180})
      break
    case 'mirror_cross':
      for(const y of [165,g-35])for(const d of [-.12,.12])bolt(w-15,y,Math.atan2(aim-y,bird.x-w)+d,speed,{split:true})
      duration+=45;break
    case 'lava_arcs':
      for(let i=0;i<(boss.phase===2?5:3);i++)emit({x:boss.x,y:boss.y,vx:-speed*.75,vy:-4-i*.5,gravity:.075,warn:warn+i*28,radius:9,life:150})
      duration=200;break
    case 'magma_bomb':
      for(const offset of [-.18,.18])bolt(boss.x,boss.y,angle+offset,speed*.7,{radius:14,split:true})
      duration+=60;break
    case 'vent_burst': {
      const center=clamp(aim,235,g-105)
      for(let i=0;i<3;i++)emit({kind:'column',x:bird.x,y:center+(i%2?-26:26),gap:144,
        radius:22,warn:dangerWarn+i*90,life:32,piercing})
      break
    }
    case 'polarity':
      for(const y of [aim-65,aim+65])for(const offset of [-.1,.1])bolt(w-15,clamp(y,150,g-30),Math.PI+offset,speed)
      break
    case 'rail_switch':
      for(let i=boss.mechanics.activeNode;i<3;i++)emit({kind:'column',x:bird.x,y:clamp(aim,250,g-125)+(i%2?-40:40),gap:140,radius:17,warn:dangerWarn+i*90,life:30,piercing})
      duration=195;break
    case 'orbit_discharge':
      for(let i=0;i<7;i++){const a=Math.PI-.72+i*.24;bolt(w*.82,(g+130)/2,a,speed*.85,{warn:warn+i*10,radius:7})}
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
      for(let pulse=0;pulse<(tier>=3&&boss.phase===2?2:1);pulse++)emit({kind:'gate',x:w,y:clamp(center+(pulse?32:0),135+gap/2,g-22-gap/2),gap,width:26,vx:-speed,vy:0,warn:dangerWarn+pulse*100,piercing,life:Math.ceil((w+60)/speed)})
      duration=Math.ceil((w+60)/speed);break
    }
    case 'beam': emit({kind:'beam',y:aim,radius:18+tier,life:40,warn:dangerWarn,piercing});duration=50;break
    case 'pincer': {
      const center=clamp(aim,230,g-105)
      for(let pulse=0;pulse<(boss.phase===2?2:1);pulse++)for(const sign of [-1,1]) emit({kind:'beam',y:center+(pulse?24:-24)+sign*85,radius:20,warn:warn+pulse*100,life:40})
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
      return boss.variant.theme==='desert'?180:warn
  }
  // 连协只在当前招式危险物完全退场后接续，增加密度不制造未预告交叉封路。
  boss.attackDuration=Math.max(duration,lastEnd-warn+2)
  return warn
}
