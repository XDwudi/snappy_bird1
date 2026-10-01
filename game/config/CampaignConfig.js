// 1.8.2：六章内容单一事实源。时间均为有效游玩帧（60fps），暂停不计。
const themes = [
  ['蓝天草地','meadow','森芽','古木守卫','#347d63','#79cf9b','#94dc67','#315b42',60,105,120],
  ['流沙遗迹','desert','沙铸','遗迹巨蝎','#d99750','#f3d69a','#d8ae65','#81532f',68,115,200],
  ['暗夜密林','night','织影','月蚀蛛后','#131b38','#494373','#b195ed','#44346d',76,125,340],
  ['极光冰川','glacier','霜脉','冰川魔像','#537fb2','#c8edfa','#90e2f5','#436993',84,135,540],
  ['熔火裂谷','volcano','熔核','熔岩地龙','#391c32','#cb6247','#ff985a','#873f38',92,145,880],
  ['天穹风暴','storm','天枢','风暴机核','#1b2248','#63759c','#b6f6ff','#485688',100,155,1350]
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
  ['飞到树根高度，让导弹优先击碎两枚树根','树根全破：护甲消失，集中攻击本体'],
  ['先飞到绿框高度，诱导巨蝎瞄准岩柱','红色冲锋线锁定后，向上或向下离开'],
  ['飞到紫卵高度，用导弹阻止孵化','紫卵越少，卵巢散射的射口越少'],
  ['在绿框停留蓄热，交替完成三次','碎冰后集中火力；紫色冻层会穿盾'],
  ['绿框停留开阀，交替三次引爆熔核','开阀降低热量；热量满会喷出地火'],
  ['飞到发光节点高度，按顺序击破三个','断路后核心失防；紫色磁轨会穿盾']
]
const chapters = themes.map((t,i) => ({
  id:i+1, name:t[0], title:`第${['一','二','三','四','五','六'][i]}章 · ${t[0]}`,
  subtitle:`${t[2]}派系开放 · ${t[8]}管 / 至少${t[9]}秒`, faction:t[2],
  triggerPipes:t[8], minFrames:t[9]*60, maxFrames:(t[9]+35)*60,
  mods:{ scrollSpeedAdd:i*0.36, gapAdd:-i*9, pipeDistanceScale:1-i*0.025,
    monsterSpawnDistance:[560,400,360,330,300,280][i], monsterMaxAlive:[1,2,2,3,3,4][i],
    monsterHpMult:1+i*0.45, floaterTrackSpeed:0.7+i*0.13, batSineAmp:40+i*5,
    eliteChance:0.48+i*0.055, eliteTier:i, eliteHp:[6,12,24,42,66,96][i], bossHp:t[10] },
  visual:{theme:t[1],skyTop:t[4],skyBottom:t[5],clouds:i===0,
    sun:{color:'#ffd93b',radius:36},duneColor:'#d5a061',heatParticles:12,
    ground:{base:t[7],strip:t[6],tileA:t[7],tileB:t[4]},
    pipe:{body:t[7],highlight:t[6],shadow:t[4]}}
}))
const bosses = themes.map((t,i) => ({
  name:t[3], theme:t[1], tier:i, guide:guides[i], survivalFrames:(100+i*18)*60,
  gatherText:`${t[0]}异动……${t[3]}苏醒！`,bulletColor:t[6],
  colors:{body:t[7],wing:t[4],belly:t[6],beak:t[6],eye:'#fff2b8',outline:'#172638'},
  skills:skills[i].map(([name,kind])=>({name,kind,hint:hints[kind]})),
  // 两招连协，第三/六章后半程三连；每一个技能都会轮到。
  combos:i>=2?[[0,2,1],[3,4,5],[1,3],[5,0,4]]:[[0,1],[2,4],[3,5]],
  restFrames:Math.max(22,48-i*5), recoverFrames:Math.max(32,60-i*5),
  warnFrames:Math.max(54,72-i*4), bulletSpeed:3.85+i*0.37, gateGap:150-i*6
}))
module.exports = { chapters, bosses }
