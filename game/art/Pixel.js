// Shared visual vocabulary. All helpers isolate Canvas state and use no RNG.
const C = { ink:'#172b3e', panel:'#22384d', edge:'#526d80', paper:'#fff4d6', muted:'#a8c1ca', gold:'#e8bd68', green:'#a8ce76', red:'#ed7265', ice:'#a4deef', purple:'#d6a1ed' }
function box(c,x,y,w,h,fill=C.panel,edge=C.edge) {
  x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h)
  c.fillStyle=C.ink;c.fillRect(x+3,y,w-6,h);c.fillRect(x,y+3,w,h-6)
  c.fillStyle=edge;c.fillRect(x+3,y+2,w-6,h-4);c.fillRect(x+2,y+3,w-4,h-6)
  c.fillStyle=fill;c.fillRect(x+4,y+4,w-8,h-8)
  c.fillStyle=edge;c.fillRect(x+6,y+5,w-12,1)
}
function text(c,s,x,y,size=12,color=C.paper,align='left',bold=false) {
  c.fillStyle=color;c.font=(bold?'bold ':'')+size+'px sans-serif';c.textAlign=align;c.textBaseline='middle';c.fillText(String(s),x,y)
}
function lines(c,s,maxWidth,size=12) {
  c.font=size+'px sans-serif'
  const result=[];let line=''
  for(const ch of String(s)) {if(ch==='\n'||(line&&c.measureText(line+ch).width>maxWidth)){result.push(line);line=ch==='\n'?'':ch}else line+=ch}
  if(line)result.push(line)
  return result
}
function bar(c,x,y,w,h,value,color=C.green) {
  box(c,x,y,w,h,C.ink,C.edge)
  const n=Math.max(0,Math.min(1,value||0)), iw=Math.floor((w-6)*n)
  c.fillStyle=color;c.fillRect(x+3,y+3,iw,Math.max(1,h-6));c.save();c.fillStyle=C.paper;c.globalAlpha*=.25;c.fillRect(x+3,y+3,iw,1);c.restore()
}
function path(c,points,color,width=2) {
  c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.stroke()
}
function ring(c,x,y,r,color,alpha=1,progress=1,phase=0) {
  c.save();c.globalAlpha*=alpha;c.fillStyle=color
  const count=Math.max(16,Math.min(64,Math.ceil(r*1.8)))
  for(let i=0;i<Math.ceil(count*Math.max(0,Math.min(1,progress)));i++) {const a=i/count*Math.PI*2-Math.PI/2+phase;c.fillRect(Math.round((x+Math.cos(a)*r)/2)*2-1,Math.round((y+Math.sin(a)*r)/2)*2-1,2,2)}
  c.restore()
}
function spark(c,x,y,size,color) {c.fillStyle=color;c.fillRect(Math.round(x)-size,Math.round(y)-1,size*2+1,3);c.fillRect(Math.round(x)-1,Math.round(y)-size,3,size*2+1)}
function heart(c,x,y,size,color) {
  const rows=['0110110','1111111','1111111','0111110','0011100','0001000'],p=size/7
  c.fillStyle=C.ink;c.fillRect(x,y+1,size,Math.max(1,size*.6))
  rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]==='1'){c.fillStyle=color;c.fillRect(x+i*p,y+j*p,p+.1,p+.1)}})
  c.save();c.fillStyle=C.paper;c.globalAlpha*=.5;c.fillRect(x+p,y+p,p,p);c.restore()
}
function brackets(c,x,y,w,h,color=C.green) {
  for(const sx of [0,1])for(const sy of [0,1]){const px=x+sx*w,py=y+sy*h;path(c,[[px,py+(sy?-1:1)*7],[px,py],[px+(sx?-1:1)*7,py]],C.ink,4);path(c,[[px,py+(sy?-1:1)*7],[px,py],[px+(sx?-1:1)*7,py]],color,2)}
}
module.exports={C,box,text,lines,bar,path,ring,spark,heart,brackets}
