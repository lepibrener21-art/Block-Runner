import { describe, expect, it } from 'vitest';
import { difficultyLog10FromBits, difficultyMultipliers } from './difficulty.ts';

describe('difficultyLog10FromBits', () => {
  it('returns 0 for the genesis target (bits 0x1d00ffff)', () => {
    expect(difficultyLog10FromBits(0x1d00ffff)).toBeCloseTo(0, 6);
  });

  it('grows roughly with how much harder a block was to mine', () => {
    // Block 100,000 (Dec 2010): bits 0x1b04864c, difficulty ~14484.
    // log10(14484) ~ 4.16.
    const ld = difficultyLog10FromBits(0x1b04864c);
    expect(ld).toBeGreaterThan(3.8);
    expect(ld).toBeLessThan(4.5);
  });

  it('handles a chain-tip-era target (bits 0x17030c0e) within sensible bounds', () => {
    // Difficulty was on the order of 10^13 - 10^14 around 2021.
    const ld = difficultyLog10FromBits(0x17030c0e);
    expect(ld).toBeGreaterThan(13);
    expect(ld).toBeLessThan(15);
  });

  it('clamps to 0 when given an invalid (zero-mantissa) bits value', () => {
    expect(difficultyLog10FromBits(0)).toBe(0);
    expect(difficultyLog10FromBits(0x1d000000)).toBe(0);
  });
});

describe('difficultyMultipliers', () => {
  it('returns 1× across the board for the genesis difficulty', () => {
    const m = difficultyMultipliers(0x1d00ffff);
    expect(m.hp).toBeCloseTo(1, 5);
    expect(m.damage).toBeCloseTo(1, 5);
    expect(m.speed).toBeCloseTo(1, 5);
  });

  it('lands inside the tuned ceilings for chain-tip-era difficulty', () => {
    const m = difficultyMultipliers(0x17030c0e);
    expect(m.hp).toBeGreaterThan(4);
    expect(m.hp).toBeLessThanOrEqual(6);
    expect(m.damage).toBeGreaterThan(2);
    expect(m.damage).toBeLessThanOrEqual(2.5);
    expect(m.speed).toBeGreaterThan(1.25);
    expect(m.speed).toBeLessThanOrEqual(1.4);
  });

  it('caps each stat at its tuned ceiling for absurdly hard targets', () => {
    // Push log10(difficulty) up around 30, well past the chain tip.
    const fakeBits = 0x10000001;
    const m = difficultyMultipliers(fakeBits);
    expect(m.hp).toBeLessThanOrEqual(6);
    expect(m.damage).toBeLessThanOrEqual(2.5);
    expect(m.speed).toBeLessThanOrEqual(1.4);
  });

  it('hp scales the most, speed the least, damage in between', () => {
    const m = difficultyMultipliers(0x1b04864c);
    expect(m.hp).toBeGreaterThan(m.damage);
    expect(m.damage).toBeGreaterThan(m.speed);
  });

  it('is monotonic in difficulty', () => {
    const easy = difficultyMultipliers(0x1d00ffff);
    const mid = difficultyMultipliers(0x1b04864c);
    const hard = difficultyMultipliers(0x17030c0e);
    expect(mid.hp).toBeGreaterThanOrEqual(easy.hp);
    expect(hard.hp).toBeGreaterThanOrEqual(mid.hp);
    expect(mid.damage).toBeGreaterThanOrEqual(easy.damage);
    expect(hard.damage).toBeGreaterThanOrEqual(mid.damage);
    expect(mid.speed).toBeGreaterThanOrEqual(easy.speed);
    expect(hard.speed).toBeGreaterThanOrEqual(mid.speed);
  });
});
