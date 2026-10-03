const P=require('./Pixel'),C=P.C,R=require('../abilities/AbilityRegistry')
const inside=(b,x,y)=>b&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h
function upgrade(g){
 const c=g.ctx,w=g.screenW,top=g.safeTop+104,bottom=g.safeBottom-116,choices=g._currentChoices||[]
 c.save();c.fillStyle='rgba(15,29,44,.96)';c.fillRect(0,0,w,g.screenH)
 const titles={levelup:'选择能力',bossGrowth:'首领成长奖励',specialization:'选择主专精',apex:'选择专精分支',rest:'章间休息',adjustFrom:'选择要替换的卡',adjustTo:'选择替换目标',adjustConfirm:'调整预览',respec:'更换专精'}
 P.text(c,titles[g._panelMode]||'构筑调整',w/2,g.safeTop+24,22,C.gold,'center',true)
 const n=[...g.abilitySystem.owned.keys()].filter(id=>R.get(id).slotType==='component').length
 P.text(c,`组件 ${n}/3 · 被动 ${g.abilitySystem.owned.size-n}/6 · 进化 ${g.build.evolutions.length}/2`,w/2,g.safeTop+51,11,C.paper,'center')
 P.text(c,g.build.route()?g.build.route().name:'首领战后选择专精',w/2,g.safeTop+74,11,C.ice,'center')
 let offset=0;const layouts=choices.map(d=>{const level=g.abilitySystem.owned.get(d.id)||0,recipe=g.build.recipeText(d.id),body=d.effectText(Math.min(d.maxLevel||1,level+1))+(recipe?'\n'+recipe:'')
  const lines=body.split('\n').flatMap(s=>P.lines(c,s,w-60,11)),h=Math.max(98,54+lines.length*16)
  const b={x:16,y:offset,w:w-32,h,id:d.id,d,lines,level};offset+=h+10;return b})
 g._choiceScrollMax=Math.max(0,offset-10-(bottom-top));g._choiceScroll=Math.max(0,Math.min(g._choiceScroll||0,g._choiceScrollMax));g._choiceViewport={x:0,y:top,w,h:bottom-top};g._cardBounds=[]
 c.save();c.beginPath();c.rect(0,top,w,Math.max(0,bottom-top));c.clip()
 for(const b of layouts){b.y+=top-g._choiceScroll;if(b.y+b.h<top||b.y>bottom)continue
  P.box(c,b.x,b.y,b.w,b.h,C.panel,g._choiceSelected===b.id?C.gold:C.edge)
  P.text(c,b.d.name,b.x+12,b.y+20,14,C.paper,'left',true)
  P.text(c,({common:'普通',uncommon:'稀有',rare:'珍贵',epic:'史诗'})[b.d.rarity]||'',b.x+b.w-12,b.y+20,10,C.gold,'right')
  if(b.d.slotType)P.text(c,(b.d.slotType==='component'?'组件':'被动')+' · '+(b.level?'Lv.'+b.level+' → '+(b.level+1):'新能力'),b.x+12,b.y+41,10,C.ice)
  b.lines.forEach((s,i)=>P.text(c,s,b.x+12,b.y+61+i*16,11,C.paper))
  const y=Math.max(top,b.y);g._cardBounds.push({x:b.x,y,w:b.w,h:Math.min(bottom,b.y+b.h)-y,id:b.id})
 }c.restore()
 if(g._choiceScrollMax){const h=Math.max(20,(bottom-top)*(bottom-top)/offset);c.fillStyle=C.gold;c.fillRect(w-7,top+(bottom-top-h)*g._choiceScroll/g._choiceScrollMax,3,h)}
 const selected=choices.find(d=>d.id===g._choiceSelected),label=g._checkpointError?'保存失败，请重试或继续旅程':selected?'已选：'+selected.name:'先点选卡牌，再按确认；滑动不会选择'
 P.lines(c,label,w-32,11).slice(0,2).forEach((s,i)=>P.text(c,s,w/2,bottom+16+i*14,11,C.gold,'center'))
 const canRoll=['levelup','bossGrowth'].includes(g._panelMode)
 g._rerollBounds=canRoll?{x:16,y:g.safeBottom-60,w:94,h:44}:null
 g._confirmBounds={x:canRoll?120:16,y:g.safeBottom-60,w:w-(canRoll?136:32),h:44}
 if(canRoll){P.box(c,16,g.safeBottom-60,94,44,C.panel,C.edge);P.text(c,'重掷 '+g.build.rerolls,63,g.safeBottom-38,12,C.muted,'center')}
 const b=g._confirmBounds;P.box(c,b.x,b.y,b.w,b.h,C.panel,selected?C.gold:C.edge);P.text(c,selected?'确认选择':'请先点选',b.x+b.w/2,b.y+22,14,selected?C.gold:C.muted,'center',true)
 c.restore()
}
function touchStart(g,x,y){
 if(g._suspended)return
 if(g.state!=='upgrading'){g.handleTouch(x,y);return}
 if(Date.now()-g._choiceOpenedAt<350)return
 const target=inside(g._confirmBounds,x,y)?'confirm':inside(g._rerollBounds,x,y)?'reroll':inside(g._choiceViewport,x,y)?'cards':null
 if(target)g._choiceGesture={x,y,start:g._choiceScroll||0,moved:false,epoch:g._choiceEpoch,target,selected:g._choiceSelected}
}
function touchMove(g,x,y){const t=g._choiceGesture;if(!t)return;if(Math.hypot(x-t.x,y-t.y)>8)t.moved=true;if(t.moved&&t.target==='cards')g._choiceScroll=Math.max(0,Math.min(g._choiceScrollMax||0,t.start+t.y-y))}
function touchEnd(g,x,y){const t=g._choiceGesture;g._choiceGesture=null;if(!t||t.moved||g.state!=='upgrading'||t.epoch!==g._choiceEpoch||Math.hypot(x-t.x,y-t.y)>8)return
 if(t.target==='confirm'&&inside(g._confirmBounds,x,y)&&t.selected&&t.selected===g._choiceSelected&&Date.now()-(g._choiceSelectedAt||0)>=250){g.selectAbility(t.selected);return}
 if(t.target==='reroll'&&inside(g._rerollBounds,x,y)){g.rerollChoices();return}
 if(t.target==='cards'){const b=g._cardBounds.find(b=>inside(b,x,y));if(b&&b.h>=24){g._choiceSelected=b.id;g._choiceSelectedAt=Date.now()}}
}
module.exports={upgrade,touchStart,touchMove,touchEnd}
