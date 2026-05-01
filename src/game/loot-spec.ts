import { Rng } from '../rng/rng.ts';
import { ARENA_H_PX, ARENA_W_PX, TILE_SIZE } from './constants.ts';
import type { Wall } from './level/types.ts';

export const LOOT_CATEGORIES = ['health', 'sats', 'weapon', 'powerup', 'passive'] as const;
export type LootCategory = (typeof LOOT_CATEGORIES)[number];

const BIAS_MIN = 0.5;
const BIAS_RANGE = 1.5;

const SLOT_MARGIN_PX = 2 * TILE_SIZE;
const SLOT_MAX_REJECTIONS = 16;

export type LootBiasWeights = Record<LootCategory, number>;

export interface LootSlot {
  x: number;
  y: number;
  category: LootCategory;
}

export function lootCountFor(txCount: number): number {
  const raw = Math.sqrt(Math.max(1, txCount)) / 2;
  return Math.min(20, Math.max(2, Math.floor(raw)));
}

export function deriveBiasWeights(nonce: number): LootBiasWeights {
  const hex = (nonce >>> 0).toString(16).padStart(8, '0');
  const rng = Rng.fromHex(`nonce-bias:${hex}`);
  const out = {} as LootBiasWeights;
  for (const cat of LOOT_CATEGORIES) {
    out[cat] = BIAS_MIN + (rng.int(256) / 255) * BIAS_RANGE;
  }
  return out;
}

export function pickCategory(rng: Rng, weights: LootBiasWeights): LootCategory {
  let total = 0;
  for (const c of LOOT_CATEGORIES) total += weights[c];
  const r = rng.next() * total;
  let cum = 0;
  for (const c of LOOT_CATEGORIES) {
    cum += weights[c];
    if (r < cum) return c;
  }
  return LOOT_CATEGORIES[LOOT_CATEGORIES.length - 1]!;
}

function isInsideWall(px: number, py: number, walls: readonly Wall[]): boolean {
  const tx = Math.floor(px / TILE_SIZE);
  const ty = Math.floor(py / TILE_SIZE);
  for (const w of walls) {
    if (tx >= w.x && tx < w.x + w.w && ty >= w.y && ty < w.y + w.h) return true;
  }
  return false;
}

export function generateLootSlots(
  blockHashHex: string,
  nonce: number,
  txCount: number,
  walls: readonly Wall[],
): LootSlot[] {
  const count = lootCountFor(txCount);
  const positionRng = Rng.fromHex(`loot:${blockHashHex}`);
  const weights = deriveBiasWeights(nonce);
  const slots: LootSlot[] = [];
  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    let placed = false;
    for (let attempt = 0; attempt < SLOT_MAX_REJECTIONS; attempt++) {
      x = SLOT_MARGIN_PX + positionRng.next() * (ARENA_W_PX - 2 * SLOT_MARGIN_PX);
      y = SLOT_MARGIN_PX + positionRng.next() * (ARENA_H_PX - 2 * SLOT_MARGIN_PX);
      if (!isInsideWall(x, y, walls)) {
        placed = true;
        break;
      }
    }
    if (!placed) continue;
    const category = pickCategory(positionRng, weights);
    slots.push({ x, y, category });
  }
  return slots;
}
