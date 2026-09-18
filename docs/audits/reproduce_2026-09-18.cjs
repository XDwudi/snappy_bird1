// Historical baseline e3866f9 only. These defect-presence assertions SHOULD fail after v1.6.0 fixes.
// Current regression suite: node test/test_v160.js
const assert = require('node:assert/strict');
// Audit reproductions: assertions confirm existing defects, not successful fixes.
const root = require('node:path').resolve(__dirname, '../..');
const Ability = require(root + '/game/systems/AbilitySystem.js');
const Exp = require(root + '/game/systems/ExpSystem.js');
const Game = require(root + '/game/core/Game.js');
const Hail = require(root + '/game/weather/HailEffect.js');
const Missile = require(root + '/game/entities/Missile.js');
require(root + '/game/systems/GameLogger.js').enabled = false;
global.wx = {getStorageSync:()=>'',setStorageSync:()=>{}};
const results = [];
function game() { const g = new Game({}, {}, 375, 667, null); g.start(); return g; }
function select(a,id,n=1) { for(let i=0;i<n;i++)a.selectAbility(id); a.invalidateStats(); }
function check(name,fn){ const evidence=fn(); results.push({name,evidence}); }
check('unowned_combo_invincibility',()=>{
 const a = new Ability(); for(let i=0;i<5;i++)a.onPipePass();
 assert.equal(a.owned.size,0); assert.equal(a.invincibleFrames,180);
 return {owned:0,passes:5,invincibleFrames:a.invincibleFrames};
});
check('boss_hail_bypasses_defeat',()=>{
 const regular=game(); regular.chapterSystem.startBossFight(); regular.abilitySystem.hp=1; regular._handleCollision();
 const hail=game(); hail.chapterSystem.startBossFight(); hail.abilitySystem.hp=1;
 new Hail()._handleHailCollision({x:hail.bird.x,y:hail.bird.y},hail._buildGameCtx());
 assert.equal(regular.abilitySystem.hp,1); assert.equal(hail.abilitySystem.hp,0); assert.notEqual(regular.state,hail.state);
 return {regular:{state:regular.state,hp:regular.abilitySystem.hp},hail:{state:hail.state,hp:hail.abilitySystem.hp}};
});
check('echo_vitality_does_not_update_max_hp',()=>{
 const g=game(); select(g.abilitySystem,'vitality'); select(g.abilitySystem,'chapter_echo');
 g._applyChapterEcho(); assert.equal(g.abilitySystem.owned.get('vitality'),2); assert.equal(g.abilitySystem.maxHp,3);
 return {vitalityLevel:2,maxHp:3,expectedMaxHp:4};
});
check('echo_shield_capacity_remains_after_revert',()=>{
 const g=game(); select(g.abilitySystem,'toughness'); select(g.abilitySystem,'chapter_echo');
 g._applyChapterEcho(); select(g.abilitySystem,'toughness'); g._revertChapterEcho();
 assert.equal(g.abilitySystem.owned.get('toughness'),2); assert.equal(g.abilitySystem.maxShieldLayers,4);
 return {toughnessLevel:2,maxShieldLayers:4,expectedMaxShieldLayers:3};
});
check('bank_cannot_retain_balance_or_earn_interest',()=>{
 let deposits=0; for(let amount=1;amount<=1000;amount++){
  const e=new Exp(); e.configureBank(3); e.addExp(amount,1); if(e.lastBankDeposit>0)deposits++;
  assert.equal(e.bankBalance,0); assert.equal(e.tickBankInterest(),0);
 }
 const e=new Exp(); e.configureBank(3); e.addExp(100,1);
 return {sampleCount:1000,depositsOccurred:deposits,example:{deposit:e.lastBankDeposit,withdraw:e.lastBankWithdraw,balance:e.bankBalance,interest:e.tickBankInterest()}};
});
check('shield_burst_skips_overdrive',()=>{
 const a=new Ability(); select(a,'aegis_overdrive',3); select(a,'shield_burst'); a.shieldLayers=a.maxShieldLayers; a.shieldBurstTimer=1; a.tickCooldowns();
 assert.equal(a.tempHp,0); a.addShieldLayer(1); assert.equal(a.tempHp,1);
 return {burstTempHp:0,addShieldLayerTempHp:1};
});
check('hail_repeatedly_consumes_shields_during_invincibility',()=>{
 const g=game(); select(g.abilitySystem,'toughness',2); g.abilitySystem.shieldLayers=3; g.abilitySystem.invincibleFrames=100;
 const h=new Hail(); const ctx=g._buildGameCtx(); const stone={x:g.bird.x,y:g.bird.y}; h._handleHailCollision(stone,ctx);h._handleHailCollision(stone,ctx);
 assert.equal(g.abilitySystem.shieldLayers,1); assert.equal(g.abilitySystem.invincibleFrames,30);
 return {sameFrameHits:2,shieldsBefore:3,shieldsAfter:1,invincibleBefore:100,invincibleAfter:30};
});
check('missile_left_boundary_not_reclaimed',()=>{
 const m=new Missile(100,300,null,Math.PI); for(let i=0;i<1000;i++)m.update(1);
 assert.ok(m.x < -1000); assert.equal(m.isOffscreen(375,667),false);
 return {x:m.x,y:m.y,isOffscreen:m.isOffscreen(375,667)};
});
check('bank_suppresses_enlightenment',()=>{
 const plain=new Exp(); plain.configureEnlighten(1); plain.addExp(36,1);
 const bank=new Exp(); bank.configureEnlighten(1); bank.configureBank(1); bank.addExp(36,1);
 assert.equal(plain.level,3); assert.equal(bank.level,2);
 return {withoutBank:{level:plain.level,enlightenUsed:plain.enlightenUsed},withBank:{level:bank.level,enlightenUsed:bank.enlightenUsed}};
});
console.log(JSON.stringify(results,null,2));
