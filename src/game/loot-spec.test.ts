import { describe, expect, it } from 'vitest';
import {
  LOOT_CATEGORIES,
  deriveBiasWeights,
  generateLootSlots,
  lootCountFor,
  pickCategory,
} from './loot-spec.ts';
import { Rng } from '../rng/rng.ts';
import type { Wall } from './level/types.ts';

describe('lootCountFor', () => {
  it('floors at 2 for tiny tx counts', () => {
    expect(lootCountFor(0)).toBe(2);
    expect(lootCountFor(1)).toBe(2);
    expect(lootCountFor(15)).toBe(2);
  });

  it('caps at 20 for huge blocks', () => {
    expect(lootCountFor(10_000)).toBe(20);
    expect(lootCountFor(1_000_000)).toBe(20);
  });

  it('scales sub-linearly through the middle', () => {
    expect(lootCountFor(100)).toBe(5);
    expect(lootCountFor(400)).toBe(10);
    expect(lootCountFor(1600)).toBe(20);
  });
});

describe('deriveBiasWeights', () => {
  it('returns one weight per category, each in [0.5, 2.0]', () => {
    const w = deriveBiasWeights(0xdeadbeef);
    for (const c of LOOT_CATEGORIES) {
      expect(w[c]).toBeGreaterThanOrEqual(0.5);
      expect(w[c]).toBeLessThanOrEqual(2);
    }
  });

  it('is deterministic for the same nonce', () => {
    expect(deriveBiasWeights(0x12345678)).toEqual(deriveBiasWeights(0x12345678));
  });

  it('varies across nonces', () => {
    const a = deriveBiasWeights(0x11111111);
    const b = deriveBiasWeights(0x22222222);
    expect(a).not.toEqual(b);
  });
});

describe('pickCategory', () => {
  it('respects weights heavily skewed to one category', () => {
    const weights = { health: 100, sats: 1, weapon: 1, powerup: 1, passive: 1 } as const;
    const rng = Rng.fromHex('pickCategoryTest');
    let healths = 0;
    for (let i = 0; i < 200; i++) {
      if (pickCategory(rng, weights) === 'health') healths++;
    }
    // > 70 % should be health.
    expect(healths).toBeGreaterThan(140);
  });
});

describe('generateLootSlots', () => {
  const walls: Wall[] = [];
  const HASH = '00000000000000000000abcdef0123456789abcdef0123456789abcdef012345';

  it('produces lootCountFor(txCount) slots when no walls intervene', () => {
    const slots = generateLootSlots(HASH, 0xdeadbeef, 100, walls);
    expect(slots).toHaveLength(5);
  });

  it('is deterministic for the same inputs', () => {
    const a = generateLootSlots(HASH, 0xdeadbeef, 100, walls);
    const b = generateLootSlots(HASH, 0xdeadbeef, 100, walls);
    expect(a).toEqual(b);
  });

  it('places every slot inside the arena bounds', () => {
    const slots = generateLootSlots(HASH, 0xdeadbeef, 1600, walls);
    for (const s of slots) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('avoids placing inside walls', () => {
    const fullWall: Wall[] = [{ x: 5, y: 5, w: 30, h: 20 }];
    const slots = generateLootSlots(HASH, 0xdeadbeef, 100, fullWall);
    // Some slots may be skipped (no valid position found). The remaining
    // ones must not fall inside the wall rectangle.
    const TILE = 16;
    for (const s of slots) {
      const tx = Math.floor(s.x / TILE);
      const ty = Math.floor(s.y / TILE);
      const inside = tx >= 5 && tx < 35 && ty >= 5 && ty < 25;
      expect(inside).toBe(false);
    }
  });

  it('only emits valid LootCategory values', () => {
    const slots = generateLootSlots(HASH, 0xdeadbeef, 1600, walls);
    for (const s of slots) {
      expect(LOOT_CATEGORIES).toContain(s.category);
    }
  });
});
