import { Rng } from '../rng/rng.ts';

export type EnemyType = 'chaser' | 'dasher' | 'shooter' | 'orbiter';

export const ALL_ENEMY_TYPES: readonly EnemyType[] = [
  'chaser',
  'dasher',
  'shooter',
  'orbiter',
] as const;

const TIER_AVAILABILITY: readonly (readonly EnemyType[])[] = [
  ['chaser'],
  ['chaser', 'dasher'],
  ['chaser', 'dasher', 'shooter'],
  ['chaser', 'dasher', 'shooter', 'orbiter'],
];

const TIER_LD_BREAKS: readonly number[] = [4, 8, 12];

export type AggressionTier = 0 | 1 | 2 | 3;

export function aggressionTier(difficultyLog10: number): AggressionTier {
  if (difficultyLog10 >= TIER_LD_BREAKS[2]!) return 3;
  if (difficultyLog10 >= TIER_LD_BREAKS[1]!) return 2;
  if (difficultyLog10 >= TIER_LD_BREAKS[0]!) return 1;
  return 0;
}

export function availableEnemyTypes(tier: AggressionTier): readonly EnemyType[] {
  return TIER_AVAILABILITY[tier]!;
}

export function pickEnemyTypes(
  blockHashHex: string,
  tier: AggressionTier,
  count: number,
): EnemyType[] {
  const types = availableEnemyTypes(tier);
  const rng = Rng.fromHex(`enemy-types:${blockHashHex}`);
  const out: EnemyType[] = [];
  for (let i = 0; i < count; i++) {
    out.push(types[rng.int(types.length)]!);
  }
  return out;
}
