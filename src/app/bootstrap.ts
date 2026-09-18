import { createFrameLoop } from '../core/frame-loop.ts';
import type { GamePlatform, Point } from '../core/ports.ts';
import { createRun, stepRun } from '../game/run.ts';
import { FACTIONS, STEP } from '../game/model.ts';
import { banish, chooseRelic, chooseSkill, reroll } from '../game/skills.ts';
import { renderGame } from '../scenes/game-scene.ts';
import type { ViewState } from '../scenes/game-scene.ts';

export function bootstrap(platform: GamePlatform) {
  const view: ViewState = {
    screen: 'menu',
    faction: 'E',
    run: null,
    paused: false,
    countdown: 0,
    animation: 0,
    banMode: false,
  };
  let disposed = false,
    hidden = false,
    pendingFlap = false,
    accumulator = 0;
  function start(practice = false) {
    view.run = createRun(platform.randomSeed(), view.faction, practice);
    view.screen = 'game';
    view.paused = false;
    view.countdown = 3;
    view.banMode = false;
    accumulator = 0;
    pendingFlap = false;
  }
  function resumeAfterChoice() {
    pendingFlap = false;
    accumulator = 0;
    view.banMode = false;
    if (view.run?.phase === 'rest') stepRun(view.run);
    view.countdown = view.run?.phase === 'result' ? 0 : 3;
  }
  function tap(point: Point) {
    if (hidden || disposed) return;
    if (view.screen === 'menu') {
      if (point.y >= 307 && point.y <= 434) {
        const col = Math.floor((point.x - 24) / 106),
          row = Math.floor((point.y - 307) / 69);
        const faction = FACTIONS[row * 3 + col];
        if (col >= 0 && col < 3 && row >= 0 && row < 2 && faction)
          view.faction = faction;
      }
      if (point.y >= 468 && point.y <= 512 && point.x >= 30 && point.x <= 330)
        start();
      if (point.y >= 570 && point.y <= 612) start(true);
      return;
    }
    const run = view.run;
    if (!run) return;
    if (run.phase === 'draft') {
      if (point.y >= 157 && point.y <= 471 && point.x >= 23 && point.x <= 337) {
        const i = Math.floor((point.y - 157) / 110),
          id = run.offers[i];
        if (id && (point.y - 157) % 110 <= 94) {
          if (view.banMode) {
            banish(run, id);
            view.banMode = false;
          } else if (chooseSkill(run, id)) resumeAfterChoice();
        }
      } else if (point.y >= 506 && point.y <= 550) {
        if (point.x < 180) reroll(run);
        else if (run.banishes) view.banMode = !view.banMode;
      }
      return;
    }
    if (run.phase === 'reward') {
      if (point.y >= 150 && point.y <= 468) {
        const id = run.relicOffers[Math.floor((point.y - 150) / 112)];
        if (id && (point.y - 150) % 112 <= 94) chooseRelic(run, id);
      }
      return;
    }
    if (run.phase === 'result') {
      if (point.y >= 501 && point.y <= 545) start(run.practice);
      else if (point.y >= 555 && point.y <= 600) {
        view.screen = 'menu';
        view.run = null;
      }
      return;
    }
    if (view.paused) {
      if (point.y >= 335 && point.y <= 379) {
        view.paused = false;
        view.countdown = 3;
        accumulator = 0;
      } else if (point.y >= 408 && point.y <= 450) {
        view.screen = 'menu';
        view.run = null;
        view.paused = false;
      }
      return;
    }
    if (point.x >= 301 && point.y <= 60) {
      view.paused = true;
      pendingFlap = false;
      return;
    }
    if (view.countdown <= 0) pendingFlap = true;
  }
  const loop = createFrameLoop(
    platform,
    (delta) => {
      view.animation += delta;
      if (
        delta > 0.2 &&
        view.screen === 'game' &&
        view.run &&
        !['draft', 'reward', 'result'].includes(view.run.phase)
      ) {
        view.paused = true;
        accumulator = 0;
        pendingFlap = false;
      }
      if (!hidden && !view.paused && view.screen === 'game' && view.run) {
        if (view.countdown > 0) {
          view.countdown = Math.max(0, view.countdown - delta);
          accumulator = 0;
        } else if (!['draft', 'reward', 'result'].includes(view.run.phase)) {
          accumulator += delta;
          let steps = 0;
          while (accumulator >= STEP && steps < 5) {
            stepRun(view.run, pendingFlap);
            pendingFlap = false;
            accumulator -= STEP;
            steps++;
            if (['draft', 'reward', 'result'].includes(view.run.phase)) {
              accumulator = 0;
              break;
            }
          }
        }
      }
      renderGame(platform.surface, view);
    },
    0.25,
  );
  const disposeListeners = [
    platform.onHide(() => {
      hidden = true;
      if (view.screen === 'game') view.paused = true;
      pendingFlap = false;
      accumulator = 0;
      loop.stop();
    }),
    platform.onShow(() => {
      hidden = false;
      loop.start();
    }),
    platform.onTap(tap),
  ];
  loop.start();
  return {
    getState: () => view,
    dispose() {
      if (disposed) return;
      disposed = true;
      loop.stop();
      disposeListeners.forEach((dispose) => dispose());
      platform.dispose();
    },
  };
}
