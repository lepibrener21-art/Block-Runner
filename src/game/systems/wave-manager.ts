import type { Level, WaveSpec } from '../level/types.ts';
import { WAVE } from '../constants.ts';

export type WaveState = 'pending' | 'active' | 'cleared';

interface WaveCallbacks {
  onSpawn: (spec: WaveSpec, waveIndex: number) => void;
  onAllCleared: () => void;
}

interface WaveStats {
  spawned: number;
  alive: number;
}

export class WaveManager {
  private waveIndex = -1;
  private waveStartTime = 0;
  private state: WaveState = 'pending';
  private readonly stats: WaveStats[];

  constructor(
    private readonly level: Level,
    private readonly callbacks: WaveCallbacks,
  ) {
    this.stats = level.waves.map(() => ({ spawned: 0, alive: 0 }));
  }

  start(time: number): void {
    this.spawnNext(time);
  }

  currentWaveIndex(): number {
    return this.waveIndex;
  }

  totalWaves(): number {
    return this.level.waves.length;
  }

  enemySpawned(waveIndex: number): void {
    const stat = this.stats[waveIndex];
    if (!stat) return;
    stat.spawned++;
    stat.alive++;
  }

  enemyKilled(waveIndex: number, time: number): void {
    const stat = this.stats[waveIndex];
    if (stat) stat.alive = Math.max(0, stat.alive - 1);
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

  private totalAlive(): number {
    return this.stats.reduce((sum, s) => sum + s.alive, 0);
  }

  private checkAdvance(time: number): void {
    if (this.state !== 'active') return;
    const cur = this.stats[this.waveIndex];
    if (!cur || cur.spawned === 0) return;

    const isLast = this.waveIndex >= this.level.waves.length - 1;

    if (isLast) {
      if (this.totalAlive() === 0) this.advance(time);
      return;
    }

    const killed = cur.spawned - cur.alive;
    if (killed / cur.spawned >= WAVE.killThreshold) this.advance(time);
  }

  private advance(time: number): void {
    const isLast = this.waveIndex >= this.level.waves.length - 1;
    if (isLast) {
      if (this.totalAlive() === 0) {
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
    this.waveStartTime = time;
    this.state = 'active';
    this.callbacks.onSpawn(spec, this.waveIndex);
  }
}
