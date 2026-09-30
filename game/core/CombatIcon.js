// 新技能用 Canvas 图标，避免不同手机 emoji 字体缺字或图案不一致。
module.exports = function drawCombatIcon(ctx, id, x, y, size) {
  if (!['feather_blade', 'orbit_guard', 'revenge_pulse'].includes(id)) return false
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 32, size / 32)
  ctx.strokeStyle = '#a1f5ff'; ctx.fillStyle = '#e9ffff'; ctx.lineWidth = 2
  if (id === 'orbit_guard') {
    ctx.beginPath(); ctx.arc(0, 0, 12, 0.35, 5.8); ctx.stroke()
    ctx.beginPath(); ctx.arc(11, -5, 4, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(0, -5); ctx.lineTo(5, 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.stroke()
  } else {
    const angles = id === 'revenge_pulse' ? [-0.6, 0, 0.6] : [-0.55]
    for (const angle of angles) {
      ctx.save();ctx.rotate(angle)
      ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-10,-4);ctx.lineTo(-4,0);ctx.lineTo(-10,4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()
    }
  }
  ctx.restore(); return true
}
