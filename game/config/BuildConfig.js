// v1.9.0: slot/recipe contracts shared by every acquisition and replacement path.
let catalog=[]
const components='feather_blade orbit_guard wind_rider shield_burst missile_barrage seed_bolt sand_lance frost_lance frost_shell magma_core singularity'.split(' ')
const compressed='light_feather agile magnet greed time_warp shield_burst slow_world double_score shrink_ray'.split(' ')
const sources={feather_blade:'blade',seed_bolt:'seed',sand_lance:'sand',frost_lance:'frost',wind_rider:'wind',frost_shell:'frost_shell',magma_core:'magma',singularity:'singularity',missile_barrage:'missile',orbit_guard:'reflect',shield_burst:'shield'}
const prerequisites={
 revenge_pulse:['orbit_guard','shield_burst'],toughness:['shield_burst'],bounce_shield:['shield_burst'],aegis_overdrive:['shield_burst'],mirror_shield:['orbit_guard','shield_burst'],
 missile_rack:['missile_barrage'],hunter_mark:['missile_barrage'],missile_link:['missile_barrage'],missile_storm:['missile_barrage'],boss_slayer:['missile_barrage'],
 tailwind:['feather_blade','seed_bolt','sand_lance'],shadow_echo:['feather_blade','seed_bolt','sand_lance'],venom_thread:['frost_lance','seed_bolt'],storm_chain:['frost_lance','seed_bolt','wind_rider'],cinder_execution:['frost_lance','magma_core','singularity'],
 storm_child:['wind_rider'],wind_reader:['wind_rider'],raincoat:['wind_rider'],eye_of_storm:['wind_rider'],iron_feather:['echo_wing'],time_crystal:['time_warp'],phantom_edge:['combo_heart'],combo_seed:['combo_heart']
}
const routes=[
 {id:'precision',name:'对线穿透',core:'feather_blade',support:'tailwind',branches:['标记加速','集中强击'],desc:'有效对线命中积累标记，第6次触发强化弹道'},
 {id:'missile',name:'导弹齐射',core:'missile_barrage',support:'missile_rack',branches:['集中爆发','余波追击'],desc:'周期齐射集中发射，批次伤害独立记账'},
 {id:'guard',name:'守卫反击',core:'orbit_guard',support:'mirror_shield',branches:['迅捷弹反','蓄层重击'],desc:'成功拦截蓄层，3层反射爆发；不挡穿盾'},
 {id:'graze',name:'擦边连段',core:'combo_heart',support:'phantom_edge',branches:['定向贯穿','宽幅反击'],desc:'过管慢充、真实擦边快充，满能短时强化已装备弹道核心'},
 {id:'element',name:'元素反应',core:'frost_lance',support:'venom_thread',branches:['碎霜扩散','凝霜毒爆'],desc:'冰枪施霜与毒相遇触发反应，局部冷却2秒'},
 {id:'weather',name:'天气引擎',core:'wind_rider',support:'storm_child',branches:['长风窗口','疾风爆发'],desc:'周期个人风窗强化风刃，不生成经验或冰雹'}
]
const branchEffects={precision:['标记需求从6次降至4次，强化弹沿用当前进化形态','每6次有效命中强化弹额外+2伤害'],missile:['齐射每枚对Boss额外+1伤害，仍受批次预算约束','每枚命中Boss追加一枚2伤余波弹，派生不触发链路'],guard:['成功拦截后的护卫冷却缩短25%','满3层反射对Boss额外+2伤害'],graze:['充满后的3秒弹道可贯穿3个目标','充满后的3秒强化弹改为三向反击'],element:['霜毒反应向90px内其他敌人扩散3伤，不波及机关','霜毒反应额外+2伤害'],weather:['个人风窗额外延长1秒','风刃从双刃改为三向爆发']}
const evolutions=routes.flatMap(r=>(r.id==='precision'?['pierce','fan']:['evolved']).map((branch,i)=>({
 id:'evo_'+r.id+'_'+branch,route:r.id,core:r.core,support:r.support,coreLevel:3,supportLevel:2,branch,
 name:r.id==='precision'?(i?'风羽扇阵':'贯空飞羽'):{missile:'蜂群齐射',guard:'镜羽反阵',graze:'掠影飞羽',element:'霜毒共鸣',weather:'天风引擎'}[r.id],
 effect:r.id==='precision'?(i?'替换羽刃为三向扇射':'替换羽刃为三段贯穿'):r.desc
})))
function effective(id,level){return compressed.includes(id)&&level>0?[0,1,3,5][Math.min(3,level)]:level}
function valid(def,owned,chapter=1,capacity=true){
 if(!def||def.retired||def.unlockChapter>chapter)return false
 if(chapter>=6&&['nomad','chapter_echo'].includes(def.id))return false
 if(def.id==='chapter_master'&&!owned.has(def.id)){const next=new Map(owned);next.set(def.id,1);if(!catalog.some(d=>d.id!==def.id&&d.rarity==='epic'&&(next.get(d.id)||0)<d.maxLevel&&valid(d,next,chapter,capacity)))return false}
 const req=prerequisites[def.id];if(req&&!req.some(id=>(owned.get(id)||0)>0))return false
 if(capacity&&!owned.has(def.id)){
  const slots=[...owned.keys()].filter(id=>components.includes(id)).length
  if(def.slotType==='component'?slots>=3:owned.size-slots>=6)return false
 }
 return true
}
function migrate(cards){
 catalog=cards
 for(const a of cards){
  const original=a.effectText;a.legacyMaxLevel=a.maxLevel;a.maxLevel=Math.min(3,a.maxLevel)
  a.slotType=components.includes(a.id)?'component':'passive';a.retired=['pipe_sense','oracle'].includes(a.id)
  a.sourceTags=sources[a.id]?[sources[a.id]]:prerequisites[a.id]?prerequisites[a.id].map(id=>sources[id]||id):[a.id];a.prerequisiteAny=prerequisites[a.id]||[];a.exclusiveBranches=a.id==='feather_blade'?['evo_precision_pierce','evo_precision_fan']:[]
  if(compressed.includes(a.id))a.effectText=lv=>original(effective(a.id,lv))
 }
 const get=id=>cards.find(a=>a.id===id)
 for(const r of routes){get(r.core).unlockChapter=Math.min(get(r.core).unlockChapter,2);get(r.support).unlockChapter=Math.min(get(r.support).unlockChapter,2)}
 for(const id of ['missile_barrage','orbit_guard','combo_heart','shield_burst'])get(id).unlockChapter=1
 get('chapter_master').unlockChapter=2
 const texts={
 tailwind:lv=>`羽刃/灵种/沙矛间隔-${6*lv}%；羽刃3＋顺风2可进化`,
 toughness:lv=>`护盾上限+${lv}，产盾周期缩短${lv*8}%（需护盾爆发）`,
 bounce_shield:lv=>`护盾碰撞弹开，上限+${lv}；不额外自动产盾`,
 mirror_shield:lv=>`成功拦截积${lv}层，3层反射；失盾保留冲击波`,
 shadow_echo:lv=>`首个已装备弹道核心每4轮复射，伤害${lv+1}；派生弹不再触发`,
 venom_thread:lv=>`冰枪优先、否则灵种命中挂毒3秒，每秒${lv}伤；派生不挂毒`,
 storm_chain:lv=>`冰枪/灵种/风刃中的首个核心传导${lv+2}伤，每秒一次；派生不连锁`,
 cinder_execution:lv=>`冰枪/熔核/坍缩对低于30%HP敌人增伤${lv*30}%`,
 wind_rider:lv=>`每${6-lv}秒双风刃并开启2秒个人风窗；风刃${lv}伤/Boss${lv+1}`,
 storm_child:lv=>`真实天气或个人风窗中风刃增伤${lv}；过管得分+${lv*20}%（不叠窗）`,
 wind_reader:lv=>`真实风力-${lv*30}%；个人风窗延长${lv*.2}秒`,
 raincoat:lv=>`积水-${Math.min(100,lv*40)}%；雨驯化时风刃间隔-${lv*3}%`,
 phantom_edge:lv=>`真实管道擦边触发1.5秒幻影窗，经验提高；弹幕擦边可为连段充能（每秒一次）`,
 eye_of_storm:lv=>`双天气或个人风窗中负面-${lv*20}%；仅真实双天气经验+${lv*50}%`,
 chapter_master:()=> '取得后下次普通面板必含史诗；此后每章首面板保底，无尽也可兑现下次',
 berserk:lv=>`1HP时首个攻击组件间隔-${lv*8}%，过管分+${lv*25}%；血契收益减半`,
 combo_heart:lv=>`连过${Math.max(2,5-lv)}管得1秒保护；进化后改为过管/擦边充能爆发`,
 ice_crystal:lv=>`真实冰雹转盾CD${20-3*(lv-1)}秒；无天气受击无敌+${lv*.1}秒`,
 time_crystal:lv=>`时间扭曲时普通怪/普通弹冻结${lv*.75}秒；Boss只减速，不冻结招式`
 }
 for(const [id,text] of Object.entries(texts)){get(id).effectText=text;get(id).desc=text(1)}
 return cards
}
module.exports={branchEffects,components,compressed,sources,prerequisites,routes,evolutions,effective,valid,migrate}
