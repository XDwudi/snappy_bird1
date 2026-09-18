export type Dispose = () => void;
export interface FrameClock {
  requestFrame(callback: (timestampMs: number) => void): number;
  cancelFrame(id: number): void;
}
export interface Viewport {
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Surface {
  viewport(): Viewport;
  clear(color: string): void;
  gradient(top: string, bottom: string): void;
  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    radius?: number,
  ): void;
  circle(x: number, y: number, radius: number, color: string): void;
  line(
    x: number,
    y: number,
    x2: number,
    y2: number,
    color: string,
    width?: number,
  ): void;
  polygon(points: Point[], color: string): void;
  text(
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align?: 'left' | 'center' | 'right',
  ): void;
}
export interface GamePlatform extends FrameClock {
  surface: Surface;
  randomSeed(): number;
  onHide(callback: () => void): Dispose;
  onShow(callback: () => void): Dispose;
  onTap(callback: (point: Point) => void): Dispose;
  dispose(): void;
}
