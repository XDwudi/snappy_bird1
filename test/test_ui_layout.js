// Offline Canvas layout regression. NODE_PATH must provide @napi-rs/canvas.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path')
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas')
const font=process.env.CJK_FONT||'/System/Library/Fonts/STHeiti Medium.ttc'
if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'sans-serif')
const Game=require('../game/core/Game'),Art=require('../game/art/GameArt'),A=require('../game/art/Assets'),R=require('../game/abilities/AbilityRegistry')
const Monster=require('../game/entities/Monster')
require('../game/systems/GameLogger').enabled=false
const screens=[[320,568,20,0],[375,667,20,20],[390,844,47,34],[430,932,59,34]]
const out=path.resolve(__dirname,'../docs/audits/v184-ui');fs.mkdirSync(out,{recursive:true})
let count=0
function test(name,fn){fn();count++;console.log('✓ '+name)}
function make([w,h,top,inset],chapter=0){const c=createCanvas(w,h),ctx=c.getContext('2d'),g=new Game(c,ctx,w,h,{top,bottom:h-inset});g.start();g.chapterSystem._applyNextChapter(chapter);g.chapterSystem._transition=null;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.boss.mechanics.cycleStart();g.bird.y=280;return {c,ctx,g}}
function pixel(ctx,x,y){return [...ctx.getImageData(x,y,1,1).data]}
async function main(){
 for(const [key,file] of Object.entries(A.files))A.images[key]=await loadImage(path.resolve(__dirname,'..',file))
 test('六章×四屏：顶部HUD止于机关血条上方，底栏绝不侵入战斗区/系统手势区',()=>{
  for(const screen of screens)for(let ch=0;ch<6;ch++){
   const {c,ctx,g}=make(screen,ch),l=Art.layout(g);Art.hud(g)
   const upper=ctx.getImageData(0,l.headerBottom,c.width,c.height-l.headerBottom).data;assert.ok(!upper.some(v=>v),'header spills below layout')
   assert.ok(l.headerBottom<=130);assert.ok(l.headerBottom<190-30)
   ctx.clearRect(0,0,c.width,c.height);g.abilitySystem.hp=1;g.weatherSystem.tamedWeather='wind';for(const t of ['wind','rain','hail'])g.weatherSystem._triggerEffect(t,g._buildGameCtx());Art.footer(g)
   assert.ok(!ctx.getImageData(0,0,c.width,l.ground).data.some(v=>v),'footer covers battlefield')
   if(l.bottom<c.height)assert.ok(!ctx.getImageData(0,l.bottom,c.width,c.height-l.bottom).data.some(v=>v),'footer covers system area')
  }
 })
 test('召唤物和玩家进入HUD区域仍优先可见；震屏时也不被面板覆盖',()=>{
  for(const screen of screens)for(const shake of [0,4]){
   const {ctx,g}=make(screen),y=g.safeTop+50
   g.shakeFrames=shake;g.shakeIntensity=0
   g.monsters=[{render(c){c.fillStyle='#ff00ff';c.fillRect(22,y,14,14)}}]
   g.bird.render=c=>{c.fillStyle='#00ffff';c.fillRect(45,y,14,14)}
   g.render();assert.deepEqual(pixel(ctx,28,y+6),[255,0,255,255]);assert.deepEqual(pixel(ctx,51,y+6),[0,255,255,255])
  }
 })
 test('刘海短屏的首关上树根完整保留：绘制HUD与否，目标区域像素一致',()=>{
  for(const screen of screens){const {c,ctx,g}=make(screen),root=g.boss.mechanics.nodes[0];g.render();const withHUD=Buffer.from(ctx.getImageData(root.x-6,root.y-30,46,55).data);g._drawHUD=()=>{};g.render();assert.ok(withHUD.equals(Buffer.from(ctx.getImageData(root.x-6,root.y-30,46,55).data)))}
 })
 test('低血/三天气/穿盾与Boss说明同开不越界，技能栏在空间不足时让位',()=>{
  const {g}=make(screens[2]);g.abilitySystem.hp=1;g.abilitySystem.chapter=6;for(const d of R.getAll())g.abilitySystem.selectAbility(d.id);for(const t of ['wind','rain','hail'])g.weatherSystem._triggerEffect(t,g._buildGameCtx());g.render();assert.equal(g._artInventoryBounds,null)
  const plain=make(screens[0]);plain.g.abilitySystem.selectAbility('feather_blade');plain.g.render();assert.ok(plain.g._artInventoryBounds);assert.ok(plain.g._artInventoryBounds.y>=Art.layout(plain.g).ground)
 })
 test('密集通知不叠字，不压住玩家/小怪/树根，也不侵入上下HUD',()=>{
  const {g}=make(screens[2]),root=g.boss.mechanics.nodes[0]
  for(let i=0;i<9;i++)g._addFloatingText(root.x,root.y,'提示 '+i,'#fff',50)
  const before=JSON.stringify(g.floatingTexts);g.render();assert.equal(JSON.stringify(g.floatingTexts),before)
  const bounds=g._artFloatingBounds;assert.ok(bounds.length>0&&bounds.length<=6)
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y
  bounds.forEach((r,i)=>{assert.ok(r.y>Art.layout(g).headerBottom&&r.y+r.h<Art.layout(g).ground);assert.ok(!overlap(r,{x:root.x,y:root.y-30,w:30,h:55}));assert.ok(!bounds.slice(i+1).some(b=>overlap(r,b)))})
 })
 // Review real assets, top/bottom summons, weather, all chapters and modal states.
 const sheet=createCanvas(1170,1688),sc=sheet.getContext('2d')
 for(let ch=0;ch<6;ch++){
  const {c,g}=make(screens[2],ch);g.score=128;g.expSystem.level=18
  g.monsters=[new Monster(145,164,'bat',g.screenH-80),new Monster(170,g.screenH-112,'floater',g.screenH-80)]
  for(const t of ['rain','wind','hail'])g.weatherSystem._triggerEffect(t,g._buildGameCtx())
  g.abilitySystem.selectAbility('feather_blade');g.abilitySystem.hp=1;g.render();sc.drawImage(c,ch%3*390,Math.floor(ch/3)*844)
  if(ch===0)fs.writeFileSync(path.join(out,'chapter-1-notch.png'),c.toBuffer('image/png'))
 }
 fs.writeFileSync(path.join(out,'six-chapters.png'),sheet.toBuffer('image/png'))
 const sizes=createCanvas(1515,932),sx=sizes.getContext('2d');let x=0
 for(const screen of screens){const {c,g}=make(screen);g.monsters=[new Monster(160,164,'bat',g.screenH-80)];g.render();sx.drawImage(c,x,0);x+=screen[0]}
 fs.writeFileSync(path.join(out,'four-screens.png'),sizes.toBuffer('image/png'))
 const modes=createCanvas(1600,568),mx=modes.getContext('2d')
 for(let i=0;i<5;i++){const {c,g}=make(screens[0]);if(i===0)g.backToReady();if(i===1){g.state='upgrading';g._currentChoices=R.getAll().slice(0,6)}if(i===2)g.chapterSystem._bossIntro={phase:'gather',frame:20};if(i===3)g.chapterSystem._transition={phase:'title',frame:35,toIndex:1};if(i===4){g.state='gameover';g.bossClears=[{chapter:1,method:'kill'}]}g.render();mx.drawImage(c,i*320,0)}
 fs.writeFileSync(path.join(out,'modal-layouts.png'),modes.toBuffer('image/png'))
 console.log(count+' UI layout tests passed')
}
main().catch(e=>{console.error(e);process.exitCode=1})
