const Storage=require('../../utils/Storage'),Random=require('../core/Random'),R=require('../abilities/AbilityRegistry'),Rules=require('../config/BuildConfig')
const Weather={wind:require('../weather/WindEffect'),rain:require('../weather/RainEffect'),hail:require('../weather/HailEffect')},Hailstone=require('../entities/Hailstone')
function copy(obj,skip=[]){const out={};for(const [key,value] of Object.entries(obj)){if(skip.includes(key)||typeof value==='function')continue;out[key]=value}return JSON.parse(JSON.stringify(out))}
const fields='score _scoreRemainder gameTime frameCount survivalTimer pipesPassed monsterKills bossFightFrames bossClears bossBadges _bossClearMode _bossRewardPending _bossVictoryProtectionFrames _nextChoiceAt _trainingSpawned _trainingRewarded _lastDamage timings _echoBoost'.split(' ')
module.exports={
 save(g){if(!g._bossRewardPending||!['bossGrowth','specialization','apex','rest'].includes(g._panelMode))return false
  const game={};fields.forEach(k=>game[k]=g[k]);const a=copy(g.abilitySystem,['owned','_statsCache','fxEvents']),chapter=copy(g.chapterSystem,['_deps','cleared']),weather=copy(g.weatherSystem,['activeEffects','rainResidual'])
  const data={version:'1.9.0',random:Random.getState(),game,ability:a,owned:[...g.abilitySystem.owned],exp:copy(g.expSystem),build:copy(g.build,['game']),chapter,cleared:[...g.chapterSystem.cleared],spawn:copy(g.spawnSystem,['_deps']),combat:copy(g.combat,['game','shots']),weather,
   effects:g.weatherSystem.activeEffects.map(e=>copy(e)),residual:g.weatherSystem.rainResidual?copy(g.weatherSystem.rainResidual):null,mode:g._panelMode,
   choices:g._currentChoices.map(d=>({id:d.id,name:d.name,rarity:d.rarity,text:d.effectText((g.abilitySystem.owned.get(d.id)||0)+1)}))}
  return Storage.saveRun(data)
 },
 load(g){const d=Storage.loadRun();if(!d||d.version!=='1.9.0')return false
  try{
   if(!Array.isArray(d.owned)||!d.choices.length||!Number.isFinite(d.game.gameTime)||d.chapter.index<0||d.chapter.index>5)throw Error('invalid checkpoint')
   const owned=new Map(d.owned);if(owned.size!==d.owned.length||d.owned.some(([id,lv])=>!R.get(id)||R.get(id).retired||!Number.isInteger(lv)||lv<1||lv>R.get(id).maxLevel))throw Error('invalid cards')
   const components=[...owned.keys()].filter(id=>Rules.components.includes(id)).length
   if(components>3||owned.size-components>6||d.build.evolutions.length>2)throw Error('invalid capacity')
   g.start(true);Object.assign(g,d.game);Object.assign(g.abilitySystem,d.ability,{owned,fxEvents:[],_statsCache:null});Object.assign(g.expSystem,d.exp);Object.assign(g.build,d.build);Object.assign(g.chapterSystem,d.chapter,{cleared:new Set(d.cleared)});Object.assign(g.spawnSystem,d.spawn);Object.assign(g.combat,d.combat,{shots:[]});Object.assign(g.weatherSystem,d.weather)
   const restore=e=>{if(!Weather[e.type])throw Error('invalid weather');const effect=Object.assign(new Weather[e.type](),e);if(e.hailstones)effect.hailstones=e.hailstones.map(h=>Object.assign(Object.create(Hailstone.prototype),h));return effect}
   g.weatherSystem.activeEffects=d.effects.map(restore);g.weatherSystem.rainResidual=d.residual?restore(d.residual):null
   g.abilitySystem.refreshDerivedStats();g.bird.y=g.screenH*.45;g.bird.velocity=0;Random.seed(d.random)
   g._openChoices(d.mode,d.choices.map(v=>R.get(v.id)||{...v,effectText:()=>v.text}));this.save(g);return true
  }catch(e){g.backToReady();return false}
 }
}
