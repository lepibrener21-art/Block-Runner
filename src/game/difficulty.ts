const LOG10_2 = Math.log10(2);

const MAX_TARGET_MANTISSA = 0xffff;
const MAX_TARGET_EXPONENT = 0x1d;
const MAX_TARGET_LOG10 =
  Math.log10(MAX_TARGET_MANTISSA) + 8 * (MAX_TARGET_EXPONENT - 3) * LOG10_2;

const HP_K = 0.35;
const HP_CAP = 6;
const DMG_K = 0.12;
const DMG_CAP = 2.5;
const SPD_K = 0.025;
const SPD_CAP = 1.4;

export interface DifficultyMultipliers {
  hp: number;
  damage: number;
  speed: number;
}

export function difficultyLog10FromBits(bits: number): number {
  const exponent = (bits >>> 24) & 0xff;
  const mantissa = bits & 0xffffff;
  if (mantissa <= 0) return 0;
  const targetLog10 = Math.log10(mantissa) + 8 * (exponent - 3) * LOG10_2;
  const ld = MAX_TARGET_LOG10 - targetLog10;
  return ld > 0 ? ld : 0;
}

export function difficultyMultipliers(bits: number): DifficultyMultipliers {
  const ld = difficultyLog10FromBits(bits);
  return {
    hp: Math.min(HP_CAP, 1 + ld * HP_K),
    damage: Math.min(DMG_CAP, 1 + ld * DMG_K),
    speed: Math.min(SPD_CAP, 1 + ld * SPD_K),
  };
}
