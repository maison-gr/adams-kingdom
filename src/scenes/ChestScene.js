import Phaser from 'phaser';
import { GameState }  from '../GameState.js';
import { CHEST_DEFS, generateRewards } from '../systems/ChestSystem.js';
import { CardSystem }  from '../systems/CardSystem.js';
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
    this.chestId    = data.chestId;
    this.chestType  = data.chestType || 'wood';
    this.rewards    = generateRewards(this.chestType);
    this.opened     = false;
    this.cardSystem = new CardSystem();
    this.drawnCards = [];
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
          this.drawnCards = this.cardSystem.drawFromChest(this.chestType);
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
    const endY   = H * 0.22;

    rewards.forEach((reward, i) => {
      this.time.delayedCall(i * 240, () => {
        const card = this._makeCard(xPositions[i], startY, reward);
        this.tweens.add({ targets: card, y: endY, duration: 400, ease: 'Back.easeOut' });

        if (i === rewards.length - 1) {
          this.time.delayedCall(400, () => this._showCardReveal());
          this.time.delayedCall(900, () => this._showCollectButton());
        }
      });
    });
  }

  _showCardReveal() {
    const { W, H } = this;
    const cards    = this.drawnCards;
    if (!cards.length) return;

    const RARITY_COL = { common: 0x2244BB, rare: 0x8833CC, gold: 0xD4A017 };
    const RARITY_BG  = { common: 0x0A1A3A, rare: 0x1A0A38, gold: 0x2A1500 };

    this.add.text(W / 2, H * 0.48, '🃏  New Card' + (cards.length > 1 ? 's' : '') + '!', {
      fontSize: '14px', fontFamily: 'Arial Black',
      color: '#D4A017', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(7).setAlpha(0);

    const lbl = this.children.list[this.children.list.length - 1];
    this.tweens.add({ targets: lbl, alpha: 1, duration: 300 });

    const CW = 72, CH = 88;
    const gap = 10;
    const totalW = cards.length * CW + (cards.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + CW / 2;

    cards.forEach((card, i) => {
      const cx = startX + i * (CW + gap);
      const cy = H * 0.60;

      this.time.delayedCall(i * 160, () => {
        const g = this.add.graphics().setDepth(7).setAlpha(0);
        g.fillStyle(RARITY_BG[card.rarity], 1);
        g.fillRoundedRect(cx - CW / 2, cy - CH / 2, CW, CH, 6);
        g.lineStyle(2, RARITY_COL[card.rarity], 0.9);
        g.strokeRoundedRect(cx - CW / 2, cy - CH / 2, CW, CH, 6);
        if (card.rarity === 'gold') {
          g.fillStyle(0xFFD700, 0.08);
          g.fillRoundedRect(cx - CW / 2, cy - CH / 2, CW, CH, 6);
        }
        this.tweens.add({ targets: g, alpha: 1, duration: 280 });

        const icon = this.add.text(cx, cy - 14, card.icon, { fontSize: '26px' })
          .setOrigin(0.5).setDepth(8).setAlpha(0);
        const name = this.add.text(cx, cy + 22, card.name, {
          fontSize: '9px', fontFamily: 'Arial Black',
          color: { common: '#88AADD', rare: '#CC88EE', gold: '#FFD700' }[card.rarity],
        }).setOrigin(0.5).setDepth(8).setAlpha(0);
        const rTag = this.add.text(cx, cy + 36, card.rarity.toUpperCase(), {
          fontSize: '7px', fontFamily: 'Arial Black', color: '#445566',
        }).setOrigin(0.5).setDepth(8).setAlpha(0);

        this.tweens.add({ targets: [icon, name, rTag], alpha: 1, duration: 280 });
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

    const newSets = this.cardSystem.unclaimedComplete();
    if (newSets.length > 0) {
      this._showSetCompleteFlash(newSets[0].name, () => this._returnHome());
    } else {
      this._returnHome();
    }
  }

  _showSetCompleteFlash(setName, callback) {
    const { W, H } = this;
    const D = 20;
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(D);
    const t1 = this.add.text(W / 2, H * 0.40, '🎉 SET COMPLETE!', {
      fontSize: '36px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(D + 1).setScale(0.1);
    const t2 = this.add.text(W / 2, H * 0.52, setName, {
      fontSize: '20px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D + 1).setAlpha(0);
    const t3 = this.add.text(W / 2, H * 0.62, 'Visit Cards to claim your reward!', {
      fontSize: '13px', fontFamily: 'Arial', color: '#AABBCC',
    }).setOrigin(0.5).setDepth(D + 1).setAlpha(0);

    this.tweens.add({ targets: t1, scaleX: 1, scaleY: 1, duration: 380, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [t2, t3], alpha: 1, duration: 400, delay: 280 });
    this.time.delayedCall(2800, () => {
      this.tweens.add({
        targets: [bg, t1, t2, t3], alpha: 0, duration: 350,
        onComplete: callback,
      });
    });
  }

  _returnHome() {
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('ChestScene');
      this.scene.wake('GameScene');
    });
  }
}
