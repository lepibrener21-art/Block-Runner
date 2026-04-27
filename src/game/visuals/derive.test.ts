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
    '87fa15c52a305049bf8096163298fc48cef9ee8deccb6db4a7afa6ec5afd0e13',
  '00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048':
    'e7d5838e42b9480247154a4e9c05f6cc1b4e69748429145c9d8f3f742d0c3d48',
  '000000000fa8bfa0f0dd32f956b874b2c7f1772c5fbedcb1b35e03335c7fb0a8':
    '917e464d91010911227c2c8a767a509c3789950af5938e6cb1b549e60be66f97',
  '000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506':
    'f44197b41dea9470188195f774173628f3b886447f38fe69840c3d424f0328ce',
  '0000000000000000000590fc0f3eba193a278534220b2b37e9849e1a770ca959':
    '2cf9dd592f8bce2b5982d5eb1ffa4bb3abf4e7f6a7a00270809d75fc58d23d91',
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
