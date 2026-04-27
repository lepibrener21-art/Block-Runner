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
    'f9c42d53519e5a9b33b55aae261ab1f59b497bf4349e9a5552046861d46960af',
  '00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048':
    '21dc9eb5060a47282a6a305500e3f005c0f2529a21cbb7d4575b9d589d6422da',
  '000000000fa8bfa0f0dd32f956b874b2c7f1772c5fbedcb1b35e03335c7fb0a8':
    '058f5d60de1e9f2bb29d9cad2f4bf62a59a8a6bf91fc3ccb48cf459147e26a3b',
  '000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506':
    '8afa863db23551c991864a014cee7c1bdce80f2c35d165c767ee12d211eb4bb9',
  '0000000000000000000590fc0f3eba193a278534220b2b37e9849e1a770ca959':
    '9e00d210dc8069c6c2f9f51fc89d8b22fd3067edf3bef12ed6be8bc8eb0b6f6f',
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
