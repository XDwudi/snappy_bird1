export type Faction = 'E' | 'S' | 'F' | 'N' | 'I' | 'A';
export type Phase = 'flight' | 'boss' | 'rest' | 'draft' | 'reward' | 'result';
export type Weather = 'clear' | 'wind' | 'rain' | 'heat' | 'fire';
export interface Gate {
  id: number;
  x: number;
  center: number;
  gap: number;
  passed: boolean;
  hit: boolean;
  ghost: boolean;
}
export interface Enemy {
  id: number;
  kind: 'cloud' | 'bee' | 'moth' | 'elite' | 'boss';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  age: number;
  cooldown: number;
  aimY: number;
  burns: { ticks: number; dps: number; source: 'fire' | 'poison' }[];
  frostHits: number;
  frozen: number;
  slow: number;
  mark: number;
  markExpiry: number;
  firework: number;
}
export interface Shot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  hostile: boolean;
  life: number;
}
export interface Spark {
  x: number;
  y: number;
  x2: number;
  y2: number;
  color: string;
  life: number;
}
export interface Run {
  seed: number;
  worldRng: number;
  draftRng: number;
  tick: number;
  id: number;
  stageTick: number;
  chapter: number;
  chapterComplete: boolean;
  weather: Weather;
  phase: Phase;
  returnPhase: 'flight' | 'boss' | 'rest';
  practice: boolean;
  bird: {
    y: number;
    vy: number;
    hp: number;
    maxHp: number;
    shield: number;
    invulnerable: number;
  };
  gates: Gate[];
  enemies: Enemy[];
  shots: Shot[];
  sparks: Spark[];
  weapons: Faction[];
  skills: Record<string, number>;
  weaponCooldowns: Record<Faction, number>;
  offers: string[];
  rerolls: number;
  bans: string[];
  banishes: number;
  upgrades: number;
  bonusXp: number;
  scheduledUpgrades: number;
  pendingUpgrades: number;
  relics: string[];
  relicOffers: string[];
  gateCount: number;
  precise: number;
  kills: number;
  damageDealt: number;
  lastHit: string;
  charge: number;
  chargeExpiry: number;
  rhythm: number;
  rhythmExpiry: number;
  graze: boolean;
  shieldCooldown: number;
  echoCooldown: number;
  explosionCooldown: number;
  spawnGate: number;
  spawnEnemy: number;
  bossStarted: boolean;
  bossDefeated: boolean;
  eliteSpawned: boolean;
  elitesKilled: number;
  bossesKilled: number;
  warningY: number;
  warningTicks: number;
  fireX: number;
  fireWarning: number;
  won: boolean;
  history: string[];
  counters: Record<string, number>;
  cooldowns: Record<string, number>;
  triggers: Record<string, number>;
  lastFlap: number;
  fallingTicks: number;
  hitsTaken: number;
}
export const WIDTH = 360;
export const HEIGHT = 640;
export const BIRD_X = 90;
export const STEP = 1 / 60;
export const UPGRADE_XP = [15, 30, 45, 62, 80, 110, 125, 132];
export const FACTIONS: Faction[] = ['E', 'S', 'F', 'N', 'I', 'A'];
export const FACTION_NAMES: Record<Faction, string> = {
  E: '烬羽',
  S: '鸣雷',
  F: '霜镜',
  N: '森灵',
  I: '铁翼',
  A: '星轨',
};
export const COLORS: Record<Faction, string> = {
  E: '#ffac70',
  S: '#c5a4ff',
  F: '#87e2ff',
  N: '#a9e7a2',
  I: '#d4e1ee',
  A: '#f4d580',
};
export function random(state: Run, stream: 'worldRng' | 'draftRng'): number {
  let x = state[stream] | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state[stream] = x >>> 0;
  return state[stream] / 4294967296;
}
export function rank(run: Run, id: string): number {
  return run.skills[id] ?? 0;
}
export function value(run: Run, id: string, values: number[]): number {
  return values[rank(run, id) - 1] ?? 0;
}
export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
export function count(run: Run, key: string, amount = 1) {
  run.counters[key] = (run.counters[key] ?? 0) + amount;
  return run.counters[key];
}
export function trigger(run: Run, key: string) {
  run.triggers[key] = (run.triggers[key] ?? 0) + 1;
}
