const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const Game=require('../game/core/Game'),R=require('../game/abilities/AbilityRegistry'),C=require('../game/config/GameConfig')
const Art=require('../game/art/GameArt'),A=require('../game/art/Assets'),I=require('../game/art/Icons'),P=require('../game/art/Pixel')
const Pipe=require('../game/entities/Pipe'),Wall=require('../game/entities/SandWall'),Hazard=require('../game/entities/BossHazard')
require('../game/systems/GameLogger').enabled=false
let n=0;function test(name,fn){fn();console.log('✓ '+name);n++}
function context(){const calls=[],stack=[],state={globalAlpha:1};return new Proxy(state,{get(o,k){if(k==='calls')return calls;if(k in o)return o[k];if(k==='measureText')return s=>({width:String(s).length*11});if(k==='save')return()=>stack.push({...o});if(k==='restore')return()=>Object.assign(o,stack.pop());return(...args)=>{for(const x of args)if(typeof x==='number')assert.ok(Number.isFinite(x),k+' has non-finite argument');calls.push([k,...args])}},set(o,k,v){if(k==='globalAlpha')assert.ok(Number.isFinite(v));o[k]=v;return true}})}
function game(w=375,h=667,safe=null){const c=context(),g=new Game({},c,w,h,safe);g.start();return g}
function choices(g,count){g.state='upgrading';g._currentChoices=R.getAll().slice(0,count);g.render()}
function state(g){return JSON.stringify({bird:[g.bird.x,g.bird.y,g.bird.velocity,g.bird.collisionWidth,g.bird.collisionHeight],hp:[g.abilitySystem.hp,g.abilitySystem.tempHp,g.abilitySystem.shieldLayers],owned:[...g.abilitySystem.owned],time:[g.gameTime,g.bossFightFrames,g.frameCount],xp:[g.expSystem.level,g.expSystem.exp],boss:g.boss&&[g.boss.x,g.boss.y,g.boss.hp,g.boss.state,g.boss.stateT,g.boss.attackIndex],hazards:g.feathers.map(f=>[f.x,f.y,f.age,f.warn,f.radius]),pipes:g.pipes.map(p=>[p.x,p.topHeight,p.bottomY,p.gap])})}
test('版本与运行包：全部四张PNG在项目中，RGBA解码预算24MiB，运行文件低于7MiB（给上传限制预留空间）',()=>{
 assert.equal(C.VERSION,'1.8.3');let total=0,decoded=0
 function size(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())size(f);else total+=fs.statSync(f).size}}
 size(path.join(__dirname,'../art-extra'));size(path.join(__dirname,'../game'));size(path.join(__dirname,'../utils'));total+=fs.statSync(path.join(__dirname,'../game.js')).size
 for(const f of Object.values(A.files)){const b=fs.readFileSync(path.join(__dirname,'..',f));assert.equal(b.toString('ascii',1,4),'PNG');decoded+=b.readUInt32BE(16)*b.readUInt32BE(20)*4}
 assert.ok(total<7*1024*1024);assert.equal(decoded,24*1024*1024);console.log('  Runtime bytes '+total+'; decoded atlas bytes '+decoded)
})
test('资源仅加载一次；未加载/失败有回退，成功后使用本地图集',()=>{
 const filename=require.resolve('../game/art/Assets');delete require.cache[filename];const fresh=require(filename),imgs=[];fresh.init(()=>{const img={};imgs.push(img);return img});fresh.init(()=>{throw Error('duplicate load')});assert.equal(imgs.length,4)
 const c=context();assert.equal(fresh.draw(c,'bird0',0,0,32,28),false);imgs[0].onload();assert.equal(fresh.draw(c,'bird0',0,0,32,28),true);imgs[2].onerror();assert.equal(fresh.errors.bosses,true);assert.equal(fresh.draw(c,'meadow',0,0,80,80),false)
})
test('分包成功前只加载主包；成功后再读分包图片；失败仍保留主包和绘制回退',()=>{
 const filename=require.resolve('../game/art/Assets')
 for(const success of [true,false]){
  delete require.cache[filename];const fresh=require(filename),imgs=[];let request
  fresh.init(()=>{const img={};imgs.push(img);return img},opts=>request=opts)
  assert.equal(request.name,'art-extra');assert.equal(imgs.length,2);assert.ok(imgs.every(v=>v.src.startsWith('game/assets/')))
  assert.equal(fresh.draw(context(),'meadow',0,0,80,80),false)
  if(success){request.success();assert.equal(imgs.length,4);assert.ok(imgs.slice(2).every(v=>v.src.startsWith('art-extra/')));imgs[2].onload();assert.equal(fresh.draw(context(),'meadow',0,0,80,80),true)}
  else{request.fail();assert.equal(imgs.length,2);assert.equal(fresh.errors.extra,true);imgs[0].onload();assert.equal(fresh.draw(context(),'bird0',0,0,32,28),true);assert.equal(fresh.draw(context(),'meadow',0,0,80,80),false)}
 }
 const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../game.json'),'utf8'));assert.ok(config.subpackages.some(p=>p.name==='art-extra'&&fs.existsSync(path.join(__dirname,'..',p.root,'game.js'))))
})
test('角色与Boss裁切均在图集内，三帧小鸟/四精英/六Boss齐全',()=>{
 assert.equal(Object.keys(A.rects).length,14)
 for(const r of Object.values(A.rects)){const b=fs.readFileSync(path.join(__dirname,'..',A.files[r[0]]));assert.ok(r[1]>=0&&r[2]>=0&&r[3]>0&&r[4]>0);assert.ok(r[1]+r[3]<=b.readUInt32BE(16)&&r[2]+r[4]<=b.readUInt32BE(20))}
})
test('73张能力全部有专属图标映射和颜色，语义组合不重复',()=>{
 const seen=new Set();assert.equal(R.getAll().length,73)
 for(const d of R.getAll()){const s=I.spec[d.id];assert.ok(s&&s.color,d.id);const key=s.glyph+':'+s.mark;assert.ok(!seen.has(key),d.id);seen.add(key);I.draw(context(),d.id,20,20,24)}
})
test('三屏全部73张卡的满级效果全文绘制，数值文案没有省略',()=>{
 for(const w of [320,375,430])for(const d of R.getAll()){const c=context(),level=Math.max(0,d.maxLevel-1),full=d.effectText(level+1),lines=P.lines(c,full,w-58,11);Art.card(c,{x:16,y:90,w:w-32,h:86+lines.length*15},d,level,{})
 const drawn=c.calls.filter(v=>v[0]==='fillText').map(v=>v[1]);for(const l of lines)assert.ok(drawn.includes(l),d.id+': '+l)}
})
test('3/4/6选一在短屏与刘海屏所有选项可滚到、点击框不越过裁切区',()=>{
 for(const [w,h,top,inset] of [[320,568,12,0],[375,667,20,20],[390,844,47,34]])for(const count of [3,4,6]){const g=game(w,h,{top,bottom:h-inset});choices(g,count);const found=new Set()
 for(let y=0;y<=g._choiceScrollMax+40;y+=40){g._choiceScroll=Math.min(y,g._choiceScrollMax);g.render();for(const b of g._cardBounds){assert.ok(b.y>=g._choiceViewport.y);assert.ok(b.y+b.h<=g.safeBottom-23);assert.ok(b.h>=0);found.add(b.id)}}assert.equal(found.size,count)}
})
test('选卡在抬手时触发一次；滑动不选卡；取消/更换卡组不误选',()=>{
 const g=game(320,568);choices(g,6);let selected=[];g.selectAbility=id=>selected.push(id);const b=g._cardBounds[0],x=b.x+20,y=b.y+30
 g.handleTouchStart(x,y);assert.equal(selected.length,0);g.handleTouchEnd(x,y);assert.deepEqual(selected,[b.id]);selected=[]
 g.handleTouchStart(x,y);g.handleTouchMove(x,y-120);g.handleTouchEnd(x,y-120);assert.equal(selected.length,0);assert.ok(g._choiceScroll>0)
 g.render();g.handleTouchStart(x,y);g.handleTouchCancel();g.handleTouchEnd(x,y);assert.equal(selected.length,0)
 g.handleTouchStart(x,y);g._currentChoices=R.getAll().slice(6,9);g.handleTouchEnd(x,y);assert.equal(selected.length,0);g.render();assert.equal(g._choiceScroll,0)
})
test('飞行触摸保持按下即拍翅，抬手不重复触发',()=>{const g=game();let count=0;g.flap=()=>count++;g.handleTouchStart(10,200);assert.equal(count,1);g.handleTouchMove(10,100);g.handleTouchEnd(10,100);assert.equal(count,1)})
test('底部能力图标与结算按钮全部避开34px系统安全区',()=>{
 for(const [w,h] of [[320,568],[390,844]]){const g=game(w,h,{top:47,bottom:h-34});g.abilitySystem.selectAbility('feather_blade');g.render();assert.ok(g._artDockTop+46<=g.safeBottom)
 g.state='gameover';g.render();for(const b of [g._homeBtnBounds,g._restartBtnBounds]){assert.ok(b.y+b.h<=g.safeBottom);assert.ok(b.x+b.w<=w)}let action='';g.restart=()=>action='restart';g.backToReady=()=>action='home';g.handleTouchStart(1,1);assert.equal(action,'');for(const [key,expected] of [['_restartBtnBounds','restart'],['_homeBtnBounds','home']]){const b=g[key];g.handleTouchStart(b.x+10,b.y+10);assert.equal(action,expected)}}
})
test('图集缺失时六章/Boss/全部天气/实体可绘制，渲染不耗随机数、不改变战斗状态',()=>{
 const random=Math.random
 for(let ch=0;ch<6;ch++){const g=game();g.chapterSystem._applyNextChapter(ch);g.chapterSystem._transition=null;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.boss.mechanics.cycleStart();g.pipes=[new Pipe(240,180,212,587)];for(const type of ['rain','wind','hail'])g.weatherSystem._triggerEffect(type,g._buildGameCtx());g._screenShake=0;const before=state(g)
 try{Math.random=()=>{throw Error('render consumes gameplay RNG')};for(let k=0;k<3;k++)g.render()}finally{Math.random=random}assert.equal(state(g),before)}
})
test('HUD不出现undefined/NaN，羽盾凤凰天气与章节信息可读',()=>{
 const g=game();for(const id of ['echo_wing','phoenix','combo_heart'])g.abilitySystem.selectAbility(id);g.abilitySystem.comboCount=3;g.weatherSystem._triggerEffect('rain',g._buildGameCtx());g.render();const text=g.ctx.calls.filter(v=>v[0]==='fillText').map(v=>v[1]).join(' ');assert.ok(!/undefined|NaN/.test(text));assert.ok(text.includes('×'));assert.ok(text.includes('连击'))
})
test('沙墙与管道绘制不改变碰撞结果；穿盾预警始终不提前伤人',()=>{
 const g=game();for(const p of [new Pipe(g.bird.x,180,212,587),new Wall(g.bird.x,587,280,212)]){g.bird.y=280;const gap=p.checkCollision(g.bird);g.bird.y=100;const solid=p.checkCollision(g.bird);p.render(g.ctx);g.bird.y=280;assert.equal(p.checkCollision(g.bird),gap);g.bird.y=100;assert.equal(p.checkCollision(g.bird),solid);assert.equal(gap,false);assert.equal(solid,true)}
 const f=new Hazard({kind:'beam',y:300,piercing:true,warn:90,radius:22});g.bird.y=300;f.age=89;f.render(g.ctx);assert.equal(f.checkCollision(g.bird),false);f.age=90;f.render(g.ctx);assert.equal(f.checkCollision(g.bird),true)
})
console.log('v1.8.3: '+n+' tests passed')
