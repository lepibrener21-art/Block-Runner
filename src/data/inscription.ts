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
const MAX_LINE_LEN = 110;
const MAX_LINES = 5;

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
  if (cleaned.length <= MAX_LINE_LEN) return cleaned;
  return `${cleaned.slice(0, MAX_LINE_LEN - 1)}…`;
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

export function findInscription(_height: number, txs: readonly MempoolTx[]): string | null {
  const lines: string[] = [];
  const seen = new Set<string>();
  const push = (msg: string | null): boolean => {
    if (!msg || seen.has(msg)) return false;
    seen.add(msg);
    lines.push(msg);
    return lines.length >= MAX_LINES;
  };

  const cb = txs[0]?.vin[0]?.scriptsig;
  if (cb && push(fromCoinbaseScriptsig(cb))) return lines.join('\n');

  for (const tx of txs) {
    if (tx.vin[0]?.is_coinbase) continue;
    for (const vout of tx.vout) {
      if (!vout.scriptpubkey) continue;
      if (push(fromOpReturn(vout.scriptpubkey))) return lines.join('\n');
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}
