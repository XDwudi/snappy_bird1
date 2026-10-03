const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas'),Game=require('../game/core/Game'),Art=require('../game/art/GameArt'),Assets=require('../game/art/Assets'),R=require('../game/abilities/AbilityRegistry')
require('../game/systems/GameLogger').enabled=false
GlobalFonts.registerFromPath(process.env.CJK_FONT||'/System/Library/Fonts/STHeiti Medium.ttc','sans-serif')
const out=path.resolve('docs/audits/v190'),screens=[[320,568,20,0],[375,667,20,20],[390,844,47,34],[430,932,59,34]];fs.mkdirSync(out,{recursive:true})
function make([w,h,top,inset]){const c=createCanvas(w,h),g=new Game(c,c.getContext('2d'),w,h,{top,bottom:h-inset});g.start();return {c,g}}
function save(c,name){fs.writeFileSync(path.join(out,name+'.png'),c.toBuffer('image/png'))}
async function main(){for(const [key,file] of Object.entries(Assets.files))Assets.images[key]=await loadImage(path.resolve(file))
 let assertions=0
 for(const screen of screens){const {c,g}=make(screen),w=c.width;g.abilitySystem.chapter=6;g.abilitySystem.selectAbility('lucky');g.abilitySystem.selectAbility('lucky');g.abilitySystem.selectAbility('lucky');g._triggerLevelUp();assert.equal(g._currentChoices.length,6)
  const seen=new Set();let fixed
  for(const ratio of [0,.25,.5,.75,1]){g.render();g._choiceScroll=g._choiceScrollMax*ratio;g.render();g._cardBounds.forEach(b=>{assert.ok(b.h>0&&b.y+b.h<=g._choiceViewport.y+g._choiceViewport.h);seen.add(b.id)});assert.ok(g._confirmBounds.y>=g._choiceViewport.y+g._choiceViewport.h+40);if(fixed)assert.deepEqual(g._confirmBounds,fixed);fixed={...g._confirmBounds};if(ratio===0||ratio===1)save(c,'choices-'+w+'-'+ratio)}assert.equal(seen.size,6);assertions++
  g._choiceOpenedAt=0;const b=g._cardBounds.find(b=>b.h>=24);Art.touchStart(g,b.x+20,b.y+b.h/2);Art.touchEnd(g,b.x+20,b.y+b.h/2);g.render();assert.ok(g._choiceSelected);save(c,'selected-'+w)
  g._bossRewardPending=true;g._openRest();g.render();save(c,'rest-'+w)
 }
 const panel=createCanvas(375*3,667*2),pc=panel.getContext('2d')
 for(let ch=0;ch<6;ch++){const {c,g}=make(screens[1]);g.chapterSystem._applyNextChapter(ch);g.chapterSystem._transition=null;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.boss.mechanics.cycleStart();g.boss.mechanics.update(g.bird);if(ch===4)g.boss.mechanics.valveStage='open';g.render();pc.drawImage(c,(ch%3)*375,Math.floor(ch/3)*667)}save(panel,'six-bosses')
 const {c,g}=make(screens[1]);g.build.specialization='precision';g.build.evolutions=['evo_precision_pierce'];g._lastDamage={source:'穿盾区域'};g.build.record('mechanic','选择超载阀，强攻窗口打开');g._gameOver();g.render();save(c,'report')
 fs.writeFileSync(path.join(out,'render-results.json'),JSON.stringify({screens,assertions,description:'Real Canvas: six-card scroll visibility, nonoverlapping fixed confirmation, six Boss states and report.'},null,2)+'\n');console.log(assertions+' screen checks passed')
}main().catch(e=>{console.error(e);process.exitCode=1})
