import Phaser from 'phaser';

const FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uIntensity;
uniform float uTime;

varying vec2 outTexCoord;

float hash11(float n) {
  return fract(sin(n) * 43758.5453);
}

void main() {
  vec2 uv = outTexCoord;

  // Occasional horizontal pixel-shift bands.
  float bandIdx = floor(uv.y * 28.0);
  float bandSeed = bandIdx + floor(uTime * 4.0);
  float bandActive = step(1.0 - 0.3 * uIntensity, hash11(bandSeed));
  float shift = (hash11(bandSeed * 1.7) - 0.5) * 0.06 * uIntensity * bandActive;

  vec2 uvShifted = vec2(uv.x + shift, uv.y);

  // Chromatic aberration -- split R / B channels horizontally.
  float aber = (4.0 / uResolution.x) * uIntensity;

  float r = texture2D(uMainSampler, vec2(uvShifted.x + aber, uv.y)).r;
  float g = texture2D(uMainSampler, uvShifted).g;
  float b = texture2D(uMainSampler, vec2(uvShifted.x - aber, uv.y)).b;
  float a = texture2D(uMainSampler, uvShifted).a;

  gl_FragColor = vec4(r, g, b, a);
}
`;

export const GLITCH_PIPELINE_KEY = 'GlitchPostFX';

export class GlitchPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private intensity = 0.5;

  constructor(game: Phaser.Game) {
    super({ game, name: GLITCH_PIPELINE_KEY, fragShader: FRAG });
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
