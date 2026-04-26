import Phaser from 'phaser';
import { getBlock } from '../../data/blocks.ts';

const DEFAULT_HEIGHT = 700_000;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(0x0a0c1a);

    this.add
      .text(width / 2, height / 2 - 40, 'Block Runner', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#ddd',
      })
      .setOrigin(0.5);

    const status = this.add
      .text(width / 2, height / 2 + 10, this.statusFor(DEFAULT_HEIGHT), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#888',
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(width / 2, height / 2 + 40, 'WASD move · mouse aim · click fire · space dodge · esc pause', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#5b6080',
      })
      .setOrigin(0.5);

    void getBlock(this.heightFromUrl(DEFAULT_HEIGHT))
      .then((block) => {
        status.setText(`Loaded block ${block.height} — entering…`);
        this.time.delayedCall(400, () => {
          hint.destroy();
          this.scene.start('arena', { block });
        });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        status.setColor('#f88');
        status.setText(`Failed to load block: ${msg}`);
      });
  }

  private statusFor(height: number): string {
    return `Loading block ${height}…`;
  }

  private heightFromUrl(fallback: number): number {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('h');
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }
}
