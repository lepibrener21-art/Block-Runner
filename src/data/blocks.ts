import { fetchBlocksFromHeight } from './api.ts';
import { getCached, putManyCached } from './cache.ts';
import { EPOCH_LENGTH, epochStartHeight, type BlockData } from './types.ts';

const inflight = new Map<number, Promise<BlockData>>();

async function fetchAndCache(height: number): Promise<BlockData> {
  const batch = await fetchBlocksFromHeight(height);
  await putManyCached(batch);
  const target = batch.find((b) => b.height === height);
  if (!target) {
    throw new Error(`Block ${height} not present in batch returned by mempool.space`);
  }
  return target;
}

export async function getBlock(height: number): Promise<BlockData> {
  const cached = await getCached(height);
  if (cached) return cached;

  const existing = inflight.get(height);
  if (existing) return existing;

  const promise = fetchAndCache(height).finally(() => {
    inflight.delete(height);
  });
  inflight.set(height, promise);
  return promise;
}

export async function getEpochAnchor(height: number): Promise<BlockData> {
  return getBlock(epochStartHeight(height));
}

export { EPOCH_LENGTH, epochStartHeight };
export type { BlockData };
