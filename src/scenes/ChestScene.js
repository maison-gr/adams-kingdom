import Phaser from 'phaser';
import { GameState }  from '../GameState.js';
import { CHEST_DEFS, generateRewards } from '../systems/ChestSystem.js';
import { burstParticles } from '../effects/juice.js';

const REWARD_COLORS = {
  coins:  { bg: 0x7A5800, border: 0xFFD700, text: '#FFD700' },
  spins:  { bg: 0x0A4A28, border: 0x2ECC71, text: '#2ECC71' },
  shield: { bg: 0x12294A, border: 0x5DADE2, text: '#5DADE2' },
};
const REWARD_ICON  = { coins: '🪙', spins: '🔄', shield: '🛡' };

export class ChestScene extends Phaser.Scene {
  constructor() { super('ChestScene'); }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  init(data) {
    this.chestId   = data.chestId;
    this.chestType = data.chestType || 'wood';
    this.rewards   = generateRewards(this.chestType);
    this.opened    = false;
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.W  = W;
    this.H  = H;
    this.cx = W / 2;
    this.cy = H * 0.50;

    this._buildBackground();
    this._buildChest();
    this._buildPrompt();
    this._buildReturnButton();

    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 280 });
  }

  // ── Background ─────────────────────────────────────────────────────────────

  _buildBackground() {
    const { W, H, cx, cy } = this;

    const bg = this.add.graphics();
    bg.fillStyle(0x08080F, 1);
    bg.fillRect(0, 0, W, H);

    // Soft radial spotlight around chest
    const sp = this.add.graphics();
    for (let i = 10; i > 0; i--) {
      sp.fillStyle(0xFFE060, 0.034);
      sp.fillCircle(cx, cy, i * 22);
    }

    const def = CHEST_DEFS[this.chestType];
    this.add.text(cx, H * 0.08, def.label, {
      fontSize: '24px', fontFamily: 'Arial Black',
      color: `#${def.lidColor.toString(16).padStart(6, '0')}`,
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2);
  }

  // ── Chest drawing ──────────────────────────────────────────────────────────

  _buildChest() {
    const { W } = this;
    this.chestBodyGfx = this.add.graphics().setDepth(4);
    this.chestLidGfx  = this.add.graphics().setDepth(5);
    this._drawChest(0);

    const hit = this.add.zone(W / 2, this.cy, 130, 130)
      .setInteractive({ useHandCursor: true });
    hit.once('pointerdown', () => this._openChest());
  }

  _drawChest(lidOffsetY) {
    const { chestType, cx, cy } = this;
    const def = CHEST_DEFS[chestType];
    const bx = cx, by = cy;

    // ─ Body ─
    const g = this.chestBodyGfx;
    g.clear();

    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(bx, by + 58, 90, 17);

    g.fillStyle(def.bodyColor, 1);
    g.fillRect(bx - 36, by, 72, 52);

    g.fillStyle(def.darkColor, 1);
    g.fillRect(bx - 36, by + 38, 72, 14);

    g.fillStyle(def.bandColor, 1);
    g.fillRect(bx - 36, by + 16, 72, 5);

    g.fillStyle(def.gemColor, 1);
    g.fillRect(bx - 11, by + 22, 22, 15);
    g.fillStyle(0x000000, 0.5);
    g.fillCircle(bx, by + 27, 4);

    g.lineStyle(2, def.bandColor, 1);
    g.strokeRect(bx - 36, by, 72, 52);

    // ─ Lid ─
    const l = this.chestLidGfx;
    l.clear();

    const lx = bx;
    const ly = by + lidOffsetY;

    l.fillStyle(def.lidColor, 1);
    l.fillRect(lx - 36, ly - 28, 72, 30);

    l.fillStyle(def.lidColor, 0.85);
    l.fillRect(lx - 30, ly - 34, 60, 8);

    l.fillStyle(def.bandColor, 1);
    l.fillRect(lx - 36, ly - 12, 72, 5);

    l.lineStyle(2, def.bandColor, 1);
    l.strokeRect(lx - 36, ly - 28, 72, 30);
  }

  // ── Prompt ─────────────────────────────────────────────────────────────────

  _buildPrompt() {
    const { W, H } = this;
    this.promptText = this.add.text(W / 2, H * 0.70, 'Tap to Open!', {
      fontSize: '20px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(5);

    this.tweens.add({
      targets: this.promptText, alpha: 0.25,
      duration: 580, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ── Return button ──────────────────────────────────────────────────────────

  _buildReturnButton() {
    const { W, H } = this;
    const bg = this.add.graphics().setDepth(8);
    bg.fillStyle(0x222222, 0.92);
    bg.fillRoundedRect(W / 2 - 70, H * 0.90 - 1, 140, 40, 10);
    bg.lineStyle(2, 0x888888, 0.8);
    bg.strokeRoundedRect(W / 2 - 70, H * 0.90 - 1, 140, 40, 10);

    const btn = this.add.text(W / 2, H * 0.90 + 19, 'Return Home', {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#AAAAAA', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#FFFFFF' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#AAAAAA' }));
    btn.on('pointerdown', () => this._returnHome());
  }

  // ── Open animation ─────────────────────────────────────────────────────────

  _openChest() {
    if (this.opened) return;
    this.opened = true;

    this.tweens.killTweensOf(this.promptText);
    this.promptText.setAlpha(0);

    this.cameras.main.shake(240, 0.013);

    const proxy = { lidY: 0 };
    this.time.delayedCall(260, () => {
      this.tweens.add({
        targets: proxy,
        lidY: -72,
        duration: 360,
        ease: 'Back.easeOut',
        onUpdate: () => this._drawChest(proxy.lidY),
        onComplete: () => {
          const def = CHEST_DEFS[this.chestType];
          burstParticles(this, this.cx, this.cy, [
            def.lidColor, def.gemColor, 0xFFFFFF, 0xFFD700,
          ], 20);
          this._showRewards();
        },
      });
    });
  }

  // ── Reward cards ───────────────────────────────────────────────────────────

  _showRewards() {
    const { W, H, rewards } = this;
    const xPositions = [W * 0.18, W * 0.50, W * 0.82];
    const startY = this.cy - 10;
    const endY   = H * 0.26;

    rewards.forEach((reward, i) => {
      this.time.delayedCall(i * 240, () => {
        const card = this._makeCard(xPositions[i], startY, reward);
        this.tweens.add({ targets: card, y: endY, duration: 400, ease: 'Back.easeOut' });

        if (i === rewards.length - 1) {
          this.time.delayedCall(500, () => this._showCollectButton());
        }
      });
    });
  }

  _makeCard(x, y, reward) {
    const col  = REWARD_COLORS[reward.type] || REWARD_COLORS.coins;
    const icon = REWARD_ICON[reward.type] || '?';
    const label =
      reward.type === 'coins'  ? `+${reward.value.toLocaleString()}` :
      reward.type === 'spins'  ? `+${reward.value} Spin${reward.value > 1 ? 's' : ''}` :
                                 `+${reward.value} Shield${reward.value > 1 ? 's' : ''}`;
    const CW = 84, CH = 110;

    const container = this.add.container(x, y).setDepth(6);

    const bg = this.add.graphics();
    bg.fillStyle(col.bg, 1);
    bg.fillRoundedRect(-CW / 2, -CH / 2, CW, CH, 10);
    bg.lineStyle(2.5, col.border, 1);
    bg.strokeRoundedRect(-CW / 2, -CH / 2, CW, CH, 10);

    const iconTxt = this.add.text(0, -20, icon, { fontSize: '28px' }).setOrigin(0.5);
    const lblTxt  = this.add.text(0, 22, label, {
      fontSize: '12px', fontFamily: 'Arial Black',
      color: col.text, stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    container.add([bg, iconTxt, lblTxt]);
    return container;
  }

  // ── Collect button ─────────────────────────────────────────────────────────

  _showCollectButton() {
    const { W, H } = this;
    const bx = W / 2 - 88, by = H * 0.72;

    const bg = this.add.graphics().setDepth(8).setAlpha(0);
    bg.fillStyle(0x1ABC9C, 1);
    bg.fillRoundedRect(bx, by, 176, 48, 12);
    bg.lineStyle(2, 0x148F77, 1);
    bg.strokeRoundedRect(bx, by, 176, 48, 12);

    const btn = this.add.text(W / 2, by + 24, 'Collect All!', {
      fontSize: '18px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9).setScale(0.3).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this._collectAll());

    this.tweens.add({ targets: bg,  alpha: 1,   duration: 200 });
    this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.easeOut' });
  }

  // ── Collect & return ───────────────────────────────────────────────────────

  _collectAll() {
    this.rewards.forEach(r => {
      if (r.type === 'coins')  GameState.addCoins(r.value);
      if (r.type === 'spins')  GameState.addSpins(r.value);
      if (r.type === 'shield') for (let i = 0; i < r.value; i++) GameState.addShield();
    });
    if (this.chestId) GameState.removeChest(this.chestId);
    this._returnHome();
  }

  _returnHome() {
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('ChestScene');
      this.scene.wake('GameScene');
    });
  }
}
