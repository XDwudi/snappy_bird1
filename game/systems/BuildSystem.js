const Random=require('../core/Random')
const Rules=require('../config/BuildConfig'),R=require('../abilities/AbilityRegistry')
const option=(id,name,desc)=>({id,name,desc,icon:'✦',rarity:'epic',category:'special',effectText:()=>desc})
class BuildSystem {
 constructor(game){this.game=game;this.reset()}
 reset(){this.specialization=null;this.apex=null;this.evolutions=[];this.rerolls=2;this.adjustments=2;this.panels=0;this.lastCoreOffer=0;this.breakthroughs={};this.refund=0;this.masterDue=false;this.masterEverOwned=false;this.tamedChoice=null;this.tamingUsed=false;this.supplyAt=0;this.growthInvestments=0;this.events=[];this.damage={hits:0,attempted:0,applied:0,limited:0}}
 canReleaseGrowth(){return this.game.chapterSystem.endless||this.growthInvestments<[8,14,19,24,29,35][this.game.chapterSystem.index]-1}
 permanent(id){const e=this.game._echoBoost;return (this.owned.get(id)||0)-(e&&e.id===id?e.to-e.from:0)}
 get owned(){return this.game.abilitySystem.owned}
 hasEvolution(route){return this.evolutions.find(id=>Rules.evolutions.find(e=>e.id===id).route===route)}
 route(){return Rules.routes.find(r=>r.id===this.specialization)}
 sourceFor(ids){return ids.find(id=>this.owned.has(id))}
 availableEvolutions(){return this.evolutions.length>=2||(this.evolutions.length===1&&!this.game.chapterSystem.endless&&this.game.chapterSystem.index<3)?[]:Rules.evolutions.filter(e=>!this.hasEvolution(e.route)&&this.permanent(e.core)>=3&&this.permanent(e.support)>=2)}
 recipeText(id){const e=Rules.evolutions.find(e=>e.core===id||e.support===id);if(!e)return ''
  return `${this.evolutions.length===1&&this.game.chapterSystem.index<3?'第二进化第4章解锁 · ':''}${R.get(e.core).name}${this.owned.get(e.core)||0}/3＋${R.get(e.support).name}${this.owned.get(e.support)||0}/2 → ${e.name}`}
 choices(reroll=false){
  const g=this.game,a=g.abilitySystem,ch=a.chapter,all=R.getAll().filter(d=>Rules.valid(d,this.owned,ch)&&(this.owned.get(d.id)||0)<d.maxLevel)
  if(!reroll){this.panels++;this.panelEpic=this.masterDue||(a.chapterFirstPanelDue&&this.owned.has('chapter_master'))}
  const picks=[];const add=def=>{if(def&&!picks.some(p=>p.id===def.id))picks.push(def)}
  const weighted=list=>{if(!list.length)return null;const weights=list.map(d=>d.slotType==='component'?3:d.id==='double_score'&&ch<3?.3:1);let n=Random.random()*weights.reduce((x,y)=>x+y,0);return list.find((d,i)=>(n-=weights[i])<=0)||list[0]}
  const cores=all.filter(d=>this.owned.has(d.id)&&(d.slotType==='component'||d.id==='combo_heart'))
  add(weighted(cores))
  if(cores.length&&!reroll)this.lastCoreOffer=this.panels
  const support=all.filter(d=>!picks.includes(d)&&(Rules.routes.some(r=>this.owned.has(r.core)&&r.support===d.id)||['vitality','light_feather','regeneration','agile'].includes(d.id)))
  add(weighted(support));add(weighted(all.filter(d=>!picks.includes(d))))
  const evo=this.availableEvolutions();if(evo.length)add(option(evo[0].id,evo[0].name,evo[0].effect+'；替换原机制，不新增槽位'))
  if(evo.length>1&&evo[0].route===evo[1].route)add(option(evo[1].id,evo[1].name,evo[1].effect+'；与贯穿互斥'))
  const target=Math.min(6,3+(a.owned.get('lucky')||0))
  while(picks.length<target){const more=all.filter(d=>!picks.some(p=>p.id===d.id));if(!more.length)break;add(weighted(more))}
  // Evolution is a real investment; keep the promised owned-core slot intact.
  if(picks.length>target)picks.splice(1,picks.length-target)
  if(this.panelEpic||(a.owned.get('lucky')===3)){
   const epic=all.filter(d=>d.rarity==='epic'&&!picks.some(p=>p.id===d.id));if(epic.length&&!picks.some(p=>p.rarity==='epic'))picks[Math.min(picks.length,Math.max(1,picks.length-1))]=weighted(epic)
  }
  if(!reroll){a.chapterFirstPanelDue=false;this.masterDue=false}
  if(!picks.length){
   for(const id of this.owned.keys())if(Rules.components.includes(id)&&(this.breakthroughs[id]||0)<3)add(option('boost_'+id,R.get(id).name+'突破',id==='shield_burst'?'产盾周期缩短5%，最多3次':'本组件伤害+1，最多3次'))
   if(!picks.length)add(option('supply','旅途补给','恢复1HP或1盾（至少10秒间隔）；满容量/冷却中+10分'))
  }
  return picks.slice(0,Math.max(target,Math.min(5,picks.length)))
 }
 apply(id){
  const a=this.game.abilitySystem,e=this.availableEvolutions().find(e=>e.id===id)
  if(e){this.evolutions.push(id);this.record('evolution','进化成型：'+e.name);return true}
  if(id.startsWith('boost_')){const key=id.slice(6);if(!this.owned.has(key)||!Rules.components.includes(key)||(this.breakthroughs[key]||0)>=3)return false;this.breakthroughs[key]=(this.breakthroughs[key]||0)+1;if(key==='shield_burst')a.shieldBreakthrough=this.breakthroughs[key];return true}
  if(id==='supply'){if((this.supplyAt||0)>this.game.gameTime){this.game._addScore(10);return true}if(a.healHP(1)||a.addShieldLayer(1))this.supplyAt=this.game.gameTime+600;else this.game._addScore(10);return true}
  const d=R.get(id);if(!Rules.valid(d,this.owned,a.chapter)||(this.owned.get(id)||0)>=d.maxLevel)return false
  a.selectAbility(id);if(id==='chapter_master'){this.masterDue=true;this.masterEverOwned=true}
  this.game.expSystem.configureEnlighten(this.owned.get('enlightenment')||0)
  if(id==='chaos_dice'){this.game._applyChaosDiceTaming();this.tamingUsed=true}
  return true
 }
 specializationChoices(){return Rules.routes.filter(r=>this.owned.has(r.core)).map(r=>option('spec_'+r.id,r.name,r.desc))}
 apexChoices(){const r=this.route();return r?r.branches.map((name,i)=>option('apex_'+i,name,Rules.branchEffects[r.id][i])):[]}
 record(type,text){this.events.push({type,text,frame:this.game.gameTime,chapter:this.game.chapterSystem.index+1,hp:this.game.abilitySystem.hp});if(this.events.length>32)this.events.shift();this.game._addFloatingText(this.game.screenW/2,this.game.screenH*.36,text,'#b6f6ff',85)}
 // Pure validation first; commit only a complete legal transaction. No selectAbility side effects.
 previewReplacement(changes,specialization=this.specialization){
  if(!['rest','adjustConfirm','respec'].includes(this.game._panelMode)||this.adjustments<=0)return {ok:false,error:'只能在章间使用剩余调整次数'}
  const owned=new Map(this.owned),types=new Set();let points=0
  for(const change of changes){const from=R.get(change.from),to=R.get(change.to)
   if(!from||!to||!owned.has(from.id)||owned.has(to.id)||from.slotType!==to.slotType||types.has(from.slotType))return {ok:false,error:'每次最多换一个组件和一个被动'}
   types.add(from.slotType);points+=owned.get(from.id);owned.delete(from.id)
  }
  let spent=0
  for(const c of changes){const d=R.get(c.to);if(!Number.isInteger(c.level)||c.level<1||c.level>d.maxLevel)return {ok:false,error:'等级超出上限'};spent+=c.level;owned.set(c.to,c.level)}
  if(changes.some(c=>!Rules.valid(R.get(c.to),owned,this.game.abilitySystem.chapter,false)))return {ok:false,error:'目标卡尚未解锁'}
  if(spent!==points)return {ok:false,error:'替换等级投资必须等额'}
  if([...owned].some(([id])=>R.get(id).retired||(Rules.prerequisites[id]&&!Rules.prerequisites[id].some(key=>owned.has(key)))))return {ok:false,error:'替换后有技能缺少前置或已失效'}
  const components=[...owned.keys()].filter(id=>Rules.components.includes(id)).length
  if(components>3||owned.size-components>6)return {ok:false,error:'槽位超限'}
  const spec=Rules.routes.find(r=>r.id===specialization);if(spec&&!owned.has(spec.core))return {ok:false,error:'请同时改选有核心的专精'}
  const lost=this.evolutions.filter(id=>{const e=Rules.evolutions.find(e=>e.id===id);return (owned.get(e.core)||0)<3||(owned.get(e.support)||0)<2})
  return {ok:true,owned,specialization,lost,changes}
 }
 replace(plan){if(!plan.ok)return false;const check=this.previewReplacement(plan.changes,plan.specialization);if(!check.ok)return false
  const a=this.game.abilitySystem;a.owned=check.owned;this.evolutions=this.evolutions.filter(id=>!check.lost.includes(id));this.refund+=check.lost.length
  if(this.specialization!==check.specialization){this.specialization=check.specialization;this.apex=null}
  this.adjustments--;a.refreshDerivedStats();a.featherShields=Math.min(a.featherShields,a.owned.has('echo_wing')?a._getFeatherShieldCap():0)
  if(!a.owned.has('chaos_dice')){this.tamedChoice=this.game.weatherSystem.tamedWeather||this.tamedChoice;this.game.weatherSystem.tamedWeather=null;this.game.weatherSystem.tamedPending=false}
  else if(this.tamingUsed){this.game.weatherSystem.tamedWeather=this.tamedChoice||this.game.weatherSystem.tamedWeather;this.game.weatherSystem.tamedPending=!this.game.weatherSystem.tamedWeather}
  else{this.game._applyChaosDiceTaming();this.tamingUsed=true}
  if(a.owned.has('chapter_master')&&!this.masterEverOwned){this.masterDue=true;this.masterEverOwned=true}
  this.game.expSystem.configureEnlighten(a.owned.get('enlightenment')||0)
  this.game.combat.clearShots();this.game.missiles=[];this.game.combat.guardCharge=0
  for(const m of this.game.monsters)m.venom=null
  if(!a.owned.has('time_warp'))a.timeWarpActive=0
  if(!a.owned.has('time_crystal'))a.timeCrystalFreezeFrames=0
  if(!a.owned.has('combo_heart')){a.comboCount=0;this.game.combat.grazeCharge=0;this.game.combat.grazeWindow=0}
  if(!a.owned.has('wind_rider'))this.game.combat.windWindow=0
  if(!a.owned.has('missile_storm'))a.missileStormFrames=0
  if(!a.owned.has('missile_link'))a.missileLinkStacks=0
  for(const id of ['shield_burst','regeneration','missile_barrage'])if(a.owned.has(id)){
   const pairs={shield_burst:['shieldBurstTimer','_getShieldBurstCD'],regeneration:['regenerationTimer','_getRegenerationCD'],missile_barrage:['missileBarrageTimer','_getMissileBarrageCD']},[key,method]=pairs[id];a[key]=Math.max(a[key]||0,a[method]())
  }
  a.fxEvents=[];return true
 }
}
module.exports=BuildSystem
