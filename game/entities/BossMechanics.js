const Art=require('../art/Entities')
// 六种可主动破解的战斗规则。机关不是小怪，不产出经验/回血/连锁刷取。
const Hazard = require('./BossHazard.js')
class BossMechanics {
  constructor(boss) {
    this.boss=boss;this.age=0;this.nodes=[];this.weak=0;this.cycle=0
    this.progress=0;this.heat=0;this.zoneY=220;this.zoneTime=0;this.completed=0
    this.activeNode=0;this.rockY=220;this.notice=0;this.nextCycle=1
  }
  node(y,kind,index=0) {
    const b=this.boss,m=this
    const hp=Math.ceil((kind==='cocoon'?4:6)*Math.sqrt(b.power)*(1+b.difficultyTier*.16))
    const n={x:b.screenW*.59,y,width:30,height:30,topHeight:y-15,bottomY:y+15,hp,maxHp:hp,
      kind,index,isMechanic:true,destructible:true,type:'mechanic',age:0,
      takeDamage(damage) {
        if(this.hp<=0 || (kind==='relay'&&index!==m.activeNode))return false
        this.hp=Math.max(0,this.hp-damage)
        if(!this.hp)m.destroy(this)
        return this.hp===0
      }}
    this.nodes.push(n);return n
  }
  destroy(n) {
    const b=this.boss
    if(n.kind==='root' && this.nodes.every(x=>x.hp<=0))this.breakArmor(.12,240)
    if(n.kind==='cocoon') {this.strike(.055);this.notice=60}
    if(n.kind==='relay') {
      this.activeNode++
      if(this.activeNode>=3)this.breakArmor(.18,210)
    }
  }
  strike(fraction) {
    this.boss.hp=Math.max(0,this.boss.hp-Math.max(1,Math.round(this.boss.maxHp*fraction)))
    this.boss._hitFlash=12
  }
  breakArmor(fraction,frames) {
    this.strike(fraction);this.weak=frames;this.completed++;this.notice=100
    this.nextCycle=this.age+frames+180;this.progress=0;this.heat=0
  }
  cycleStart() {
    const b=this.boss,g=b.groundY
    this.cycle++;this.nodes=[];this.activeNode=0
    const low=g-100,high=190
    switch(b.variant.theme) {
      case 'meadow': this.node(high,'root');this.node(low,'root');break
      case 'desert': this.rockY=this.cycle%2?high:low;break
      case 'night': this.node(high,'cocoon');this.node(low,'cocoon');break
      case 'glacier': case 'volcano': this.zoneY=this.cycle%2?high:low;this.zoneTime=0;break
      case 'storm': this.node(high,'relay',0);this.node((high+low)/2,'relay',1);this.node(low,'relay',2);break
    }
    this.nextCycle=Infinity
  }
  update(bird) {
    const b=this.boss
    if(['entering','dying','leaving'].includes(b.state))return
    this.age++;if(this.weak>0)this.weak--;if(this.notice>0)this.notice--
    if(this.age>=this.nextCycle)this.cycleStart()
    const theme=b.variant.theme
    if(theme==='night') {
      for(const n of this.nodes)if(n.hp>0&&++n.age>=420) {
        n.hp=0;b._deps.onSummon('floater',b.screenW+20,n.y)
        for(const dy of [-.18,.18])b._deps.onHazard(new Hazard({x:n.x,y:n.y,vx:-3.8*Math.min(4.5,b.power),vy:dy*6,warn:66,life:180,color:'#be9cff',screenW:b.screenW}))
      }
      if(this.nodes.length&&this.nodes.every(n=>n.hp<=0)&&this.nextCycle===Infinity)this.nextCycle=this.age+150
    }
    if(theme==='desert'&&b.state==='charging'&&Math.abs(b.chargeY-this.rockY)<45&&b.x<b.screenW*.55&&!this.weak) {
      this.breakArmor(.15,210);b.x=b.homeX;b.comboQueue=[];b._setState('recover')
    }
    if((theme==='glacier'||theme==='volcano')&&!this.weak) {
      // 只需单指保持在绿色环的高度；圈不赋予无敌，须在弹幕间找时机。
      if(Math.abs(bird.y-this.zoneY)<34)this.zoneTime++
      else this.zoneTime=Math.max(0,this.zoneTime-2)
      if(this.zoneTime>=45) {
        this.zoneTime=0;this.progress++;this.zoneY=this.zoneY<250?b.groundY-100:190
        if(theme==='volcano') {this.heat=Math.max(0,this.heat-2);this.strike(.045)}
        if(this.progress>=3)this.breakArmor(theme==='glacier' ? .20 : .10,210)
      }
    }
  }
  onAttack() {
    if(this.boss.variant.theme==='volcano'&&!this.weak) {
      this.heat++
      if(this.heat>=4) {
        this.heat=1
        const b=this.boss
        b._deps.onHazard(new Hazard({kind:'beam',y:b.groundY-42,radius:32,warn:90,life:120,screenW:b.screenW,color:'#ff7b44'}))
      }
    }
  }
  damageScale() {
    if(this.weak>0)return 1.5
    const t=this.boss.variant.theme
    if(t==='meadow'&&this.nodes.some(n=>n.hp>0))return .45
    if(t==='glacier')return .5
    if(t==='storm'&&this.activeNode<3)return .35
    return 1
  }
  label() {
    if(this.weak)return '机关破解！集中火力'
    const alive=this.nodes.filter(n=>n.hp>0).length
    return {
      meadow:'对准树根发射 · 剩'+alive+'根解除护甲',
      desert:this.boss.state==='windup'||this.boss.state==='charging'?'瞄准已锁定！离开红带，让巨蝎撞柱':'先到绿框高度 · 等冲锋锁定再离开',
      night:'对准紫卵发射 · 剩'+alive+'卵会孵化',
      glacier:'绿框停留蓄热 '+this.progress+'/3 · 碎冰后强攻',
      volcano:'绿框开阀 '+this.progress+'/3 · 热量 '+this.heat+'/4',
      storm:'对准发光节点 '+Math.min(3,this.activeNode+1)+'/3 · 导弹自动瞄准'
    }[this.boss.variant.theme]
  }
  render(ctx,birdX) {
    Art.mechanics(ctx, this, birdX)
  }
}
module.exports=BossMechanics
