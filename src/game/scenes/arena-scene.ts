import Phaser from 'phaser';
import { getBlock, getEpochAnchor } from '../../data/blocks.ts';
import type { BlockData } from '../../data/types.ts';
import {
  ARENA_H_PX,
  ARENA_W_PX,
  CAMERA_ZOOM,
  ENEMY,
  TILE_SIZE,
} from '../constants.ts';
import { Bullet } from '../entities/bullet.ts';
import { Enemy } from '../entities/enemy.ts';
import { Player } from '../entities/player.ts';
import { generateLevel } from '../level/generator.ts';
import type { Level, WaveSpec } from '../level/types.ts';
import { WaveManager } from '../systems/wave-manager.ts';
import { deriveBlockVisuals, deriveEpochVisuals } from '../visuals/derive.ts';
import { CRTPipeline } from '../visuals/shaders/crt.ts';
import { GlitchPipeline } from '../visuals/shaders/glitch.ts';
import { NeonPipeline } from '../visuals/shaders/neon.ts';
import { VintagePipeline } from '../visuals/shaders/vintage.ts';
import { WatercolorPipeline } from '../visuals/shaders/watercolor.ts';
import { hslToInt, shiftHsl, type BlockVisuals } from '../visuals/types.ts';

export interface ArenaSceneData {
  block: BlockData;
  epochAnchor: BlockData;
}

type EndKind = 'cleared' | 'died';

export class ArenaScene extends Phaser.Scene {
  private block!: BlockData;
  private epochAnchor!: BlockData;
  private visuals!: BlockVisuals;
  private level!: Level;
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private waveManager!: WaveManager;
  private endKind?: EndKind;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private nextKey?: Phaser.Input.Keyboard.Key;
  private advancing = false;

  constructor() {
    super('arena');
  }

  init(data: ArenaSceneData): void {
    this.block = data.block;
    this.epochAnchor = data.epochAnchor;
    const epoch = deriveEpochVisuals(data.epochAnchor.hash);
    this.visuals = deriveBlockVisuals(data.block.hash, epoch);
    this.level = generateLevel(data.block);
    this.endKind = undefined;
    this.advancing = false;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, ARENA_W_PX, ARENA_H_PX);
    this.cameras.main.setBounds(0, 0, ARENA_W_PX, ARENA_H_PX);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.centerOn(ARENA_W_PX / 2, ARENA_H_PX / 2);
    this.cameras.main.setBackgroundColor(hslToInt(this.visuals.palette.background));

    this.drawArenaBackground();
    this.drawFog();
    this.drawInscription();
    this.applyShader();

    const wallFill = hslToInt(this.visuals.palette.primary);
    const wallStroke = hslToInt(shiftHsl(this.visuals.palette.primary, 0, 0, 0.18));

    this.walls = this.physics.add.staticGroup();
    for (const w of this.level.walls) {
      const px = w.x * TILE_SIZE + (w.w * TILE_SIZE) / 2;
      const py = w.y * TILE_SIZE + (w.h * TILE_SIZE) / 2;
      const rect = this.add.rectangle(px, py, w.w * TILE_SIZE, w.h * TILE_SIZE, wallFill);
      rect.setStrokeStyle(1, wallStroke, 0.9);
      this.physics.add.existing(rect, true);
      this.walls.add(rect);
    }

    this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemies = this.physics.add.group({ classType: Enemy });

    this.player = new Player(this, ARENA_W_PX / 2, ARENA_H_PX / 2, (x, y, dx, dy) => {
      const bullet = new Bullet(this, x, y);
      this.bullets.add(bullet);
      bullet.launch(dx, dy);
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
      const waveIdx = enemy.waveIndex;
      const killed = enemy.takeDamage(bullet.damage);
      bullet.destroy();
      if (killed) this.waveManager.enemyKilled(waveIdx, this.time.now);
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
      this.nextKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    }

    this.events.emit('hud:reset');
    this.emitHudState(0);
    if (!this.scene.isActive('ui')) {
      this.scene.launch('ui');
    }

    this.waveManager.start(this.time.now);
  }

  private drawArenaBackground(): void {
    const gridColor = hslToInt(shiftHsl(this.visuals.palette.background, 0, 0, 0.12));
    const borderColor = hslToInt(shiftHsl(this.visuals.palette.primary, 0, 0, 0.05));
    const grid = this.add.graphics();
    grid.lineStyle(1, gridColor, 0.8);
    for (let x = TILE_SIZE; x < ARENA_W_PX; x += TILE_SIZE * 4) {
      grid.lineBetween(x, 0, x, ARENA_H_PX);
    }
    for (let y = TILE_SIZE; y < ARENA_H_PX; y += TILE_SIZE * 4) {
      grid.lineBetween(0, y, ARENA_W_PX, y);
    }
    grid.lineStyle(2, borderColor, 0.9);
    grid.strokeRect(0.5, 0.5, ARENA_W_PX - 1, ARENA_H_PX - 1);
    grid.setDepth(-10);
  }

