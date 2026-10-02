// 固定输入、固定构筑探针，用于前后对照，不代表真人胜率或自然抽卡进程。
const path=require('path'),root=path.resolve(process.argv[2]||path.join(__dirname,'..'))
const Game=require(path.join(root,'game/core/Game')),R=require(path.join(root,'game/abilities/AbilityRegistry'))
require(path.join(root,'game/systems/GameLogger')).enabled=false
const game=()=>{const g=new Game({},{},375,667,null);g.start();return g}
const give=(g,id,lv)=>{for(let i=0;i<Math.min(lv,R.get(id).maxLevel);i++)g.abilitySystem.selectAbility(id)}
function singleFlap(full){const g=game();if(full){for(const id of ['light_feather','tailwind','berserk','storm_child'])give(g,id,9);g.abilitySystem.allBuffLevel=10;g.abilitySystem.hp=1;g.abilitySystem.setWeatherActive(true)}g._applyAbilityStatsToBird();g.bird.y=350;g.flap();let min=350,frames=0;while(g.bird.velocity<0&&frames++<1000){g.bird.update();min=Math.min(min,g.bird.y)}return{rise:350-min,frames,flapForce:g.bird.flapForce}}
function income(base){const g=game(),a=g.abilitySystem;for(const id of ['greed','exp_tide','eye_of_storm','exp_resonance','trophy_wall','storm_child','berserk'])give(g,id,9);a.allBuffLevel=10;a.bossesDefeated=6;a.blessingExpMult=1.45;a.hp=1;a.setWeatherActive(true);a.setWeatherConcurrent(3);g.expSystem.level=40
 let seed=42;const random=Math.random;Math.random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646}
 try {for(let i=0;i<600;i++)g._gainExp(base,'probe',a.getStats())}finally{Math.random=random}
 return{baseExpPerSecond:base,seconds:600,startLevel:40,endLevel:g.expSystem.level,multiplier:a.getStats().expMultiplier,upgrades:g.expSystem.pendingLevelUps}}
function fire(boost){const g=game();give(g,'feather_blade',3);give(g,'seed_bolt',3);if(boost){give(g,'tailwind',5);give(g,'berserk',3);give(g,'storm_child',3);g.abilitySystem.hp=1;g.abilitySystem.allBuffLevel=10;g.abilitySystem.setWeatherActive(true)}let shots=0;g.combat.fire=()=>shots++;for(let i=0;i<600;i++)g.combat.update();return{castsPer10s:shots,cadence:g.abilitySystem.getStats().weaponCadence}}
console.log(JSON.stringify({singleFlap:{base:singleFlap(false),stacked:singleFlap(true)},income:[5,50,100].map(income),fire:{base:fire(false),stacked:fire(true)}},null,2))
