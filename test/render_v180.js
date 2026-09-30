const fs=require('fs'),path=require('path')
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas')
if(process.env.CJK_FONT)for(const font of ['sans-serif','monospace'])GlobalFonts.registerFromPath(process.env.CJK_FONT,font)
const Game=require('../game/core/Game'),R=require('../game/abilities/AbilityRegistry')
require('../game/systems/GameLogger').enabled=false
const out=path.resolve(__dirname,'../docs/audits/v180');fs.mkdirSync(out,{recursive:true})
function game(w=375,h=667){const c=createCanvas(w,h),g=new Game(c,c.getContext('2d'),w,h,null);g.start();return {c,g}}
for(const active of [false,true]){
 const sheet=createCanvas(1125,1414),ctx=sheet.getContext('2d');ctx.fillStyle='#152435';ctx.fillRect(0,0,sheet.width,sheet.height)
 for(let i=0;i<6;i++){
  const {c,g}=game();g.chapterSystem._applyNextChapter(i);g.chapterSystem._transition=null
  g.chapterSystem.pipesPassed=g.chapterSystem.getChapter().triggerPipes;g.chapterSystem.chapterTime=g.chapterSystem.getChapter().minFrames
  g._spawnBoss();g.chapterSystem.startBossFight();const b=g.boss;b.x=b.homeX;b._setState('roam');g.bird.y=340
  b.attackIndex=active?2:0;b._beginAttack(g.bird)
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
