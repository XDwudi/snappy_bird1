const A=require('./Assets'),P=require('./Pixel'),I=require('./Icons'),W=require('./World'),Config=require('../config/GameConfig'),C=P.C
function init(){A.init()}
function heartHUD(g,x,y,size=12){
 const a=g.abilitySystem,c=g.ctx,cap=a.maxHp+Config.SHIELD.OVERDRIVE_TEMP_HP_CAP+a.blessingTempHpCapBonus,cols=Math.ceil(cap/2),width=Math.max(74,g.screenW*.5-42),step=Math.min(size+3,width/cols),s=Math.min(size,step-1)
 for(let k=0;k<a.maxHp+a.tempHp;k++)P.heart(c,x+(k%cols)*step,y+Math.floor(k/cols)*14,s,k>=a.maxHp?C.gold:k<a.hp?C.red:'#435363')
}
function hud(g){if(g.state==='ready')return;const c=g.ctx,w=g.screenW,top=g.safeTop,a=g.abilitySystem,e=g.expSystem.getExpBarData(),ch=g.chapterSystem.getHudData(),boss=g.chapterSystem.isBossActive()&&g.boss
 c.save();c.globalAlpha=.72;P.box(c,0,0,w,top+70,C.panel,C.edge);c.globalAlpha=1;heartHUD(g,12,top+5)
 P.text(c,g.score,w*.52,top+18,26,C.paper,'center',true);P.text(c,'Lv.'+e.level,w-12,top+14,14,C.gold,'right',true)
 let sx=w-18
 for(const s of [['echo_wing','feather',a.featherShields],['phoenix','phoenix',(a.owned.get('phoenix')||0)-a.phoenixUsed]])if(a.owned.get(s[0])){P.text(c,'×'+s[2],sx,top+34,10,C.muted,'right');I.draw(c,s[0],sx-29,top+34,14);sx-=48}
 P.bar(c,14,top+45,w-28,9,e.progress,C.green)
 const chapter=g.chapterSystem.getChapter()
 const summary=ch.endless?'无尽 '+Math.floor(ch.seconds/60)+':'+String(ch.seconds%60).padStart(2,'0')+' · 得分×2':ch.rematch?'再战 '+ch.remainingPipes+'管 · 最迟'+ch.deadline+'秒':chapter.name+' · '+ch.pipes+'/'+ch.target+(boss?'':' · '+ch.deadline+'秒内迎战')
 P.text(c,summary,w/2,top+62,10,C.paper,'center')
 if(boss)bossHP(g,w/2,top+77)
 const weather=g.weatherSystem.getActiveEffectInfo(),wy=boss?top+168:top+84
 weather.forEach((v,k)=>{const x=12+k*65;P.box(c,x,wy,60,22,C.panel,C.edge);I.draw(c,v.type,x+12,wy+11,16);P.text(c,v.remaining+'s',x+25,wy+11,10,C.paper)})
 if(!boss&&a.comboCount>0&&a.owned.get('combo_heart'))P.text(c,'连击 '+Math.floor(a.comboCount)+'/'+a.getStat('comboThreshold'),w-12,wy+11,11,C.gold,'right')
 const bottom=Math.min(g.screenH-58,g.safeBottom-47);g._artDockTop=bottom;P.box(c,0,bottom,w,g.screenH-bottom,C.panel,C.edge)
 const factions=a.getFactions().filter(f=>f.tier>0),fy=bottom-12
 if(factions.length){const st=factions.map(f=>f.name+f.count).join(' · ');P.text(c,st,w/2,fy,10,C.paper,'center')}
 const owned=a.getOwnedList(),capacity=Math.max(1,Math.floor((w-46)/34)),show=owned.slice(-capacity),start=(w-(show.length*34+(owned.length>capacity?28:0)))/2
 show.forEach((v,k)=>{const x=start+k*34;P.box(c,x,bottom+9,29,37,C.ink,C.edge);I.draw(c,v.def.id,x+14,bottom+23,22);P.text(c,v.level,x+14,bottom+40,8,C.gold,'center')})
 if(owned.length>capacity)P.text(c,'+'+(owned.length-capacity),start+show.length*34+10,bottom+27,11,C.muted,'center')
 if(!owned.length)P.text(c,'穿越障碍 · 积累经验 · 选择能力',w/2,bottom+28,11,C.muted,'center')
 // Keep endless recovery information and permanent tamed-weather badge discoverable.
 if(ch.endless){const m=g.chapterSystem.getMods();P.text(c,'恢复 '+Math.round(100*m.recoveryRate)+'% · 补给 '+Math.round(m.renewalInterval/60)+'s · 破敌盾 '+Math.floor(g.combat.endlessCharge)+'/'+Math.ceil(20*m.pressure),w/2,bottom-27,9,C.ice,'center')}
 if(g.weatherSystem.tamedWeather){const names={wind:'风',rain:'雨',hail:'冰雹'};P.text(c,'已驯化 · '+names[g.weatherSystem.tamedWeather],w-12,wy+34,10,C.green,'right')}
 c.restore()
}
function bossHP(g,cx,y){const c=g.ctx,b=g.boss;if(!b)return;const w=g.screenW
 c.save();c.globalAlpha=.72;P.box(c,12,y,w-24,85,C.panel,C.edge);c.restore()
 P.text(c,b.name+(b.phase===2?' · 暴怒':''),25,y+13,12,b.phase===2?C.red:C.paper,'left',true)
 const sec=Math.ceil(Math.max(0,g._getBossSurvivalFrames()-g.bossFightFrames)/60)
 P.text(c,g._bossClearMode?(g._bossClearMode==='kill'?'击败通关':'生存通关'):'坚持 '+sec+'秒',w-24,y+13,10,C.gold,'right')
 P.bar(c,24,y+24,w-48,10,b.hp/b.maxHp,b.phase===2?C.red:'#cf8b76')
 const label=b.getActionLabel();P.text(c,label,w/2,y+47,10,b.piercingAttack?C.purple:C.paper,'center')
 const ls=P.lines(c,b.mechanics.label(),w-52,10);ls.slice(0,2).forEach((line,k)=>P.text(c,line,w/2,y+63+k*12,10,b.mechanics.weak?C.gold:C.green,'center'))
}
function ready(g){const c=g.ctx,w=g.screenW,h=g.screenH,y=Math.max(g.safeTop+30,h*.16);c.save()
 P.box(c,24,y,w-48,107,C.panel,C.edge);P.text(c,'SNAPPY BIRD',w/2,y+31,Math.min(29,w/12),C.paper,'center',true);P.text(c,'六章试炼 / 像素飞行冒险',w/2,y+63,12,C.green,'center');P.text(c,'v'+Config.VERSION,w/2,y+85,10,C.muted,'center')
 const by=h*.58;P.box(c,w/2-94,by,188,44,C.panel,C.gold);I.draw(c,'light_feather',w/2-62,by+22,25);P.text(c,'点击屏幕开始',w/2+15,by+22,16,C.paper,'center',true)
 P.box(c,32,h*.72,w-64,71,C.panel,C.edge);P.text(c,'点击拍翅 · 穿越障碍 · 升级选卡',w/2,h*.72+24,11,C.paper,'center');P.text(c,'通关六章，开启无尽冒险',w/2,h*.72+46,11,C.muted,'center')
 if(g.bestScore>0)P.text(c,'最高纪录 '+g.bestScore,w/2,by+65,12,C.ink,'center',true);c.restore()
}
const rarity={common:[C.ice,'普通'],uncommon:[C.green,'稀有'],rare:[C.gold,'珍贵'],epic:[C.purple,'史诗']}
function card(c,b,def,level,extras){const r=rarity[def.rarity]||rarity.common;P.box(c,b.x,b.y,b.w,b.h,C.panel,r[0]);c.save();if(extras.greyReason)c.globalAlpha=.5
 const size=b.w<340?44:50,ix=b.x+12,ty=b.y+17
 P.box(c,ix,b.y+16,size,size,C.ink,C.edge);I.draw(c,def.id,ix+size/2,b.y+16+size/2,size-4)
 const tx=ix+size+12;P.text(c,def.name,tx,ty,14,C.paper,'left',true)
 P.text(c,level?'Lv.'+level+' → '+(level+1):'新能力 · Lv.1',tx,ty+21,11,C.gold)
 const tag=extras.tag==='core'?' · 核心':extras.tag==='synergy'?' · 协同':extras.tag==='anti'?' · 反协同':''
 P.text(c,r[1]+' · '+(def.faction||'祝福')+(def.unlockChapter?' · Ch'+def.unlockChapter:'')+tag,tx,ty+38,10,I.factionColors[def.faction]||C.muted)
 const ls=P.lines(c,def.effectText(level+1),b.w-26,11)
 ls.forEach((l,k)=>P.text(c,l,b.x+13,b.y+77+k*15,11,C.paper))
 if(extras.greyReason)P.text(c,extras.greyReason,b.x+b.w-12,b.y+b.h-13,10,C.red,'right')
 if(extras.tamedMarked)P.text(c,'已驯化',b.x+b.w-12,b.y+17,9,C.green,'right')
 c.restore()
}
function upgrade(g){const c=g.ctx,w=g.screenW,h=g.screenH,choices=g._currentChoices||[],top=g.safeTop+86,bottom=g.safeBottom-23
 c.save();c.fillStyle='rgba(15,29,44,.89)';c.fillRect(0,0,w,h)
 const title={bossCard:'章节大礼包',blessing:'章节祝福',levelup:'升级！'}
 P.text(c,title[g._panelMode]||title.levelup,w/2,g.safeTop+28,25,C.gold,'center',true)
 P.text(c,g._panelMode==='blessing'?'选择一道祝福 · 本局永久':'Lv.'+g.expSystem.level+' · 选择一项能力',w/2,g.safeTop+60,12,C.paper,'center')
 if(g._artChoiceRef!==choices){g._artChoiceRef=choices;g._choiceScroll=0;g._choiceGesture=null}
 const x=16,cw=w-32,gap=10;let offset=0
 const owned=g.abilitySystem.getOwnedList(),layouts=choices.map(def=>{const found=owned.find(v=>v.def.id===def.id),level=found?found.level:0,rows=P.lines(c,def.effectText(level+1),cw-26,11).length,ch=Math.max(106,86+rows*15);const b={x,y:offset,w:cw,h:ch,id:def.id,def,level};offset+=ch+gap;return b})
 g._choiceScrollMax=Math.max(0,offset-gap-(bottom-top));g._choiceScroll=Math.max(0,Math.min(g._choiceScrollMax,g._choiceScroll||0));g._choiceViewport={x:0,y:top,w,h:bottom-top}
 g._cardBounds=[];c.save();c.beginPath();c.rect(0,top,w,bottom-top);c.clip()
 layouts.forEach(b=>{b.y+=top-g._choiceScroll;if(b.y+b.h<top||b.y>bottom)return
  card(c,b,b.def,b.level,{greyReason:g._getCardGreyReason(b.id),tag:g.abilitySystem.owned.get('oracle')?g.abilitySystem.getSynergyTag(b.id,g.weatherSystem.tamedWeather):null,tamedMarked:g._isCardTamedMutex(b.id)})
  const yy=Math.max(top,b.y);g._cardBounds.push({x:b.x,y:yy,w:b.w,h:Math.min(bottom,b.y+b.h)-yy,id:b.id})
 });c.restore()
 if(g._choiceScrollMax>0){const rh=Math.max(24,(bottom-top)*(bottom-top)/(offset-gap)),ry=top+g._choiceScroll/g._choiceScrollMax*(bottom-top-rh);c.fillStyle=C.edge;c.fillRect(w-7,top,3,bottom-top);c.fillStyle=C.gold;c.fillRect(w-7,ry,3,rh)}
 P.text(c,g._choiceScrollMax>0?'上下滑动查看全部 '+choices.length+' 项 · 点击选择':'点击卡牌获得能力',w/2,g.safeBottom-9,10,C.muted,'center');c.restore()
}
function gameover(g){const c=g.ctx,w=g.screenW,h=g.screenH,top=g.safeTop+20;c.save();c.fillStyle='rgba(15,29,44,.90)';c.fillRect(0,0,w,h)
 P.text(c,g.chapterSystem.endless?'无尽旅程结束':'本次冒险结束',w/2,top+16,23,C.paper,'center',true);P.text(c,g.score,w/2,top+65,38,C.gold,'center',true)
 const py=top+103;P.box(c,20,py,w-40,95,C.panel,C.edge)
 P.text(c,'最高纪录 '+g.bestScore,34,py+23,12,C.gold);P.text(c,'等级 Lv.'+g.expSystem.level,w-34,py+23,12,C.ice,'right')
 P.text(c,'存活 '+Math.floor(g.gameTime/3600)+'分'+Math.floor(g.gameTime/60)%60+'秒',34,py+49,11,C.paper);P.text(c,'通过 '+g.pipesPassed+' 管',w-34,py+49,11,C.paper,'right')
 const kills=g.bossClears.filter(v=>v.method==='kill').length;P.text(c,'首领通关 '+g.bossClears.length+' · 击败 '+kills+' · 生存 '+(g.bossClears.length-kills),w/2,py+73,11,C.green,'center')
 const badges=g.bossClears.slice(-6).map(v=>(v.endless?'∞':'Ch'+v.chapter)+(v.method==='kill'?'击败':'生存')).join(' · ');if(badges)P.text(c,badges,w/2,py+108,9,C.gold,'center')
 const owned=g.abilitySystem.getOwnedList(),rowY=py+132;P.text(c,'本局能力 '+owned.length+' 张',w/2,rowY,12,C.muted,'center')
 const cols=Math.floor((w-48)/34),available=Math.max(1,Math.min(3,Math.floor((g.safeBottom-104-rowY)/38))),show=owned.slice(-cols*available)
 show.forEach((v,k)=>{const x=24+k%cols*34,y=rowY+17+Math.floor(k/cols)*38;P.box(c,x,y,29,33,C.panel,C.edge);I.draw(c,v.def.id,x+14,y+13,23);P.text(c,v.level,x+14,y+27,8,C.gold,'center')})
 const bw=(w-56)/2,by=g.safeBottom-59;g._homeBtnBounds={x:20,y:by,w:bw,h:44};g._restartBtnBounds={x:36+bw,y:by,w:bw,h:44}
 P.box(c,20,by,bw,44,C.panel,C.edge);P.text(c,'返回首页',20+bw/2,by+22,14,C.paper,'center')
 P.box(c,36+bw,by,bw,44,C.panel,C.gold);P.text(c,'再飞一次',36+bw*1.5,by+22,14,C.gold,'center',true)
 c.restore()
}
function transition(g){const tr=g.chapterSystem.getTransitionRenderState();if(!tr)return;const c=g.ctx,w=g.screenW,h=g.screenH,T=Config.CHAPTERS.TRANSITION;c.save()
 if(tr.phase==='flash'){c.fillStyle=C.paper;c.globalAlpha=(1-tr.frame/T.FLASH_FRAMES)*.5;c.fillRect(0,0,w,h)}
 else if(tr.phase==='wipe'){const n=Math.ceil(w*tr.frame/T.WIPE_FRAMES/12);c.fillStyle=C.panel;for(let i=0;i<n;i++)c.fillRect(i*12,0,12,h)}
 else{c.globalAlpha=Math.max(0,Math.min(1,tr.frame/15,(T.TITLE_FRAMES-tr.frame)/15));P.box(c,16,h*.38,w-32,116,C.panel,C.gold);P.text(c,tr.title,w/2,h*.38+34,20,C.paper,'center',true);P.lines(c,tr.subtitle,w-64,12).forEach((v,i)=>P.text(c,v,w/2,h*.38+68+i*17,12,C.green,'center'))}
 c.restore()
}
function intro(g){const st=g.chapterSystem.getBossIntroRenderState();if(!st)return;const c=g.ctx,w=g.screenW,h=g.screenH,cfg=Config.BOSS.VARIANTS[g.chapterSystem.getBossIndex()];c.save();c.fillStyle='rgba(15,29,44,.38)';c.fillRect(0,0,w,h)
 if(st.phase!=='vignette'){const y=h*.37;P.box(c,14,y,w-28,173,C.panel,C.gold);P.text(c,cfg.name,w/2,y+25,21,C.paper,'center',true);P.text(c,'破招指引',w/2,y+50,11,C.gold,'center')
 let yy=y+75;cfg.guide.forEach((s,i)=>{const ls=P.lines(c,(i+1)+'. '+s,w-62,11);ls.forEach(l=>{P.text(c,l,30,yy,11,C.paper);yy+=16});yy+=6})
 P.text(c,g.chapterSystem.endless||cfg.tier>=3?'紫色菱纹穿盾 · 必须躲避':'橙色为危险预警 · 绿色为目标',w/2,y+154,10,C.purple,'center')}
 c.restore()
}
function touchStart(g,x,y){if(g.state!=='upgrading'){g.handleTouch(x,y);return}g._choiceGesture={x,y,start:g._choiceScroll||0,moved:false,ref:g._currentChoices}}
function touchMove(g,x,y){const t=g._choiceGesture;if(!t||g.state!=='upgrading')return;if(Math.abs(y-t.y)>6||Math.abs(x-t.x)>10)t.moved=true;if(t.moved)g._choiceScroll=Math.max(0,Math.min(g._choiceScrollMax||0,t.start+t.y-y))}
function touchEnd(g,x,y){const t=g._choiceGesture;g._choiceGesture=null;if(!t||t.moved||g.state!=='upgrading'||t.ref!==g._currentChoices)return;if(Math.abs(y-t.y)<8&&Math.abs(x-t.x)<10)g.handleTouch(x,y)}
module.exports={init,background:W.background,scenery:W.scenery,ground:W.ground,hud,heartHUD,bossHP,ready,upgrade,gameover,transition,intro,touchStart,touchMove,touchEnd,card}
