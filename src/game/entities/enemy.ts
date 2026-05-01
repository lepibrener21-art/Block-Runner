import Phaser from 'phaser';
import { ENEMY } from '../constants.ts';
import type { DifficultyMultipliers } from '../difficulty.ts';
import type { EnemyType } from '../enemy-spec.ts';

const TEXTURE_KEYS: Record<EnemyType, string> = {
  chaser: 'enemy-chaser',
  dasher: 'enemy-dasher',
  shooter: 'enemy-shooter',
  orbiter: 'enemy-orbiter',
};

export type EnemyFireFn = (
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  damage: number,
) => void;

const DASHER_WALK_FRACTION = 0.55;
const DASHER_DASH_MULTIPLIER = 3.5;
const DASHER_DASH_DURATION_MS = 400;
const DASHER_CYCLE_MS = 3000;

const SHOOTER_SPEED_FRACTION = 0.7;
const SHOOTER_HOLD_MIN = 110;
const SHOOTER_HOLD_MAX = 170;
const SHOOTER_FIRE_INTERVAL_MS = 2000;

const ORBITER_SPEED_FRACTION = 1.1;
const ORBITER_RADIUS = 130;
const ORBITER_FIRE_INTERVAL_MS = 2500;
const ORBITER_RADIAL_SPRING = 0.02;

