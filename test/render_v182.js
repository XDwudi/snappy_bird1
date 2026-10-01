const fs=require('fs'),path=require('path')
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas')
if(process.env.CJK_FONT)for(const font of ['sans-serif','monospace'])GlobalFonts.registerFromPath(process.env.CJK_FONT,font)
const Game=require('../game/core/Game'),R=require('../game/abilities/AbilityRegistry')
require('../game/systems/GameLogger').enabled=false
const out=path.resolve(__dirname,'../docs/audits/v182');fs.mkdirSync(out,{recursive:true})
function game(w=375,h=667){const c=createCanvas(w,h),g=new Game(c,c.getContext('2d'),w,h,null);g.start();return {c,g}}
for(const active of [false,true]){
 const sheet=createCanvas(1125,1414),ctx=sheet.getContext('2d');ctx.fillStyle='#152435';ctx.fillRect(0,0,sheet.width,sheet.height)
 for(let i=0;i<6;i++){
  const {c,g}=game();g.chapterSystem._applyNextChapter(i);g.chapterSystem._transition=null
  g.chapterSystem.pipesPassed=g.chapterSystem.getChapter().triggerPipes;g.chapterSystem.chapterTime=g.chapterSystem.getChapter().minFrames
  g._spawnBoss();g.chapterSystem.startBossFight();const b=g.boss;b.x=b.homeX;b._setState('roam');g.bird.y=340
  b.attackIndex=active?2:[0,5,0,2,5,1][i];b._beginAttack(g.bird)
  for(let f=0;f<(active?b.warnFrames+18:30);f++){b.update(g.bird);for(const p of g.feathers)p.update()}
  g.render();const x=i%3*375,y=Math.floor(i/3)*707
  ctx.drawImage(c,x,y+40);ctx.fillStyle='#fff';ctx.font='bold 17px sans-serif';ctx.fillText(g.chapterSystem.getChapter().name+' · '+b.name,x+16,y+25)
 }
 fs.writeFileSync(out+(active?'/boss-attacks.png':'/six-chapters.png'),sheet.toBuffer('image/png'))
}
const {c,g}=game(320,568);g.abilitySystem.chapter=6;g.state='upgrading';g._currentChoices=['seed_harvest','sand_lance','venom_thread','frost_shell','magma_core','singularity'].map(id=>R.get(id));g.render();fs.writeFileSync(out+'/cards-short-screen.png',c.toBuffer('image/png'))
const end=game();end.g.chapterSystem.index=5;for(let i=0;i<6;i++)end.g.chapterSystem.cleared.add(i);end.g.chapterSystem.enterEndless();end.g.chapterSystem.endlessFrames=9*3600;end.g.abilitySystem.chapter=6
for(const a of R.getAll())end.g.abilitySystem.selectAbility(a.id)
end.g.expSystem.level=128;end.g.chapterSystem.endlessBossIndex=0;end.g._spawnBoss();end.g.boss.x=end.g.boss.homeX;end.g.boss._setState('roam');end.g.chapterSystem.startBossFight();end.g.render();fs.writeFileSync(out+'/endless.png',end.c.toBuffer('image/png'))
console.log(out)

const Elite=require('../game/entities/EliteMonster')
const elites=createCanvas(1500,707),ec=elites.getContext('2d')
for(let i=0;i<4;i++){
 const {c,g}=game();g.bird.y=310;g.abilitySystem.maxHp=6;g.abilitySystem.hp=4;g.abilitySystem.tempHp=4;g.abilitySystem.blessingTempHpCapBonus=3
 const m=new Elite(260,310,'floater',587,{elite:true,eliteKind:['gunship','stormcaller','prism','bomber'][i],eliteTier:i<2?0:4,screenW:375,onHazard:h=>g.feathers.push(h),getPipes:()=>[]})
 g.monsters=[m];for(let f=0;f<245;f++)m.update(3,g.bird)
 if(i===1){g.weatherSystem.setElitePressure(true);for(const t of ['wind','rain'])g.weatherSystem._triggerEffect(t,g._buildGameCtx());for(let f=0;f<90;f++)g.weatherSystem.update(5000,g._buildGameCtx())}
 g.render();ec.fillStyle='#152435';ec.fillRect(i*375,0,375,707);ec.drawImage(c,i*375,40);ec.fillStyle='#fff';ec.font='bold 16px sans-serif';ec.fillText(m.name+' · 伴飞与击杀奖励',i*375+15,25)
}
fs.writeFileSync(out+'/elites.png',elites.toBuffer('image/png'))
const hearts=createCanvas(960,568),hc=hearts.getContext('2d')
for(let i=0;i<3;i++){
 const {c,g}=game(320,568);g.abilitySystem.maxHp=6;g.abilitySystem.hp=[6,4,1][i];g.abilitySystem.tempHp=[11,4,0][i];g.abilitySystem.blessingTempHpCapBonus=9
 g.abilitySystem.selectAbility('phoenix');g.abilitySystem.selectAbility('echo_wing');g.render();hc.drawImage(c,i*320,0)
}
fs.writeFileSync(out+'/hearts-short-screen.png',hearts.toBuffer('image/png'))

const intro=createCanvas(960,1136),ic=intro.getContext('2d')
for(let i=0;i<6;i++){const {c,g}=game(320,568);g.chapterSystem.index=i;g.chapterSystem._bossIntro={phase:'gather',frame:80};g.render();ic.drawImage(c,i%3*320,Math.floor(i/3)*568)}
fs.writeFileSync(out+'/boss-guides.png',intro.toBuffer('image/png'))
