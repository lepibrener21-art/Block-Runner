import type { Level, WaveSpec } from '../level/types.ts';
import { WAVE } from '../constants.ts';

export type WaveState = 'pending' | 'active' | 'cleared' | 'between';

interface WaveCallbacks {
  onSpawn: (spec: WaveSpec, waveIndex: number) => void;
  onAllCleared: () => void;
}

export class WaveManager {
  private waveIndex = -1;
  private aliveInWave = 0;
  private spawnedInWave = 0;
  private waveStartTime = 0;
  private state: WaveState = 'pending';

  constructor(
    private readonly level: Level,
    private readonly callbacks: WaveCallbacks,
  ) {}

  start(time: number): void {
    this.spawnNext(time);
  }

  currentWaveIndex(): number {
    return this.waveIndex;
  }

  totalWaves(): number {
    return this.level.waves.length;
  }

  enemySpawned(): void {
    this.aliveInWave++;
    this.spawnedInWave++;
  }

  enemyKilled(time: number): void {
    this.aliveInWave = Math.max(0, this.aliveInWave - 1);
    this.checkAdvance(time);
  }

  update(time: number): void {
    if (this.state !== 'active') return;
    if (time - this.waveStartTime >= WAVE.safetyTimeoutMs) {
      this.advance(time);
    }
  }

  isCleared(): boolean {
    return this.state === 'cleared';
  }

  private checkAdvance(time: number): void {
    if (this.state !== 'active') return;
    const spec = this.level.waves[this.waveIndex];
    if (!spec) return;
    const killed = this.spawnedInWave - this.aliveInWave;
    const killRatio = killed / spec.spawns.length;
    if (killRatio >= WAVE.killThreshold) {
      this.advance(time);
    }
  }

  private advance(time: number): void {
    if (this.waveIndex >= this.level.waves.length - 1) {
      if (this.aliveInWave === 0) {
        this.state = 'cleared';
        this.callbacks.onAllCleared();
      }
      return;
    }
    this.spawnNext(time);
  }

  private spawnNext(time: number): void {
    this.waveIndex++;
    const spec = this.level.waves[this.waveIndex];
    if (!spec) return;
    this.aliveInWave = 0;
    this.spawnedInWave = 0;
    this.waveStartTime = time;
    this.state = 'active';
    this.callbacks.onSpawn(spec, this.waveIndex);
  }
}
