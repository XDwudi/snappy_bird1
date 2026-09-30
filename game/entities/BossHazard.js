// 有寿命的环境攻击；预警无碰撞，冻结时寿命也暂停，实体上限由 Game 控制。
const MathUtil = require('../core/MathUtil.js')
class BossHazard {
  constructor(options) {
    Object.assign(this, {kind:'bolt',x:0,y:0,vx:0,vy:0,radius:7,width:24,
      warn:66,life:180,color:'#b6f6ff',groundY:580,screenW:375,gap:150,
      turnFrames:0,split:false,onSpawn:null,age:0}, options)
    this.type='feather'; this.alive=true
    this.isSandWall=this.kind==='gate' || (this.kind==='beam' || this.kind==='column')
    this.topHeight=this.y-this.gap/2; this.bottomY=this.y+this.gap/2
    this._splitDone=false
  }
  update(scale=1) {
    this.previousX=this.x;this.previousY=this.y
    this.age+=scale
    if (this.age < this.warn) return
    const t=this.age-this.warn
    if (this.kind==='beam' || this.kind==='column') return
    if(this.returnAt && t>=this.returnAt && !this.returned){this.vx=-this.vx;this.returned=true}
    if(this.gravity)this.vy+=this.gravity*scale
    if(this.bounce && (this.y<145 || this.y>this.groundY-20))this.vy=-this.vy
    if(this.grow)this.radius=Math.min(23,10+t*.13)
    if (this.turnFrames && t<this.turnFrames && this.target) {
      this.vy+=MathUtil.clamp((this.target.y-this.y)*0.003,-0.09,0.09)*scale
      this.vy=MathUtil.clamp(this.vy,-2,2)
    }
    this.x+=this.vx*scale; this.y+=this.vy*scale
    if (this.split && !this._splitDone && t>=36) {
      this._splitDone=true
      if(this.onSpawn) for(const sign of [-1,1]) this.onSpawn(new BossHazard({
        x:this.x,y:this.y,vx:this.vx,vy:this.vy+sign*1.25,warn:0,life:130,
        color:this.color,screenW:this.screenW,groundY:this.groundY,radius:5}))
      this.alive=false
    }
  }
  checkCollision(bird) {
    if (!this.alive || this.age<this.warn) return false
    const halfW=bird.collisionWidth/2, halfH=bird.collisionHeight/2
    if(this.kind==='gate') return bird.x+halfW>Math.min(this.x,this.previousX==null?this.x:this.previousX) && bird.x-halfW<Math.max(this.x,this.previousX==null?this.x:this.previousX)+this.width &&
      (bird.y-halfH<this.topHeight || bird.y+halfH>this.bottomY)
    if(this.kind==='column') return Math.abs(bird.x-this.x)<this.radius+halfW && (bird.y-halfH<this.topHeight || bird.y+halfH>this.bottomY)
    if(this.kind==='beam') return Math.abs(bird.y-this.y)<this.radius+halfH
    const x=this.previousX==null?this.x:this.previousX,y=this.previousY==null?this.y:this.previousY
    const dx=this.x-x,dy=this.y-y,len=dx*dx+dy*dy
    const t=len?MathUtil.clamp(((bird.x-x)*dx+(bird.y-y)*dy)/len,0,1):0
    return Math.hypot(bird.x-x-dx*t,bird.y-y-dy*t)<this.radius+Math.max(halfW,halfH)
  }
  isOffscreen(w,h) {
    if(!this.alive || this.age>this.warn+this.life) return true
    return this.age>=this.warn && this.kind!=='beam' && this.kind!=='column' && (this.x< -40||this.y< -50||this.y>h+40)
  }
  render(ctx) {
    const warning=this.age<this.warn
    ctx.save();ctx.strokeStyle=warning?'#ffb65c':this.color;ctx.fillStyle=this.color
    ctx.lineWidth=warning?2:3
    if(this.kind==='gate') {
      if(warning) {
        ctx.fillStyle='rgba(255,95,70,0.12)'
        ctx.fillRect(0,130,this.screenW,Math.max(0,this.topHeight-130))
        ctx.fillRect(0,this.bottomY,this.screenW,this.groundY-this.bottomY)
        ctx.strokeStyle='#bdffd4';ctx.setLineDash([8,5])
        ctx.strokeRect(2,this.topHeight,this.screenW-4,this.gap)
      } else {
        ctx.fillRect(this.x,0,this.width,this.topHeight)
        ctx.fillRect(this.x,this.bottomY,this.width,this.groundY-this.bottomY)
        ctx.strokeStyle='#cffff0';ctx.strokeRect(this.x,this.topHeight-4,this.width,4)
        ctx.strokeRect(this.x,this.bottomY,this.width,4)
      }
    } else if(this.kind==='column') {
      ctx.globalAlpha=warning ? .13 : .45;ctx.fillRect(this.x-this.radius,130,this.radius*2,Math.max(0,this.topHeight-130));ctx.fillRect(this.x-this.radius,this.bottomY,this.radius*2,this.groundY-this.bottomY)
      ctx.globalAlpha=1;if(warning)ctx.setLineDash([9,7])
      ctx.beginPath();ctx.moveTo(this.x,130);ctx.lineTo(this.x,this.topHeight);ctx.moveTo(this.x,this.bottomY);ctx.lineTo(this.x,this.groundY);ctx.stroke()
      ctx.strokeStyle='#bdffd4';ctx.strokeRect(this.x-28,this.topHeight,56,this.gap)
    } else if(this.kind==='beam') {
      ctx.globalAlpha=warning?0.13:0.42;ctx.fillRect(0,this.y-this.radius,this.screenW,this.radius*2)
      ctx.globalAlpha=1; if(warning)ctx.setLineDash([9,7])
      ctx.beginPath();ctx.moveTo(0,this.y);ctx.lineTo(this.screenW,this.y);ctx.stroke()
      if(!warning){ctx.strokeStyle='#fffbe0';ctx.lineWidth=3;ctx.stroke()}
    } else if(warning) {
      ctx.globalAlpha=0.55;ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(this.x,this.y)
      ctx.lineTo(this.x+this.vx*100,this.y+this.vy*100);ctx.stroke()
      ctx.setLineDash([]);ctx.beginPath();ctx.arc(this.x,this.y,this.grow?23:10,0,Math.PI*2);ctx.stroke()
    } else {
      ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(this.x,this.y,this.radius+5,0,Math.PI*2);ctx.fill()
      ctx.globalAlpha=1;ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(this.x-1,this.y-1,2,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(this.x-this.vx*5,this.y-this.vy*5);ctx.stroke()
    }
    ctx.restore()
  }
}
module.exports=BossHazard
