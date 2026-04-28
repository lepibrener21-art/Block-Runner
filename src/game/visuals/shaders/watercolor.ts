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

  // Soft low-pass blur, radius up to 2 px at full intensity.
  float r = 2.0 * uIntensity;
  vec3 sum = vec3(0.0);
  float total = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 off = vec2(float(x), float(y)) * px * r;
      float w = 1.0 - 0.3 * length(vec2(float(x), float(y)));
      sum += texture2D(uMainSampler, uv + off).rgb * w;
      total += w;
    }
  }
  vec3 base = sum / total;

  // Color bleed -- channels drift in different directions like wet pigment.
  float bleed = 0.5 * uIntensity;
  float br = texture2D(uMainSampler, uv + px * vec2(2.0, 1.0) * bleed).r;
  float bg = texture2D(uMainSampler, uv + px * vec2(-1.0, 0.5) * bleed).g;
  float bb = texture2D(uMainSampler, uv + px * vec2(1.0, -1.5) * bleed).b;
  vec3 bled = vec3(br, bg, bb);

  vec3 color = mix(base, bled, 0.4 * uIntensity);

  // Static paper grain -- fixed by pixel position, not time, so it reads as paper texture.
  float grain = (hash21(floor(uv * uResolution)) - 0.5) * 0.10 * uIntensity;
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
