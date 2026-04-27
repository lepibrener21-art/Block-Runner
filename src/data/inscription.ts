export interface MempoolTxIn {
  is_coinbase: boolean;
  scriptsig: string;
}

export interface MempoolTxOut {
  scriptpubkey: string;
}

export interface MempoolTx {
  txid: string;
  vin: MempoolTxIn[];
  vout: MempoolTxOut[];
}

const MIN_LEN = 4;
const MAX_LEN = 220;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

function isPrintable(byte: number): boolean {
  return byte >= 0x20 && byte <= 0x7e;
}

function longestPrintableRun(hex: string): string {
  const bytes = hexToBytes(hex);
  let best = '';
  let current = '';
  for (const b of bytes) {
    if (isPrintable(b)) {
      current += String.fromCharCode(b);
      if (current.length > best.length) best = current;
    } else {
      current = '';
    }
  }
  return best;
}

function truncate(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= MAX_LEN) return cleaned;
  return `${cleaned.slice(0, MAX_LEN - 1)}…`;
}

function fromCoinbaseScriptsig(hex: string): string | null {
  const text = longestPrintableRun(hex);
  if (text.length < MIN_LEN) return null;
  return truncate(text);
}

function fromOpReturn(scriptpubkeyHex: string): string | null {
  if (!scriptpubkeyHex.startsWith('6a')) return null;
  const text = longestPrintableRun(scriptpubkeyHex.slice(2));
  if (text.length < MIN_LEN) return null;
  return truncate(text);
}

export function findInscription(height: number, txs: readonly MempoolTx[]): string | null {
  if (height === 0) {
    const cb = txs[0]?.vin[0]?.scriptsig;
    if (cb) {
      const msg = fromCoinbaseScriptsig(cb);
      if (msg) return msg;
    }
  }

  for (const tx of txs) {
    if (tx.vin[0]?.is_coinbase) continue;
    for (const vout of tx.vout) {
      if (!vout.scriptpubkey) continue;
      const msg = fromOpReturn(vout.scriptpubkey);
      if (msg) return msg;
    }
  }

  return null;
}
