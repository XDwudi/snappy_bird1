export type Dispose = () => void;

export interface FrameClock {
  requestFrame(callback: (timestampMs: number) => void): number;
  cancelFrame(id: number): void;
}

export interface Viewport {
  width: number;
  height: number;
}

// Only the drawing operations currently needed by the boot scene.
export interface Surface {
  viewport(): Viewport;
  clear(color: string): void;
  text(value: string, x: number, y: number, size: number, color: string): void;
}

export interface GamePlatform extends FrameClock {
  surface: Surface;
  onHide(callback: () => void): Dispose;
  onShow(callback: () => void): Dispose;
  onTap(callback: () => void): Dispose;
  dispose(): void;
}
