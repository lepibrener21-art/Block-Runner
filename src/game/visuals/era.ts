const GENESIS_TIMESTAMP = 1_231_006_505;
const SECONDS_PER_YEAR = 365.25 * 86_400;
const ERA_FADE_YEARS = 17;

export function eraIntensity(timestampSec: number): number {
  if (timestampSec <= GENESIS_TIMESTAMP) return 1;
  const years = (timestampSec - GENESIS_TIMESTAMP) / SECONDS_PER_YEAR;
  const t = 1 - years / ERA_FADE_YEARS;
  return Math.max(0, Math.min(1, t));
}

export const ERA_GENESIS_TIMESTAMP = GENESIS_TIMESTAMP;
export const ERA_FADE_YEARS_VALUE = ERA_FADE_YEARS;
