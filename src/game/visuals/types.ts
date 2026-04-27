export const SHADER_MOODS = ['crt', 'glitch', 'watercolor', 'neon', 'vintage'] as const;
export type ShaderMood = (typeof SHADER_MOODS)[number];

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface Palette {
  primary: HSL;
  accent: HSL;
  background: HSL;
  particle: HSL;
}

export interface EpochVisuals {
  shader: ShaderMood;
  shaderIntensity: number;
  palette: Palette;
  fogDensity: number;
  particleDensity: number;
  ambientToneShift: number;
  ambientIntensity: number;
}

export interface BlockVisuals {
  epoch: EpochVisuals;
  palette: Palette;
}

export function hslToInt({ h, s, l }: HSL): number {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const ri = Math.round(Math.min(255, Math.max(0, (r + m) * 255)));
  const gi = Math.round(Math.min(255, Math.max(0, (g + m) * 255)));
  const bi = Math.round(Math.min(255, Math.max(0, (b + m) * 255)));
  return (ri << 16) | (gi << 8) | bi;
}

export function shiftHsl(c: HSL, dh: number, ds: number, dl: number): HSL {
  return {
    h: (((c.h + dh) % 360) + 360) % 360,
    s: Math.min(1, Math.max(0, c.s + ds)),
    l: Math.min(1, Math.max(0, c.l + dl)),
  };
}
