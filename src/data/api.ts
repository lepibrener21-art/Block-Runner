import type { BlockData } from './types.ts';

const MEMPOOL_BASE = 'https://mempool.space/api';

interface MempoolBlock {
  id: string;
  height: number;
  timestamp: number;
  bits: number;
  nonce: number;
  tx_count: number;
}

function toBlockData(b: MempoolBlock): BlockData {
  return {
    height: b.height,
    hash: b.id,
    timestamp: b.timestamp,
    bits: b.bits,
    nonce: b.nonce,
    txCount: b.tx_count,
  };
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return res;
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        const delay = 1000 * Math.pow(3, i);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export async function fetchBlocksFromHeight(height: number): Promise<BlockData[]> {
  const res = await fetchWithRetry(`${MEMPOOL_BASE}/v1/blocks/${height}`);
  const raw = (await res.json()) as MempoolBlock[];
  return raw.map(toBlockData);
}

export async function fetchTipHeight(): Promise<number> {
  const res = await fetchWithRetry(`${MEMPOOL_BASE}/blocks/tip/height`);
  const text = await res.text();
  return parseInt(text.trim(), 10);
}