  private drawFog(): void {
    const density = this.visuals.epoch.fogDensity;
    if (density <= 0) return;
    const color = hslToInt(this.visuals.palette.particle);
    const alpha = 0.05 + density * 0.18;
    const fog = this.add.rectangle(ARENA_W_PX / 2, ARENA_H_PX / 2, ARENA_W_PX, ARENA_H_PX, color, alpha);
    fog.setDepth(50);
  }

  private applyShader(): void {
    const intensity = this.visuals.epoch.shaderIntensity;
    switch (this.visuals.epoch.shader) {
      case 'crt': {
        this.cameras.main.setPostPipeline(CRTPipeline);
        const pipe = this.cameras.main.getPostPipeline(CRTPipeline);
        if (pipe instanceof CRTPipeline) pipe.setIntensity(intensity);
        return;
      }
      case 'glitch': {
        this.cameras.main.setPostPipeline(GlitchPipeline);
        const pipe = this.cameras.main.getPostPipeline(GlitchPipeline);
        if (pipe instanceof GlitchPipeline) pipe.setIntensity(intensity);
        return;
      }
      case 'watercolor': {
        this.cameras.main.setPostPipeline(WatercolorPipeline);
        const pipe = this.cameras.main.getPostPipeline(WatercolorPipeline);
        if (pipe instanceof WatercolorPipeline) pipe.setIntensity(intensity);
        return;
      }
      case 'neon': {
        this.cameras.main.setPostPipeline(NeonPipeline);
        const pipe = this.cameras.main.getPostPipeline(NeonPipeline);
        if (pipe instanceof NeonPipeline) pipe.setIntensity(intensity);
        return;
      }
      case 'vintage': {
        this.cameras.main.setPostPipeline(VintagePipeline);
        const pipe = this.cameras.main.getPostPipeline(VintagePipeline);
        if (pipe instanceof VintagePipeline) pipe.setIntensity(intensity);
        return;
      }
      default:
        return;
    }
  }

  private drawInscription(): void {
    const text = this.block.inscription;
    if (!text) return;

    const bg = this.visuals.palette.background;
    const lightness = Math.min(0.78, Math.max(0.5, 0.55 + (0.2 - bg.l) * 1.6));
    const fillHex = `#${hslToInt({ h: 215, s: 0.6, l: lightness }).toString(16).padStart(6, '0')}`;
    const strokeHex = `#${hslToInt({ h: 215, s: 0.55, l: Math.max(0, lightness - 0.3) }).toString(16).padStart(6, '0')}`;

    this.add
      .text(ARENA_W_PX / 2, ARENA_H_PX / 2, text, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: fillHex,
        align: 'center',
        stroke: strokeHex,
        strokeThickness: 2,
        wordWrap: { width: ARENA_W_PX - 80, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setAlpha(0.78)
      .setDepth(-5);
  }

  private spawnWave(spec: WaveSpec, idx: number): void {
    const tint = hslToInt(this.visuals.palette.accent);
    for (const point of spec.spawns) {
      const enemy = new Enemy(this, point.x, point.y);
      enemy.waveIndex = idx;
      enemy.setTint(tint);
      this.enemies.add(enemy);
      this.waveManager.enemySpawned(idx);
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
    if (this.endKind && !this.advancing) {
      if (this.restartKey?.isDown) {
        this.scene.restart({ block: this.block, epochAnchor: this.epochAnchor });
        return;
      }
      if (this.endKind === 'cleared' && this.nextKey?.isDown) {
        void this.advanceToNextBlock();
        return;
      }
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

  private async advanceToNextBlock(): Promise<void> {
    if (this.advancing) return;
    this.advancing = true;
    const nextHeight = this.block.height + 1;
    this.events.emit('hud:loading', `loading block ${nextHeight}…`);
    try {
      const [next, anchor] = await Promise.all([
        getBlock(nextHeight),
        getEpochAnchor(nextHeight),
      ]);
      this.scene.restart({ block: next, epochAnchor: anchor });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.events.emit('hud:loading', `failed to load: ${msg}`);
      this.advancing = false;
    }
  }
}
