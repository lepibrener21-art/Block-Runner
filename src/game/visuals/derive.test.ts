import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { deriveBlockVisuals, deriveEpochVisuals } from './derive.ts';

const HASHES: string[] = [
  '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
  '00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048',
  '000000000fa8bfa0f0dd32f956b874b2c7f1772c5fbedcb1b35e03335c7fb0a8',
  '000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506',
  '0000000000000000000590fc0f3eba193a278534220b2b37e9849e1a770ca959',
];

const EXPECTED: Record<string, string> = {
  '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f':
    '790f3899417a89cc8469ab3286e1f81235b59f1aab1b13030a29a5d7f23e7948',
  '00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048':
    '58d186d7372a5c77aeecd59d26f91dfb0fb56b32822caa1a86a83b4ddfe3745f',
  '000000000fa8bfa0f0dd32f956b874b2c7f1772c5fbedcb1b35e03335c7fb0a8':
    'fca2203238125c27c5b938aa8b1ed80deb1ec1446863add84a54b4d0863538aa',
  '000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506':
    'b1f49b419727208039dd2626e8e200b2a5fb24a22d4a02a266161ce04ef2c134',
  '0000000000000000000590fc0f3eba193a278534220b2b37e9849e1a770ca959':
    '014a8f854a6d06482cf322fdc707a96fbb414f36073193f3533d6b206264d245',
};

function snapshotHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

describe('deriveEpochVisuals', () => {
  it('is deterministic for the same hash', () => {
    for (const h of HASHES) {
      const a = deriveEpochVisuals(h);
      const b = deriveEpochVisuals(h);
      expect(snapshotHash(a)).toEqual(snapshotHash(b));
    }
  });

  it('produces a stable per-hash snapshot (record / verify)', () => {
    for (const h of HASHES) {
      const hash = snapshotHash(deriveEpochVisuals(h));
      const expected = EXPECTED[h];
      if (!expected) {
        console.log(`SNAPSHOT epoch ${h} -> ${hash}`);
        continue;
      }
      expect(hash, `epoch visuals for ${h} drifted`).toEqual(expected);
    }
  });

  it('produces different output for different hashes', () => {
    const hashes = new Set(HASHES.map((h) => snapshotHash(deriveEpochVisuals(h))));
    expect(hashes.size).toBe(HASHES.length);
  });

  it('returns one of the five shader moods', () => {
    for (const h of HASHES) {
      const v = deriveEpochVisuals(h);
      expect(['crt', 'glitch', 'watercolor', 'neon', 'vintage']).toContain(v.shader);
    }
  });

  it('spreads shader moods across many real Bitcoin hashes', () => {
    const moods = new Set<string>();
    for (let i = 0; i < HASHES.length; i++) moods.add(deriveEpochVisuals(HASHES[i]!).shader);
    const synth = (i: number): string => {
      const seed = (i * 2654435761) >>> 0;
      const hex = seed.toString(16).padStart(8, '0');
      return `00000000000000000000${hex}${hex.repeat(4)}`.slice(0, 64);
    };
    for (let i = 0; i < 200; i++) moods.add(deriveEpochVisuals(synth(i)).shader);
    expect(moods.size).toBeGreaterThanOrEqual(4);
  });
});

describe('deriveBlockVisuals', () => {
  it('keeps the epoch palette as a clear ancestor', () => {
    const epoch = deriveEpochVisuals(HASHES[0]!);
    const block = deriveBlockVisuals(HASHES[1]!, epoch);
    const dh = Math.abs(block.palette.primary.h - epoch.palette.primary.h);
    expect(Math.min(dh, 360 - dh)).toBeLessThanOrEqual(12);
  });

  it('is deterministic for the same inputs', () => {
    const epoch = deriveEpochVisuals(HASHES[0]!);
    const a = deriveBlockVisuals(HASHES[1]!, epoch);
    const b = deriveBlockVisuals(HASHES[1]!, epoch);
    expect(snapshotHash(a)).toEqual(snapshotHash(b));
  });
});
