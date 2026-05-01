import Phaser from 'phaser';
import { ARENA_H_PX, ARENA_W_PX, ENEMY_BULLET } from '../constants.ts';

const TEXTURE_KEY = 'enemy-bullet-texture';

export class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
  damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, damage: number) {
    EnemyBullet.registerTexture(scene);
    super(scene, x, y, TEXTURE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.damage = damage;
  }

  launch(dirX: number, dirY: number): void {
    const halo = ENEMY_BULLET.size + 4;
    const offset = (halo - ENEMY_BULLET.size) / 2;
    this.setCircle(ENEMY_BULLET.size / 2, offset, offset);
    this.setVelocity(dirX * ENEMY_BULLET.speed, dirY * ENEMY_BULLET.speed);
  }

  static registerTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const halo = ENEMY_BULLET.size + 4;
    const cx = halo / 2;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(ENEMY_BULLET.glowColor, 0.45);
    g.fillCircle(cx, cx, halo / 2);
    g.fillStyle(ENEMY_BULLET.color, 1);
    g.fillCircle(cx, cx, ENEMY_BULLET.size / 2);
    g.generateTexture(TEXTURE_KEY, halo, halo);
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
