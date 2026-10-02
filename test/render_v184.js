const fs=require('fs'),path=require('path'),{createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas')
GlobalFonts.registerFromPath(process.env.CJK_FONT||'/System/Library/Fonts/STHeiti Medium.ttc','sans-serif')
const Game=require('../game/core/Game'),A=require('../game/art/Assets'),R=require('../game/abilities/AbilityRegistry')
const cast=require('../game/entities/BossPatterns')
require('../game/systems/GameLogger').enabled=false
const out=path.resolve(__dirname,'../docs/audits/v184')
function make(ch,w=375,h=667){const c=createCanvas(w,h),g=new Game(c,c.getContext('2d'),w,h,null);g.start();g.chapterSystem._applyNextChapter(ch);g.chapterSystem._transition=null;g._spawnBoss();g.chapterSystem.startBossFight();g.boss.x=g.boss.homeX;g.boss._setState('roam');g.boss.mechanics.cycleStart();return{g,c}}
function save(c,name){fs.writeFileSync(path.join(out,name+'.png'),c.toBuffer('image/png'))}
async function main(){
 for(const key of Object.keys(A.files))A.images[key]=await loadImage(path.resolve(__dirname,'..',A.files[key]))
 const root=createCanvas(1125,667),rx=root.getContext('2d')
 for(let stage=0;stage<3;stage++){const {g,c}=make(0),m=g.boss.mechanics;if(stage)for(const n of m.nodes)n.takeDamage(99);if(stage===2){m.weak=0;g.boss.phase2Flash=0};g.render();rx.drawImage(c,stage*375,0)}save(root,'root-progress')
 const sheet=createCanvas(960,1136),sx=sheet.getContext('2d'),guides=createCanvas(960,1136),gx=guides.getContext('2d')
 for(let ch=0;ch<6;ch++){const {g,c}=make(ch,320,568),b=g.boss;b.phase=2;b.skill=b.variant.skills[[2,2,0,0,0,2][ch]];b.action=b.skill.kind;b._setState('telegraph');cast(b,g.bird,b.skill);for(const h of g.feathers)h.age=30;g.render();sx.drawImage(c,ch%3*320,Math.floor(ch/3)*568);g.chapterSystem._bossIntro={phase:'gather',frame:15};g.render();gx.drawImage(c,ch%3*320,Math.floor(ch/3)*568)}save(sheet,'six-bosses-short');save(guides,'guides-short')
 const {g,c}=make(0,320,568);g.state='upgrading';g._currentChoices=['tailwind','feather_blade','wind_rider'].map(id=>R.get(id));g.render();save(c,'cards-short')
 console.log(out)
}
main().catch(e=>{console.error(e);process.exitCode=1})
