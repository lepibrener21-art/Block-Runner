import Phaser from 'phaser';
import { VIEWPORT_H, VIEWPORT_W } from '../constants.ts';

export interface HudState {
  blockHeight: number;
  hp: number;
  maxHp: number;
  wave: number;
  totalWaves: number;
}

export type EndKind = 'cleared' | 'died';

export class UIScene extends Phaser.Scene {
  private blockText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private endTitle?: Phaser.GameObjects.Text;
  private endHint?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ui', active: false });
  }

  create(): void {
    const baseStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#dde3ff',
    };

    this.blockText = this.add.text(12, 10, '', baseStyle);
    this.hpText = this.add.text(12, 32, '', baseStyle);
    this.waveText = this.add.text(12, 54, '', baseStyle);

    const arena = this.scene.get('arena');
    arena.events.on('hud:state', (state: HudState) => this.applyState(state), this);
    arena.events.on('hud:end', (kind: EndKind) => this.showEnd(kind), this);
    arena.events.on('hud:reset', () => this.clearEnd(), this);
    arena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      arena.events.off('hud:state', undefined, this);
      arena.events.off('hud:end', undefined, this);
      arena.events.off('hud:reset', undefined, this);
    });
  }

  private applyState(state: HudState): void {
    this.blockText.setText(`block ${state.blockHeight}`);
    this.hpText.setText(`hp ${state.hp}/${state.maxHp}`);
    this.waveText.setText(`wave ${state.wave}/${state.totalWaves}`);
  }

  private showEnd(kind: EndKind): void {
    if (this.endTitle) return;
    const title = kind === 'cleared' ? 'LEVEL CLEARED' : 'YOU DIED';
    const color = kind === 'cleared' ? '#9bff7a' : '#ff6c6c';

    this.endTitle = this.add
      .text(VIEWPORT_W / 2, VIEWPORT_H / 2 - 18, title, {
        fontFamily: 'monospace',
        fontSize: '40px',
        color,
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.endHint = this.add
      .text(VIEWPORT_W / 2, VIEWPORT_H / 2 + 24, 'press R to restart', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#aab0cc',
      })
      .setOrigin(0.5);
  }

  private clearEnd(): void {
    this.endTitle?.destroy();
    this.endHint?.destroy();
    this.endTitle = undefined;
    this.endHint = undefined;
  }
}
