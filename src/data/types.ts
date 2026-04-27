export interface BlockData {
  height: number;
  hash: string;
  timestamp: number;
  bits: number;
  nonce: number;
  txCount: number;
  inscription?: string;
  inscriptionFetched?: boolean;
}

export const EPOCH_LENGTH = 2016;

export function epochStartHeight(height: number): number {
  return Math.floor(height / EPOCH_LENGTH) * EPOCH_LENGTH;
}
