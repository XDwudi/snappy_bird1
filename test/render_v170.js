// 离线调用真实 Canvas 渲染。需开发环境提供 @napi-rs/canvas；CJK_FONT 指向中文字体。
const fs = require('fs')
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas')
// 可选本机中文字体；渲染工具依赖不进入小游戏运行包。
if (process.env.CJK_FONT) {
  GlobalFonts.registerFromPath(process.env.CJK_FONT, 'sans-serif')
  GlobalFonts.registerFromPath(process.env.CJK_FONT, 'monospace')
}
const root=require('path').resolve(__dirname, '..')
const Game = require(root+'/game/core/Game.js')
const Monster = require(root+'/game/entities/Monster.js')
require(root+'/game/systems/GameLogger.js').enabled=false
const sheet=createCanvas(375*4,667+40);const c=sheet.getContext('2d')
c.fillStyle='#142635';c.fillRect(0,0,sheet.width,sheet.height)
const labels=['草地 · 叶刃预警','草地 · 俯冲预警','沙漠 · 沙墙预警','沙漠 · 穿越与反击']
for(let i=0;i<4;i++){
 const canvas=createCanvas(375,667),ctx=canvas.getContext('2d'),g=new Game(canvas,ctx,375,667,null)
 g.start();g.chapterSystem.index=i<2?0:1;g.chapterSystem._bossTriggered=true;g._spawnBoss();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.chapterSystem.startBossFight()
 g.bird.y=350;g.abilitySystem.selectAbility('feather_blade');g.abilitySystem.selectAbility('orbit_guard');g.abilitySystem.selectAbility('revenge_pulse')
 const b=g.boss;if(i===1)b.attackIndex=1
 b._beginAttack(g.bird)
 const n=i===3?135:30
 for(let f=0;f<n;f++){b.update(g.bird);for(const p of g.feathers)p.update();g.combat.update()}
 g.frameCount=120;g.render()
 c.drawImage(canvas,i*375,40);c.fillStyle='#fff';c.font='bold 16px sans-serif';c.fillText(labels[i],i*375+20,26)
}
fs.mkdirSync(root+'/docs/audits/v170',{recursive:true})
fs.writeFileSync(root+'/docs/audits/v170/boss-phases.png',sheet.toBuffer('image/png'))
const anim=createCanvas(600,180);const a=anim.getContext('2d');a.fillStyle='#344859';a.fillRect(0,0,600,180)
for(let i=0;i<6;i++){
 for(const type of ['bat','floater']){
  const m=new Monster(i*100+30,type==='bat'?60:135,type,180,{elite:i===5,sineAmp:1})
  for(let f=0;f<i*8;f++)m.update(0,{y:135})
  if(i===4)m.takeDamage(0)
  m.render(a)
 }
}
fs.writeFileSync(root+'/docs/audits/v170/monster-motion.png',anim.toBuffer('image/png'))
const Registry=require(root+'/game/abilities/AbilityRegistry.js')
const cards=createCanvas(320,568);const cardctx=cards.getContext('2d');const g=new Game(cards,cardctx,320,568,null)
g.start();g.state='upgrading';g._currentChoices=['feather_blade','orbit_guard','revenge_pulse','feather_blade','orbit_guard','revenge_pulse'].map(id=>Registry.get(id));g.render()
fs.writeFileSync(root+'/docs/audits/v170/cards-short-screen.png',cards.toBuffer('image/png'))
