// Visual semantics and state regressions. Uses real Canvas; no gameplay coefficients change.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path')
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas')
GlobalFonts.registerFromPath(process.env.CJK_FONT||'/System/Library/Fonts/STHeiti Medium.ttc','sans-serif')
const Game=require('../game/core/Game'),Art=require('../game/art/GameArt'),E=require('../game/art/Entities'),FX=require('../game/art/Effects'),I=require('../game/art/Icons'),P=require('../game/art/Pixel'),A=require('../game/art/Assets')
const Item=require('../game/entities/Item'),Rain=require('../game/weather/RainEffect'),Wind=require('../game/weather/WindEffect'),R=require('../game/abilities/AbilityRegistry'),Config=require('../game/config/GameConfig')
require('../game/systems/GameLogger').enabled=false
const out=path.resolve(__dirname,process.env.ART_OUTPUT||'../docs/audits/v185');fs.mkdirSync(out,{recursive:true})
let count=0;function test(name,fn){fn();count++;console.log('✓ '+name)}
function make(w=390,h=844,top=47,inset=34){const c=createCanvas(w,h),ctx=c.getContext('2d'),g=new Game(c,ctx,w,h,{top,bottom:h-inset});g.start();g.frameCount=240;g.gameTime=3600;g.bird.y=h*.44;return{c,ctx,g}}
function weather(g,type){g.weatherSystem._triggerEffect(type,g._buildGameCtx());const e=g.weatherSystem.activeEffects.find(v=>v.type===type);e.elapsed=e.duration/2;if(type==='rain')e.rainLevel=64;if(type==='wind'){e.isVertical=false;e.direction=1;e.currentForce=.1}g.floatingTexts=[];return e}
function save(c,name){fs.writeFileSync(path.join(out,name+'.png'),c.toBuffer('image/png'))}
async function main(){
 for(const [key,file] of Object.entries(A.files))A.images[key]=await loadImage(path.resolve(__dirname,'..',file))
 test('1.8.5；五补给与武器/磁吸/机关使用真实物体图形，所有卡牌映射有效',()=>{
  assert.equal(Config.VERSION,'1.8.6')
  for(const [id,glyph] of Object.entries({missile:'missile',shield_pack:'shield',health_pack:'heart',exp_pack:'crystal',speed_pack:'clock',magnet:'magnet',sand_lance:'spear',frost_lance:'spear',iron_beak:'beak',raincoat:'umbrella',venom_thread:'skull'}))assert.equal(I.spec[id].glyph,glyph)
  for(const def of R.getAll()){assert.ok(I.glyphs[I.spec[def.id].glyph]);assert.equal(I.spec[def.id].mark,undefined)}
  for(const rows of Object.values(I.glyphs))assert.ok(rows.every(row=>row.length<=10))
 })
 test('0–7层护盾逐层完整闭环，读数一致；守卫不伪装成额外护盾',()=>{
  const {g,ctx}=make(),arc=ctx.arc.bind(ctx),arcs=[];ctx.arc=(...args)=>{arcs.push(args);arc(...args)}
  for(let n=0;n<=7;n++){arcs.length=0;E.bird(ctx,g.bird,n);assert.equal(arcs.length,n);for(let i=0;i<n;i++){assert.equal(arcs[i][4]-arcs[i][3],Math.PI*2);if(i)assert.equal(arcs[i][2]-arcs[i-1][2],6)}}
  g.abilitySystem.selectAbility('orbit_guard');arcs.length=0;E.combat(ctx,g.combat);assert.ok(arcs.every(a=>a[4]-a[3]<Math.PI))
  const texts=[],fill=ctx.fillText.bind(ctx);ctx.fillText=(s,...args)=>{texts.push(s);fill(s,...args)};g.abilitySystem.shieldLayers=7;g.abilitySystem.maxShieldLayers=7;Art.hud(g);assert.ok(texts.includes('护盾 7/7'))
 })
 test('雨从触发即覆盖战区；Boss冻结计时仍有动画；停雨后不再绘制落雨',()=>{
  const {ctx,g}=make(),rain=weather(g,'rain'),gc=g._buildGameCtx();gc.artTop=Art.layout(g).headerBottom;gc.artFrame=0
  rain.elapsed=0;FX.rain(ctx,rain,390,844,gc);assert.ok(ctx.getImageData(0,200,390,300).data.some(v=>v))
  assert.ok(!ctx.getImageData(0,0,390,gc.artTop).data.some(v=>v));assert.ok(!ctx.getImageData(0,764,390,80).data.some(v=>v))
  const first=Buffer.from(ctx.getImageData(0,0,390,844).data);ctx.clearRect(0,0,390,844);gc.artFrame=30;FX.rain(ctx,rain,390,844,gc);assert.ok(!first.equals(Buffer.from(ctx.getImageData(0,0,390,844).data)))
  ctx.clearRect(0,0,390,844);rain.active=false;rain.splashParticles=[];FX.rain(ctx,rain,390,844,gc);assert.ok(!ctx.getImageData(0,0,390,844).data.some(v=>v));g.weatherSystem.activeEffects=[];g.weatherSystem.rainResidual=rain;assert.match(FX.weatherStatus(g).join(' '),/残水64%/)
 })
 test('上/下/左/右风箭头轴与方向正确，文案对应真实作用及免疫/驯化',()=>{
  const {ctx,g}=make(),wind=weather(g,'wind'),orig=P.path
  for(const vertical of [false,true])for(const dir of [-1,1]){
   wind.isVertical=vertical;wind.direction=dir;const paths=[];P.path=(c,pts,...rest)=>{paths.push(pts);orig(c,pts,...rest)}
   try{FX.wind(ctx,wind,390,844,g._buildGameCtx())}finally{P.path=orig}
   const line=paths[0],dx=line[1][0]-line[0][0],dy=line[1][1]-line[0][1];assert.equal(Math.sign(vertical?dy:dx),dir);assert.equal(vertical?dx:dy,0)
   assert.match(FX.weatherStatus(g).join(' '),new RegExp(vertical?(dir<0?'↑上风':'↓下风'):(dir<0?'←左风减速':'→右风加速')))
  }
  g.abilitySystem.weatherImmuneUntil=g.gameTime+60;assert.match(FX.weatherStatus(g).join(' '),/免疫/);assert.doesNotMatch(FX.weatherStatus(g).join(' '),/加速|减速/)
  g.abilitySystem.weatherImmuneUntil=0;g.weatherSystem.tamedWeather='wind';assert.match(FX.weatherStatus(g).join(' '),/驯化/)
  g.weatherSystem.frozen=true;assert.match(FX.weatherStatus(g).join(' '),/持续/)
 })
 test('渲染不消耗随机数/改动天气与护盾；氛围在敌人下方、实体冰雹只绘制一次',()=>{
  const {g,ctx}=make(),rain=weather(g,'rain'),wind=weather(g,'wind');weather(g,'hail');g.abilitySystem.shieldLayers=5;g.abilitySystem.maxShieldLayers=7
  const hail=g.weatherSystem.activeEffects.find(e=>e.type==='hail');let hailDraws=0;hail.hailstones=[{render(){hailDraws++}}]
  const original=Math.random,before=JSON.stringify([rain,wind,g.abilitySystem.shieldLayers]);g.monsters=[{render(c){c.fillStyle='#ff00ff';c.fillRect(200,200,16,16)}}]
  try{Math.random=()=>{throw Error('render RNG')};g.render()}finally{Math.random=original}
  assert.equal(JSON.stringify([rain,wind,g.abilitySystem.shieldLayers]),before);assert.equal(hailDraws,1);assert.deepEqual([...ctx.getImageData(208,208,1,1).data],[255,0,255,255])
 })
 test('护盾拾取和抵挡反馈按真实结果：加层、满盾、恢复冷却、溢出生命',()=>{
  const {g}=make(),a=g.abilitySystem,pick=()=>{g.floatingTexts=[];g._collectItem({type:'shield_pack'});return g.floatingTexts.map(t=>t.text).join(' ')}
  a.shieldLayers=0;assert.match(pick(),/护盾\+1/);assert.equal(a.shieldLayers,1);assert.match(pick(),/护盾已满/)
  a.shieldLayers=0;a.renewalInterval=90;a.renewalCD=60;assert.match(pick(),/补给冷却中/);assert.equal(a.shieldLayers,0)
  a.renewalCD=0;a.renewalInterval=0;a.shieldLayers=a.maxShieldLayers;a.owned.set('aegis_overdrive',3);assert.match(pick(),/满盾转临时生命/);assert.equal(a.tempHp,1)
 })
 test('六章×四屏，密集天气/机关信息仍至少9px，不把文字挤成不可辨小字',()=>{
  for(const [w,h,top,inset] of [[320,568,20,0],[375,667,20,20],[390,844,47,34],[430,932,59,34]])for(let ch=0;ch<6;ch++){
   const {g,ctx}=make(w,h,top,inset);g.chapterSystem._applyNextChapter(ch);g.chapterSystem._transition=null;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('telegraph');g.boss.skill=g.boss.variant.skills[5];g.boss.comboLength=3;g.boss.comboStep=2;g.boss.piercingAttack=true
   for(const t of ['rain','wind','hail'])weather(g,t);g.abilitySystem.hp=1
   const fill=ctx.fillText.bind(ctx);ctx.fillText=(s,...args)=>{const size=Number(ctx.font.match(/([\d.]+)px/)[1]);assert.ok(size>=9,w+' '+s+' '+size);fill(s,...args)}
   for(const skill of g.boss.variant.skills)for(const immune of [false,true]){g.boss.skill=skill;g.abilitySystem.weatherImmuneUntil=immune?g.gameTime+60:0;Art.footer(g)}
  }
 })
 // Review panels use actual game rendering and actual assets.
 const overview=createCanvas(1170,844),ox=overview.getContext('2d')
 for(let i=0;i<3;i++){
  const {g,c}=make();g.score=128;g.expSystem.level=8
  if(i===0){g.abilitySystem.shieldLayers=3;g.abilitySystem.maxShieldLayers=3;weather(g,'rain');weather(g,'wind');g.abilitySystem.selectAbility('orbit_guard')}
  if(i===1){g.chapterSystem._applyNextChapter(0);g.chapterSystem._transition=null;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.boss.mechanics.cycleStart();g.abilitySystem.shieldLayers=7;g.abilitySystem.maxShieldLayers=7}
  if(i===2)g.items=['missile','health_pack','shield_pack','exp_pack','speed_pack'].map((id,k)=>new Item(250,220+k*90,id))
  g.render();ox.drawImage(c,i*390,0)
 }save(overview,'overview')
 const shields=createCanvas(960,400),sx=shields.getContext('2d')
 for(const [i,n] of [0,1,2,3,5,7].entries()){sx.fillStyle=i%2?'#89bfdd':'#22384d';sx.fillRect(i%3*320,Math.floor(i/3)*200,320,200);const {g}=make();g.bird.x=i%3*320+160;g.bird.y=Math.floor(i/3)*200+100;E.bird(sx,g.bird,n);P.text(sx,n+'层护盾',g.bird.x,g.bird.y+80,14,P.C.paper,'center',true)}save(shields,'shield-layers')
 const winds=createCanvas(1280,568),wx=winds.getContext('2d')
 for(let i=0;i<4;i++){const {g,c}=make(320,568,20,0),e=weather(g,'wind');e.isVertical=i<2;e.direction=i%2?1:-1;g.render();wx.drawImage(c,i*320,0)}save(winds,'wind-directions')
 console.log(count+' v1.8.5 visual tests passed')
}
main().catch(e=>{console.error(e);process.exitCode=1})
