import Phaser from 'phaser';
import { ARENA_H_PX, ARENA_W_PX, WEAPON } from '../constants.ts';

const TEXTURE_KEY = 'bullet-texture';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  damage: number = WEAPON.bulletDamage;

  constructor(scene: Phaser.Scene, x: number, y: number, dirX: number, dirY: number) {
    Bullet.registerTexture(scene);
    super(scene, x, y, TEXTURE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(WEAPON.bulletSize / 2);
    this.setVelocity(dirX * WEAPON.bulletSpeed, dirY * WEAPON.bulletSpeed);
  }

  static registerTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(WEAPON.bulletColor, 1);
    g.fillCircle(WEAPON.bulletSize / 2, WEAPON.bulletSize / 2, WEAPON.bulletSize / 2);
    g.generateTexture(TEXTURE_KEY, WEAPON.bulletSize, WEAPON.bulletSize);
    g.destroy();
  }

  override update(): void {
    if (
      this.x < -8 ||
      this.x > ARENA_W_PX + 8 ||
      this.y < -8 ||
      this.y > ARENA_H_PX + 8
    ) {
      this.destroy();
    }
  }
}
