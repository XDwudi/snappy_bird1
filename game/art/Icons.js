const P=require('./Pixel'), C=P.C
// Semantic, reusable pixel glyphs; every ability gets an explicit glyph/accent/mark.
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
 missile:['......aa..','.....acca.','....acdda.','...acdda..','..acdda...','.aacda....','accaa.....','.aa.......','a.........','..........'],
 boot:['..aaaa....','..acca....','..acca....','..acca....','..accaaa..','..accccca.','.acccccca.','.aaaaaaaa.','..........','..........'],
 coin:['...aaaa...','..acccca..','.acddccca.','.acdcccca.','.acddccca.','.acccdcca.','.acddccca.','..acccca..','...aaaa...','..........'],
 rain:['..aaaa....','.accccaa..','accccccca.','.aaaaaaa..','..........','..c..c..c.','.c..c..c..','..........','..........','..........'],
 node:['...aaaa...','...acca...','...aaaa...','....d.....','.adddddda.','aacaaaacaa','acca..acca','aaaa..aaaa','..........','..........']
}
const groups={
 feather:'feather_blade light_feather agile echo_wing iron_feather phantom_edge revenge_pulse',
 shield:'orbit_guard toughness physique shield_burst bounce_shield mirror_shield aegis_overdrive thick_skin dune_cache',
 heart:'vitality regeneration combo_heart seed_harvest blood_pact bless_vitality health_pack',
 wind:'tailwind wind_reader wind_rider climate_adapt wind steady_charm', clock:'time_warp slow_world time_crystal speed_pack',
 crystal:'ice_crystal frost_lance frost_shell hail', flame:'phoenix berserk magma_core cinder_execution',
 star:'lucky double_score exp_resonance enlightenment exp_pack', leaf:'combo_seed seed_bolt bless_growth',
 eye:'survivor_instinct edge_focus pipe_sense eye_of_storm oracle hunter_mark',
 bolt:'storm_child storm_chain lightning', bow:'boss_slayer iron_beak sand_lance bless_hunt',
 potion:'supply_line scavenger', book:'chapter_echo trophy_wall chapter_master', crown:'greed',
 dice:'chaos_dice', missile:'missile_rack missile_barrage missile_storm missile_link missile',
 boot:'teleport nomad', coin:'magnet', rain:'raincoat exp_tide rain', node:'shrink_ray shadow_echo venom_thread singularity shield_pack'
}
const colors={bolt:C.gold,feather:C.paper,shield:C.ice,heart:C.red,wind:C.ice,clock:C.gold,crystal:C.ice,flame:C.red,star:C.gold,leaf:C.green,eye:C.purple,bow:C.gold,potion:C.green,book:C.gold,crown:C.gold,dice:C.purple,missile:C.red,boot:C.gold,coin:C.gold,rain:C.ice,node:C.purple}
const spec={};Object.keys(groups).forEach((g)=>groups[g].split(' ').forEach((id,i)=>{spec[id]={glyph:g,mark:i,color:colors[g]}}))
Object.keys(glyphs).forEach(id=>{if(!spec[id])spec[id]={glyph:id,mark:0,color:colors[id]||C.gold}})
const factionColors={森芽:C.green,沙铸:C.gold,织影:C.purple,霜脉:C.ice,熔核:C.red,天枢:'#9bc5ea'}
function draw(c,id,x,y,size=24) {
 const s=spec[id]||{glyph:'star',mark:0,color:C.gold}, rows=glyphs[s.glyph]
 c.save();c.translate(Math.round(x-size/2),Math.round(y-size/2));const k=size/12
 const palette={a:C.ink,b:'#a87746',c:s.color,d:C.paper}
 rows.forEach((row,j)=>{for(let i=0;i<row.length;i++)if(palette[row[i]]){c.fillStyle=palette[row[i]];c.fillRect(Math.round((i+1)*k),Math.round((j+1)*k),Math.ceil(k),Math.ceil(k))}})
 // Secondary runes identify variants even in a monochrome faction palette.
 if(s.mark>0){c.fillStyle=C.ink;c.fillRect(size-6,size-6,7,7);c.fillStyle=s.color;for(let i=0;i<4;i++)if(s.mark&(1<<i))c.fillRect(size-5+(i%2)*3,size-5+Math.floor(i/2)*3,2,2)}
 c.restore();return true
}
module.exports={draw,spec,glyphs,factionColors}
