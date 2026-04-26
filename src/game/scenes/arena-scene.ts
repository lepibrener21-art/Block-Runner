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

type EndKind = 'cleared' | 'died';

export class ArenaScene extends Phaser.Scene {
  private block!: BlockData;
  private level!: Level;
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private waveManager!: WaveManager;
  private endKind?: EndKind;
  private restartKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('arena');
  }

  init(data: ArenaSceneData): void {
    this.block = data.block;
    this.level = generateLevel(data.block);
    this.endKind = undefined;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, ARENA_W_PX, ARENA_H_PX);
    this.cameras.main.setBounds(0, 0, ARENA_W_PX, ARENA_H_PX);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.centerOn(ARENA_W_PX / 2, ARENA_H_PX / 2);
    this.cameras.main.setBackgroundColor(0x0d0f1c);

    this.drawArenaBackground();

    this.walls = this.physics.add.staticGroup();
    for (const w of this.level.walls) {
      const px = w.x * TILE_SIZE + (w.w * TILE_SIZE) / 2;
      const py = w.y * TILE_SIZE + (w.h * TILE_SIZE) / 2;
      const rect = this.add.rectangle(px, py, w.w * TILE_SIZE, w.h * TILE_SIZE, WALL.color);
      rect.setStrokeStyle(1, 0x8088b5, 0.7);
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
      onAllCleared: () => this.handleEnd('cleared'),
    });

    if (this.input.keyboard) {
      this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    }

    this.events.emit('hud:reset');
    this.emitHudState(0);
    if (!this.scene.isActive('ui')) {
      this.scene.launch('ui');
    }

    this.waveManager.start(this.time.now);
  }

  private drawArenaBackground(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a2040, 0.6);
    for (let x = TILE_SIZE; x < ARENA_W_PX; x += TILE_SIZE * 4) {
      grid.lineBetween(x, 0, x, ARENA_H_PX);
    }
    for (let y = TILE_SIZE; y < ARENA_H_PX; y += TILE_SIZE * 4) {
      grid.lineBetween(0, y, ARENA_W_PX, y);
    }
    grid.lineStyle(2, 0x6b73a8, 0.9);
    grid.strokeRect(0.5, 0.5, ARENA_W_PX - 1, ARENA_H_PX - 1);
    grid.setDepth(-10);
  }

  private spawnWave(spec: WaveSpec, idx: number): void {
    for (const point of spec.spawns) {
      const enemy = new Enemy(this, point.x, point.y);
      this.enemies.add(enemy);
      this.waveManager.enemySpawned();
    }
    this.emitHudState(idx);
  }

  private emitHudState(waveIdx: number): void {
    this.events.emit('hud:state', {
      blockHeight: this.block.height,
      hp: this.player ? this.player.hp : 100,
      maxHp: this.player ? this.player.maxHp : 100,
      wave: waveIdx + 1,
      totalWaves: this.waveManager.totalWaves(),
    });
  }

  private handleEnd(kind: EndKind): void {
    if (this.endKind) return;
    this.endKind = kind;
    this.events.emit('hud:end', kind);
  }

  override update(time: number): void {
    if (this.restartKey?.isDown && this.endKind) {
      this.scene.restart({ block: this.block });
      return;
    }

    this.player.update(time);
    this.enemies.children.iterate((obj) => {
      const enemy = obj as Enemy;
      if (enemy.active) enemy.chase(this.player.x, this.player.y);
      return true;
    });
    this.waveManager.update(time);

    this.emitHudState(Math.max(0, this.waveManager.currentWaveIndex()));

    if (this.player.isDead() && !this.endKind) {
      this.handleEnd('died');
    }
  }
}
