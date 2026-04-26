import Phaser from 'phaser';
import { VIEWPORT_H, VIEWPORT_W } from './game/constants.ts';
import { ArenaScene } from './game/scenes/arena-scene.ts';
import { BootScene } from './game/scenes/boot-scene.ts';

new Phaser.Game({
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
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, ArenaScene],
});
