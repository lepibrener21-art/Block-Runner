import type { HSL } from './types.ts';

export interface TodTint {
  color: HSL;
  alpha: number;
}

interface Stop {
  t: number;
  h: number;
  s: number;
  l: number;
  a: number;
}

const STOPS: readonly Stop[] = [
  { t: 0.0, h: 220, s: 0.55, l: 0.15, a: 0.35 },
  { t: 0.25, h: 25, s: 0.65, l: 0.5, a: 0.22 },
  { t: 0.5, h: 60, s: 0.15, l: 0.9, a: 0.06 },
  { t: 0.75, h: 12, s: 0.65, l: 0.45, a: 0.22 },
  { t: 1.0, h: 220, s: 0.55, l: 0.15, a: 0.35 },
];

const SECONDS_PER_DAY = 86_400;

export function timeOfDayFromTimestamp(timestampSec: number): number {
  const wrapped = ((timestampSec % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
  return wrapped / SECONDS_PER_DAY;
}

export function computeTodTint(tod: number): TodTint {
  const t = Math.max(0, Math.min(1, tod));
  let i = 0;
  for (; i < STOPS.length - 1; i++) {
    if (t >= STOPS[i]!.t && t <= STOPS[i + 1]!.t) break;
  }
  const a = STOPS[i]!;
  const b = STOPS[i + 1]!;
  const span = b.t - a.t;
  const tn = span === 0 ? 0 : (t - a.t) / span;

  let dh = b.h - a.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const h = (a.h + dh * tn + 360) % 360;

  return {
    color: {
      h,
      s: a.s + (b.s - a.s) * tn,
      l: a.l + (b.l - a.l) * tn,
    },
    alpha: a.a + (b.a - a.a) * tn,
  };
}
