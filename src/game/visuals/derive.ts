import { bytesFromHex } from '../../rng/rng.ts';
import {
  SHADER_MOODS,
  shiftHsl,
  type BlockVisuals,
  type EpochVisuals,
  type HSL,
  type Palette,
  type ShaderMood,
} from './types.ts';

const SAT_MIN = 0.4;
const SAT_RANGE = 0.55;
const LIGHT_MIN = 0.35;
const LIGHT_RANGE = 0.35;

const PER_BLOCK_HUE_RANGE = 12;
const PER_BLOCK_SAT_RANGE = 0.08;

function hslFromBytes(hueByte: number, satByte: number, lightByte: number): HSL {
  return {
    h: (hueByte / 255) * 360,
    s: SAT_MIN + (satByte / 255) * SAT_RANGE,
    l: LIGHT_MIN + (lightByte / 255) * LIGHT_RANGE,
  };
}

function buildPalette(anchorA: HSL, anchorB: HSL): Palette {
  return {
    primary: anchorA,
    accent: anchorB,
    background: { h: anchorA.h, s: anchorA.s * 0.6, l: Math.max(0.05, anchorA.l * 0.18) },
    particle: { h: anchorB.h, s: anchorB.s * 0.5, l: Math.min(0.85, anchorB.l + 0.2) },
  };
}

export function deriveEpochVisuals(epochHashHex: string): EpochVisuals {
  const bytes = bytesFromHex(epochHashHex);
  if (bytes.length < 14) {
    throw new Error(`epoch hash too short: ${bytes.length} bytes`);
  }

  const shader: ShaderMood = SHADER_MOODS[bytes[0]! % SHADER_MOODS.length]!;
  const shaderIntensity = bytes[1]! / 255;

  const anchorA = hslFromBytes(bytes[2]!, bytes[3]!, bytes[4]!);
  const anchorB = hslFromBytes(bytes[5]!, bytes[6]!, bytes[7]!);
  const palette = buildPalette(anchorA, anchorB);

  return {
    shader,
    shaderIntensity,
    palette,
    fogDensity: bytes[8]! / 255,
    particleDensity: bytes[9]! / 255,
    ambientToneShift: (bytes[12]! / 255) * 2 - 1,
    ambientIntensity: bytes[13]! / 255,
  };
}

export function deriveBlockVisuals(blockHashHex: string, epoch: EpochVisuals): BlockVisuals {
  const bytes = bytesFromHex(blockHashHex);
  if (bytes.length < 18) {
    return { epoch, palette: epoch.palette };
  }
  const dh = ((bytes[16]! / 255) * 2 - 1) * PER_BLOCK_HUE_RANGE;
  const ds = ((bytes[17]! / 255) * 2 - 1) * PER_BLOCK_SAT_RANGE;
  const palette: Palette = {
    primary: shiftHsl(epoch.palette.primary, dh, ds, 0),
    accent: shiftHsl(epoch.palette.accent, dh, ds, 0),
    background: shiftHsl(epoch.palette.background, dh, 0, 0),
    particle: shiftHsl(epoch.palette.particle, dh, ds, 0),
  };
  return { epoch, palette };
}
