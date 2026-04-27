import { fetchBlocksFromHeight, fetchFirstBlockTxs } from './api.ts';
import { getCached, putCached, putManyCached } from './cache.ts';
import { findInscription } from './inscription.ts';
import { EPOCH_LENGTH, epochStartHeight, type BlockData } from './types.ts';

const inflight = new Map<number, Promise<BlockData>>();

async function fetchHeader(height: number): Promise<BlockData> {
  const batch = await fetchBlocksFromHeight(height);
  await putManyCached(batch);
  const target = batch.find((b) => b.height === height);
  if (!target) {
    throw new Error(`Block ${height} not present in batch returned by mempool.space`);
  }
  return target;
}

async function withInscription(block: BlockData): Promise<BlockData> {
  if (block.inscriptionFetched) return block;
  try {
    const txs = await fetchFirstBlockTxs(block.hash);
    const inscription = findInscription(block.height, txs) ?? undefined;
    const enriched: BlockData = { ...block, inscription, inscriptionFetched: true };
    await putCached(enriched);
    return enriched;
  } catch {
    return block;
  }
}

export async function getBlock(height: number): Promise<BlockData> {
  const cached = await getCached(height);
  if (cached?.inscriptionFetched) return cached;

  const existing = inflight.get(height);
  if (existing) return existing;

  const promise = (async () => {
    const base = cached ?? (await fetchHeader(height));
    return withInscription(base);
  })().finally(() => {
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
