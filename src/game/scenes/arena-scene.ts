import Phaser from 'phaser';
import type { BlockData } from '../../data/types.ts';
import {
  ARENA_H_PX,
  ARENA_W_PX,
  CAMERA_ZOOM,
  ENEMY,
  TILE_SIZE,
  WALL,
} from '../constants.ts';
import { Bullet } from '../entities/bullet.ts';
import { Enemy } from '../entities/enemy.ts';
import { Player } from '../entities/player.ts';
import { generateLevel } from '../level/generator.ts';
import type { Level, WaveSpec } from '../level/types.ts';
import { WaveManager } from '../systems/wave-manager.ts';

export interface ArenaSceneData {
  block: BlockData;
}

export class ArenaScene extends Phaser.Scene {
  private level!: Level;
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private waveManager!: WaveManager;

  private hpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private blockText!: Phaser.GameObjects.Text;
  private endText?: Phaser.GameObjects.Text;

  constructor() {
    super('arena');
  }

  init(data: ArenaSceneData): void {
    this.level = generateLevel(data.block);
  }

  create(): void {
    this.physics.world.setBounds(0, 0, ARENA_W_PX, ARENA_H_PX);
    this.cameras.main.setBounds(0, 0, ARENA_W_PX, ARENA_H_PX);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.centerOn(ARENA_W_PX / 2, ARENA_H_PX / 2);
    this.cameras.main.setBackgroundColor(0x1a1d2e);

    this.walls = this.physics.add.staticGroup();
    for (const w of this.level.walls) {
      const px = w.x * TILE_SIZE + (w.w * TILE_SIZE) / 2;
      const py = w.y * TILE_SIZE + (w.h * TILE_SIZE) / 2;
      const rect = this.add.rectangle(px, py, w.w * TILE_SIZE, w.h * TILE_SIZE, WALL.color);
      rect.setStrokeStyle(1, 0x000000, 0.5);
      this.physics.add.existing(rect, true);
      this.walls.add(rect);
    }

    this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemies = this.physics.add.group({ classType: Enemy });

    this.player = new Player(this, ARENA_W_PX / 2, ARENA_H_PX / 2, (x, y, dx, dy) => {
      const bullet = new Bullet(this, x, y, dx, dy);
      this.bullets.add(bullet);
    });

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.bullets, this.walls, (bullet) => {
      (bullet as Bullet).destroy();
    });
    this.physics.add.overlap(this.bullets, this.enemies, (bulletObj, enemyObj) => {
      const bullet = bulletObj as Bullet;
      const enemy = enemyObj as Enemy;
      if (!bullet.active || !enemy.active) return;
      const killed = enemy.takeDamage(bullet.damage);
      bullet.destroy();
      if (killed) this.waveManager.enemyKilled(this.time.now);
    });
    this.physics.add.overlap(this.player, this.enemies, (_p, enemyObj) => {
      if (!(enemyObj as Enemy).active) return;
      this.player.takeDamage(ENEMY.contactDamage, this.time.now);
    });

    this.waveManager = new WaveManager(this.level, {
      onSpawn: (spec, idx) => this.spawnWave(spec, idx),
      onAllCleared: () => this.showEnd('LEVEL CLEARED', 0x9bff7a),
    });

    this.buildHud();
    this.waveManager.start(this.time.now);
  }

  private spawnWave(spec: WaveSpec, idx: number): void {
    for (const point of spec.spawns) {
      const enemy = new Enemy(this, point.x, point.y);
      this.enemies.add(enemy);
      this.waveManager.enemySpawned();
    }
    this.waveText.setText(this.waveLabel(idx));
  }

  private buildHud(): void {
    const cam = this.cameras.main;
    const baseStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ddd',
    };
    this.blockText = this.add
      .text(8, 6, `block ${this.level.blockHeight}`, baseStyle)
      .setScrollFactor(0)
      .setDepth(1000);
    this.hpText = this.add.text(8, 22, '', baseStyle).setScrollFactor(0).setDepth(1000);
    this.waveText = this.add.text(8, 38, '', baseStyle).setScrollFactor(0).setDepth(1000);
    this.blockText.setScale(1 / cam.zoom);
    this.hpText.setScale(1 / cam.zoom);
    this.waveText.setScale(1 / cam.zoom);
    this.refreshHud();
  }

  private waveLabel(idx: number): string {
    return `wave ${idx + 1}/${this.waveManager.totalWaves()}`;
  }

  private refreshHud(): void {
    this.hpText.setText(`hp ${this.player.hp}/${this.player.maxHp}`);
  }

  private showEnd(text: string, color: number): void {
    if (this.endText) return;
    const cx = this.cameras.main.scrollX + this.cameras.main.width / 2 / this.cameras.main.zoom;
    const cy = this.cameras.main.scrollY + this.cameras.main.height / 2 / this.cameras.main.zoom;
    this.endText = this.add
      .text(cx, cy, text, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setScale(1 / this.cameras.main.zoom);
  }

  override update(time: number): void {
    this.player.update(time);
    this.enemies.children.iterate((obj) => {
      const enemy = obj as Enemy;
      if (enemy.active) enemy.chase(this.player.x, this.player.y);
      return true;
    });
    this.waveManager.update(time);
    this.refreshHud();

    if (this.player.isDead() && !this.endText) {
      this.showEnd('YOU DIED', 0xff6c6c);
    }
  }
}
