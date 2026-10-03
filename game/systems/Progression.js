const Rules=require('../config/BuildConfig'),R=require('../abilities/AbilityRegistry'),Storage=require('../../utils/Storage')
const option=(id,name,text)=>({id,name,rarity:'rare',category:'special',effectText:()=>text})
module.exports={
 _openChoices(mode,choices){
  this.state='upgrading';this._panelMode=mode;this._currentChoices=choices;this._choiceEpoch=(this._choiceEpoch||0)+1
  this._choiceOpenedAt=Date.now();this._choiceSelected=null;this._checkpointError=false;this._choiceGesture=null;this._choiceScroll=0;this._cardBounds=[]
  if(this.onLevelUp)this.onLevelUp(choices,this.expSystem.level,this.abilitySystem.getOwnedList())
 },
 _triggerLevelUp(){this._openChoices('levelup',this.build.choices())},
 rerollChoices(){if(!['levelup','bossGrowth'].includes(this._panelMode)||this.build.rerolls<=0)return false
  this.build.rerolls--;this._openChoices(this._panelMode,this.build.choices(true));this._saveCheckpoint();return true
 },
 selectAbility(id){
  if(this.state!=='upgrading'||!this._currentChoices||!this._currentChoices.some(d=>d.id===id))return false
  const mode=this._panelMode
  if(mode==='specialization'){this.build.specialization=id.slice(5);this._afterBossDecision();return true}
  if(mode==='apex'){this.build.apex=Number(id.slice(5));this._openRest();return true}
  if(mode==='rest')return this._selectRest(id)
  if(mode==='adjustFrom'){if(id==='adjust_done')return this._previewAdjustment();this._adjustFrom=id.slice(5);this._openAdjustTargets();return true}
  if(mode==='adjustTo'){
   if(id==='adjust_cancel'){this._openRest();return true}
   this._adjustDraft.push({from:this._adjustFrom,to:id.slice(3),level:Math.min(R.get(id.slice(3)).maxLevel,this.abilitySystem.owned.get(this._adjustFrom))})
   const used=this._adjustDraft.map(c=>R.get(c.from).slotType)
   if(used.includes('component')&&!used.includes('passive'))this._openAdjustFrom('passive')
   else if(used.includes('passive')&&!used.includes('component'))this._openAdjustFrom('component')
   else this._previewAdjustment();return true
  }
  if(mode==='adjustSpec'){if(id==='adjust_cancel'){this._openRest();return true}this._adjustSpec=id.slice(5);return this._previewAdjustment()}
  if(mode==='adjustConfirm'){
   if(id==='adjust_apply'){if(!this.build.replace(this._adjustPlan))return false;this.build.record('adjust','完成构筑调整')}
   this._openRest();return true
  }
  if(mode==='respec'){
   if(id==='respec_cancel'){this._openRest();return true}
   const plan=this.build.previewReplacement([],id.slice(5));if(!this.build.replace(plan))return false;this._openRest();return true
  }
  if(!this.build.apply(id))return false
  if(mode==='bossGrowth'||this.build.refund<=0)this.build.growthInvestments++
  this.abilitySystem.invalidateStats()
  if(mode==='bossGrowth'){this._afterBossDecision();return true}
  if(this.build.refund>0)this.build.refund--;else this.expSystem.consumeLevelUp()
  this._afterUpgrade();return true
 },
 _afterUpgrade(){
  this._currentChoices=null;this._panelMode='levelup';this._nextChoiceAt=this.gameTime+360
  this.abilitySystem.invincibleFrames=Math.max(this.abilitySystem.invincibleFrames,60);this.bird.velocity=0;this.state='playing'
 },
 _startBossRewards(){
  this._revertChapterEcho(true);this._bossRewardPending=true;this._addScore(100);this.abilitySystem.healHP(1);this.abilitySystem.addShieldLayer(1)
  this.pipes=[];this.monsters=[];this.feathers=[];this.items=[];this.orbs=[];this.missiles=[];this.bird.y=this.screenH*.45;this.bird.velocity=0
  this._openChoices('bossGrowth',this.build.choices());this._saveCheckpoint()
 },
 _afterBossDecision(){
  const ch=this.chapterSystem.index
  if(!this.chapterSystem.endless&&ch===0&&!this.build.specialization){const choices=this.build.specializationChoices();if(choices.length){this._openChoices('specialization',choices);this._saveCheckpoint();return}}
  if(!this.chapterSystem.endless&&ch>=2&&this.build.specialization&&this.build.apex==null){this._openChoices('apex',this.build.apexChoices());this._saveCheckpoint();return}
  this._openRest()
 },
 _openRest(){
  const last=!this.chapterSystem.endless&&this.chapterSystem.index===5
  const choices=[option('rest_continue',last?'继续无尽':'继续旅程',last?'六章已获胜，沿用当前构筑进入无尽':'结束休息，进入下一段旅程')]
  if(last)choices.unshift(option('rest_finish','结束本局','保存六章胜利战报，之后可重新开始'))
  if(this.build.adjustments>0){choices.push(option('rest_adjust','调整构筑',`剩${this.build.adjustments}次；可同时替换一个组件和一个被动，等级等额转移`));if(this.build.specialization)choices.push(option('rest_spec','更换专精','消耗一次调整；预览并确认，新专精从基础开始'))}
  choices.push(option('rest_save','保存退出','保存此休息点、卡牌、待选经验和一次性资源；下次接着选择'))
  this._openChoices('rest',choices);this._saveCheckpoint()
 },
 _selectRest(id){
  if(id==='rest_adjust'){this._adjustDraft=[];this._adjustSpec=undefined;this._openAdjustFrom();return true}
  if(id==='rest_spec'){this._openChoices('respec',this.build.specializationChoices().filter(d=>d.id!=='spec_'+this.build.specialization).concat(option('respec_cancel','取消返回','不扣调整次数')));return true}
  if(id==='rest_save'){if(this._saveCheckpoint())this.backToReady();else this._checkpointError=true;return true}
  if(id==='rest_finish'){this.chapterSystem.cleared.add(5);this.victory=true;this._bossRewardPending=false;this._gameOver();return true}
  if(id==='rest_continue'){
   Storage.clearRun();this._bossRewardPending=false;this.state='playing';this._panelMode='levelup';this._currentChoices=null;this._nextChoiceAt=this.gameTime+360
   this.chapterSystem.endBossFight(true)
   if(this.chapterSystem.cleared.size===6&&!this.chapterSystem.endless)this.chapterSystem.enterEndless()
   this._bossClearMode=null;this.bird.velocity=0;this.abilitySystem.invincibleFrames=Math.max(90,this.abilitySystem.invincibleFrames)
   return true
  }
  return false
 },
 _openAdjustFrom(type){
  const choices=[...this.abilitySystem.owned].filter(([id])=>!type||R.get(id).slotType===type).map(([id,lv])=>option('from_'+id,'替换 '+R.get(id).name,`转移${lv}级投资；依赖被动可在同一次事务中调整`))
  choices.push(option('adjust_done','完成预览','检查前置、专精、进化及投资后再确认'))
  this._openChoices('adjustFrom',choices)
 },
 _openAdjustTargets(){const from=R.get(this._adjustFrom),lv=this.abilitySystem.owned.get(from.id),draft=new Map(this.abilitySystem.owned)
  for(const c of this._adjustDraft){draft.delete(c.from);draft.set(c.to,c.level)}draft.delete(from.id)
  const choices=R.getAll().filter(d=>d.slotType===from.slotType&&!draft.has(d.id)&&d.id!==from.id&&Rules.valid(d,draft,this.abilitySystem.chapter,false)).map(d=>option('to_'+d.id,d.name,`转入Lv.${lv}：${d.effectText(lv)}`))
  choices.push(option('adjust_cancel','取消调整','不扣调整次数'));this._openChoices('adjustTo',choices)
 },
 _previewAdjustment(){
  const draft=new Map(this.abilitySystem.owned);let points=this._adjustDraft.reduce((n,c)=>n+draft.get(c.from),0)
  for(const c of this._adjustDraft){draft.delete(c.from);c.level=Math.min(c.level,R.get(c.to).maxLevel);points-=c.level;draft.set(c.to,c.level)}
  for(const c of this._adjustDraft){const extra=Math.min(Math.max(0,points),R.get(c.to).maxLevel-c.level);c.level+=extra;points-=extra;draft.set(c.to,c.level)}
  const spec=Rules.routes.find(r=>r.id===(this._adjustSpec||this.build.specialization))
  if(spec&&!draft.has(spec.core)){
   this._openChoices('adjustSpec',Rules.routes.filter(r=>draft.has(r.core)).map(r=>option('spec_'+r.id,r.name,'此替换将失去原专精核心；同一次调整改选此专精')).concat(option('adjust_cancel','取消返回','没有合适专精时可取消本次调整')));return true
  }
  const saved=this._panelMode;this._panelMode='rest';this._adjustPlan=this.build.previewReplacement(this._adjustDraft,this._adjustSpec||this.build.specialization);this._panelMode=saved
  const p=this._adjustPlan,changes=this._adjustDraft.map(c=>R.get(c.from).name+'→'+R.get(c.to).name+' Lv.'+c.level).join('；')
  const choices=[option('adjust_cancel','取消返回',p.ok?'不改构筑，不扣次数':p.error)]
  if(p.ok&&p.changes.length)choices.unshift(option('adjust_apply','确认调整',changes+(p.lost.length?`；${p.lost.length}项进化回退，返还等量投资`:'；现有配方保持')))
  this._openChoices('adjustConfirm',choices)
 },
 _saveCheckpoint(){return this.onSaveRun?this.onSaveRun():false}
}
