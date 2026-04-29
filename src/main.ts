import Phaser from 'phaser';
import { VIEWPORT_H, VIEWPORT_W } from './game/constants.ts';
import { ArenaScene } from './game/scenes/arena-scene.ts';
import { BootScene } from './game/scenes/boot-scene.ts';
import { UIScene } from './game/scenes/ui-scene.ts';
import { CRTPipeline, CRT_PIPELINE_KEY } from './game/visuals/shaders/crt.ts';
import { GlitchPipeline, GLITCH_PIPELINE_KEY } from './game/visuals/shaders/glitch.ts';
import { NeonPipeline, NEON_PIPELINE_KEY } from './game/visuals/shaders/neon.ts';
import { WatercolorPipeline, WATERCOLOR_PIPELINE_KEY } from './game/visuals/shaders/watercolor.ts';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEWPORT_W,
  height: VIEWPORT_H,
  pixelArt: true,
  backgroundColor: '#0a0c1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  audio: {
    noAudio: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, ArenaScene, UIScene],
});

game.events.once(Phaser.Core.Events.READY, () => {
  if (game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
    game.renderer.pipelines.addPostPipeline(CRT_PIPELINE_KEY, CRTPipeline);
    game.renderer.pipelines.addPostPipeline(GLITCH_PIPELINE_KEY, GlitchPipeline);
    game.renderer.pipelines.addPostPipeline(WATERCOLOR_PIPELINE_KEY, WatercolorPipeline);
    game.renderer.pipelines.addPostPipeline(NEON_PIPELINE_KEY, NeonPipeline);
  }
});
