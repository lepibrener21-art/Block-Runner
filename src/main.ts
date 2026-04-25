import Phaser from 'phaser';
import { getBlock } from './data/blocks.ts';
import { Rng } from './rng/rng.ts';

class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 20, 'Block Runner', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#ddd',
      })
      .setOrigin(0.5);

    const status = this.add
      .text(width / 2, height / 2 + 20, 'Loading block 0...', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#888',
      })
      .setOrigin(0.5);

    void getBlock(0)
      .then((block) => {
        const rng = Rng.fromHex(block.hash);
        const sample = rng.int(1000);
        status.setText(
          `Genesis loaded — hash ${block.hash.slice(0, 16)}…  rng sample ${sample}`,
        );
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        status.setColor('#f88');
        status.setText(`Failed to load genesis: ${msg}`);
      });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#111',
  scene: [BootScene],
});
