import Phaser from 'phaser';

const FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uIntensity;

varying vec2 outTexCoord;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = outTexCoord;
  vec2 px = 1.0 / uResolution;

  // Per-mood intensity is floored so low-byte epochs still read as
  // watercolour. uEffect ranges 0.4 .. 1.0.
  float uEffect = mix(0.4, 1.0, uIntensity);

  // Low-pass blur, radius 1 -> 4 px across the floored intensity.
  float r = 1.0 + 3.0 * uEffect;
  vec3 sum = vec3(0.0);
  float total = 0.0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 off = vec2(float(x), float(y)) * px * r;
      float w = 1.0 - 0.18 * length(vec2(float(x), float(y)));
      sum += texture2D(uMainSampler, uv + off).rgb * w;
      total += w;
    }
  }
  vec3 base = sum / total;

  // Mild overall desaturation -- watercolour pigments aren't punchy.
  float lum = dot(base, vec3(0.299, 0.587, 0.114));
  base = mix(base, vec3(lum), 0.2);

  // Strong colour bleed -- each channel drifts in its own direction.
  float bleed = 0.4 + 0.7 * uEffect;
  float br = texture2D(uMainSampler, uv + px * vec2(3.0, 1.5) * bleed).r;
  float bg = texture2D(uMainSampler, uv + px * vec2(-1.5, 0.8) * bleed).g;
  float bb = texture2D(uMainSampler, uv + px * vec2(1.5, -2.5) * bleed).b;
  vec3 bled = vec3(br, bg, bb);

  vec3 color = mix(base, bled, 0.35 + 0.3 * uEffect);

  // Paper grain -- always a baseline alpha so the page texture is
  // present even at minimum intensity.
  float grainAmp = 0.06 + 0.10 * uEffect;
  float grain = (hash21(floor(uv * uResolution)) - 0.5) * grainAmp;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const WATERCOLOR_PIPELINE_KEY = 'WatercolorPostFX';

export class WatercolorPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private intensity = 0.5;

  constructor(game: Phaser.Game) {
    super({ game, name: WATERCOLOR_PIPELINE_KEY, fragShader: FRAG });
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
