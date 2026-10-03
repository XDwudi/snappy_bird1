// 1.8.4：六章内容单一事实源。时间均为有效游玩帧（60fps），暂停不计。
const themes = [
  ['蓝天草地','meadow','森芽','古木守卫','#347d63','#79cf9b','#94dc67','#315b42',60,105,135],
  ['流沙遗迹','desert','沙铸','遗迹巨蝎','#d99750','#f3d69a','#d8ae65','#81532f',68,115,235],
  ['暗夜密林','night','织影','月蚀蛛后','#131b38','#494373','#b195ed','#44346d',76,125,410],
  ['极光冰川','glacier','霜脉','冰川魔像','#537fb2','#c8edfa','#90e2f5','#436993',84,135,680],
  ['熔火裂谷','volcano','熔核','熔岩地龙','#391c32','#cb6247','#ff985a','#873f38',92,145,1120],
  ['天穹风暴','storm','天枢','风暴机核','#1b2248','#63759c','#b6f6ff','#485688',100,155,1750]
]
// 每套六种不同几何/节拍；连协按前招结束→下一招独立预警，避免随机叠加堵死缺口。
const skills = [
  [['回旋飞种','return_seed'],['荆棘根墙','gate'],['根须阶梯','vine_steps'],['生长孢雷','seed_mines'],['藤蔓突进','dash'],['林地复苏','summon']],
  [['毒尾埋雷','tail_mines'],['流沙石门','gate'],['地裂钳击','pincer'],['流沙漏斗','sand_funnel'],['钻沙冲撞','dash'],['错落砂瀑','sandfall']],
  [['交织蛛网','web_lattice'],['月蚀射线','beam'],['追魂虫群','seek'],['毒卵孵化','summon'],['卵巢散射','egg_spiral'],['蛛足合围','spider_legs']],
  [['弹跳冰棱','ice_bounce'],['冰川断层','pincer'],['交替冻层','frost_steps'],['暴雪坠晶','rain'],['冰镜折射','mirror_cross'],['冰山推进','gate']],
  [['抛射熔岩','lava_arcs'],['火山喷发','eruption'],['熔岩吐息','beam'],['赤鳞冲锋','dash'],['熔核炸弹','magma_bomb'],['阀口喷发','vent_burst']],
  [['磁极分流','polarity'],['切换磁轨','rail_switch'],['引力之门','gate'],['离子追踪','seek'],['星环裂变','split'],['轨道放电','orbit_discharge']]
]
const hints={return_seed:'飞种会折返',vine_steps:'上下交替躲根',seed_mines:'离开膨胀孢子',tail_mines:'离开锁定雷点',sand_funnel:'留在两股沙流之间',sandfall:'上下换位 · 穿绿色缺口',web_lattice:'连续穿过错位缺口',egg_spiral:'击卵减少射口',spider_legs:'交替避开斜刺',ice_bounce:'留意上下反弹',frost_steps:'按顺序换层',mirror_cross:'远离交叉落点',lava_arcs:'避开下坠弧线',magma_bomb:'留意熔核裂变',vent_burst:'上下换位 · 穿绿色缺口',polarity:'穿过两极之间',rail_switch:'穿过磁轨绿框',orbit_discharge:'避开环形散射'}
const guides = [
  ['飞到树根高度，让导弹优先击碎两枚树根','上根减少飞种，下根减少根须；永久破甲'],
  ['先飞到绿框高度，诱导巨蝎瞄准岩柱','红色冲锋线锁定后，向上或向下离开'],
  ['上卵封路，下卵追踪：7秒内选择击破','紫卵越少，卵巢散射的射口越少'],
  ['沿缓移暖流蓄热3秒，离开0.8秒开始衰减','每次碎冰永久减甲；紫色冻层会穿盾'],
  ['阀门预告后开2秒，须从外侧进入','冷却阀消热；超载阀5秒易伤但追加预告地火'],
  ['飞到发光节点高度，按顺序击破三个','每个节点永久停一路磁轨；虚框提示下一路']
]
const chapters = themes.map((t,i) => ({
  id:i+1, name:t[0], title:`第${['一','二','三','四','五','六'][i]}章 · ${t[0]}`,
  subtitle:`${t[2]}派系开放 · ${t[8]}管 / 至少${90+i*5}秒`, faction:t[2],
  triggerPipes:t[8], minFrames:(90+i*5)*60, maxFrames:(105+i*5)*60,
  mods:{ scrollSpeedAdd:i*0.36, gapAdd:-i*9, pipeDistanceScale:1-i*0.025,
    monsterSpawnDistance:[560,400,360,330,300,280][i], monsterMaxAlive:[1,2,2,3,3,4][i],
    monsterHpMult:1+i*0.45, floaterTrackSpeed:0.7+i*0.13, batSineAmp:40+i*5,
    eliteChance:0.48+i*0.055, eliteTier:i, eliteHp:[6,12,24,42,66,96][i], bossHp:[150,230,320,430,540,660][i] },
  visual:{theme:t[1],skyTop:t[4],skyBottom:t[5],clouds:i===0,
    sun:{color:'#ffd93b',radius:36},duneColor:'#d5a061',heatParticles:12,
    ground:{base:t[7],strip:t[6],tileA:t[7],tileB:t[4]},
    pipe:{theme:t[1],body:t[7],highlight:t[6],shadow:t[4]}}
}))
const bosses = themes.map((t,i) => ({
  name:t[3], theme:t[1], tier:i, guide:guides[i], survivalFrames:(55+i*5)*60,
  gatherText:`${t[0]}异动……${t[3]}苏醒！`,bulletColor:t[6],
  colors:{body:t[7],wing:t[4],belly:t[6],beak:t[6],eye:'#fff2b8',outline:'#172638'},
  skills:skills[i].map(([name,kind])=>({name,kind,hint:hints[kind]})),
  // 两招连协，第三/六章后半程三连；每一个技能都会轮到。
  combos:i>=2?[[0,2,1],[3,4,5],[1,3],[5,0,4]]:[[0,1],[2,4],[3,5]],
  restFrames:Math.max(20,44-i*5), recoverFrames:Math.max(28,56-i*5),
  warnFrames:Math.max(54,72-i*4), bulletSpeed:4+i*0.4, gateGap:150-i*6
}))
module.exports = { chapters, bosses }
