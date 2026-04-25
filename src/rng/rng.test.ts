import { describe, expect, it } from 'vitest';
import { Rng } from './rng.ts';

describe('Rng', () => {
  it('produces identical sequences from identical seeds', () => {
    const a = Rng.fromHex('deadbeef');
    const b = Rng.fromHex('deadbeef');
    const seqA = Array.from({ length: 8 }, () => a.int(1000));
    const seqB = Array.from({ length: 8 }, () => b.int(1000));
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences from different seeds', () => {
    const a = Rng.fromHex('deadbeef');
    const b = Rng.fromHex('cafef00d');
    const seqA = Array.from({ length: 8 }, () => a.int(1000));
    const seqB = Array.from({ length: 8 }, () => b.int(1000));
    expect(seqA).not.toEqual(seqB);
  });

  it('forks deterministically by label', () => {
    const a1 = Rng.fromHex('deadbeef').fork('layout');
    const a2 = Rng.fromHex('deadbeef').fork('layout');
    const b = Rng.fromHex('deadbeef').fork('loot');
    expect(Array.from({ length: 4 }, () => a1.int(1000))).toEqual(
      Array.from({ length: 4 }, () => a2.int(1000)),
    );
    expect(Array.from({ length: 4 }, () => Rng.fromHex('deadbeef').fork('layout').int(1000))).not.toEqual(
      Array.from({ length: 4 }, () => b.int(1000)),
    );
  });
});
