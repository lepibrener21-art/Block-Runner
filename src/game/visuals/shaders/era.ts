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
  vec3 color = texture2D(uMainSampler, uv).rgb;

  if (uIntensity < 0.01) {
    gl_FragColor = vec4(color, 1.0);
    return;
  }

  // Aged-paper / faded-photograph wash. Pull through luminance and
  // tint toward a cream tone, then mix back with the original
  // proportional to intensity so modern blocks (low intensity) read
  // unchanged and old blocks read sun-bleached.
  vec3 cream = vec3(0.95, 0.85, 0.65);
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  vec3 aged = mix(vec3(lum), cream * lum, 0.55);
  color = mix(color, aged, 0.5 * uIntensity);

  // Mild overall desaturation so old blocks feel washed out vs the
  // saturated post-shader image we got from the mood pipeline.
  float lum2 = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(lum2), 0.20 * uIntensity);

  // Animated film grain, lighter than Vintage-mood's grain so the two
  // can stack on a vintage-mood + early-block combo without looking
  // overcooked.
  float t = floor(uTime * 24.0);
  float grain = (hash21(floor(uv * uResolution) + vec2(t, t * 1.3)) - 0.5);
  color += grain * 0.07 * uIntensity;

  // Faint horizontal scanlines as if projected from old film.
  float scan = 0.5 + 0.5 * sin(uv.y * uResolution.y * 0.8);
  color *= mix(1.0, scan, 0.10 * uIntensity);

  // Soft vignette darkens corners.
  vec2 cc = uv - 0.5;
  float vign = 1.0 - dot(cc, cc) * 1.2 * uIntensity;
  vign = clamp(vign, 0.6, 1.0);
  color *= vign;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const ERA_PIPELINE_KEY = 'EraPostFX';

export class EraPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private intensity = 0.5;

  constructor(game: Phaser.Game) {
    super({ game, name: ERA_PIPELINE_KEY, fragShader: FRAG });
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
