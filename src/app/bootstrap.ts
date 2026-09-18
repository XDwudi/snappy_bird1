import { createFrameLoop } from '../core/frame-loop.ts';
import type { GamePlatform } from '../core/ports.ts';
import { renderBootScene } from '../scenes/boot-scene.ts';

export function bootstrap(platform: GamePlatform) {
  let inputVerified = false;
  let disposed = false;
  const loop = createFrameLoop(platform, () => {
    renderBootScene(platform.surface, inputVerified);
  });
  const disposeListeners = [
    platform.onHide(loop.stop),
    platform.onShow(loop.start),
    platform.onTap(() => {
      inputVerified = true;
    }),
  ];
  loop.start();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      loop.stop();
      disposeListeners.forEach((dispose) => dispose());
      platform.dispose();
    },
  };
}
