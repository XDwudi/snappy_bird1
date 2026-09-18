import type { GamePlatform } from '../../core/ports.ts';

export function createWechatPlatform(): GamePlatform {
  const canvas = wx.createCanvas();
  const context = canvas.getContext('2d');
  let width = 0,
    height = 0,
    scale = 1,
    offsetX = 0,
    offsetY = 0,
    ratio = 1;
  function resize() {
    const info = wx.getWindowInfo();
    width = info.windowWidth;
    height = info.windowHeight;
    ratio = Math.max(1, Math.min(info.pixelRatio, 2));
    const top = info.safeArea?.top ?? 0;
    const bottom = info.safeArea ? height - info.safeArea.bottom : 0;
    scale = Math.min(width / 360, (height - top - bottom) / 640);
    offsetX = (width - 360 * scale) / 2;
    offsetY = top + (height - top - bottom - 640 * scale) / 2;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(
      scale * ratio,
      0,
      0,
      scale * ratio,
      offsetX * ratio,
      offsetY * ratio,
    );
  }
  resize();
  wx.onWindowResize(resize);
  return {
    surface: {
      viewport: () => ({ width: 360, height: 640 }),
      clear(color) {
        context.fillStyle = color;
        context.fillRect(
          -offsetX / scale,
          -offsetY / scale,
          width / scale,
          height / scale,
        );
      },
      gradient(top, bottom) {
        const fill = context.createLinearGradient(0, 0, 0, 640);
        fill.addColorStop(0, top);
        fill.addColorStop(1, bottom);
        context.fillStyle = fill;
        context.fillRect(0, 0, 360, 640);
      },
      rect(x, y, w, h, color, radius = 0) {
        context.fillStyle = color;
        const r = Math.min(radius, w / 2, h / 2);
        if (!r) {
          context.fillRect(x, y, w, h);
          return;
        }
        context.beginPath();
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.quadraticCurveTo(x + w, y, x + w, y + r);
        context.lineTo(x + w, y + h - r);
        context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        context.lineTo(x + r, y + h);
        context.quadraticCurveTo(x, y + h, x, y + h - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
        context.fill();
      },
      circle(x, y, r, color) {
        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fillStyle = color;
        context.fill();
      },
      line(x, y, x2, y2, color, lineWidth = 1) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x2, y2);
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.stroke();
      },
      polygon(points, color) {
        if (!points[0]) return;
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (const p of points.slice(1)) context.lineTo(p.x, p.y);
        context.closePath();
        context.fillStyle = color;
        context.fill();
      },
      text(value, x, y, size, color, align = 'center') {
        context.fillStyle = color;
        context.font = `${size}px sans-serif`;
        context.textAlign = align;
        context.textBaseline = 'middle';
        context.fillText(value, x, y);
      },
    },
    randomSeed: () => Date.now() >>> 0,
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id),
    onHide(callback) {
      wx.onHide(callback);
      return () => wx.offHide(callback);
    },
    onShow(callback) {
      wx.onShow(callback);
      return () => wx.offShow(callback);
    },
    onTap(callback) {
      const handler = (event: WechatMinigame.OnTouchStartListenerResult) => {
        const touch = event.changedTouches[0];
        if (!touch) return;
        const x = (touch.clientX - offsetX) / scale,
          y = (touch.clientY - offsetY) / scale;
        if (x >= 0 && x <= 360 && y >= 0 && y <= 640) callback({ x, y });
      };
      wx.onTouchStart(handler);
      return () => wx.offTouchStart(handler);
    },
    dispose: () => wx.offWindowResize(resize),
  };
}
