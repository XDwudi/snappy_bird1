import type { GamePlatform } from '../../core/ports.ts';

export function createWechatPlatform(): GamePlatform {
  const canvas = wx.createCanvas();
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;

  function resize() {
    const info = wx.getWindowInfo();
    width = info.windowWidth;
    height = info.windowHeight;
    // Limit backing-store memory on high-DPI devices.
    const ratio = Math.max(1, Math.min(info.pixelRatio, 2));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.scale(ratio, ratio);
  }
  resize();
  wx.onWindowResize(resize);

  return {
    surface: {
      viewport: () => ({ width, height }),
      clear(color) {
        context.fillStyle = color;
        context.fillRect(0, 0, width, height);
      },
      text(value, x, y, size, color) {
        context.fillStyle = color;
        context.font = `${size}px sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(value, x, y);
      },
    },
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
      wx.onTouchStart(callback);
      return () => wx.offTouchStart(callback);
    },
    dispose: () => wx.offWindowResize(resize),
  };
}
