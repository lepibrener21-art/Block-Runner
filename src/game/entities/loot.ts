import Phaser from 'phaser';
import type { LootCategory } from '../loot-spec.ts';

const SIZE = 8;

const CATEGORY_COLORS: Record<LootCategory, { fill: number; ring: number }> = {
  health: { fill: 0x6cff8d, ring: 0xc2ffce },
  sats: { fill: 0xffd66c, ring: 0xfff0b8 },
  weapon: { fill: 0xb8c1e0, ring: 0xe6ebf7 },
  powerup: { fill: 0xc06cff, ring: 0xe2c2ff },
  passive: { fill: 0x6cf0ff, ring: 0xc2f6ff },
};

function textureKey(cat: LootCategory): string {
  return `loot-${cat}`;
}

export class Loot extends Phaser.Physics.Arcade.Sprite {
  category: LootCategory;

  constructor(scene: Phaser.Scene, x: number, y: number, category: LootCategory) {
    Loot.registerTexture(scene, category);
    super(scene, x, y, textureKey(category));
    this.category = category;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(SIZE / 2);
    this.setImmovable(true);
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }

    scene.tweens.add({
      targets: this,
      scale: { from: 0.85, to: 1.05 },
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: 'Sine.easeInOut',
    });
  }

  static registerTexture(scene: Phaser.Scene, category: LootCategory): void {
    const key = textureKey(category);
    if (scene.textures.exists(key)) return;
    const colors = CATEGORY_COLORS[category];
    const half = SIZE / 2;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(colors.ring, 0.45);
    g.fillCircle(half, half, half);
    g.fillStyle(colors.fill, 1);
    g.fillCircle(half, half, half - 1.5);
    g.lineStyle(1, 0xffffff, 0.85);
    g.strokeCircle(half, half, half - 0.5);
    g.generateTexture(key, SIZE, SIZE);
    g.destroy();
  }
}
