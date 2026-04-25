import seedrandom from 'seedrandom';

export class Rng {
  private readonly prng: seedrandom.PRNG;

  constructor(seed: string) {
    this.prng = seedrandom(seed, { state: true });
  }

  static fromHex(hex: string): Rng {
    return new Rng(hex);
  }

  static fromBytes(bytes: Uint8Array): Rng {
    let hex = '';
    for (const b of bytes) hex += b.toString(16).padStart(2, '0');
    return new Rng(hex);
  }

  next(): number {
    return this.prng.quick();
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  range(minInclusive: number, maxExclusive: number): number {
    return minInclusive + this.int(maxExclusive - minInclusive);
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick called on empty array');
    return arr[this.int(arr.length)]!;
  }

  bytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = this.int(256);
    return out;
  }

  fork(label: string): Rng {
    const tag = this.bytes(16).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
    return new Rng(`${label}:${tag}`);
  }
}

export function bytesFromHex(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error(`hex length not even: ${hex}`);
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}
