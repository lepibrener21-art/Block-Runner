import type { BlockData } from '../../data/types.ts';
import { Rng } from '../../rng/rng.ts';
import {
  ARENA_H_PX,
  ARENA_H_TILES,
  ARENA_W_PX,
  ARENA_W_TILES,
  HASH_BYTES,
  WAVE,
  TILE_SIZE,
} from '../constants.ts';
import type { Level, SpawnEdge, SpawnPoint, WaveSpec, Wall } from './types.ts';

const SPAWN_GUARD_TILES = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashSlice(hash: string, byteStart: number, byteLen: number): string {
  return hash.slice(byteStart * 2, (byteStart + byteLen) * 2);
}

function totalEnemiesFor(txCount: number): number {
  const raw = 4 * Math.sqrt(Math.max(1, txCount));
  return clamp(Math.floor(raw), 6, 100);
}

function waveCountFor(total: number): number {
  const raw = Math.ceil(Math.log2(Math.max(2, total / 5)));
  return clamp(raw, 2, 8);
}

function splitEnemiesAcrossWaves(total: number, waveCount: number): number[] {
  const counts: number[] = [];
  let remaining = total;
  for (let i = 0; i < waveCount; i++) {
    const wavesLeft = waveCount - i;
    const isLast = wavesLeft === 1;
    const count = isLast ? remaining : Math.ceil(remaining / wavesLeft);
    counts.push(count);
    remaining -= count;
  }
  return counts;
}

function pickEdge(rng: Rng): SpawnEdge {
  return (['N', 'E', 'S', 'W'] as const)[rng.int(4)]!;
}

function spawnPointFor(edge: SpawnEdge, rng: Rng): SpawnPoint {
  const margin = WAVE.spawnMargin * TILE_SIZE;
  switch (edge) {
    case 'N':
      return { edge, x: rng.range(margin, ARENA_W_PX - margin), y: margin };
    case 'S':
      return { edge, x: rng.range(margin, ARENA_W_PX - margin), y: ARENA_H_PX - margin };
    case 'W':
      return { edge, x: margin, y: rng.range(margin, ARENA_H_PX - margin) };
    case 'E':
      return { edge, x: ARENA_W_PX - margin, y: rng.range(margin, ARENA_H_PX - margin) };
  }
}

function generateWalls(rng: Rng): Wall[] {
  const count = rng.range(5, 13);
  const walls: Wall[] = [];
  const cx = ARENA_W_TILES / 2;
  const cy = ARENA_H_TILES / 2;
  for (let i = 0; i < count; i++) {
    const w = rng.range(1, 4);
    const h = rng.range(1, 4);
    const x = rng.range(2, ARENA_W_TILES - w - 2);
    const y = rng.range(2, ARENA_H_TILES - h - 2);
    const overlapsSpawn =
      x <= cx + SPAWN_GUARD_TILES &&
      x + w >= cx - SPAWN_GUARD_TILES &&
      y <= cy + SPAWN_GUARD_TILES &&
      y + h >= cy - SPAWN_GUARD_TILES;
    if (overlapsSpawn) continue;
    walls.push({ x, y, w, h });
  }
  return walls;
}

export function generateLevel(block: BlockData): Level {
  const layoutSeed = hashSlice(block.hash, HASH_BYTES.layoutStart, HASH_BYTES.layoutLen);
  const waveSeed = hashSlice(block.hash, HASH_BYTES.waveStart, HASH_BYTES.waveLen);

  const layoutRng = Rng.fromHex(layoutSeed);
  const waveRng = Rng.fromHex(waveSeed);

  const walls = generateWalls(layoutRng);

  const totalEnemies = totalEnemiesFor(block.txCount);
  const waveCount = waveCountFor(totalEnemies);
  const counts = splitEnemiesAcrossWaves(totalEnemies, waveCount);

  const waves: WaveSpec[] = counts.map((count) => {
    const spawns: SpawnPoint[] = [];
    for (let i = 0; i < count; i++) {
      const edge = pickEdge(waveRng);
      spawns.push(spawnPointFor(edge, waveRng));
    }
    return { spawns };
  });

  return {
    blockHeight: block.height,
    blockHash: block.hash,
    walls,
    waves,
    totalEnemies,
  };
}
