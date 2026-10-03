// Economy/offer probe: normal XP + real choices/physics, lethal hits suppressed to reach all chapters.
const fs=require('node:fs'),Game=require('../game/core/Game'),R=require('../game/abilities/AbilityRegistry'),Rules=require('../game/config/BuildConfig'),Random=require('../game/core/Random'),pilot=require('./sim_v190').pilot
require('../game/systems/GameLogger').enabled=false
const rows=[]
for(const route of Rules.routes)for(const seed of [190,7919]){
 const g=new Game({},{},375,667,null);g.start();Random.seed(seed);g._handleCollision=()=>false;const ctx=g._buildGameCtx.bind(g);g._buildGameCtx=()=>({...ctx(),isVictoryProtected:()=>true})
 const p={last:-99,pending:-1,observe:0,target:300,daze:0};let s=seed;const random=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296)
 const chapters=[],evolutions=[];let decisions=0,current=0,normal=0
 for(let frame=0;frame<150000&&g.state!=='gameover';frame++){
  if(g.state==='upgrading'){
   let id;if(g._panelMode==='rest'){chapters.push({chapter:g.chapterSystem.index+1,decisions,normal,seconds:g.gameTime/60,pending:g.expSystem.pendingLevelUps});id=g.chapterSystem.index===5?'rest_finish':'rest_continue'}
   else if(g._panelMode==='specialization')id=g._currentChoices.find(d=>d.id==='spec_'+route.id)?.id||g._currentChoices[0].id
   else if(g._panelMode==='apex')id=g._currentChoices[0].id
   else{const prefer=[route.core,route.support,'feather_blade','light_feather','agile','vitality','regeneration','magnet','greed'];id=g._currentChoices.slice().sort((a,b)=>rank(b)-rank(a))[0].id;decisions++;if(g._panelMode==='levelup')normal++;if(id.startsWith('evo_'))evolutions.push({id,chapter:g.chapterSystem.index+1,seconds:g.gameTime/60})
    function rank(d){return (d.id.startsWith('evo_')?100:0)+(prefer.includes(d.id)?40-prefer.indexOf(d.id)*2:0)+(g.abilitySystem.owned.has(d.id)?3:0)-(d.slotType==='component'&&!prefer.includes(d.id)?20:0)}
   }
   for(let i=0;i<180;i++)g.update();g.selectAbility(id)
  }else{pilot(g,p,random);g.update()}
 }
 rows.push({route:route.id,seed,chapters,evolutions,owned:[...g.abilitySystem.owned],timings:g.timings})
}
fs.writeFileSync('docs/audits/v190/progression-probe.json',JSON.stringify({protocol:'Damage suppressed for complete chapter observation. XP and candidates unchanged; 3s reading/decision. Not a survival or human-duration measurement.',rows},null,2)+'\n')
console.log(rows.map(r=>({route:r.route,decisions:r.chapters.map(c=>c.decisions),evolutions:r.evolutions.map(e=>e.chapter),totalSeconds:Object.values(r.timings).reduce((a,b)=>a+b,0)})))
