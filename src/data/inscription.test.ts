import { describe, expect, it } from 'vitest';
import { findInscription, type MempoolTx } from './inscription.ts';

const GENESIS_COINBASE_SCRIPTSIG =
  '04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73';

function tx(scriptpubkeys: string[], opts: { coinbase?: boolean; scriptsig?: string } = {}): MempoolTx {
  return {
    txid: 'stub',
    vin: [{ is_coinbase: opts.coinbase ?? false, scriptsig: opts.scriptsig ?? '' }],
    vout: scriptpubkeys.map((s) => ({ scriptpubkey: s })),
  };
}

function asciiToHex(s: string): string {
  let out = '';
  for (const c of s) out += c.charCodeAt(0).toString(16).padStart(2, '0');
  return out;
}

describe('findInscription', () => {
  it('extracts the Times message from the genesis coinbase scriptsig', () => {
    const txs: MempoolTx[] = [tx([], { coinbase: true, scriptsig: GENESIS_COINBASE_SCRIPTSIG })];
    const msg = findInscription(0, txs);
    expect(msg).toContain('The Times 03/Jan/2009 Chancellor on brink of second bailout for banks');
  });

  it('extracts a printable OP_RETURN payload from a normal block', () => {
    const payload = asciiToHex('hello bitcoin');
    const opReturn = `6a${(payload.length / 2).toString(16).padStart(2, '0')}${payload}`;
    const txs: MempoolTx[] = [
      tx([], { coinbase: true, scriptsig: '03a08607' }),
      tx([opReturn]),
    ];
    expect(findInscription(700_000, txs)).toBe('hello bitcoin');
  });

  it('skips binary OP_RETURN payloads', () => {
    const opReturn = '6a20' + 'ff'.repeat(32);
    const txs: MempoolTx[] = [
      tx([], { coinbase: true, scriptsig: '03a08607' }),
      tx([opReturn]),
    ];
    expect(findInscription(700_000, txs)).toBeNull();
  });

  it('returns null for a block with no OP_RETURN outputs', () => {
    const txs: MempoolTx[] = [
      tx([], { coinbase: true, scriptsig: '03a08607' }),
      tx(['76a914' + '11'.repeat(20) + '88ac']),
    ];
    expect(findInscription(700_000, txs)).toBeNull();
  });

  it('picks the first printable OP_RETURN in tx order', () => {
    const first = '6a' + (asciiToHex('first').length / 2).toString(16).padStart(2, '0') + asciiToHex('first');
    const second = '6a' + (asciiToHex('second').length / 2).toString(16).padStart(2, '0') + asciiToHex('second');
    const txs: MempoolTx[] = [
      tx([], { coinbase: true, scriptsig: '03a08607' }),
      tx([first]),
      tx([second]),
    ];
    expect(findInscription(700_000, txs)).toBe('first');
  });
});
