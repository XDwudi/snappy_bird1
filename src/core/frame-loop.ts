import type { FrameClock } from './ports.ts';

/** Runtime timing only; physics should add a fixed-step accumulator when needed. */
export function createFrameLoop(
  clock: FrameClock,
  update: (deltaSeconds: number) => void,
  maxDeltaSeconds = 0.05,
) {
  let running = false;
  let handle: number | undefined;
  let previous: number | undefined;

  function tick(timestampMs: number) {
    if (!running) return;
    handle = undefined;
    const elapsed =
      previous === undefined ? 0 : (timestampMs - previous) / 1000;
    previous = timestampMs;
    try {
      update(Math.max(0, Math.min(elapsed, maxDeltaSeconds)));
    } catch (error) {
      stop();
      throw error;
    }
    if (running) handle = clock.requestFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    previous = undefined;
    handle = clock.requestFrame(tick);
  }

  function stop() {
    running = false;
    previous = undefined;
    if (handle !== undefined) clock.cancelFrame(handle);
    handle = undefined;
  }

  return { start, stop };
}
