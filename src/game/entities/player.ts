import Phaser from 'phaser';
import { PLAYER, WEAPON } from '../constants.ts';

const TEXTURE_KEY = 'player-texture';

export interface FireFn {
  (originX: number, originY: number, dirX: number, dirY: number): void;
}

interface InputKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  dodge: Phaser.Input.Keyboard.Key;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp: number = PLAYER.hp;
  readonly maxHp: number = PLAYER.hp;

  private hitCooldownUntil = 0;
  private dodgeCooldownUntil = 0;
  private dodgeUntil = 0;
  private iframeUntil = 0;
  private fireCooldownUntil = 0;

  private dodgeDirX = 1;
  private dodgeDirY = 0;

  private readonly keys: InputKeys;
  private readonly fire: FireFn;

  constructor(scene: Phaser.Scene, x: number, y: number, fire: FireFn) {
    Player.registerTexture(scene);
    super(scene, x, y, TEXTURE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.fire = fire;
    this.setCircle(PLAYER.size / 2);
    this.setCollideWorldBounds(true);

    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Player requires a keyboard input plugin.');
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      dodge: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };
  }

  static registerTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(PLAYER.color, 1);
    g.fillCircle(PLAYER.size / 2, PLAYER.size / 2, PLAYER.size / 2);
    g.lineStyle(1, 0xffffff, 0.6);
    g.strokeCircle(PLAYER.size / 2, PLAYER.size / 2, PLAYER.size / 2 - 0.5);
    g.generateTexture(TEXTURE_KEY, PLAYER.size, PLAYER.size);
    g.destroy();
  }

  isDodging(time: number): boolean {
    return time < this.dodgeUntil;
  }

  hasIFrames(time: number): boolean {
    return time < this.iframeUntil;
  }

  takeDamage(dmg: number, time: number): boolean {
    if (this.hasIFrames(time)) return false;
    if (time < this.hitCooldownUntil) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.hitCooldownUntil = time + PLAYER.hitCooldownMs;
    return true;
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  override update(time: number): void {
    if (this.isDead()) {
      this.setVelocity(0, 0);
      return;
    }

    const dodging = this.isDodging(time);

    if (!dodging) {
      let vx = 0;
      let vy = 0;
      if (this.keys.left.isDown) vx -= 1;
      if (this.keys.right.isDown) vx += 1;
      if (this.keys.up.isDown) vy -= 1;
      if (this.keys.down.isDown) vy += 1;

      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        vx /= len;
        vy /= len;
        this.setVelocity(vx * PLAYER.speed, vy * PLAYER.speed);
        this.dodgeDirX = vx;
        this.dodgeDirY = vy;
      } else {
        this.setVelocity(0, 0);
      }

      if (this.keys.dodge.isDown && time >= this.dodgeCooldownUntil) {
        this.dodgeUntil = time + PLAYER.dodge.durationMs;
        this.iframeUntil = time + PLAYER.dodge.iframeMs;
        this.dodgeCooldownUntil = time + PLAYER.dodge.cooldownMs;
        if (this.dodgeDirX === 0 && this.dodgeDirY === 0) {
          const aim = this.aimVector();
          this.dodgeDirX = aim.x;
          this.dodgeDirY = aim.y;
        }
        this.setVelocity(this.dodgeDirX * PLAYER.dodge.speed, this.dodgeDirY * PLAYER.dodge.speed);
      }
    } else {
      this.setVelocity(this.dodgeDirX * PLAYER.dodge.speed, this.dodgeDirY * PLAYER.dodge.speed);
    }

    if (this.scene.input.activePointer.isDown && time >= this.fireCooldownUntil) {
      const aim = this.aimVector();
      this.fire(this.x, this.y, aim.x, aim.y);
      this.fireCooldownUntil = time + WEAPON.fireIntervalMs;
    }
  }

  private aimVector(): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const pointer = this.scene.input.activePointer;
    const world = cam.getWorldPoint(pointer.x, pointer.y);
    let dx = world.x - this.x;
    let dy = world.y - this.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return { x: 1, y: 0 };
    dx /= len;
    dy /= len;
    return { x: dx, y: dy };
  }
}
