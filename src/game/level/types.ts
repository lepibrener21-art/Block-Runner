export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SpawnEdge = 'N' | 'E' | 'S' | 'W';

export interface SpawnPoint {
  edge: SpawnEdge;
  x: number;
  y: number;
}

export interface WaveSpec {
  spawns: SpawnPoint[];
}

export interface Level {
  blockHeight: number;
  blockHash: string;
  walls: Wall[];
  waves: WaveSpec[];
  totalEnemies: number;
}
