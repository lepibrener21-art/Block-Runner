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
  private loadingText?: Phaser.GameObjects.Text;
  private pauseTitle?: Phaser.GameObjects.Text;
  private pauseHint?: Phaser.GameObjects.Text;

  private inEndState = false;
  private paused = false;

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
    const onState = (state: HudState): void => this.applyState(state);
    const onEnd = (kind: EndKind): void => {
      this.inEndState = true;
      this.showEnd(kind);
    };
    const onReset = (): void => {
      this.inEndState = false;
      this.clearEnd();
      this.clearPause();
    };

    const onLoading = (msg: string): void => this.showLoading(msg);

    arena.events.on('hud:state', onState, this);
    arena.events.on('hud:end', onEnd, this);
    arena.events.on('hud:reset', onReset, this);
    arena.events.on('hud:loading', onLoading, this);

    const escKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
      true,
      false,
    );
    escKey?.on('down', () => this.togglePause());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      arena.events.off('hud:state', onState, this);
      arena.events.off('hud:end', onEnd, this);
      arena.events.off('hud:reset', onReset, this);
      arena.events.off('hud:loading', onLoading, this);
    });
  }

  private togglePause(): void {
    if (this.inEndState) return;
    if (this.paused) this.resumeArena();
    else this.pauseArena();
  }

  private pauseArena(): void {
    this.paused = true;
    this.scene.pause('arena');
    this.showPause();
  }

  private resumeArena(): void {
    this.paused = false;
    this.scene.resume('arena');
    this.hidePause();
  }

  private showPause(): void {
    if (this.pauseTitle) return;
    this.pauseTitle = this.add
      .text(VIEWPORT_W / 2, VIEWPORT_H / 2 - 18, 'PAUSED', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#ffd66c',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.pauseHint = this.add
      .text(VIEWPORT_W / 2, VIEWPORT_H / 2 + 24, 'press Esc to resume', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#aab0cc',
      })
      .setOrigin(0.5);
  }

  private hidePause(): void {
    this.pauseTitle?.destroy();
    this.pauseHint?.destroy();
    this.pauseTitle = undefined;
    this.pauseHint = undefined;
  }

  private clearPause(): void {
    if (this.paused) {
      this.scene.resume('arena');
      this.paused = false;
    }
    this.hidePause();
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
    const hint =
      kind === 'cleared' ? 'press R to restart  ·  press N for next block' : 'press R to restart';

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
      .text(VIEWPORT_W / 2, VIEWPORT_H / 2 + 24, hint, {
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
    this.loadingText?.destroy();
    this.loadingText = undefined;
  }

  private showLoading(msg: string): void {
    if (this.loadingText) {
      this.loadingText.setText(msg);
      return;
    }
    this.loadingText = this.add
      .text(VIEWPORT_W / 2, VIEWPORT_H / 2 + 60, msg, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#dde3ff',
      })
      .setOrigin(0.5);
  }
}
