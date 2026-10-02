// v1.8.3: four local atlases, loaded once; rendering never blocks gameplay.
const files = { actors: 'game/assets/actor_atlas.png', bosses: 'art-extra/boss_atlas.png', scenery: 'game/assets/scenery_atlas.png', materials: 'art-extra/material_atlas.png' }
const rects = {
  bird0: ['actors',77,134,270,265], bird1: ['actors',448,134,283,265], bird2: ['actors',845,134,270,265],
  bat: ['actors',1190,130,310,268], gunship: ['actors',11,600,373,285],
  stormcaller: ['actors',448,560,254,359], prism: ['actors',838,569,245,340], bomber: ['actors',1190,592,304,337],
  meadow: ['bosses',39,36,453,444], desert: ['bosses',544,51,441,429], night: ['bosses',1057,106,442,374],
  glacier: ['bosses',46,548,430,409], volcano: ['bosses',536,548,477,400], storm: ['bosses',1050,537,450,416]
}
const images = {}, errors = {}
let started = false
function init(factory, loadSubpackage) {
  if (started) return
  if (!factory && typeof wx !== 'undefined' && wx.createImage) factory = () => wx.createImage()
  if (!factory) return
  if (!loadSubpackage && typeof wx !== 'undefined' && wx.loadSubpackage) loadSubpackage = opts => wx.loadSubpackage(opts)
  started = true
  const load = key => {
    const img = factory()
    img.onload = () => { images[key] = img }
    img.onerror = () => { errors[key] = true }
    img.src = files[key]
  }
  load('actors')
  load('scenery')
  const extra = () => { load('bosses'); load('materials') }
  if (loadSubpackage) {
    // Start fetching at boot, while core art and touch input remain usable.
    // Failed downloads retain the existing procedural pixel fallback.
    loadSubpackage({ name: 'art-extra', success: extra, fail: () => { errors.extra = true } })
  } else extra() // Offline tools / older SDK: direct paths, with per-image error fallback.
}

function draw(ctx, id, x, y, w, h) {
  const r = rects[id]
  if (!r || !images[r[0]]) return false
  ctx.save(); ctx.imageSmoothingEnabled = false
  ctx.drawImage(images[r[0]],r[1],r[2],r[3],r[4],Math.round(x),Math.round(y),Math.round(w),Math.round(h))
  ctx.restore(); return true
}
module.exports = { files, rects, images, errors, init, draw }
