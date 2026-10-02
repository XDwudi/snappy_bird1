const Art=require('../art/Entities')
// 有寿命的环境攻击；预警无碰撞，冻结时寿命也暂停，实体上限由 Game 控制。
const MathUtil = require('../core/MathUtil.js')
class BossHazard {
  constructor(options) {
    Object.assign(this, {kind:'bolt',x:0,y:0,vx:0,vy:0,radius:7,width:24,
      warn:66,life:180,color:'#b6f6ff',groundY:580,screenW:375,gap:150,
      turnFrames:0,split:false,onSpawn:null,age:0}, options)
    this.type='feather'; this.alive=true
    if(this.piercing)this.color='#ff66df'
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
    Art.hazard(ctx, this)
  }
}
module.exports=BossHazard
