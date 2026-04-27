import { GameState }      from '../GameState.js';
import { getLeaderboard } from '../api/client.js';

export class LeaderboardScene extends Phaser.Scene {
  constructor() { super('LeaderboardScene'); }

  // ─── LIFECYCLE ──────────────────────────────────────────────────────────────

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this._drawBg(W, H);
    this._drawTitlePanel(W);
    this._drawCloseBtn(W, H);

    this._statusText = this.add.text(W / 2, H * 0.42, 'Loading…', {
      fontSize: '18px', fontFamily: 'Arial', color: '#556677',
    }).setOrigin(0.5).setDepth(5);

    getLeaderboard().then(rows => {
      this._statusText.destroy();
      if (!rows || rows.length === 0) {
        this.add.text(W / 2, H * 0.42,
          'No players yet.\nPlay online to appear here!', {
            fontSize: '16px', fontFamily: 'Arial',
            color: '#778899', align: 'center',
          }).setOrigin(0.5).setDepth(5);
        return;
      }
      this._buildRows(W, rows);
    });
  }

  // ─── BACKGROUND ─────────────────────────────────────────────────────────────

  _drawBg(W, H) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x03031A, 0x03031A, 0x0D0D3A, 0x0D0D3A, 1);
    bg.fillRect(0, 0, W, H);

    // Nebula wash
    const neb = this.add.graphics();
    neb.fillStyle(0x3A0A90, 0.07); neb.fillCircle(W * 0.12, H * 0.10, 130);
    neb.fillStyle(0x0A2E90, 0.06); neb.fillCircle(W * 0.85, H * 0.16,  90);

    for (let i = 0; i < 70; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H * 0.60),
        Phaser.Math.FloatBetween(0.4, 1.6),
        0xFFFFFF,
        Phaser.Math.FloatBetween(0.3, 0.85),
      );
    }
  }

  // ─── TITLE PANEL ────────────────────────────────────────────────────────────

  _drawTitlePanel(W) {
    const g = this.add.graphics();

    g.fillStyle(0xFFD700, 0.04);
    g.fillRoundedRect(4, 4, W - 8, 82, 17);

    g.fillStyle(0x05051E, 0.90);
    g.fillRoundedRect(8, 8, W - 16, 74, 14);

    g.fillStyle(0xFFFFFF, 0.05);
    g.fillRoundedRect(8, 8, W - 16, 36, 14);

    g.lineStyle(2, 0xFFD700, 0.65);
    g.strokeRoundedRect(8, 8, W - 16, 74, 14);
    g.lineStyle(1, 0xFFFFFF, 0.07);
    g.strokeRoundedRect(11, 11, W - 22, 68, 12);

    this.add.text(W / 2, 44, '🏆  LEADERBOARD', {
      fontSize: '24px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2);
  }

  // ─── ROWS ───────────────────────────────────────────────────────────────────

  _buildRows(W, rows) {
    const panelX = 16;
    const panelW = W - 32;
    const startY = 100;
    const rowH   = 52;
    const myName = GameState.playerName;

    // Panel background
    const bgG = this.add.graphics().setDepth(4);
    bgG.fillStyle(0x05051E, 0.82);
    bgG.fillRoundedRect(panelX, startY - 6, panelW, rows.length * rowH + 16, 12);
    bgG.lineStyle(1.5, 0x2A2A5A, 0.90);
    bgG.strokeRoundedRect(panelX, startY - 6, panelW, rows.length * rowH + 16, 12);

    const MEDALS      = ['🥇', '🥈', '🥉'];
    const MEDAL_COLS  = ['#FFD700', '#C8C8C8', '#CD8B4A'];

    rows.forEach((player, i) => {
      const rowY = startY + i * rowH;
      const midY = rowY + rowH / 2;
      const isMe = player.name === myName;

      // Separator
      if (i > 0) {
        bgG.lineStyle(1, 0x2A2A5A, 0.45);
        bgG.lineBetween(panelX + 10, rowY, panelX + panelW - 10, rowY);
      }

      // "You" highlight row
      if (isMe) {
        bgG.fillStyle(0xFFD700, 0.09);
        bgG.fillRoundedRect(panelX + 4, rowY + 2, panelW - 8, rowH - 4, 7);
        bgG.lineStyle(1, 0xFFD700, 0.30);
        bgG.strokeRoundedRect(panelX + 4, rowY + 2, panelW - 8, rowH - 4, 7);
      }

      // Collect texts for stagger-in tween
      const rowTexts = [];

      // Rank badge
      const rankStr  = i < 3 ? MEDALS[i]      : `#${i + 1}`;
      const rankCol  = i < 3 ? MEDAL_COLS[i]   : '#778899';
      rowTexts.push(this.add.text(panelX + 26, midY, rankStr, {
        fontSize: i < 3 ? '22px' : '13px',
        fontFamily: 'Arial Black', color: rankCol,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(5));

      // Name
      rowTexts.push(this.add.text(panelX + 60, midY, player.name, {
        fontSize: '14px', fontFamily: 'Arial Black',
        color: isMe ? '#FFD700' : '#DDEEFF',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0, 0.5).setDepth(5));

      // Kingdom level (sum of building levels)
      const kLvl = (player.buildings || []).reduce((s, v) => s + v, 0);
      rowTexts.push(this.add.text(W * 0.62, midY, `Lv.${kLvl}`, {
        fontSize: '12px', fontFamily: 'Arial', color: '#1ABC9C',
        stroke: '#000000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(5));

      // Coins
      rowTexts.push(this.add.text(panelX + panelW - 12, midY,
        `${player.coins.toLocaleString()} 💰`, {
          fontSize: '13px', fontFamily: 'Arial Black',
          color: isMe ? '#FFE066' : '#FFD700',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1, 0.5).setDepth(5));

      // Staggered entrance
      rowTexts.forEach(t => t.setAlpha(0));
      this.tweens.add({
        targets: rowTexts,
        alpha: 1,
        duration: 280,
        delay: 120 + i * 55,
        ease: 'Power2',
      });
    });
  }

  // ─── CLOSE BUTTON ───────────────────────────────────────────────────────────

  _drawCloseBtn(W, H) {
    const bx = W / 2;
    const by = H * 0.93;

    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x7B2D00, 1);
    g.fillRoundedRect(bx - 100, by - 28, 200, 56, 16);
    g.fillStyle(0xE67E22, 1);
    g.fillRoundedRect(bx - 100, by - 28, 200, 42, 16);
    g.fillStyle(0xF5A623, 0.45);
    g.fillRoundedRect(bx - 96, by - 24, 192, 20, 12);
    g.lineStyle(2.5, 0xFFD700, 0.90);
    g.strokeRoundedRect(bx - 100, by - 28, 200, 56, 16);

    this.add.text(bx, by, '← Back', {
      fontSize: '23px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#7B2D00', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(6);

    this.add.rectangle(bx, by, 200, 56, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(7)
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(280, 0, 0, 0);
        this.time.delayedCall(290, () => {
          this.scene.stop('LeaderboardScene');
          this.scene.wake('GameScene');
        });
      });
  }
}
