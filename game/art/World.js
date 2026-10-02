const A=require('./Assets'),P=require('./Pixel'),C=P.C
const themes=['meadow','desert','night','glacier','volcano','storm']
const palettes=[
 ['#85bfea','#bcdfec','#8f704c','#c6a171','#587840','#b2d277'],
 ['#f8c69f','#f9ddb1','#b18153','#e8bc81','#bd945b','#f4dca7'],
 ['#314d83','#576e9e','#393751','#75618e','#4c6679','#bfa5d5'],
 ['#76a9d3','#beddea','#537f9d','#bddfea','#81bccc','#e4f5e8'],
 ['#4d3b5b','#a56d72','#463e50','#80606a','#ad614f','#ffc47a'],
 ['#587798','#9aafbd','#4b596f','#90a8af','#688f96','#b7e1d9']]
function index(g){return Math.max(0,themes.indexOf(g.chapterSystem.getVisual().theme))}
function background(g){
 const c=g.ctx,w=g.screenW,h=g.screenH-80,i=index(g),p=palettes[i],im=A.images.scenery
 c.save();c.imageSmoothingEnabled=false
 if(im){
  // Stretch sky separately; keep landscape proportions on tall phones.
  const sx=i%3*512,sy=Math.floor(i/3)*512,land=Math.min(w,h*.64)
  c.drawImage(im,sx,sy,512,280,0,0,w,h-land*.453)
  c.drawImage(im,sx,sy+280,512,232,0,h-land*.453,w,land*.453)
 }else{
  c.fillStyle=p[0];c.fillRect(0,0,w,h);c.fillStyle=p[1];c.fillRect(0,h*.65,w,h*.35)
  for(let x=0;x<w;x+=8){c.fillStyle=p[4];const y=h-35-Math.round((Math.sin(x*.028)+1)*18);c.fillRect(x,y,8,h-y)}
 }
 c.restore()
}
function scenery(g){
 const c=g.ctx,i=index(g),h=g.screenH-80,f=g.frameCount,w=g.screenW
 c.save();c.globalAlpha=.23;c.fillStyle=palettes[i][5]
 // A few ambient motes, visibly smaller and fainter than enemy bullets.
 for(let k=0;k<8;k++){const x=((k*79-f*.12)%(w+20)+w+20)%(w+20)-10,y=h-18-(k*31+f*.08)%Math.min(115,h*.2);c.fillRect(Math.round(x),Math.round(y),1,2)}
 c.restore()
}
function ground(g){const c=g.ctx,w=g.screenW,y=g.screenH-80,p=palettes[index(g)];c.fillStyle=p[2];c.fillRect(0,y,w,80);c.fillStyle=C.ink;c.fillRect(0,y,w,3);c.fillStyle=p[4];c.fillRect(0,y+3,w,7)
 for(let x=-g.groundOffset;x<w;x+=24){c.fillStyle=p[5];c.fillRect(Math.round(x),y+3,14,3);c.fillStyle=p[3];c.fillRect(Math.round(x+6),y+13,8,5);c.fillStyle=C.ink;c.globalAlpha=.2;c.fillRect(Math.round(x+14),y+20,9,4);c.globalAlpha=1}
}
function pipe(c,p){
 const theme=p.colorSet&&p.colorSet.theme||'meadow',i=Math.max(0,themes.indexOf(theme)),col=palettes[i]
 for(const part of [[0,p.topHeight],[p.bottomY,p.bottomHeight]]){
  const x=Math.round(p.x),y=Math.round(part[0]),h=Math.max(0,Math.round(part[1])),w=p.width
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.fillStyle=C.ink;c.fillRect(x,y,w,h);c.fillStyle=col[2];c.fillRect(x+2,y,w-4,h)
  for(let dx=5;dx<w-3;dx+=9){c.fillStyle=dx%2?col[3]:col[2];c.fillRect(x+dx,y,3,h);for(let yy=y+((dx*17)%37);yy<y+h;yy+=39){c.fillStyle=C.ink;c.globalAlpha=.25;c.fillRect(x+dx,yy,2,17);c.globalAlpha=1}}
  if(i!==0&&i!==2){for(let yy=y+24;yy<y+h;yy+=36){c.fillStyle=C.ink;c.globalAlpha=.25;c.fillRect(x+3,yy,w-6,2);c.globalAlpha=1}}
  // Carved insets / crystal veins stay inside the actual solid rectangle.
  for(let yy=y+55;yy<y+h-18;yy+=104){P.path(c,[[x+w/2,yy-8],[x+w/2+8,yy],[x+w/2,yy+8],[x+w/2-8,yy],[x+w/2,yy-8]],col[3],2)}
  if(A.images.materials){
   c.imageSmoothingEnabled=false
   for(let yy=y;yy<y+h;yy+=120)c.drawImage(A.images.materials,i%3*512+128,Math.floor(i/3)*512+110,256,402,x+2,yy,w-4,120)
  }
  c.restore()
 }
 for(const y of [p.topHeight-26,p.bottomY]){
  const x=Math.round(p.x-4),w=p.width+8;P.box(c,x,y,w,26,col[4],col[3]);c.fillStyle=col[5];c.fillRect(x+4,y+4,w-8,4)
  if(A.images.materials){c.save();c.imageSmoothingEnabled=false;c.drawImage(A.images.materials,i%3*512,Math.floor(i/3)*512,512,i===0?100:140,x+3,y+3,w-6,20);c.restore()}
  else for(let k=0;k<5;k++){c.fillStyle=k%2?col[2]:col[5];c.fillRect(x+5+k*11,y+9,6,4+(k%3)*3)}
 }
}
module.exports={themes,palettes,index,background,scenery,ground,pipe}
