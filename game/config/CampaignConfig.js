// 1.1.8：六章内容单一事实源。时间均为有效游玩帧（60fps），暂停不计。
const themes = [
  ['蓝天草地','meadow','森芽','古木守卫','#347d63','#79cf9b','#94dc67','#315b42',60,105,68],
  ['流沙遗迹','desert','沙铸','遗迹巨蝎','#d99750','#f3d69a','#d8ae65','#81532f',68,115,90],
  ['暗夜密林','night','织影','月蚀蛛后','#131b38','#494373','#b195ed','#44346d',76,125,120],
  ['极光冰川','glacier','霜脉','冰川魔像','#537fb2','#c8edfa','#90e2f5','#436993',84,135,155],
  ['熔火裂谷','volcano','熔核','熔岩地龙','#391c32','#cb6247','#ff985a','#873f38',92,145,310],
  ['天穹风暴','storm','天枢','风暴机核','#1b2248','#63759c','#b6f6ff','#485688',100,155,440]
]
// 每套六种不同几何/节拍；连协按前招结束→下一招独立预警，避免随机叠加堵死缺口。
const skills = [
  [['追风叶刃','fan'],['荆棘根墙','gate'],['树根横扫','beam'],['孢子播散','rain'],['藤蔓突进','dash'],['林地复苏','summon']],
  [['毒尾三刺','burst'],['流沙石门','gate'],['地裂钳击','pincer'],['毒针风轮','spiral'],['钻沙冲撞','dash'],['落岩震击','rain']],
  [['蛛丝封路','gate'],['月蚀射线','beam'],['追魂虫群','seek'],['毒卵孵化','summon'],['八足回旋','spiral'],['暗影连刺','burst']],
  [['冰棱扇击','fan'],['冰川断层','pincer'],['霜线冻结','beam'],['暴雪坠晶','rain'],['折光冰镜','split'],['冰山推进','gate']],
  [['熔核喷吐','burst'],['火山喷发','eruption'],['熔岩吐息','beam'],['赤鳞冲锋','dash'],['碎岩爆裂','split'],['地火夹击','pincer']],
  [['磁轨齐射','fan'],['天雷锁定','columns'],['引力之门','gate'],['离子追踪','seek'],['星环裂变','split'],['过载涡旋','spiral']]
]
const chapters = themes.map((t,i) => ({
  id:i+1, name:t[0], title:`第${['一','二','三','四','五','六'][i]}章 · ${t[0]}`,
  subtitle:`${t[2]}派系开放 · ${t[8]}管 / 至少${t[9]}秒`, faction:t[2],
  triggerPipes:t[8], minFrames:t[9]*60,
  mods:{ scrollSpeedAdd:i*0.24, gapAdd:-i*6, pipeDistanceScale:1-i*0.025,
    monsterSpawnDistance:[650,430,400,370,340,310][i], monsterMaxAlive:[1,2,2,3,3,4][i],
    monsterHpMult:1+i*0.45, floaterTrackSpeed:0.7+i*0.13, batSineAmp:40+i*5,
    eliteChance:0.25+i*0.04, bossHp:t[10] },
  visual:{theme:t[1],skyTop:t[4],skyBottom:t[5],clouds:i===0,
    sun:{color:'#ffd93b',radius:36},duneColor:'#d5a061',heatParticles:12,
    ground:{base:t[7],strip:t[6],tileA:t[7],tileB:t[4]},
    pipe:{body:t[7],highlight:t[6],shadow:t[4]}}
}))
const bosses = themes.map((t,i) => ({
  name:t[3], theme:t[1], tier:i, survivalFrames:(60+i*10)*60,
  gatherText:`${t[0]}异动……${t[3]}苏醒！`,bulletColor:t[6],
  colors:{body:t[7],wing:t[4],belly:t[6],beak:t[6],eye:'#fff2b8',outline:'#172638'},
  skills:skills[i].map(([name,kind])=>({name,kind})),
  // 两招连协，第三/六章后半程三连；每一个技能都会轮到。
  combos:i>=2?[[0,2,1],[3,4,5],[1,3],[5,0,4]]:[[0,1],[2,4],[3,5]],
  restFrames:Math.max(35,70-i*6), recoverFrames:Math.max(45,85-i*6),
  warnFrames:Math.max(54,78-i*4), bulletSpeed:3.3+i*0.27, gateGap:160-i*5
}))
module.exports = { chapters, bosses }
