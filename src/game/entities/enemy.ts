import Phaser from 'phaser';
import { ENEMY } from '../constants.ts';

const TEXTURE_KEY = 'enemy-texture';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number = ENEMY.hp;
  waveIndex = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    Enemy.registerTexture(scene);
    super(scene, x, y, TEXTURE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(ENEMY.size / 2);
    this.setCollideWorldBounds(true);
  }

  static registerTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, ENEMY.size, ENEMY.size);
    g.lineStyle(1, 0x202020, 1);
    g.strokeRect(0.5, 0.5, ENEMY.size - 1, ENEMY.size - 1);
    g.generateTexture(TEXTURE_KEY, ENEMY.size, ENEMY.size);
    g.destroy();
  }

  takeDamage(dmg: number): boolean {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  chase(targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) {
      this.setVelocity(0, 0);
      return;
    }
    this.setVelocity((dx / len) * ENEMY.speed, (dy / len) * ENEMY.speed);
  }
}
