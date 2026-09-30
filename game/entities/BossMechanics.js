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
    return {meadow:'击碎两枚树根 · 解除护甲',desert:'站到绿环高度 · 诱撞岩柱',night:'击碎紫卵 · 阻止孵化',glacier:'绿环蓄热 · 三次碎冰',volcano:'绿环开阀 · 排热反噬',storm:'击打发光节点 · 依次断路'}[this.boss.variant.theme]
  }
  render(ctx,birdX) {
    const b=this.boss,t=b.variant.theme
    if(['entering','dying','leaving'].includes(b.state))return
    ctx.save()
    for(const n of this.nodes)if(n.hp>0) {
      const active=n.kind!=='relay'||n.index===this.activeNode
      ctx.strokeStyle=active?'#fff4a3':'#64718a';ctx.fillStyle=n.kind==='cocoon'?'#8c5aaf':n.kind==='root'?'#487849':'#436982';ctx.lineWidth=active?3:1
      ctx.beginPath()
      if(n.kind==='root') {
        ctx.moveTo(n.x+8,n.y-18);ctx.lineTo(n.x+21,n.y-18);ctx.lineTo(n.x+25,n.y+13)
        ctx.lineTo(n.x+32,n.y+22);ctx.lineTo(n.x+17,n.y+15);ctx.lineTo(n.x+1,n.y+24);ctx.lineTo(n.x+7,n.y+8);ctx.closePath()
      } else if(n.kind==='relay') {
        ctx.moveTo(n.x+15,n.y-20);ctx.lineTo(n.x+32,n.y);ctx.lineTo(n.x+15,n.y+20);ctx.lineTo(n.x-2,n.y);ctx.closePath()
      } else ctx.ellipse(n.x+15,n.y,15,19,Math.sin(this.age*.03)*.15,0,Math.PI*2)
      ctx.fill();ctx.stroke()
      if(n.kind==='cocoon') {ctx.strokeStyle='#cba5e8';ctx.lineWidth=1;for(const dy of [-8,0,8]){ctx.beginPath();ctx.moveTo(n.x+3,n.y+dy);ctx.lineTo(n.x+27,n.y+dy+4);ctx.stroke()}}
      ctx.fillStyle='#d7f9ac';ctx.fillRect(n.x,n.y-27,30*n.hp/n.maxHp,3)
      if(n.kind==='cocoon'){ctx.strokeStyle='#eb9aff';ctx.beginPath();ctx.arc(n.x+15,n.y,23,-Math.PI/2,-Math.PI/2+Math.PI*2*n.age/420);ctx.stroke()}
      if(n.kind==='relay'){ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle=active?'#fff':'#9aa';ctx.fillText(String(n.index+1),n.x+15,n.y+4)}
    }
    if(t==='desert'||t==='glacier'||t==='volcano') {
      const y=t==='desert'?this.rockY:this.zoneY
      if(!this.weak){
        ctx.strokeStyle='#9dffd3';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(birdX-28,y-34,56,68);ctx.setLineDash([])
        ctx.beginPath();ctx.arc(birdX,y,25,-Math.PI/2,-Math.PI/2+Math.PI*2*(t==='desert'?1:this.zoneTime/45));ctx.stroke()
        ctx.fillStyle='#d4ffe7';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText(t==='desert'?'诱撞':t==='glacier'?'蓄热':'开阀',birdX,y-40)
      }
      if(t==='desert'){ctx.fillStyle='#ab886b';ctx.fillRect(b.screenW*.52,y-25,18,50);ctx.strokeStyle='#ecd3a5';ctx.strokeRect(b.screenW*.52,y-25,18,50)}
      else for(let i=0;i<3;i++){ctx.fillStyle=i<this.progress?'#ffdb72':'#456';ctx.fillRect(b.x+i*12,b.y+b.height/2+12,8,6)}
    }
    ctx.restore()
  }
}
module.exports=BossMechanics
