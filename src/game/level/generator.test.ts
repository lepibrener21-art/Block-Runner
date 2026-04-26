import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { BlockData } from '../../data/types.ts';
import { generateLevel } from './generator.ts';

const SAMPLES: BlockData[] = [
  {
    height: 0,
    hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    timestamp: 1231006505,
    bits: 486604799,
    nonce: 2083236893,
    txCount: 1,
  },
  {
    height: 1,
    hash: '00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048',
    timestamp: 1231469665,
    bits: 486604799,
    nonce: 2573394689,
    txCount: 1,
  },
  {
    height: 100,
    hash: '000000007bc154e0fa7ea32218a72fe2c1bb9f86cf8c9ebf9a715ed27fdb229a',
    timestamp: 1231660825,
    bits: 486604799,
    nonce: 1573057331,
    txCount: 1,
  },
  {
    height: 2016,
    hash: '000000000fa8bfa0f0dd32f956b874b2c7f1772c5fbedcb1b35e03335c7fb0a8',
    timestamp: 1232903437,
    bits: 486604799,
    nonce: 1543891798,
    txCount: 1,
  },
  {
    height: 100000,
    hash: '000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506',
    timestamp: 1293623863,
    bits: 453281356,
    nonce: 274148111,
    txCount: 4,
  },
  {
    height: 700000,
    hash: '0000000000000000000590fc0f3eba193a278534220b2b37e9849e1a770ca959',
    timestamp: 1632447077,
    bits: 386877668,
    nonce: 2607782010,
    txCount: 2495,
  },
];

const EXPECTED_HASHES: Record<number, string> = {
  0: '1c3d4a798362750396b537ee037738e04b48ba2e7300f2500dc70df866e60a54',
  1: '2df0ad73dbdd1be88f1245cc81901dd3f3104646e67672a21a1155dc8534740d',
  100: 'afa6ad499538dc755cf6e5463f785db88f9ad90cd5586b282dbe0e86da68f186',
  2016: '4391bb9edb5f622e12eddad1d12a7dc70c915bd2c6d636d3d20d0137c4a0ef6f',
  100000: 'a36d0ffec66bcfd7050243594d7cbfc8cfabe4a804de67437aefb57bc9c9256b',
  700000: 'a8b1fab11224df0a931e01dc998cc0b013bb2cad004688ea6bf155a4ec618b31',
};

function snapshotHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

describe('generateLevel — determinism contract (§3d)', () => {
  it('produces identical output for identical input (run-to-run)', () => {
    for (const block of SAMPLES) {
      const a = generateLevel(block);
      const b = generateLevel(block);
      expect(snapshotHash(a)).toEqual(snapshotHash(b));
    }
  });

  it('produces a stable snapshot per height', () => {
    for (const block of SAMPLES) {
      const hash = snapshotHash(generateLevel(block));
      const expected = EXPECTED_HASHES[block.height];
      if (!expected) {
        console.log(`SNAPSHOT block ${block.height} -> ${hash}`);
        continue;
      }
      expect(hash, `level for block ${block.height} drifted`).toEqual(expected);
    }
  });

  it('produces different output for different blocks', () => {
    const hashes = new Set(SAMPLES.map((b) => snapshotHash(generateLevel(b))));
    expect(hashes.size).toBe(SAMPLES.length);
  });
});
