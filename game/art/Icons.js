const P=require('./Pixel'), C=P.C
// Literal silhouettes shared by pickups, cards and HUD. Badges express effects, never binary IDs.
const glyphs={
 feather:['.......aa.','......acca','.....accca','....accca.','...accca..','..accca...','.accca....','..aca.....','.aa.......','a.........'],
 shield:['....aa....','..aaccaa..','.acccccca.','.acddccca.','.acddccca.','..acccca..','..acccca..','...acca...','....aa....','..........'],
 heart:['.aa..aa...','acccaacca.','accccccca.','accccccca.','.accccca..','..accca...','...aca....','....a.....','..........','..........'],
 wind:['......ccc.','.....c..dc','..ccccc.dc','.......cc.','.ccccccc..','........dc','..cccccdcc','.....dc...','....cc....','..........'],
 clock:['...aaaa...','..acccca..','.acddccca.','acccdcccc a'.replace(/ /g,''),'acccdcccc a'.replace(/ /g,''),'acccddcca.','.acccccca.','..acccca..','...aaaa...','..........'],
 crystal:['....a.....','...aca....','..acdca...','.acddcca..','acdddccca.','.acddcca..','..acdca...','...aca....','....a.....','..........'],
 flame:['.....a....','....aca...','....acca..','..a.accca.','.acacddca.','accccddcca','acccdddcca','.accddcca.','..acccca..','...aaaa...'],
 star:['....a.....','...aca....','...aca....','aaaaccaaaa','.acddddca.','..acddca..','..acccca..','.accaacca.','.aa....aa.','..........'],
 bolt:['.....aaa..','....acca..','...acca...','..acccaaa.','.acccccca.','..aaaacca.','....acca..','...acca...','..aaa.....','..........'],
 leaf:['......aaa.','....aaccca','...acddcca','..acddccca','.acddccca.','.acdccca..','.acccca...','..acca....','.aa.......','..........'],
 eye:['..........','...aaaa...','.aaccccaa.','acccddccca','accddddcca','.aaccccaa.','...aaaa...','..........','..........','..........'],
 bow:['....aaa...','...ac.ca..','..ac..ca..','.ac.dddca.','aacdddddda','.ac.dddca.','..ac..ca..','...ac.ca..','....aaa...','..........'],
 potion:['...aaaa...','...acca...','...acca...','..acccca..','.accddcca.','.acdddcca.','.acdddcca.','.acdddcca.','..aaaaaa..','..........'],
 book:['.aaaaaaa..','acccaccca.','acdcacdca.','acdcacdca.','acccaccca.','acdcacdca.','acccaccca.','.aaaaaaa..','....a.....','..........'],
 crown:['a...a...a.','ac.ac.ac a.'.replace(/ /g,''),'accacacca.','accccccca.','.acddcca..','.accccca..','.aaaaaaa..','..........','..........','..........'],
 dice:['..aaaaaa..','.acccccca.','.acdcdcca.','.acccccca.','.acddccca.','.acccccca.','.acdcdcca.','.acccccca.','..aaaaaa..','..........'],
 missile:['....ee....','...eeee...','...ahha...','...ahha...','...affa...','...ahha...','..eahhae..','.eeahhaee.','...agga...','....gg....'],
 boot:['..aaaa....','..acca....','..acca....','..acca....','..accaaa..','..accccca.','.acccccca.','.aaaaaaaa.','..........','..........'],
 coin:['...aaaa...','..acccca..','.acddccca.','.acdcccca.','.acddccca.','.acccdcca.','.acddccca.','..acccca..','...aaaa...','..........'],
 rain:['..aaaa....','.accccaa..','accccccca.','.aaaaaaa..','..........','..c..c..c.','.c..c..c..','..........','..........','..........'],
 node:['...aaaa...','...acca...','...aaaa...','....d.....','.adddddda.','aacaaaacaa','acca..acca','aaaa..aaaa','..........','..........']
}
Object.assign(glyphs,{
 spear:['.......aa.','......aca.','.....acda.','....acdca.','....acca..','...aba....','..aba.....','.aba......','aba.......','aa........'],
 vortex:['..cccccc..','.cc....cc.','cc..cc..cc','c..caac..c','c.ca..ac.c','c.ca..ac.c','c..caac..c','cc..cc..cc','.cc....cc.','..cccccc..'],
 bird:['..........','.....aaa..','....accda.','a..acccdde','accacccca.','acccccca..','.acccca...','..aaaa....','...bb.....','..........'],
 magnet:['.aaa..aaa.','.aec..cea.','.aec..cea.','.acc..cca.','.acc..cca.','.acc..cca.','..acccca..','...acca...','....aa....','..........'],
 crate:['.aaaaaaaa.','acccccccca','adddddddda','acccaaacca','accaddacca','accaddacca','acccaaacca','acccccccca','.aaaaaaaa.','..........'],
 target:['...cccc...','.cc....cc.','.c..cc..c.','c..caac..c','c.ca..ac.c','c.ca..ac.c','c..caac..c','.c..cc..c.','.cc....cc.','...cccc...'],
 umbrella:['....aa....','..aac caa..'.replace(/ /g,''),'.acccccca.','acccccccca','aaaaaaaaaa','....dd....','....dd....','....dd..d.','.....ddd..','..........'],
 beak:['..aa......','.acaaa....','accddd aaa.'.replace(/ /g,''),'accdddddda','accdddaaa.','.acaaa....','..aa......','..........','..........','..........'],
 wing:['a........a','ac......ca','acc....cca','accc..ccca','.acccccca.','..acddca..','...acca...','....aa....','..........','..........'],
 skull:['..aaaaaa..','.acccccca.','acccccccca','accaa aacca'.replace(/ /g,''),'accaa aacca'.replace(/ /g,''),'acccccccca','.acc a cca.'.replace(/ /g,''),'..acccca..','..a ca ca..'.replace(/ /g,''),'..........'],
 portal:['..cccccc..','.cc....cc.','cc...d..cc','cc...dd.cc','ccdddddddc','ccdddddddc','cc...dd.cc','cc...d..cc','.cc....cc.','..cccccc..'],
 burst:['c...c...c.','.c..c..c..','..c.a.c...','...aca....','ccaacaaacc','...aca....','..c.a.c...','.c..c..c..','c...c...c.','..........'],
 chain:['..cccc....','.cc..cc...','cc....cc..','.cc..cc...','..ccccc...','...ccccc..','...cc..cc.','..cc....cc','...cc..cc.','....cccc..'],
 trophy:['..aaaaaa..','aaaccccaaa','acaccccaca','acaccccaca','.aaccccaa.','...acca...','....cc....','....cc....','..acccca..','..aaaaaa..'],
 gate:['aaa....aaa','aca....aca','aca.cc.aca','aca.cc.aca','aacaaccaac','...cccc...','...cccc...','aacaaccaac','aca.cc.aca','aaa....aaa'],
 valve:['....aa....','..aac caa..'.replace(/ /g,''),'.acccccca.','.acaccaca.','aac ca ccaa'.replace(/ /g,''),'.acaccaca.','.acccccca.','..aac caa..'.replace(/ /g,''),'....aa....','..........'],
 root:['....cc....','...acca...','..acc ca...'.replace(/ /g,''),'...abba...','...abba...','..abbbba..','.abbabba..','abb.ab.ba.','ab..ab..ba','b...b....b'],
 plus:['..........','....cc....','....cc....','..cccccc..','..cccccc..','....cc....','....cc....','..........','..........','..........'],
 up:['....cc....','...cccc...','..cccccc..','.cc.cc.cc.','....cc....','....cc....','....cc....','....cc....','..........','..........'],
 down:['....cc....','....cc....','....cc....','....cc....','.cc.cc.cc.','..cccccc..','...cccc...','....cc....','..........','..........']
})
const colors={spear:C.gold,vortex:C.purple,bird:C.gold,bolt:C.gold,feather:C.paper,shield:C.ice,heart:C.red,wind:C.ice,clock:C.gold,crystal:C.ice,flame:C.red,star:C.gold,leaf:C.green,eye:C.purple,bow:C.gold,potion:C.green,book:C.gold,crown:C.gold,dice:C.purple,missile:C.red,boot:C.gold,coin:C.gold,rain:C.ice,node:C.purple,magnet:C.red,crate:C.green,target:C.red,umbrella:C.ice,beak:C.gold,wing:C.gold,skull:C.purple,portal:C.purple,burst:C.red,chain:C.gold,trophy:C.gold,gate:C.green,valve:C.red,root:C.green,plus:C.green,up:C.paper,down:C.paper}
const spec={}
function map(glyph,ids,badge){ids.split(' ').forEach(id=>{spec[id]={glyph,color:colors[glyph],badge:badge||null}})}
map('feather','feather_blade');map('feather','light_feather','up');map('feather','revenge_pulse','burst');map('feather','iron_feather','shield');map('feather','wind_rider','wind');map('feather','phantom_edge','up')
map('shield','toughness shield_pack','plus');map('shield','orbit_guard','feather');map('shield','shield_burst','clock');map('shield','bounce_shield','up');map('shield','mirror_shield','burst');map('shield','aegis_overdrive','heart');map('shield','thick_skin','skull');map('shield','physique','clock');map('shield','survivor_instinct','heart');map('shield','dune_cache','gate');map('shield','steady_charm','wind')
map('heart','vitality health_pack bless_vitality','plus');map('heart','regeneration','clock');map('heart','combo_heart','shield');map('heart','seed_harvest','leaf');map('heart','blood_pact','down')
map('wind','wind_reader','shield');map('wind','climate_adapt','down');map('wind','tailwind','feather');map('wind','eye_of_storm','eye');map('umbrella','raincoat');map('portal','teleport');map('bird','agile edge_focus','down')
map('clock','time_warp slow_world speed_pack','down');map('clock','time_crystal','crystal');map('wing','phoenix','heart');map('wing','echo_wing','shield');map('flame','berserk','heart')
map('magnet','magnet');map('crystal','exp_resonance exp_pack','plus');map('crystal','greed','up');map('crystal','enlightenment','down');map('crystal','exp_tide','rain');map('star','double_score','plus');map('star','lucky','plus')
map('crate','scavenger','magnet');map('crate','supply_line','clock');map('leaf','combo_seed','chain');map('gate','pipe_sense shrink_ray','up');map('beak','iron_beak')
map('missile','missile missile_rack');map('missile','missile_barrage','clock');map('missile','missile_storm','burst');map('missile','missile_link','chain');map('missile','boss_slayer','crown');map('missile','hunter_mark','target')
map('eye','oracle','book');map('dice','chaos_dice','wind');map('boot','nomad','shield');map('book','chapter_echo','up');map('trophy','trophy_wall');map('crown','chapter_master')
map('leaf','seed_bolt bless_growth');map('spear','sand_lance bless_hunt');map('feather','shadow_echo','plus');map('skull','venom_thread');map('crystal','ice_crystal','shield');map('spear','frost_lance','crystal');spec.frost_lance.color=C.ice;map('crystal','frost_shell','burst');map('burst','magma_core','flame');map('flame','cinder_execution','target');map('bolt','storm_child','feather');map('bolt','storm_chain','chain');map('vortex','singularity','burst')
Object.keys(glyphs).forEach(id=>{if(!spec[id])spec[id]={glyph:id,color:colors[id]||C.gold,badge:null}})
const factionColors={森芽:C.green,沙铸:C.gold,织影:C.purple,霜脉:C.ice,熔核:C.red,天枢:'#9bc5ea'}
function pixels(c,glyph,x,y,size,color){
 const k=size/12,palette={a:C.ink,b:'#a87746',c:color,d:C.paper,e:C.red,f:C.ice,g:C.gold,h:C.paper}
 glyphs[glyph].forEach((row,j)=>{for(let i=0;i<row.length;i++)if(palette[row[i]]){c.fillStyle=palette[row[i]];c.fillRect(Math.round(x+(i+1)*k),Math.round(y+(j+1)*k),Math.ceil(k),Math.ceil(k))}})
}
function draw(c,id,x,y,size=24){
 const s=spec[id]||spec.star;c.save();pixels(c,s.glyph,x-size/2,y-size/2,size,s.color)
 // Full cards use a recognizable secondary symbol. Tiny HUD icons keep only the silhouette.
 if(s.badge&&size>=28){const bs=size*.4,bx=x+size*.15,by=y+size*.15;P.box(c,bx,by,bs,bs,C.panel,C.edge);pixels(c,s.badge,bx,by,bs,colors[s.badge]||C.paper)}
 if(['exp_pack','exp_resonance','enlightenment','exp_tide','greed'].includes(id)&&size>=24)P.text(c,'XP',x,y+1,Math.max(8,size*.24),C.ink,'center',true)
 if(id==='double_score'&&size>=24)P.text(c,'2×',x,y,Math.max(8,size*.27),C.ink,'center',true)
 c.restore();return true
}
module.exports={draw,spec,glyphs,factionColors}
