// 六种独立轮廓：根须/钳尾/蛛足/晶体/龙脊/机械环。动画由状态驱动，零素材依赖。
module.exports=function drawBossArt(ctx,b) {
  const c=b.variant.colors,t=b.stateT,p=Math.sin(t*.12),theme=b.variant.theme
  ctx.strokeStyle=c.outline;ctx.lineWidth=3;ctx.fillStyle=c.body
  const oval=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke()}
  const line=(points,color,width=5)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.stroke();ctx.strokeStyle=c.outline;ctx.lineWidth=3}
  if(theme==='meadow') {
    for(let i=0;i<5;i++)line([[-23+i*12,10],[-35+i*16,32+p*3],[ -43+i*20,38]],c.body,6)
    ctx.fillStyle=c.body;ctx.fillRect(-27,-23,53,51);ctx.strokeRect(-27,-23,53,51)
    for(let i=0;i<5;i++)oval(-36+i*18,-24-Math.sin(i)*13,18,15+p*.5,i%2?c.wing:c.belly)
    line([[-14,12],[-3,17],[10,11]],c.outline,2)
  } else if(theme==='desert') {
    for(let i=0;i<3;i++)for(const sign of [-1,1])line([[-10+i*13,sign*10],[-2+i*12,sign*(24+p*2)],[10+i*12,sign*29]],c.body,4)
    line([[22,0],[42,-12],[47,-37],[29,-46],[16,-33]],c.body,9)
    oval(17,-31,6,8,c.belly)
    oval(0,0,30,21,c.body)
    for(const sign of [-1,1]) {
      line([[-12,sign*12],[-35,sign*(22+p*3)]],c.body,9)
      oval(-40,sign*(23+p*3),15,10,c.belly)
      line([[-50,sign*21],[-39,sign*25]],c.outline,3)
    }
  } else if(theme==='night') {
    for(let i=0;i<4;i++)for(const sign of [-1,1])line([[-15+i*10,sign*8],[-34+i*19,sign*(33+p*(i%2?1:-1))],[-50+i*25,sign*45]],c.belly,4)
    oval(15,0,26,25,c.body);oval(-18,1,19,17,c.wing)
    ctx.strokeStyle=c.belly;ctx.lineWidth=2;ctx.beginPath();ctx.arc(16,-2,11,0,Math.PI*2);ctx.stroke()
  } else if(theme==='glacier') {
    for(let i=0;i<3;i++) {
      ctx.fillStyle=i%2?c.body:c.belly;ctx.beginPath();ctx.moveTo(-28+i*20,22);ctx.lineTo(-35+i*20,-18);ctx.lineTo(-15+i*20,-37-p*2);ctx.lineTo(-3+i*20,16);ctx.closePath();ctx.fill();ctx.stroke()
    }
    for(const sign of [-1,1])oval(sign*39,12+p*2,13,17,c.body)
  } else if(theme==='volcano') {
    line([[17,8],[45,22],[59,8],[49,-2]],c.body,12)
    oval(0,2,34,23,c.body);oval(-32,-5,17,16,c.body)
    for(let i=0;i<4;i++) {
      ctx.fillStyle=c.belly;ctx.beginPath();ctx.moveTo(-20+i*15,-17);ctx.lineTo(-16+i*15,-34-p*2);ctx.lineTo(-6+i*15,-16);ctx.fill()
    }
    for(const sign of [-1,1])line([[sign*16,15],[sign*27,31],[sign*38,31]],c.body,9)
    line([[-44,0],[-29,7]],'#ffdd99',3)
  } else {
    ctx.save();ctx.rotate(t*.015)
    for(let i=0;i<6;i++) {
      ctx.rotate(Math.PI/3);ctx.fillStyle=c.body;ctx.fillRect(27,-8,19,16);ctx.strokeRect(27,-8,19,16)
      ctx.fillStyle=c.belly;ctx.fillRect(39,-4,5,8)
    }
    ctx.strokeStyle=c.belly;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,32,0,Math.PI*2);ctx.stroke();ctx.restore()
    oval(0,0,23,23,c.wing)
    oval(0,0,11+p*2,11+p*2,c.belly)
  }
  if(theme!=='storm') for(const x of [-17,-4])oval(x,-4,3,4,b.phase===2?'#ff765e':'#fff7bc')
  if(b.state==='recover') {
    ctx.strokeStyle='#fff3a1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,5,13+Math.sin(t*.15)*3,0,Math.PI*2);ctx.stroke()
  }
  if(b._hitFlash>0) {ctx.globalAlpha=.35;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,29,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
}
