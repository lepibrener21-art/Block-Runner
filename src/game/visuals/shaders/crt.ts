import Phaser from 'phaser';

const FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uIntensity;

varying vec2 outTexCoord;

void main() {
  vec2 uv = outTexCoord;

  vec2 cc = uv - 0.5;
  float dist = dot(cc, cc);
  uv = uv + cc * dist * (0.10 + 0.20 * uIntensity);

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 color = texture2D(uMainSampler, uv).rgb;

  float scan = 0.5 + 0.5 * sin(uv.y * uResolution.y * 1.5);
  float scanMix = 0.20 + 0.40 * uIntensity;
  color *= mix(1.0, scan, scanMix);

  color += color * (0.05 + 0.10 * uIntensity);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const CRT_PIPELINE_KEY = 'CRTPostFX';

export class CRTPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private intensity = 0.5;

  constructor(game: Phaser.Game) {
    super({ game, name: CRT_PIPELINE_KEY, fragShader: FRAG });
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
