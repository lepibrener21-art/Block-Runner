import { createStore, get, set, setMany } from 'idb-keyval';
import type { BlockData } from './types.ts';

const store = createStore('block-runner', 'blocks');

function key(height: number): string {
  return `h:${height}`;
}

export async function getCached(height: number): Promise<BlockData | undefined> {
  return get<BlockData>(key(height), store);
}

export async function putCached(block: BlockData): Promise<void> {
  await set(key(block.height), block, store);
}

export async function putManyCached(blocks: BlockData[]): Promise<void> {
  await setMany(
    blocks.map((b) => [key(b.height), b] as [string, BlockData]),
    store,
  );
}
