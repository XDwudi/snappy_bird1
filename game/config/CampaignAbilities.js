const groups=[
 ['森芽',1,'light_feather tailwind agile magnet greed toughness vitality feather_blade orbit_guard revenge_pulse regeneration echo_wing thick_skin pipe_sense combo_seed'],
 ['沙铸',2,'physique slow_world bounce_shield shrink_ray supply_line nomad iron_beak double_score scavenger missile_rack shield_burst boss_slayer'],
 ['织影',3,'time_warp teleport lucky exp_resonance survivor_instinct edge_focus combo_heart blood_pact phantom_edge chapter_echo'],
 ['霜脉',4,'ice_crystal steady_charm mirror_shield iron_feather aegis_overdrive time_crystal climate_adapt'],
 ['熔核',5,'berserk hunter_mark missile_barrage missile_storm trophy_wall phoenix'],
 ['天枢',6,'wind_reader raincoat wind_rider storm_child exp_tide eye_of_storm missile_link oracle chaos_dice enlightenment chapter_master']
]
const extra=[
 ['seed_bolt','灵种飞弹',1,'uncommon',lv=>`每${5-lv}秒发射追踪灵种，伤害${lv}（Boss ${lv+1}）`],
 ['seed_harvest','生机收割',1,'rare',lv=>`每击杀${9-lv*2}只怪物回复1HP；治疗冷却12秒`],
 ['sand_lance','破甲沙矛',2,'uncommon',lv=>`每3秒发射穿透${lv+1}个敌人的沙矛，伤害${lv+1}（Boss ${lv+2}）`],
 ['dune_cache','沙丘补给',2,'rare',lv=>`每通过${16-lv*3}根管道获得1层护盾（遵守护盾上限）`],
 ['shadow_echo','暗影复射',3,'rare',lv=>`每4轮新武器弹丸附加暗影弹，伤害${lv+1}（Boss ${lv+2}）`],
 ['venom_thread','蚀影毒丝',3,'rare',lv=>`新武器弹丸命中挂毒3秒，每秒${lv}伤害；续毒不重置跳伤，不叠毒`],
 ['frost_lance','霜脉冰枪',4,'rare',lv=>`每2.5秒发射冰枪，伤害${lv+2}（Boss ${lv+3}）；怪物减速50%持续2秒`],
 ['frost_shell','寒晶净域',4,'epic',lv=>`每${12-lv*2}秒清除身边80px内普通弹幕，并向前反击（Boss ${lv+3}伤害）`],
 ['magma_core','熔核震爆',5,'epic',lv=>`每4秒对前方全部敌人造成${lv+2}伤害；Boss ${lv+4}伤害`],
 ['cinder_execution','余烬处决',5,'rare',lv=>`所有新武器对生命低于30%的敌人伤害增加${lv*30}%`],
 ['storm_chain','天雷链路',6,'epic',lv=>`弹丸命中传导${lv+2}伤害；单体Boss也放电，每秒一次`],
 ['singularity','引力坍缩',6,'epic',lv=>`每${10-lv}秒清除120px内普通弹幕，并造成全场${lv+4}伤害（Boss ${lv+6}）`]
]
module.exports=function addCampaignAbilities(abilities) {
  for(const [id,name,ch,rarity,effectText] of extra) abilities.push({
    id,name,icon:['芽','矛','影','冰','火','雷'][ch-1],category:'passive',rarity,maxLevel:3,
    desc:effectText(1),effectText,unlockChapter:ch,faction:groups[ch-1][0]
  })
  for(const [faction,ch,ids] of groups) for(const id of ids.split(' ')) {
    const a=abilities.find(a=>a.id===id)
    if(!a)throw new Error('Unknown campaign ability: '+id)
    a.unlockChapter=ch;a.faction=faction
  }
  // 第一章保留一张史诗核心，章节礼物及史诗保底不会成为空承诺。
  const phoenix=abilities.find(a=>a.id==='phoenix');phoenix.unlockChapter=1;phoenix.faction='森芽'
  for(const id of ['shrink_ray','time_warp','combo_heart']) {
    const a=abilities.find(a=>a.id===id);a.unlockChapter=1;a.faction='森芽'
  }
  return abilities
}
module.exports.groups=groups
