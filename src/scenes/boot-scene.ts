import type { Surface } from '../core/ports.ts';

export function renderBootScene(surface: Surface, inputVerified: boolean) {
  const { width, height } = surface.viewport();
  const centerX = width / 2;
  const centerY = height / 2;
  const titleSize = Math.min(28, width / 13);
  surface.clear('#101c2d');
  surface.text('SNAPPY BIRD', centerX, centerY - 52, titleSize, '#ffffff');
  surface.text('工程骨架已就绪', centerX, centerY, 18, '#8be4c4');
  surface.text(
    inputVerified ? '触摸输入正常' : '轻触屏幕验证输入',
    centerX,
    centerY + 40,
    14,
    '#c6d3e5',
  );
}