const NOOP_FIRE: EnemyFireFn = () => {};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number = ENEMY.hp;
  contactDamage: number = ENEMY.contactDamage;
  speed: number = ENEMY.speed;
  enemyType: EnemyType = 'chaser';
  waveIndex = -1;

  private dashUntil = 0;
  private dashCycleNextAt = 0;
  private dashDirX = 0;
  private dashDirY = 0;

  private shootCooldownUntil = 0;
  private readonly fire: EnemyFireFn;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: EnemyType = 'chaser',
    fire: EnemyFireFn = NOOP_FIRE,
  ) {
    Enemy.registerTextures(scene);
    super(scene, x, y, TEXTURE_KEYS[type]);
    this.enemyType = type;
    this.fire = fire;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(ENEMY.size / 2);
    this.setCollideWorldBounds(true);
  }

  static registerTextures(scene: Phaser.Scene): void {
    Enemy.makeChaserTexture(scene);
    Enemy.makeDasherTexture(scene);
    Enemy.makeShooterTexture(scene);
    Enemy.makeOrbiterTexture(scene);
  }

  private static makeChaserTexture(scene: Phaser.Scene): void {
    const key = TEXTURE_KEYS.chaser;
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, ENEMY.size, ENEMY.size);
    g.lineStyle(1, 0x202020, 1);
    g.strokeRect(0.5, 0.5, ENEMY.size - 1, ENEMY.size - 1);
    g.generateTexture(key, ENEMY.size, ENEMY.size);
    g.destroy();
  }

  private static makeDasherTexture(scene: Phaser.Scene): void {
    const key = TEXTURE_KEYS.dasher;
    if (scene.textures.exists(key)) return;
    const s = ENEMY.size;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(s / 2, 0);
    g.lineTo(s, s);
    g.lineTo(0, s);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x202020, 1);
    g.strokePath();
    g.generateTexture(key, s, s);
    g.destroy();
  }

  private static makeShooterTexture(scene: Phaser.Scene): void {
    const key = TEXTURE_KEYS.shooter;
    if (scene.textures.exists(key)) return;
    const s = ENEMY.size;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(s / 2, 0);
    g.lineTo(s, s / 2);
    g.lineTo(s / 2, s);
    g.lineTo(0, s / 2);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x202020, 1);
    g.strokePath();
    g.generateTexture(key, s, s);
    g.destroy();
  }

  private static makeOrbiterTexture(scene: Phaser.Scene): void {
    const key = TEXTURE_KEYS.orbiter;
    if (scene.textures.exists(key)) return;
    const s = ENEMY.size;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(s / 2, s / 2, s / 2);
    g.lineStyle(1, 0x202020, 1);
    g.strokeCircle(s / 2, s / 2, s / 2 - 0.5);
    g.generateTexture(key, s, s);
    g.destroy();
  }

  applyDifficulty(mults: DifficultyMultipliers): void {
    this.hp = Math.max(1, Math.round(ENEMY.hp * mults.hp));
    this.contactDamage = Math.max(1, Math.round(ENEMY.contactDamage * mults.damage));
    this.speed = ENEMY.speed * mults.speed;
  }

  takeDamage(dmg: number): boolean {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  tick(time: number, targetX: number, targetY: number): void {
    switch (this.enemyType) {
      case 'dasher':
        this.tickDasher(time, targetX, targetY);
        return;
      case 'shooter':
        this.tickShooter(time, targetX, targetY);
        return;
      case 'orbiter':
        this.tickOrbiter(time, targetX, targetY);
        return;
      case 'chaser':
      default:
        this.tickChaser(targetX, targetY);
        return;
    }
  }

  private tickChaser(targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) {
      this.setVelocity(0, 0);
      return;
    }
    this.setVelocity((dx / len) * this.speed, (dy / len) * this.speed);
  }

  private tickDasher(time: number, targetX: number, targetY: number): void {
    if (time < this.dashUntil) {
      this.setVelocity(
        this.dashDirX * this.speed * DASHER_DASH_MULTIPLIER,
        this.dashDirY * this.speed * DASHER_DASH_MULTIPLIER,
      );
      return;
    }

    if (time >= this.dashCycleNextAt) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        this.dashDirX = dx / len;
        this.dashDirY = dy / len;
      } else {
        this.dashDirX = 1;
        this.dashDirY = 0;
      }
      this.dashUntil = time + DASHER_DASH_DURATION_MS;
      this.dashCycleNextAt = time + DASHER_CYCLE_MS;
      return;
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) {
      this.setVelocity(0, 0);
      return;
    }
    const v = this.speed * DASHER_WALK_FRACTION;
    this.setVelocity((dx / len) * v, (dy / len) * v);
  }

  private tickShooter(time: number, targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy);
    const v = this.speed * SHOOTER_SPEED_FRACTION;

    if (len === 0) {
      this.setVelocity(0, 0);
    } else {
      const ux = dx / len;
      const uy = dy / len;
      if (len < SHOOTER_HOLD_MIN) {
        this.setVelocity(-ux * v, -uy * v);
      } else if (len > SHOOTER_HOLD_MAX) {
        this.setVelocity(ux * v, uy * v);
      } else {
        this.setVelocity(0, 0);
      }
    }

    if (time >= this.shootCooldownUntil && len > 0) {
      this.fire(this.x, this.y, dx / len, dy / len, this.contactDamage);
      this.shootCooldownUntil = time + SHOOTER_FIRE_INTERVAL_MS;
    }
  }

  private tickOrbiter(time: number, targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy);

    if (len < 1) {
      this.setVelocity(0, this.speed * ORBITER_SPEED_FRACTION);
      return;
    }

    const ux = dx / len;
    const uy = dy / len;
    const tx = -uy;
    const ty = ux;
    const error = len - ORBITER_RADIUS;
    const radial = Math.max(-1, Math.min(1, error * ORBITER_RADIAL_SPRING));
    const tangentialWeight = 1 - Math.abs(radial);

    const v = this.speed * ORBITER_SPEED_FRACTION;
    this.setVelocity(
      (tx * tangentialWeight + ux * radial) * v,
      (ty * tangentialWeight + uy * radial) * v,
    );

    if (time >= this.shootCooldownUntil) {
      this.fire(this.x, this.y, ux, uy, this.contactDamage);
      this.shootCooldownUntil = time + ORBITER_FIRE_INTERVAL_MS;
    }
  }
}
