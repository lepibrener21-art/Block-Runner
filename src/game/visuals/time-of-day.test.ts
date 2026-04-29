import { describe, expect, it } from 'vitest';
import { computeTodTint, timeOfDayFromTimestamp } from './time-of-day.ts';

describe('timeOfDayFromTimestamp', () => {
  it('wraps the timestamp into [0, 1)', () => {
    expect(timeOfDayFromTimestamp(0)).toBeCloseTo(0, 5);
    expect(timeOfDayFromTimestamp(43_200)).toBeCloseTo(0.5, 5); // noon UTC
    expect(timeOfDayFromTimestamp(86_399)).toBeCloseTo(86_399 / 86_400, 5);
    expect(timeOfDayFromTimestamp(86_400)).toBeCloseTo(0, 5);
    expect(timeOfDayFromTimestamp(86_400 * 7 + 21_600)).toBeCloseTo(0.25, 5);
  });

  it('genesis block (1231006505) lands in the late-afternoon range', () => {
    const tod = timeOfDayFromTimestamp(1_231_006_505);
    // Genesis was mined at 18:15:05 UTC, so tod ~ 0.76.
    expect(tod).toBeGreaterThan(0.7);
    expect(tod).toBeLessThan(0.8);
  });
});

describe('computeTodTint', () => {
  it('returns the midnight stop at tod = 0', () => {
    const tint = computeTodTint(0);
    expect(tint.color.h).toBeCloseTo(220, 1);
    expect(tint.color.l).toBeCloseTo(0.15, 5);
    expect(tint.alpha).toBeCloseTo(0.35, 5);
  });

  it('returns the noon stop at tod = 0.5', () => {
    const tint = computeTodTint(0.5);
    expect(tint.color.h).toBeCloseTo(60, 1);
    expect(tint.color.l).toBeCloseTo(0.9, 5);
    expect(tint.alpha).toBeCloseTo(0.06, 5);
  });

  it('is brightest (lowest alpha) around noon, dimmest around midnight', () => {
    const noon = computeTodTint(0.5);
    const midnight = computeTodTint(0);
    expect(noon.alpha).toBeLessThan(midnight.alpha);
    expect(noon.color.l).toBeGreaterThan(midnight.color.l);
  });

  it('is warm-hued at sunrise/sunset', () => {
    const sunrise = computeTodTint(0.25);
    const sunset = computeTodTint(0.75);
    // Both should land in the warm half (red/orange/yellow): hue 0..90.
    expect(sunrise.color.h).toBeLessThan(90);
    expect(sunset.color.h).toBeLessThan(90);
  });

  it('interpolates smoothly between adjacent stops', () => {
    const a = computeTodTint(0.25);
    const b = computeTodTint(0.5);
    const mid = computeTodTint(0.375);
    // Lightness should be between the two adjacent stops.
    expect(mid.color.l).toBeGreaterThan(Math.min(a.color.l, b.color.l));
    expect(mid.color.l).toBeLessThan(Math.max(a.color.l, b.color.l));
  });

  it('is deterministic for the same input', () => {
    expect(computeTodTint(0.42)).toEqual(computeTodTint(0.42));
  });
});
