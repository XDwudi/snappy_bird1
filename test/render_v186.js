// Real Canvas checks for audit A01 and the clarified card descriptions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas')
const Game=require('../game/core/Game'),Assets=require('../game/art/Assets'),Art=require('../game/art/GameArt')
const R=require('../game/abilities/AbilityRegistry'),cast=require('../game/entities/BossPatterns')
require('../game/systems/GameLogger').enabled=false
GlobalFonts.registerFromPath(process.env.CJK_FONT||'/System/Library/Fonts/STHeiti Medium.ttc','sans-serif')
const out=path.resolve(__dirname,process.env.ART_OUTPUT||'../docs/audits/v186');fs.mkdirSync(out,{recursive:true})
const screens=[[320,568,20,0],[375,667,20,20],[390,844,47,34],[430,932,59,34]]
function make([w,h,top,inset],ch=0){const c=createCanvas(w,h),ctx=c.getContext('2d'),g=new Game(c,ctx,w,h,{top,bottom:h-inset});g.start();g.chapterSystem._applyNextChapter(ch);g.chapterSystem._transition=null;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.boss.mechanics.cycleStart();return{c,ctx,g}}
function save(c,name){fs.writeFileSync(path.join(out,name+'.png'),c.toBuffer('image/png'))}
let count=0;function test(name,fn){fn();count++;console.log('✓ '+name)}
async function main(){
 for(const [key,file] of Object.entries(Assets.files))Assets.images[key]=await loadImage(path.resolve(__dirname,'..',file))
 test('四屏：磁轨/阀口/移动墙预警与生效覆盖顶部，缺口无碰撞也无填充',()=>{
  for(const screen of screens)for(const [ch,kind] of [[5,'rail_switch'],[4,'vent_burst'],[1,'gate']]){
   const {c,ctx,g}=make(screen,ch);g.bird.y=80;cast(g.boss,g.bird,{kind})
   for(const h of g.feathers){
    if(h.kind==='gate')h.x=g.bird.x
    for(const warning of [true,false]){
     ctx.clearRect(0,0,c.width,c.height);h.age=warning?h.warn-1:h.warn;h.render(ctx)
     const x=Math.round(h.kind==='column'?h.x:h.x+h.width/2)
     for(const y of [5,40,80,120,c.height-100]){
      const bird={x,y,collisionWidth:2,collisionHeight:2},alpha=ctx.getImageData(x,y,1,1).data[3]
      if(y<h.topHeight-2||y>h.bottomY+2){assert.ok(alpha>0,kind+' invisible '+y);assert.equal(h.checkCollision(bird),!warning)}
     }
     const mid=(h.topHeight+h.bottomY)/2
     assert.equal(h.checkCollision({x,y:mid,collisionWidth:2,collisionHeight:2}),false)
     assert.equal(ctx.getImageData(x,Math.round(mid),1,1).data[3],0)
    }
   }
  }
 })
 test('危险物位于顶部HUD前景：真实Game渲染保留y=80危险纹理',()=>{
  for(const screen of screens)for(const [ch,kind] of [[5,'rail_switch'],[4,'vent_burst']]){
   const {ctx,g}=make(screen,ch);g.bird.y=80;cast(g.boss,g.bird,{kind})
   // Move the bird away after casting to inspect unobscured hazard pixels.
   g.bird.y=350;const h=g.feathers[0],x=Math.round(h.x)
   for(const warning of [true,false]){
    h.age=warning?h.warn-1:h.warn;g.render();const visible=Buffer.from(ctx.getImageData(x-2,75,4,10).data)
    const hazards=g.feathers;g.feathers=[];g.render();const background=Buffer.from(ctx.getImageData(x-2,75,4,10).data);g.feathers=hazards
    assert.ok(!visible.equals(background),kind+' masked by HUD')
   }
  }
 })
 const sheet=createCanvas(1280,568),sc=sheet.getContext('2d')
 for(let i=0;i<4;i++){
  const {c,g}=make(screens[0],i<2?4:5);g.bird.y=80;const kind=i<2?'vent_burst':'rail_switch';cast(g.boss,g.bird,{kind})
  const age=g.feathers[0].warn-(i%2?0:1)
  for(const h of g.feathers)h.age=age
  g.boss.skill=g.boss.variant.skills.find(s=>s.kind===kind);g.render();sc.drawImage(c,i*320,0)
 }save(sheet,'top-hazards')
 test('修订卡面在短屏完整显示效果文本，长说明仍可滚动触达',()=>{
  const ids=['seed_harvest','chapter_master','missile_link','trophy_wall','blood_pact','phoenix','teleport','berserk','storm_child']
  const cards=createCanvas(960,1704),cc=cards.getContext('2d')
  for(let i=0;i<ids.length;i++){
   const {c,ctx,g}=make(screens[0]);g.boss=null;g.state='upgrading';g._currentChoices=[R.get(ids[i])]
   const texts=[],fill=ctx.fillText.bind(ctx);ctx.fillText=(s,x,y,...rest)=>{texts.push({s,x,y});fill(s,x,y,...rest)}
   Art.upgrade(g);const card=g._cardBounds[0]
   const effect=texts.filter(t=>t.y>=card.y+70&&t.y<g.safeBottom-25)
   assert.ok(effect.length>0)
   assert.ok(effect.every(t=>t.y+8<card.y+card.h),ids[i]+' clipped text')
   g.render();cc.drawImage(c,i%3*320,Math.floor(i/3)*568)
  }
  save(cards,'clarified-cards')
  const {g}=make(screens[0]);g.boss=null;g.state='upgrading';g._currentChoices=ids.slice(0,6).map(id=>R.get(id));g.render()
  assert.ok(g._choiceScrollMax>0);g._choiceScroll=g._choiceScrollMax;g.render()
  assert.ok(g._cardBounds.some(b=>b.id==='phoenix'))
 })
 console.log(count+' v1.8.6 Canvas tests passed')
}
main().catch(e=>{console.error(e);process.exitCode=1})
