// 有寿命的环境攻击；预警无碰撞，冻结时寿命也暂停，实体上限由 Game 控制。
const MathUtil = require('../core/MathUtil.js')
class BossHazard {
  constructor(options) {
    Object.assign(this, {kind:'bolt',x:0,y:0,vx:0,vy:0,radius:7,width:24,
      warn:66,life:180,color:'#b6f6ff',groundY:580,screenW:375,gap:150,
      turnFrames:0,split:false,onSpawn:null,age:0}, options)
    this.type='feather'; this.alive=true
    this.isSandWall=this.kind==='gate' || this.kind==='beam'
    this.topHeight=this.y-this.gap/2; this.bottomY=this.y+this.gap/2
    this._splitDone=false
  }
  update(scale=1) {
    this.age+=scale
    if (this.age < this.warn) return
    const t=this.age-this.warn
    if (this.kind==='beam') return
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
    if(this.kind==='gate') return bird.x+halfW>this.x && bird.x-halfW<this.x+this.width &&
      (bird.y-halfH<this.topHeight || bird.y+halfH>this.bottomY)
    if(this.kind==='beam') return Math.abs(bird.y-this.y)<this.radius+halfH
    return Math.hypot(bird.x-this.x,bird.y-this.y)<this.radius+Math.max(halfW,halfH)
  }
  isOffscreen(w,h) {
    if(!this.alive || this.age>this.warn+this.life) return true
    return this.age>=this.warn && this.kind!=='beam' && (this.x< -40||this.y< -50||this.y>h+40)
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
    } else if(this.kind==='beam') {
      ctx.globalAlpha=warning?0.13:0.42;ctx.fillRect(0,this.y-this.radius,this.screenW,this.radius*2)
      ctx.globalAlpha=1; if(warning)ctx.setLineDash([9,7])
      ctx.beginPath();ctx.moveTo(0,this.y);ctx.lineTo(this.screenW,this.y);ctx.stroke()
      if(!warning){ctx.strokeStyle='#fffbe0';ctx.lineWidth=3;ctx.stroke()}
    } else if(warning) {
      ctx.globalAlpha=0.55;ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(this.x,this.y)
      ctx.lineTo(this.x+this.vx*100,this.y+this.vy*100);ctx.stroke()
      ctx.setLineDash([]);ctx.beginPath();ctx.arc(this.x,this.y,10,0,Math.PI*2);ctx.stroke()
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
