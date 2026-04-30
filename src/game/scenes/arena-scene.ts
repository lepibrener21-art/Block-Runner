import Phaser from 'phaser';
import { getBlock, getEpochAnchor } from '../../data/blocks.ts';
import type { BlockData } from '../../data/types.ts';
import { ARENA_H_PX, ARENA_W_PX, CAMERA_ZOOM, TILE_SIZE } from '../constants.ts';
import { difficultyLog10FromBits, difficultyMultipliers } from '../difficulty.ts';
import { aggressionTier, pickEnemyTypes } from '../enemy-spec.ts';
import { Bullet } from '../entities/bullet.ts';
import { Enemy } from '../entities/enemy.ts';
import { Player } from '../entities/player.ts';
import { generateLevel } from '../level/generator.ts';
import type { Level, WaveSpec } from '../level/types.ts';
import { WaveManager } from '../systems/wave-manager.ts';
import { deriveBlockVisuals, deriveEpochVisuals } from '../visuals/derive.ts';
import { computeTodTint, timeOfDayFromTimestamp } from '../visuals/time-of-day.ts';
import { CRTPipeline } from '../visuals/shaders/crt.ts';
import { EraPipeline } from '../visuals/shaders/era.ts';
import { GlitchPipeline } from '../visuals/shaders/glitch.ts';
import { NeonPipeline } from '../visuals/shaders/neon.ts';
import { VintagePipeline } from '../visuals/shaders/vintage.ts';
import { WatercolorPipeline } from '../visuals/shaders/watercolor.ts';
import { eraIntensity } from '../visuals/era.ts';
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
    this.drawParticles();
    this.drawTimeOfDay();
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
      const enemy = enemyObj as Enemy;
      if (!enemy.active) return;
      this.player.takeDamage(enemy.contactDamage, this.time.now);
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

  private static readonly PARTICLE_TEXTURE_KEY = 'particle-dot';

  private registerParticleTexture(): void {
    if (this.textures.exists(ArenaScene.PARTICLE_TEXTURE_KEY)) return;
    const size = 6;
    const cx = size / 2;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(cx, cx, cx);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cx, cx * 0.45);
    g.generateTexture(ArenaScene.PARTICLE_TEXTURE_KEY, size, size);
    g.destroy();
  }

  private drawParticles(): void {
    const density = this.visuals.epoch.particleDensity;
    if (density < 0.05) return;

    this.registerParticleTexture();

    const target = Math.round(8 + density * 72);
    const lifespanAvgMs = 6000;
    const frequency = Math.max(50, Math.round(lifespanAvgMs / target));
    const tint = hslToInt(this.visuals.palette.particle);

    const emitter = this.add.particles(0, 0, ArenaScene.PARTICLE_TEXTURE_KEY, {
      x: { min: 0, max: ARENA_W_PX },
      y: { min: 0, max: ARENA_H_PX },
      speed: { min: 4, max: 14 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 4000, max: 8000 },
      scale: { min: 0.5, max: 1.1 },
      tint,
      alpha: {
        onEmit: (): number => 0,
        onUpdate: (_p, _k, t): number => 0.4 * Math.sin(t * Math.PI),
      },
      frequency,
      quantity: 1,
    });
    emitter.setDepth(60);
  }

  private drawTimeOfDay(): void {
    const tod = timeOfDayFromTimestamp(this.block.timestamp);
    const tint = computeTodTint(tod);
    if (tint.alpha < 0.02) return;
    const overlay = this.add.rectangle(
      ARENA_W_PX / 2,
      ARENA_H_PX / 2,
      ARENA_W_PX,
      ARENA_H_PX,
      hslToInt(tint.color),
      tint.alpha,
    );
    overlay.setDepth(70);
  }

  private applyShader(): void {
    const moodIntensity = this.visuals.epoch.shaderIntensity;
    const moodClass = this.moodPipelineClass();
    const eraIntens = eraIntensity(this.block.timestamp);
    const wantEra = eraIntens > 0.01;

    type PipelineCtor =
      | typeof CRTPipeline
      | typeof GlitchPipeline
      | typeof WatercolorPipeline
      | typeof NeonPipeline
      | typeof VintagePipeline
      | typeof EraPipeline;

    const classes: PipelineCtor[] = [];
    if (moodClass) classes.push(moodClass);
    if (wantEra) classes.push(EraPipeline);

    if (classes.length === 0) return;

    this.cameras.main.setPostPipeline(classes);

    if (moodClass) {
      const pipe = this.cameras.main.getPostPipeline(moodClass);
      if (
        pipe instanceof CRTPipeline ||
        pipe instanceof GlitchPipeline ||
        pipe instanceof WatercolorPipeline ||
        pipe instanceof NeonPipeline ||
        pipe instanceof VintagePipeline
      ) {
        pipe.setIntensity(moodIntensity);
      }
    }
    if (wantEra) {
      const pipe = this.cameras.main.getPostPipeline(EraPipeline);
      if (pipe instanceof EraPipeline) pipe.setIntensity(eraIntens);
    }
  }

  private moodPipelineClass():
    | typeof CRTPipeline
    | typeof GlitchPipeline
    | typeof WatercolorPipeline
    | typeof NeonPipeline
    | typeof VintagePipeline
    | null {
    switch (this.visuals.epoch.shader) {
      case 'crt':
        return CRTPipeline;
      case 'glitch':
        return GlitchPipeline;
      case 'watercolor':
        return WatercolorPipeline;
      case 'neon':
        return NeonPipeline;
      case 'vintage':
        return VintagePipeline;
      default:
        return null;
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
    const mults = difficultyMultipliers(this.block.bits);
    const tier = aggressionTier(difficultyLog10FromBits(this.block.bits));
    const types = pickEnemyTypes(this.block.hash, tier, spec.spawns.length);
    for (let i = 0; i < spec.spawns.length; i++) {
      const point = spec.spawns[i]!;
      const enemy = new Enemy(this, point.x, point.y, types[i]!);
      enemy.waveIndex = idx;
      enemy.applyDifficulty(mults);
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
      if (enemy.active) enemy.tick(time, this.player.x, this.player.y);
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
