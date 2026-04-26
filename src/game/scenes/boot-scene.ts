import Phaser from 'phaser';
import { getBlock } from '../../data/blocks.ts';
import type { BlockData } from '../../data/types.ts';

const DEFAULT_HEIGHT = 700_000;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(0x0a0c1a);

    this.add
      .text(width / 2, height / 2 - 80, 'Block Runner', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#ddd',
      })
      .setOrigin(0.5);

    const status = this.add
      .text(width / 2, height / 2 - 28, this.statusFor(DEFAULT_HEIGHT), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#888',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 90, 'WASD move · mouse aim · click fire · space dodge · esc pause', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#5b6080',
      })
      .setOrigin(0.5);

    const targetHeight = this.heightFromUrl(DEFAULT_HEIGHT);

    void getBlock(targetHeight)
      .then((block) => {
        status.setText(`Block ${block.height} ready`);
        status.setColor('#9bff7a');
        this.showStartButton(block);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        status.setColor('#f88');
        status.setText(`Failed to load block: ${msg}`);
      });
  }

  private showStartButton(block: BlockData): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2 + 30;
    const w = 180;
    const h = 52;

    const idleBorder = 0x6cc1ff;
    const idleFill = 0x14213a;
    const hoverFill = 0x1f3260;

    const border = this.add.rectangle(cx, cy, w, h, idleFill);
    border.setStrokeStyle(2, idleBorder, 0.9);

    this.add
      .text(cx, cy, 'START', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#dde3ff',
      })
      .setOrigin(0.5);

    const launch = (): void => {
      this.scene.start('arena', { block });
    };

    border.setInteractive({ useHandCursor: true });
    border.on('pointerover', () => border.setFillStyle(hoverFill));
    border.on('pointerout', () => border.setFillStyle(idleFill));
    border.on('pointerdown', launch);

    const keyboard = this.input.keyboard;
    keyboard?.once(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') launch();
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
