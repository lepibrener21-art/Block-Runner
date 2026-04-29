import Phaser from 'phaser';

const FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uIntensity;
uniform float uTime;

varying vec2 outTexCoord;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = outTexCoord;

  // Per-mood intensity is floored so low-byte epochs still read as
  // vintage. uEffect ranges 0.4 .. 1.0.
  float uEffect = mix(0.4, 1.0, uIntensity);

  vec3 base = texture2D(uMainSampler, uv).rgb;

  // Sepia tint: classic NTSC matrix shifts colour toward warm brown.
  vec3 sepia;
  sepia.r = dot(base, vec3(0.393, 0.769, 0.189));
  sepia.g = dot(base, vec3(0.349, 0.686, 0.168));
  sepia.b = dot(base, vec3(0.272, 0.534, 0.131));
  vec3 color = mix(base, sepia, 0.6 * uEffect);

  // Animated film grain -- hash keyed by pixel position AND time so it
  // shifts every frame like real film. Distinguishes from Watercolor's
  // static paper grain.
  float t = floor(uTime * 24.0);
  float grain = (hash21(floor(uv * uResolution) + vec2(t, t * 1.7)) - 0.5);
  color += grain * 0.40 * uEffect;

  // Vignette -- darken corners up to 50% of brightness at full intensity.
  vec2 cc = uv - 0.5;
  float dist = dot(cc, cc);
  float vign = 1.0 - dist * (1.6 + 0.6 * uEffect);
  vign = clamp(vign, 0.5, 1.0);
  color *= vign;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const VINTAGE_PIPELINE_KEY = 'VintagePostFX';

export class VintagePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private intensity = 0.5;

  constructor(game: Phaser.Game) {
    super({ game, name: VINTAGE_PIPELINE_KEY, fragShader: FRAG });
  }

  setIntensity(value: number): this {
    this.intensity = Math.min(1, Math.max(0, value));
    return this;
  }

  override onPreRender(): void {
    this.set1f('uIntensity', this.intensity);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set1f('uTime', this.game.loop.time / 1000);
  }
}
