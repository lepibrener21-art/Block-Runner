import { describe, expect, it } from 'vitest';
import { eraIntensity } from './era.ts';

const GENESIS = 1_231_006_505;
const YEAR = 365.25 * 86_400;

describe('eraIntensity', () => {
  it('returns 1.0 at genesis', () => {
    expect(eraIntensity(GENESIS)).toBe(1);
  });

  it('returns 1.0 for any pre-genesis timestamp', () => {
    expect(eraIntensity(0)).toBe(1);
    expect(eraIntensity(GENESIS - 1)).toBe(1);
  });

  it('halves around 8.5 years past genesis', () => {
    const eightAndAHalf = GENESIS + 8.5 * YEAR;
    expect(eraIntensity(eightAndAHalf)).toBeCloseTo(0.5, 2);
  });

  it('returns 0 at 17 years past genesis (modern blocks)', () => {
    expect(eraIntensity(GENESIS + 17 * YEAR)).toBeCloseTo(0, 5);
    expect(eraIntensity(GENESIS + 100 * YEAR)).toBe(0);
  });

  it('decays monotonically', () => {
    let prev = eraIntensity(GENESIS);
    for (let years = 1; years <= 20; years++) {
      const cur = eraIntensity(GENESIS + years * YEAR);
      expect(cur).toBeLessThanOrEqual(prev);
      prev = cur;
    }
  });

  it('genesis block stamp itself yields full intensity', () => {
    expect(eraIntensity(GENESIS)).toBe(1);
  });
});
