import { GameState }   from '../GameState.js';
import { audioSystem } from '../effects/AudioSystem.js';

export class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this._drawBg(W, H);
    this._drawTitle(W);

    let rowY = 110;
    rowY = this._drawNameRow(W, rowY);
    rowY = this._drawDivider(W, rowY + 10);
    rowY = this._drawToggleRow(W, rowY, '🔊  Sound Effects', !audioSystem.isMuted, val => {
      audioSystem.toggleMute();
      if (audioSystem.isMuted) audioSystem.stopBGM(); else audioSystem.startBGM();
    });
    rowY = this._drawToggleRow(W, rowY, '🎵  Background Music', this._bgmOn(), val => {
      const nowOn = !this._bgmOn();
      localStorage.setItem('bgmEnabled', nowOn ? '1' : '0');
      if (nowOn && !audioSystem.isMuted) audioSystem.startBGM(); else audioSystem.stopBGM();
    });
    rowY = this._drawDivider(W, rowY + 6);
    rowY = this._drawActionRow(W, rowY, '🔔  Notifications', 'SOON', '#445566', null);
    rowY = this._drawDivider(W, rowY + 6);
    rowY = this._drawActionRow(W, rowY, '🗑️  Reset Progress', 'RESET', '#CC2222', () => this._confirmReset(W, H));

    const S = Math.max(1, Math.min(W / 480, 1.4));
    this.add.text(W / 2, rowY + 28, `Adam's Kingdom  v1.0.0`, {
      fontSize: `${Math.round(12 * S)}px`, fontFamily: 'Arial', color: '#4A6070',
    }).setOrigin(0.5).setDepth(3);

    this._drawCloseBtn(W, H);
  }

  _bgmOn() {
    return localStorage.getItem('bgmEnabled') !== '0';
  }

  // ─── BACKGROUND ────────────────────────────────────────────────────────────

  _drawBg(W, H) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x03031A, 0x03031A, 0x0D0D3A, 0x0D0D3A, 1);
    bg.fillRect(0, 0, W, H);
    for (let i = 0; i < 55; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H * 0.55),
        Phaser.Math.FloatBetween(0.4, 1.6),
        0xFFFFFF,
        Phaser.Math.FloatBetween(0.3, 0.85),
      );
    }
  }

  // ─── TITLE ─────────────────────────────────────────────────────────────────

  _drawTitle(W) {
    const S = Math.max(1, Math.min(W / 480, 1.4));
    const g = this.add.graphics();
    g.fillStyle(0x05051E, 0.92); g.fillRoundedRect(8, 8, W - 16, 74, 14);
    g.fillStyle(0xFFFFFF, 0.04); g.fillRoundedRect(8, 8, W - 16, 36, 14);
    g.lineStyle(2, 0x4488CC, 0.65); g.strokeRoundedRect(8, 8, W - 16, 74, 14);

    this.add.text(W / 2, 44, '⚙️  SETTINGS', {
      fontSize: `${Math.round(22 * S)}px`, fontFamily: 'Arial Black',
      color: '#AACCFF', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2);
  }

  // ─── NAME ROW ──────────────────────────────────────────────────────────────

  _drawNameRow(W, y) {
    const S = Math.max(1, Math.min(W / 480, 1.4));
    const h = 62;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x05051E, 0.88); g.fillRoundedRect(16, y, W - 32, h, 10);
    g.lineStyle(1.5, 0x223355, 0.75); g.strokeRoundedRect(16, y, W - 32, h, 10);

    this.add.text(28, y + 12, 'PLAYER NAME', {
      fontSize: `${Math.round(11 * S)}px`, fontFamily: 'Arial Black', color: '#6688BB',
    }).setDepth(3);

    this._nameTxt = this.add.text(28, y + 36, GameState.playerName, {
      fontSize: `${Math.round(17 * S)}px`, fontFamily: 'Arial Black', color: '#DDEEFF',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(3);

    // CHANGE button
    const bx = W - 28;
    const by = y + h / 2;
    const btnG = this.add.graphics().setDepth(3);
    btnG.fillStyle(0x0A2050, 1); btnG.fillRoundedRect(bx - 72, by - 16, 72, 32, 8);
    btnG.fillStyle(0x1A4A9A, 1); btnG.fillRoundedRect(bx - 72, by - 16, 72, 22, 8);
    btnG.lineStyle(1.5, 0x4488DD, 0.8); btnG.strokeRoundedRect(bx - 72, by - 16, 72, 32, 8);

    this.add.text(bx - 36, by, 'CHANGE', {
      fontSize: `${Math.round(12 * S)}px`, fontFamily: 'Arial Black', color: '#FFFFFF',
      stroke: '#0A2050', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4);

    this.add.rectangle(bx - 36, by, 72, 32, 0, 0)
      .setDepth(5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showNameInput(W));

    return y + h + 8;
  }

  // ─── TOGGLE ROW ────────────────────────────────────────────────────────────

  _drawToggleRow(W, y, label, isOn, onChange) {
    const S = Math.max(1, Math.min(W / 480, 1.4));
    const h = 54;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x05051E, 0.88); g.fillRoundedRect(16, y, W - 32, h, 10);
    g.lineStyle(1.5, 0x223355, 0.75); g.strokeRoundedRect(16, y, W - 32, h, 10);

    this.add.text(28, y + h / 2, label, {
      fontSize: `${Math.round(15 * S)}px`, fontFamily: 'Arial Black', color: '#BBCCDD',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(3);

    const pillW = Math.round(52 * S);
    const pillH = Math.round(28 * S);
    const tx = W - pillW - 20;
    const ty = y + h / 2;

    const pillG = this.add.graphics().setDepth(3);
    let state = isOn;

    const redraw = () => {
      pillG.clear();
      pillG.fillStyle(state ? 0x27AE60 : 0x334455, 1);
      pillG.fillRoundedRect(tx, ty - pillH / 2, pillW, pillH, pillH / 2);
      pillG.fillStyle(0xFFFFFF, 1);
      const kx = state ? tx + pillW - pillH / 2 : tx + pillH / 2;
      pillG.fillCircle(kx, ty, pillH / 2 - 3);
    };
    redraw();

    this.add.rectangle(tx + pillW / 2, ty, pillW, pillH, 0, 0)
      .setDepth(4).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        state = !state;
        redraw();
        onChange(state);
      });

    return y + h + 6;
  }

  // ─── ACTION ROW ────────────────────────────────────────────────────────────

  _drawActionRow(W, y, label, btnLabel, btnColor, onTap) {
    const S = Math.max(1, Math.min(W / 480, 1.4));
    const h = 54;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x05051E, 0.88); g.fillRoundedRect(16, y, W - 32, h, 10);
    g.lineStyle(1.5, 0x223355, 0.75); g.strokeRoundedRect(16, y, W - 32, h, 10);

    this.add.text(28, y + h / 2, label, {
      fontSize: `${Math.round(15 * S)}px`, fontFamily: 'Arial Black', color: '#BBCCDD',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(3);

    const bx = W - 28;
    const by = y + h / 2;
    const hexCol = parseInt(btnColor.replace('#', ''), 16);

    const btnG = this.add.graphics().setDepth(3);
    btnG.fillStyle(hexCol, onTap ? 1 : 0.35);
    btnG.fillRoundedRect(bx - 80, by - 16, 80, 32, 8);
    btnG.lineStyle(1.5, hexCol, onTap ? 0.75 : 0.3);
    btnG.strokeRoundedRect(bx - 80, by - 16, 80, 32, 8);

    this.add.text(bx - 40, by, btnLabel, {
      fontSize: `${Math.round(12 * S)}px`, fontFamily: 'Arial Black',
      color: onTap ? '#FFFFFF' : '#556677',
      stroke: '#000', strokeThickness: onTap ? 2 : 0,
    }).setOrigin(0.5).setDepth(4);

    if (onTap) {
      this.add.rectangle(bx - 40, by, 80, 32, 0, 0)
        .setDepth(5).setInteractive({ useHandCursor: true })
        .on('pointerdown', onTap);
    }

    return y + h + 6;
  }

  // ─── DIVIDER ───────────────────────────────────────────────────────────────

  _drawDivider(W, y) {
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(1, 0x1A2A4A, 0.6);
    g.lineBetween(24, y, W - 24, y);
    return y + 8;
  }

  // ─── NAME INPUT OVERLAY ────────────────────────────────────────────────────

  _showNameInput(W) {
    const H = this.scale.height;
    const objs = [];
    const track = o => { objs.push(o); return o; };

    track(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.80).setDepth(20).setInteractive());

    const panelG = track(this.add.graphics().setDepth(21));
    panelG.fillStyle(0x07071E, 0.98);
    panelG.fillRoundedRect(W / 2 - 168, H / 2 - 110, 336, 220, 16);
    panelG.lineStyle(2, 0xFFD700, 0.65);
    panelG.strokeRoundedRect(W / 2 - 168, H / 2 - 110, 336, 220, 16);

    track(this.add.text(W / 2, H / 2 - 78, 'Change Name', {
      fontSize: '17px', fontFamily: 'Arial Black', color: '#DDEEFF',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(22));

    track(this.add.text(W / 2, H / 2 - 52, 'Letters, numbers, spaces (2–20 chars)', {
      fontSize: '10px', fontFamily: 'Arial', color: '#445577',
    }).setOrigin(0.5).setDepth(22));

    // DOM input element
    const gameDiv = document.getElementById('game') || document.body;
    const canvas  = gameDiv.querySelector('canvas') || gameDiv;
    const rect    = canvas.getBoundingClientRect();
    const scaleX  = canvas.clientWidth  / this.scale.width;
    const scaleY  = canvas.clientHeight / this.scale.height;

    const input = document.createElement('input');
    input.type      = 'text';
    input.value     = GameState.playerName;
    input.maxLength = 20;
    input.setAttribute('autocomplete', 'off');
    input.style.cssText = [
      `position:fixed`,
      `left:${rect.left + (W / 2 - 130) * scaleX}px`,
      `top:${rect.top  + (H / 2 - 20)  * scaleY}px`,
      `width:${260 * scaleX}px`,
      `height:${44 * scaleY}px`,
      `font-size:${20 * scaleY}px`,
      `font-family:Arial Black`,
      `text-align:center`,
      `background:#0A0A2E`,
      `color:#FFFFFF`,
      `border:2px solid #4488DD`,
      `border-radius:${8 * scaleY}px`,
      `outline:none`,
      `padding:0 12px`,
      `box-sizing:border-box`,
      `z-index:9999`,
    ].join(';');

    document.body.appendChild(input);
    input.focus();
    input.select();

    const cleanup = () => {
      objs.forEach(o => o.destroy());
      if (document.body.contains(input)) document.body.removeChild(input);
    };

    // Save button
    const saveBtnY = H / 2 + 52;
    const saveBtnG = track(this.add.graphics().setDepth(22));
    saveBtnG.fillStyle(0x1A6B00, 1);
    saveBtnG.fillRoundedRect(W / 2 - 80, saveBtnY - 20, 160, 40, 10);
    saveBtnG.fillStyle(0x27AE60, 1);
    saveBtnG.fillRoundedRect(W / 2 - 80, saveBtnY - 20, 160, 28, 10);
    saveBtnG.lineStyle(1.5, 0x2ECC71, 0.8);
    saveBtnG.strokeRoundedRect(W / 2 - 80, saveBtnY - 20, 160, 40, 10);

    track(this.add.text(W / 2, saveBtnY, 'SAVE', {
      fontSize: '15px', fontFamily: 'Arial Black', color: '#FFFFFF',
      stroke: '#0A3A1A', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(23));

    const doSave = () => {
      const raw  = input.value.trim();
      const name = raw.replace(/[^a-zA-Z0-9_ ]/g, '').trim().slice(0, 20);
      if (name.length < 2) {
        input.style.borderColor = '#CC2222';
        return;
      }
      GameState.setPlayerName(name);
      cleanup();
      this._nameTxt.setText(name);
    };

    track(this.add.rectangle(W / 2, saveBtnY, 160, 40, 0, 0)
      .setDepth(24).setInteractive({ useHandCursor: true })
      .on('pointerdown', doSave));

    const cancelTxt = track(this.add.text(W / 2, saveBtnY + 34, 'Cancel', {
      fontSize: '13px', fontFamily: 'Arial', color: '#445577',
    }).setOrigin(0.5).setDepth(23).setInteractive({ useHandCursor: true }));
    cancelTxt.on('pointerdown', cleanup);

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  doSave();
      if (e.key === 'Escape') cleanup();
    });
  }

  // ─── RESET PROGRESS ────────────────────────────────────────────────────────

  _confirmReset(W, H) {
    const objs = [];
    const track = o => { objs.push(o); return o; };
    const cleanup = () => objs.forEach(o => o.destroy());

    track(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(20).setInteractive());

    const panelG = track(this.add.graphics().setDepth(21));
    panelG.fillStyle(0x0E0005, 0.98);
    panelG.fillRoundedRect(W / 2 - 160, H / 2 - 120, 320, 240, 16);
    panelG.lineStyle(2, 0xCC0000, 0.70);
    panelG.strokeRoundedRect(W / 2 - 160, H / 2 - 120, 320, 240, 16);

    track(this.add.text(W / 2, H / 2 - 84, '⚠️  RESET PROGRESS', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#FF4444',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(22));

    track(this.add.text(W / 2, H / 2 - 44, 'This will erase ALL coins,\nbuildings, spins and missions.\nThis cannot be undone.', {
      fontSize: '13px', fontFamily: 'Arial', color: '#AA8888',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(22));

    // Confirm RESET
    const confY = H / 2 + 36;
    const confG = track(this.add.graphics().setDepth(22));
    confG.fillStyle(0x880000, 1); confG.fillRoundedRect(W / 2 - 100, confY - 22, 200, 44, 10);
    confG.fillStyle(0xCC1A00, 1); confG.fillRoundedRect(W / 2 - 100, confY - 22, 200, 30, 10);
    confG.lineStyle(1.5, 0xFF3300, 0.8); confG.strokeRoundedRect(W / 2 - 100, confY - 22, 200, 44, 10);

    track(this.add.text(W / 2, confY, 'YES, RESET EVERYTHING', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#FFFFFF',
      stroke: '#440000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(23));

    track(this.add.rectangle(W / 2, confY, 200, 44, 0, 0)
      .setDepth(24).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        cleanup();
        GameState.resetAll();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(310, () => {
          this.scene.stop('SettingsScene');
          this.scene.stop('GameScene');
          this.scene.start('BootScene');
        });
      }));

    const cancelY = H / 2 + 90;
    const cancelTxt = track(this.add.text(W / 2, cancelY, 'Cancel', {
      fontSize: '14px', fontFamily: 'Arial', color: '#556677',
    }).setOrigin(0.5).setDepth(23).setInteractive({ useHandCursor: true }));
    cancelTxt.on('pointerdown', cleanup);
  }

  // ─── CLOSE BUTTON ──────────────────────────────────────────────────────────

  _drawCloseBtn(W, H) {
    const S = Math.max(1, Math.min(W / 480, 1.4));
    const bx = W / 2;
    const by = H * 0.93;
    const btnW = Math.round(200 * S);
    const btnH = 56;

    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x7B2D00, 1); g.fillRoundedRect(bx - btnW / 2, by - 28, btnW, btnH, 16);
    g.fillStyle(0xE67E22, 1); g.fillRoundedRect(bx - btnW / 2, by - 28, btnW, 42, 16);
    g.fillStyle(0xF5A623, 0.45); g.fillRoundedRect(bx - btnW / 2 + 4, by - 24, btnW - 8, 20, 12);
    g.lineStyle(2.5, 0xFFD700, 0.90); g.strokeRoundedRect(bx - btnW / 2, by - 28, btnW, btnH, 16);

    this.add.text(bx, by, '← Back', {
      fontSize: `${Math.round(23 * S)}px`, fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#7B2D00', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(6);

    this.add.rectangle(bx, by, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(7)
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(280, 0, 0, 0);
        this.time.delayedCall(290, () => {
          this.scene.stop('SettingsScene');
          this.scene.wake('GameScene');
        });
      });
  }
}
