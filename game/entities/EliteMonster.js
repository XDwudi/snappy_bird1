const Monster=require('./Monster.js')
const Hazard=require('./BossHazard.js')
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
// 护航炮艇与唤天气灵：独立轮廓、有限伴飞时间、起手预警；击杀才领奖。
class EliteMonster extends Monster {
  constructor(x,y,type,groundY,opts) {
    super(x,y,type,groundY,opts)
    this.eliteKind=opts.eliteKind || 'gunship'
    this.screenW=opts.screenW;this.onHazard=opts.onHazard;this.getPipes=opts.getPipes
    this.tier=opts.eliteTier || 0
    this.name={gunship:'护航炮艇',stormcaller:'唤天气灵',prism:'棱镜哨兵',bomber:'孢雷水母'}[this.eliteKind]
    this.hint={gunship:'躲开瞄准弹，反击炮艇',stormcaller:'优先击杀，驱散叠加天气',prism:'避开交叉弹，反击菱形核心',bomber:'离开孢雷圆圈，反击水母'}[this.eliteKind]
    this.width=46;this.height=38;this.hp=opts.eliteHp || [6,12,24,42,66,96][Math.min(5,this.tier)];this.maxHp=this.hp
    this.shotTimer=0;this.stayFrames=720+this.tier*60;this.retreating=false
  }
  update(speed,bird,scale=1) {
    this.age+=scale;this.phase+=.05*scale;if(this.hitFlash>0)this.hitFlash--
    this.retreating=this.age>=this.stayFrames
    if(this.retreating){this.x+=3.5*scale;this.y-=.5*scale}
    else {
      const home=this.screenW*.70
      this.x+=clamp(home-this.x,-2*scale,2*scale)
      const pipes=this.getPipes?this.getPipes():[]
      const ahead=pipes.filter(p=>p.x+p.width>this.x-40).sort((a,b)=>a.x-b.x)[0]
      const target=ahead?ahead.topHeight+ahead.gap/2:bird.y
      this.y+=clamp(target-this.y,-.9*scale,.9*scale)
      if(this.age>90 && this.eliteKind!=='stormcaller') {
        this.shotTimer+=scale
        // 穿管瞬间不额外封路，炮口亮起后锁定，不追踪预警中的鸟。
        if(this.shotTimer>=Math.max(96,150-this.tier*10) && !pipes.some(p=>Math.abs(p.x+p.width/2-bird.x)<75)) {
          this.shotTimer=0
          const a=Math.atan2(bird.y-this.y,bird.x-this.x)
          const emit=o=>{if(this.onHazard)this.onHazard(new Hazard(Object.assign({warn:75,life:130,screenW:this.screenW,groundY:this.groundY,color:'#ffb65c'},o)))}
          const velocity=3.2+this.tier*.22
          if(this.eliteKind==='bomber') {
            // 只锁定一个高度，留足上下离开的时间；不在穿管窗口布雷。
            emit({x:bird.x+20,y:bird.y,vx:0,vy:0,grow:true,radius:10,warn:90,life:45,color:'#d6ee84'})
          } else if(this.eliteKind==='prism') {
            for(const dy of [-65,65]) {
              const angle=Math.atan2(bird.y-this.y-dy,bird.x-this.x)
              emit({x:this.x,y:this.y+dy,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,color:'#89e5ff'})
            }
          } else {
            const count=2+Math.floor(this.tier/2)
            for(let i=0;i<count;i++) {const angle=a+(i-(count-1)/2)*.25
              emit({x:this.x,y:this.y,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity})
            }
          }
        }
      }
    }
    this.y=clamp(this.y,170,this.groundY-45);this._syncBox()
  }
  isOffscreen(){return this.retreating&&this.x>this.screenW+60}
  _doCheckCollision(bird){return this.age>90&&!this.retreating&&super._doCheckCollision(bird)}
  _doRender(ctx) {
    const cx=this.x+this.width/2,y=this.y
    ctx.save();ctx.translate(cx,y);ctx.strokeStyle='#ffe09a';ctx.lineWidth=2
    if(this.eliteKind==='gunship') {
      ctx.fillStyle=this.hitFlash?'#fff6c0':'#a76948'
      ctx.beginPath();ctx.moveTo(-26,0);ctx.lineTo(-10,-18);ctx.lineTo(20,-12);ctx.lineTo(25,12);ctx.lineTo(-10,18);ctx.closePath();ctx.fill();ctx.stroke()
      ctx.fillStyle='#ffc86d';ctx.fillRect(-33,-4,18,8)
      for(const s of [-1,1]){ctx.fillStyle='#5c8294';ctx.fillRect(-8,s*25-3,30,6);ctx.strokeRect(-8,s*25-3,30,6);ctx.fillStyle='#caf4ff';ctx.fillRect(-5+Math.sin(this.phase*4)*8,s*25-2,16,4)}
    } else if(this.eliteKind==='prism') {
      ctx.fillStyle=this.hitFlash?'#fff':'#247a99';ctx.strokeStyle='#b9faff'
      ctx.beginPath();ctx.moveTo(-30,0);ctx.lineTo(0,-26);ctx.lineTo(29,0);ctx.lineTo(0,26);ctx.closePath();ctx.fill();ctx.stroke()
      for(const d of [-1,1]){ctx.beginPath();ctx.arc(0,d*32,6+Math.sin(this.phase)*2,0,Math.PI*2);ctx.stroke()}
      ctx.fillStyle='#e4fdff';ctx.fillRect(-7,-7,14,14)
    } else if(this.eliteKind==='bomber') {
      ctx.fillStyle=this.hitFlash?'#fff':'#92a959';ctx.strokeStyle='#ebff9d'
      ctx.beginPath();ctx.ellipse(0,-6,26,18,0,Math.PI,Math.PI*2);ctx.lineTo(26,8);ctx.lineTo(-26,8);ctx.closePath();ctx.fill();ctx.stroke()
      for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*9,8);ctx.quadraticCurveTo(i*9+Math.sin(this.phase+i)*10,23,i*10,33);ctx.stroke()}
      ctx.fillStyle='#fdffad';ctx.beginPath();ctx.arc(0,-4,6,0,Math.PI*2);ctx.fill()
    } else {
      ctx.fillStyle=this.hitFlash?'#fff':'#6663a7'
      ctx.beginPath();ctx.moveTo(0,-27);ctx.lineTo(23,-3);ctx.lineTo(13,20);ctx.lineTo(-16,20);ctx.lineTo(-25,-4);ctx.closePath();ctx.fill();ctx.stroke()
      ctx.strokeStyle='#b6edff';ctx.beginPath();ctx.ellipse(0,0,34,12,this.phase*.5,0,Math.PI*2);ctx.stroke()
      ctx.fillStyle='#e0f7ff';ctx.beginPath();ctx.moveTo(3,-14);ctx.lineTo(-8,3);ctx.lineTo(1,3);ctx.lineTo(-3,16);ctx.lineTo(12,-4);ctx.lineTo(3,-4);ctx.closePath();ctx.fill()
    }
    ctx.restore();ctx.save();ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff1ae'
    ctx.fillText(this.retreating?'撤离':this.name,cx,y-42)
    ctx.fillStyle='#49343e';ctx.fillRect(cx-25,y+33,50,5);ctx.fillStyle='#ffce69';ctx.fillRect(cx-25,y+33,50*this.hp/this.maxHp,5)
    ctx.strokeStyle='#ffe5a6';ctx.beginPath();ctx.arc(cx,y,36,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,1-this.age/this.stayFrames));ctx.stroke();ctx.restore()
  }
}
module.exports=EliteMonster
