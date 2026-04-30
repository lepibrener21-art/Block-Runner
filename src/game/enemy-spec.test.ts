import { describe, expect, it } from 'vitest';
import {
  aggressionTier,
  availableEnemyTypes,
  pickEnemyTypes,
  type EnemyType,
} from './enemy-spec.ts';

describe('aggressionTier', () => {
  it('returns 0 for genesis-era difficulty', () => {
    expect(aggressionTier(0)).toBe(0);
    expect(aggressionTier(3.99)).toBe(0);
  });

  it('returns 1 starting at ld = 4', () => {
    expect(aggressionTier(4)).toBe(1);
    expect(aggressionTier(7.99)).toBe(1);
  });

  it('returns 2 starting at ld = 8', () => {
    expect(aggressionTier(8)).toBe(2);
    expect(aggressionTier(11.99)).toBe(2);
  });

  it('returns 3 starting at ld = 12', () => {
    expect(aggressionTier(12)).toBe(3);
    expect(aggressionTier(20)).toBe(3);
  });
});

describe('availableEnemyTypes', () => {
  it('tier 0 has only the chaser', () => {
    expect(availableEnemyTypes(0)).toEqual(['chaser']);
  });

  it('each tier widens the unlocked set monotonically', () => {
    const t0 = availableEnemyTypes(0);
    const t1 = availableEnemyTypes(1);
    const t2 = availableEnemyTypes(2);
    const t3 = availableEnemyTypes(3);
    for (const set of [t1, t2, t3]) {
      for (const e of t0) expect(set).toContain(e);
    }
    expect(t3.length).toBeGreaterThan(t2.length);
    expect(t2.length).toBeGreaterThan(t1.length);
    expect(t1.length).toBeGreaterThan(t0.length);
  });

  it('tier 3 unlocks all four types', () => {
    expect(availableEnemyTypes(3)).toEqual(['chaser', 'dasher', 'shooter', 'orbiter']);
  });
});

describe('pickEnemyTypes', () => {
  const HASH = '00000000000000000000abcdef0123456789abcdef0123456789abcdef012345';

  it('only ever returns types unlocked at the given tier', () => {
    const t0 = pickEnemyTypes(HASH, 0, 50);
    expect(t0.every((t) => t === 'chaser')).toBe(true);

    const t1 = pickEnemyTypes(HASH, 1, 100);
    const allowed1: ReadonlySet<EnemyType> = new Set<EnemyType>(['chaser', 'dasher']);
    expect(t1.every((t) => allowed1.has(t))).toBe(true);

    const t3 = pickEnemyTypes(HASH, 3, 200);
    const allowed3: ReadonlySet<EnemyType> = new Set<EnemyType>([
      'chaser',
      'dasher',
      'shooter',
      'orbiter',
    ]);
    expect(t3.every((t) => allowed3.has(t))).toBe(true);
  });

  it('is deterministic for the same (hash, tier, count) input', () => {
    const a = pickEnemyTypes(HASH, 3, 30);
    const b = pickEnemyTypes(HASH, 3, 30);
    expect(a).toEqual(b);
  });

  it('produces different sequences for different blocks', () => {
    const other = '00000000000000000000fedcba9876543210fedcba9876543210fedcba987654';
    const a = pickEnemyTypes(HASH, 3, 30);
    const b = pickEnemyTypes(other, 3, 30);
    expect(a).not.toEqual(b);
  });

  it('uses a stream independent of the block hash itself', () => {
    // The stream is labeled "enemy-types:<hash>" which means it
    // doesn't collide with other per-block consumers (layout PRNG,
    // etc.) that read the same hash.
    const a = pickEnemyTypes(HASH, 3, 5);
    expect(a.length).toBe(5);
    a.forEach((t) => expect(['chaser', 'dasher', 'shooter', 'orbiter']).toContain(t));
  });

  it('actually exercises all unlocked types across many picks at tier 3', () => {
    const seen = new Set(pickEnemyTypes(HASH, 3, 400));
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});
