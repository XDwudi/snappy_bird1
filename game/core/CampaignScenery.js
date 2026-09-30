// 背景装饰不生成碰撞体、不消耗玩法随机数。
module.exports=function scenery(ctx,theme,w,h,frame) {
  const ground=h-80
  ctx.save()
  if(theme==='night') {
    ctx.fillStyle='#eee3c1';ctx.beginPath();ctx.arc(w-60,85,25,0,Math.PI*2);ctx.fill()
    ctx.fillStyle='#222c48';ctx.beginPath();ctx.arc(w-49,79,23,0,Math.PI*2);ctx.fill()
    for(let i=0;i<18;i++) {
      const x=(i*67-frame*.17)%(w+80)+40
      ctx.fillStyle=i%2?'#243949':'#303451';ctx.fillRect(x,ground-130-i%4*18,12,165)
      ctx.beginPath();ctx.moveTo(x-32,ground-80);ctx.lineTo(x+6,ground-220-i%4*10);ctx.lineTo(x+45,ground-80);ctx.fill()
    }
  } else if(theme==='glacier' || theme==='volcano') {
    for(let i=0;i<4;i++) {
      const x=(i*190-frame*.15)%(w+230)
      ctx.fillStyle=theme==='glacier'?(i%2?'#8db9d3':'#6d96b8'):(i%2?'#6a3b45':'#492e40')
      ctx.beginPath();ctx.moveTo(x-110,ground);ctx.lineTo(x,ground-160-i%2*80);ctx.lineTo(x+140,ground);ctx.fill()
      ctx.fillStyle=theme==='glacier'?'#deeff7':'#ff9c59';ctx.beginPath();ctx.moveTo(x-23,ground-125-i%2*80);ctx.lineTo(x,ground-160-i%2*80);ctx.lineTo(x+29,ground-125-i%2*80);ctx.fill()
    }
  } else if(theme==='storm') {
    ctx.strokeStyle='rgba(186,235,255,.20)';ctx.lineWidth=2
    for(let i=0;i<3;i++) {ctx.beginPath();ctx.ellipse(w*.68,ground*.48,60+i*42,80+i*56,Math.sin(frame*.004)*.2,0,Math.PI*2);ctx.stroke()}
    ctx.fillStyle='#374262';ctx.fillRect(0,ground-18,w,18)
    for(let i=0;i<8;i++)ctx.fillRect((i*80-frame*.3)%(w+80),ground-60-i%3*15,35,75)
  } else if(theme==='meadow') {
    ctx.fillStyle='rgba(47,113,69,.28)'
    for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse((i*120-frame*.2)%(w+140),ground+35,100,70,0,0,Math.PI*2);ctx.fill()}
  }
  if(theme!=='meadow' && theme!=='desert') for(let i=0;i<25;i++) {
    const x=(i*73+Math.sin(frame*.013+i)*8+w)%w
    const y=130+(i*97+(theme==='volcano'?-frame:frame)*.4)%(ground-140)
    ctx.globalAlpha=.2+.4*(.5+.5*Math.sin(frame*.03+i));ctx.fillStyle=theme==='volcano'?'#ffbb78':'#d5f7ff'
    ctx.fillRect(x,y,theme==='glacier'?3:2,theme==='storm'?9:3)
  }
  ctx.restore()
}
