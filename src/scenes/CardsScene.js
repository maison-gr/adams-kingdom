import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { CardSystem, CARD_SETS } from '../systems/CardSystem.js';

const RARITY_BG  = { common: 0x0A1A3A, rare: 0x1A0A38, gold: 0x2A1500 };
const RARITY_BDR = { common: 0x2244BB, rare: 0x8833CC, gold: 0xD4A017 };
const RARITY_TXT = { common: '#88AADD', rare: '#CC88EE', gold: '#FFD700' };

export class CardsScene extends Phaser.Scene {
  constructor() { super('CardsScene'); }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.cs = new CardSystem();

    this._drawBg(W, H);
    this._drawHeader(W);
    this._drawSets(W);
    this._drawBackBtn(W, H);
  }

  // ─── BACKGROUND ────────────────────────────────────────────────────────────

  _drawBg(W, H) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x03031A, 0x03031A, 0x0D0D3A, 0x0D0D3A, 1);
    bg.fillRect(0, 0, W, H);
    for (let i = 0; i < 55; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H * 0.50),
        Phaser.Math.FloatBetween(0.4, 1.5),
        0xFFFFFF,
        Phaser.Math.FloatBetween(0.3, 0.8),
      );
    }
  }

  // ─── HEADER ────────────────────────────────────────────────────────────────

  _drawHeader(W) {
    const g = this.add.graphics();
    g.fillStyle(0x05051E, 0.90); g.fillRoundedRect(8, 8, W - 16, 74, 14);
    g.fillStyle(0xFFFFFF, 0.05); g.fillRoundedRect(8, 8, W - 16, 36, 14);
    g.lineStyle(2, 0xD4A017, 0.65); g.strokeRoundedRect(8, 8, W - 16, 74, 14);

    this.add.text(W / 2, 44, '🃏  Card Collection', {
      fontSize: '22px', fontFamily: 'Arial Black',
      color: '#D4A017', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(W / 2, 73, `${this.cs.uniqueCount} / ${this.cs.totalCards} unique cards`, {
      fontSize: '11px', fontFamily: 'Arial', color: '#556677',
    }).setOrigin(0.5).setDepth(2);

    if (this.cs.uniqueCount === 0) {
      this.add.text(W / 2, 80, '🎁  Spin the wheel to get chests — open chests to collect cards!', {
        fontSize: '12px', fontFamily: 'Arial', color: '#1ABC9C',
        align: 'center', wordWrap: { width: W - 40 },
      }).setOrigin(0.5, 0).setDepth(2);
    }
  }

  // ─── SETS ──────────────────────────────────────────────────────────────────

  _drawSets(W) {
    const panelH  = 116;
    const gap     = 7;
    const startY  = 88;

    CARD_SETS.forEach((set, i) => {
      const panelY = startY + i * (panelH + gap);
      this._drawSetPanel(W, panelY, panelH, set, i);
    });
  }

  _drawSetPanel(W, y, h, set, index) {
    const collected = set.cards.filter(c => (this.cs.collection[c.id] || 0) > 0).length;
    const done      = collected === set.cards.length;
    const claimed   = this.cs._claimed.includes(set.id);

    // Panel bg
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(claimed ? 0x080816 : 0x05051E, 0.93);
    g.fillRoundedRect(12, y, W - 24, h, 10);
    if (done && !claimed) {
      g.fillStyle(0xD4A017, 0.06);
      g.fillRoundedRect(12, y, W - 24, 30, 10);
    }
    g.lineStyle(2, claimed ? 0x1A2244 : done ? 0xD4A017 : 0x233355, claimed ? 0.30 : 0.75);
    g.strokeRoundedRect(12, y, W - 24, h, 10);

    const dim = claimed ? 0.35 : 1;

    // Set title + icon
    this.add.text(30, y + 14, `${set.icon}  ${set.name}`, {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: claimed ? '#334455' : '#DDEEFF',
      stroke: '#000000', strokeThickness: 2,
    }).setAlpha(dim).setDepth(4);

    // Progress fraction (top-right)
    this.add.text(W - 28, y + 14, `${collected}/6`, {
      fontSize: '12px', fontFamily: 'Arial Black',
      color: claimed ? '#334455' : done ? '#D4A017' : '#446677',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 0).setAlpha(dim).setDepth(4);

    // 6 card slots
    const cardW  = 62;
    const cardH  = 50;
    const gapC   = 3;
    const totalW = 6 * cardW + 5 * gapC;
    const startX = 12 + Math.round((W - 24 - totalW) / 2);
    const cardY  = y + 32;

    set.cards.forEach((card, ci) => {
      const cx = startX + ci * (cardW + gapC);
      this._drawCardSlot(g, cx, cardY, cardW, cardH, card,
        (this.cs.collection[card.id] || 0) > 0, dim);
    });

    // Bottom area: progress bar OR claim button OR claimed tick
    const barY = y + h - 22;

    if (claimed) {
      this.add.text(W / 2, barY + 8, '✓  Claimed', {
        fontSize: '11px', fontFamily: 'Arial', color: '#334455',
      }).setOrigin(0.5).setDepth(4);
    } else if (done) {
      this._drawClaimBtn(W, barY, set, index);
    } else {
      // Thin progress bar
      g.fillStyle(0x0A0A22, 1);
      g.fillRoundedRect(30, barY, W - 84, 12, 5);
      if (collected > 0) {
        g.fillStyle(0x1A5A9A, 1);
        g.fillRoundedRect(30, barY, Math.round((W - 84) * collected / 6), 12, 5);
      }
      this.add.text(30 + (W - 84) / 2, barY + 6, `${collected}/6 cards`, {
        fontSize: '9px', fontFamily: 'Arial Black', color: '#556677',
      }).setOrigin(0.5).setDepth(4);
    }
  }

  _drawCardSlot(g, x, y, w, h, card, collected, alpha) {
    if (collected) {
      g.fillStyle(RARITY_BG[card.rarity], 1);
      g.fillRoundedRect(x, y, w, h, 4);
      g.lineStyle(1.5, RARITY_BDR[card.rarity], 0.90);
      g.strokeRoundedRect(x, y, w, h, 4);
      // Rarity dot
      g.fillStyle(RARITY_BDR[card.rarity], 1);
      g.fillCircle(x + w - 7, y + 7, 3.5);

      this.add.text(x + w / 2, y + 16, card.icon, { fontSize: '20px' })
        .setOrigin(0.5).setAlpha(alpha).setDepth(5);
      this.add.text(x + w / 2, y + 38, card.name, {
        fontSize: '7px', fontFamily: 'Arial Black',
        color: RARITY_TXT[card.rarity],
      }).setOrigin(0.5).setAlpha(alpha).setDepth(5);
    } else {
      g.fillStyle(0x06060F, 1);
      g.fillRoundedRect(x, y, w, h, 4);
      g.lineStyle(1, 0x111128, 0.8);
      g.strokeRoundedRect(x, y, w, h, 4);
      this.add.text(x + w / 2, y + h / 2 - 2, '?', {
        fontSize: '20px', fontFamily: 'Arial Black', color: '#141432',
      }).setOrigin(0.5).setDepth(5);
    }
  }

  _drawClaimBtn(W, y, set, index) {
    const bx = W / 2 - 80;
    const bw = 160;
    const bg = this.add.graphics().setDepth(4);
    bg.fillStyle(0x1A7A3A, 1); bg.fillRoundedRect(bx, y - 2, bw, 26, 7);
    bg.fillStyle(0x27AE60, 1); bg.fillRoundedRect(bx, y - 2, bw, 17, 7);
    bg.lineStyle(1.5, 0x2ECC71, 0.85); bg.strokeRoundedRect(bx, y - 2, bw, 26, 7);

    const rewardStr = set.reward.coins
      ? `💰 ${set.reward.coins.toLocaleString()}  +${set.reward.spins} Spins`
      : '';

    this.add.text(W / 2, y + 11, `CLAIM!  ${rewardStr}`, {
      fontSize: '11px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#0A3A1A', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    this.add.rectangle(W / 2, y + 11, bw, 26, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(6)
      .on('pointerdown', () => {
        GameState.addCoins(set.reward.coins || 0);
        GameState.addSpins(set.reward.spins || 0);
        this.cs.claimSet(set.id);
        this.cameras.main.fadeOut(160, 0, 0, 0);
        this.time.delayedCall(170, () => this.scene.restart());
      });
  }

  // ─── BACK BUTTON ───────────────────────────────────────────────────────────

  _drawBackBtn(W, H) {
    const bx = W / 2;
    const by = H * 0.920;

    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x7B2D00, 1); g.fillRoundedRect(bx - 100, by - 28, 200, 56, 16);
    g.fillStyle(0xE67E22, 1); g.fillRoundedRect(bx - 100, by - 28, 200, 42, 16);
    g.fillStyle(0xF5A623, 0.45); g.fillRoundedRect(bx - 96, by - 24, 192, 20, 12);
    g.lineStyle(2.5, 0xFFD700, 0.90); g.strokeRoundedRect(bx - 100, by - 28, 200, 56, 16);

    this.add.text(bx, by, '← Back', {
      fontSize: '23px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#7B2D00', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(6);

    this.add.rectangle(bx, by, 200, 56, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(7)
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(280, 0, 0, 0);
        this.time.delayedCall(290, () => {
          this.scene.stop('CardsScene');
          this.scene.wake('GameScene');
        });
      });
  }
}
