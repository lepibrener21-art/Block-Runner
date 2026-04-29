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

  // Per-mood intensity is floored so low-byte epochs still read as
  // neon. uEffect ranges 0.4 .. 1.0.
  float uEffect = mix(0.4, 1.0, uIntensity);

  vec3 base = texture2D(uMainSampler, uv).rgb;

  // Saturation boost: pull each channel away from luminance, scaled to
  // 1.15 -> 1.8 across uEffect. Always above 1 so the colour pop is
  // present even at minimum intensity.
  float lum = dot(base, vec3(0.299, 0.587, 0.114));
  float sat = 1.15 + 0.65 * uEffect;
  vec3 boosted = mix(vec3(lum), base, sat);

  // Two-ring single-pass bloom: 8 directions at radius 3 px and 12
  // directions effectively at radius 6 px (re-using the same loop with
  // a second sample per step). Bright excess only -- threshold 0.40.
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.78539816;
    vec2 dir = vec2(cos(a), sin(a));
    vec3 s1 = texture2D(uMainSampler, uv + dir * px * 3.0).rgb;
    vec3 s2 = texture2D(uMainSampler, uv + dir * px * 6.0).rgb;
    glow += max(vec3(0.0), s1 - 0.40) + max(vec3(0.0), s2 - 0.40) * 0.6;
  }
  glow /= 8.0;

  // Edge highlight: brightness gradient on x and y, scaled by base
  // colour so outlines pick up the local hue rather than going white.
  vec3 cR = texture2D(uMainSampler, uv + vec2(px.x, 0.0)).rgb;
  vec3 cD = texture2D(uMainSampler, uv + vec2(0.0, px.y)).rgb;
  float gx = length(base - cR);
  float gy = length(base - cD);
  float edge = clamp(gx + gy, 0.0, 1.0);
  vec3 edgeGlow = base * edge * 1.8;

  // Vignette: darken corners so glowing pixels at centre pop more.
  vec2 cc = uv - 0.5;
  float vign = 1.0 - dot(cc, cc) * (0.6 + 0.6 * uEffect);
  vign = clamp(vign, 0.55, 1.0);

  vec3 color = (boosted + glow * uEffect * 1.6 + edgeGlow * uEffect) * vign;

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
