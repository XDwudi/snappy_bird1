// Run with @napi-rs/canvas on NODE_PATH. Runtime has no npm dependencies.
const fs=require('fs'),path=require('path'),{createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas')
const font=process.env.CJK_FONT||'/System/Library/Fonts/STHeiti Medium.ttc'
if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'sans-serif')
const Game=require('../game/core/Game'),R=require('../game/abilities/AbilityRegistry'),A=require('../game/art/Assets'),P=require('../game/art/Pixel'),I=require('../game/art/Icons')
const Pipe=require('../game/entities/Pipe'),Item=require('../game/entities/Item'),Elite=require('../game/entities/EliteMonster'),Hazard=require('../game/entities/BossHazard')
require('../game/systems/GameLogger').enabled=false
const out=path.resolve(__dirname,'../docs/audits/v183');fs.mkdirSync(out,{recursive:true})
function make(w=375,h=667){const c=createCanvas(w,h),g=new Game(c,c.getContext('2d'),w,h,null);g.start();g.score=128;g.expSystem.level=5;g.bird.y=h*.47;g.frameCount=180;g.gameTime=3600;return{c,g}}
function save(c,name){fs.writeFileSync(path.join(out,name+'.png'),c.toBuffer('image/png'))}
async function main(){
 for(const key of Object.keys(A.files))A.images[key]=await loadImage(path.resolve(__dirname,'..',A.files[key]))
 const flight=make();flight.g.pipes=[new Pipe(230,190,212,587),new Pipe(530,230,212,587)];flight.g.items=[new Item(272,303,'missile')];for(const id of ['feather_blade','orbit_guard','seed_bolt'])flight.g.abilitySystem.selectAbility(id);flight.g.render();save(flight.c,'flight')
 const home=make();home.g.state='ready';home.g.render();save(home.c,'home')
 const all=createCanvas(1125,1334),cx=all.getContext('2d'),attacks=createCanvas(1125,1334),ax=attacks.getContext('2d')
 for(let i=0;i<6;i++){const {c,g}=make();g.chapterSystem._applyNextChapter(i);g.chapterSystem._transition=null;g._spawnBoss();g.chapterSystem.startBossFight();const b=g.boss;b.x=b.homeX;b._setState('roam');b.mechanics.cycleStart();g.bird.y=330;b.attackIndex=[0,5,0,2,5,1][i];b._beginAttack(g.bird);for(let f=0;f<30;f++){b.update(g.bird);for(const h of g.feathers)h.update()}g.render();cx.drawImage(c,i%3*375,Math.floor(i/3)*667);if(i===0)save(c,'boss');for(let f=0;f<b.warnFrames+18;f++){b.update(g.bird);for(const h of g.feathers)h.update()}g.render();ax.drawImage(c,i%3*375,Math.floor(i/3)*667)}save(all,'six-chapters');save(attacks,'boss-attacks')
 for(const n of [3,4,6]){const {c,g}=make(320,568);g.state='upgrading';g._currentChoices=(n===3?['feather_blade','seed_bolt','seed_harvest']:['light_feather','tailwind','wind_rider','climate_adapt','storm_child','chaos_dice']).slice(0,n).map(id=>R.get(id));g.render();save(c,'cards-'+n+'-top');if(n===6){g._choiceScroll=g._choiceScrollMax;g.render();save(c,'cards-6-bottom')}}
 const elites=createCanvas(1500,667),ec=elites.getContext('2d');for(let i=0;i<4;i++){const {c,g}=make();g.monsters=[new Elite(240,310,'floater',587,{eliteKind:['gunship','stormcaller','prism','bomber'][i],eliteTier:3,elite:true,screenW:375,onHazard:v=>g.feathers.push(v),getPipes:()=>[]})];g.monsters[0].age=220;g.render();ec.drawImage(c,i*375,0)}save(elites,'elites')
 const end=make();end.g.chapterSystem.index=5;for(let i=0;i<6;i++)end.g.chapterSystem.cleared.add(i);end.g.chapterSystem.enterEndless();end.g.chapterSystem.endlessFrames=9*3600;end.g.abilitySystem.chapter=6;for(const a of R.getAll())end.g.abilitySystem.selectAbility(a.id);end.g.expSystem.level=128;end.g.abilitySystem.hp=1;end.g.abilitySystem.tempHp=6;end.g.render();save(end.c,'endless');end.g.state='gameover';end.g.render();save(end.c,'result')
 const fx=make();fx.g.abilitySystem.selectAbility('magnet');fx.g.abilitySystem.selectAbility('orbit_guard');fx.g.abilitySystem.addShieldLayer(2);for(const type of ['rain','wind','hail'])fx.g.weatherSystem._triggerEffect(type,fx.g._buildGameCtx());for(let k=0;k<70;k++)fx.g.weatherSystem.update(5000,fx.g._buildGameCtx());fx.g._spawnExplosion(250,270,'255,200,60',18);fx.g.feathers.push(new Hazard({kind:'beam',y:430,radius:22,age:20,warn:90,piercing:true,screenW:375,groundY:587}));fx.g.render();save(fx.c,'effects')
 const hearts=createCanvas(960,568),hc=hearts.getContext('2d');for(let i=0;i<3;i++){const {c,g}=make(320,568);g.abilitySystem.maxHp=6;g.abilitySystem.hp=[6,4,1][i];g.abilitySystem.tempHp=[11,4,0][i];g.abilitySystem.blessingTempHpCapBonus=9;g.render();hc.drawImage(c,i*320,0)}save(hearts,'hearts-short-screen')
 const icons=createCanvas(900,Math.ceil(R.getAll().length/9)*100),ic=icons.getContext('2d');ic.fillStyle=P.C.panel;ic.fillRect(0,0,icons.width,icons.height);R.getAll().forEach((d,i)=>{const x=i%9*100,y=Math.floor(i/9)*100;I.draw(ic,d.id,x+50,y+36,46);P.text(ic,d.name,x+50,y+77,11,P.C.paper,'center')});save(icons,'all-73-icons')
 const sizes=createCanvas(1030,844),sc=sizes.getContext('2d');let dx=0;for(const [w,h] of [[320,568],[320,740],[390,844]]){const {c,g}=make(w,h);g.safeTop=h>740?47:12;g.safeBottom=h-34;g.pipes=[new Pipe(220,180,212,h-80)];g.render();sc.drawImage(c,dx,0);dx+=w}save(sizes,'screen-sizes')
 const guides=createCanvas(960,1136),gc=guides.getContext('2d')
 for(let i=0;i<6;i++){const {c,g}=make(320,568);g.chapterSystem._applyNextChapter(i);g.chapterSystem._transition=null;g.chapterSystem._bossIntro={phase:'gather',frame:15};g.render();gc.drawImage(c,i%3*320,Math.floor(i/3)*568)}save(guides,'boss-guides')
 const tr=make();tr.g.chapterSystem._transition={phase:'title',frame:30,toIndex:1};tr.g.render();save(tr.c,'transition')
 const phoenix=make();phoenix.g._startPhoenixRevive();phoenix.g.render();save(phoenix.c,'phoenix-pause');for(let f=0;f<72;f++)phoenix.g._updatePhoenixAnim();phoenix.g.render();save(phoenix.c,'phoenix-revive')
 console.log(out)
}
main().catch(e=>{console.error(e);process.exitCode=1})
