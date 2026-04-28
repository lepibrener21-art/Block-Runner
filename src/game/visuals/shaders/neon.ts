import Phaser from 'phaser';

const FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uIntensity;

varying vec2 outTexCoord;

void main() {
  vec2 uv = outTexCoord;
  vec2 px = 1.0 / uResolution;

  vec3 base = texture2D(uMainSampler, uv).rgb;

  // Saturation boost: pull each channel away from luminance.
  float lum = dot(base, vec3(0.299, 0.587, 0.114));
  float sat = 1.0 + 0.6 * uIntensity;
  vec3 boosted = mix(vec3(lum), base, sat);

  // Single-pass bloom approximation: sample 8 surrounding directions
  // at a small radius, keep only the bright excess (over 0.45) and
  // average. Cheap, but reads as glow on bright pixels.
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.78539816;
    vec2 dir = vec2(cos(a), sin(a));
    vec3 s = texture2D(uMainSampler, uv + dir * px * 3.0).rgb;
    glow += max(vec3(0.0), s - 0.45);
  }
  glow /= 8.0;

  // Edge highlight: brightness gradient along x and y, scaled by base
  // colour so the outline picks up the local hue rather than going white.
  vec3 cR = texture2D(uMainSampler, uv + vec2(px.x, 0.0)).rgb;
  vec3 cD = texture2D(uMainSampler, uv + vec2(0.0, px.y)).rgb;
  float gx = length(base - cR);
  float gy = length(base - cD);
  float edge = clamp(gx + gy, 0.0, 1.0);
  vec3 edgeGlow = base * edge * 1.4;

  vec3 color = boosted + glow * uIntensity * 1.4 + edgeGlow * uIntensity;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const NEON_PIPELINE_KEY = 'NeonPostFX';

export class NeonPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private intensity = 0.5;

  constructor(game: Phaser.Game) {
    super({ game, name: NEON_PIPELINE_KEY, fragShader: FRAG });
  }

  setIntensity(value: number): this {
    this.intensity = Math.min(1, Math.max(0, value));
    return this;
  }

  override onPreRender(): void {
    this.set1f('uIntensity', this.intensity);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
  }
}
