export const TILE_SIZE = 16;
export const CAMERA_ZOOM = 2;

export const ARENA_W_TILES = 40;
export const ARENA_H_TILES = 30;
export const ARENA_W_PX = ARENA_W_TILES * TILE_SIZE;
export const ARENA_H_PX = ARENA_H_TILES * TILE_SIZE;

export const VIEWPORT_W = ARENA_W_PX * CAMERA_ZOOM;
export const VIEWPORT_H = ARENA_H_PX * CAMERA_ZOOM;

export const PLAYER = {
  hp: 100,
  speed: 80,
  size: 12,
  hitCooldownMs: 500,
  color: 0x6cc1ff,
  dodge: {
    durationMs: 300,
    cooldownMs: 800,
    iframeMs: 400,
    speed: 240,
  },
} as const;

export const WEAPON = {
  fireIntervalMs: 200,
  bulletSpeed: 320,
  bulletDamage: 10,
  bulletSize: 4,
  bulletColor: 0xfff1a6,
} as const;

export const ENEMY = {
  hp: 20,
  contactDamage: 10,
  speed: 48,
  size: 12,
  color: 0xff6c6c,
} as const;

export const WALL = {
  color: 0x444a6a,
} as const;

export const WAVE = {
  killThreshold: 0.8,
  safetyTimeoutMs: 30_000,
  spawnMargin: 1,
} as const;

export const HASH_BYTES = {
  layoutStart: 0,
  layoutLen: 16,
  waveStart: 18,
  waveLen: 4,
} as const;
