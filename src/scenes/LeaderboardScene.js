import { GameState }      from '../GameState.js';
import { getLeaderboard } from '../api/client.js';

// Client-side fallback bots — shown when server is unreachable.
// Must match the server BOTS array in players.js.
const BOTS = [
  { name: 'EmperorAsh',   coins: 48200, buildings: [3,3,3,3,3,2], _bot: true },
  { name: 'StormQueen',   coins: 35600, buildings: [3,3,3,3,2,1], _bot: true },
  { name: 'IronKingdom',  coins: 27800, buildings: [3,3,3,2,2,1], _bot: true },
  { name: 'GoldCrusader', coins: 21400, buildings: [3,3,2,2,2,1], _bot: true },
  { name: 'NightBaron',   coins: 15700, buildings: [3,3,2,2,1,1], _bot: true },
  { name: 'CrystalDuke',  coins: 11200, buildings: [3,2,2,2,1,0], _bot: true },
  { name: 'ShadowKnight', coins:  8400, buildings: [3,2,2,1,1,0], _bot: true },
  { name: 'WildPeasant',  coins:  5600, buildings: [2,2,1,1,1,0], _bot: true },
  { name: 'BraveSmith',   coins:  3200, buildings: [2,1,1,1,0,0], _bot: true },
  { name: 'YoungFarmer',  coins:  1800, buildings: [1,1,1,0,0,0], _bot: true },
];

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
      // If server is unreachable or returns nothing, fall back to bots only
      const data = (rows && rows.length > 0) ? rows : BOTS;
      this._buildRows(W, data);
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

    // If the current player isn't already in the list, append them below a divider
    const alreadyIn  = rows.some(r => r.name === myName);
    const meEntry    = alreadyIn ? null : {
      name:      myName,
      coins:     GameState.coins,
      buildings: GameState.buildings || [],
      _me:       true,
    };
    const totalRows  = rows.length + (meEntry ? 2 : 0); // +2 = divider row + me row

    // Panel background — tall enough for the extra me-row
    const bgG = this.add.graphics().setDepth(4);
    bgG.fillStyle(0x05051E, 0.82);
    bgG.fillRoundedRect(panelX, startY - 6, panelW, totalRows * rowH + 16, 12);
    bgG.lineStyle(1.5, 0x2A2A5A, 0.90);
    bgG.strokeRoundedRect(panelX, startY - 6, panelW, totalRows * rowH + 16, 12);

    const MEDALS     = ['🥇', '🥈', '🥉'];
    const MEDAL_COLS = ['#FFD700', '#C8C8C8', '#CD8B4A'];

    const drawRow = (player, i, isMe) => {
      const rowY = startY + i * rowH;
      const midY = rowY + rowH / 2;

      if (i > 0) {
        bgG.lineStyle(1, 0x2A2A5A, 0.45);
        bgG.lineBetween(panelX + 10, rowY, panelX + panelW - 10, rowY);
      }

      if (isMe) {
        bgG.fillStyle(0xFFD700, 0.09);
        bgG.fillRoundedRect(panelX + 4, rowY + 2, panelW - 8, rowH - 4, 7);
        bgG.lineStyle(1, 0xFFD700, 0.30);
        bgG.strokeRoundedRect(panelX + 4, rowY + 2, panelW - 8, rowH - 4, 7);
      }

      const rowTexts = [];

      const rankStr = i < 3 ? MEDALS[i] : `#${i + 1}`;
      const rankCol = i < 3 ? MEDAL_COLS[i] : '#778899';
      rowTexts.push(this.add.text(panelX + 26, midY, rankStr, {
        fontSize: i < 3 ? '22px' : '13px',
        fontFamily: 'Arial Black', color: rankCol,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(5));

      const nameColor = isMe ? '#FFD700' : player._bot ? '#556677' : '#DDEEFF';
      rowTexts.push(this.add.text(panelX + 60, midY, player.name, {
        fontSize: '14px', fontFamily: 'Arial Black',
        color: nameColor, stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0, 0.5).setDepth(5));

      const kLvl = (player.buildings || []).reduce((s, v) => s + v, 0);
      rowTexts.push(this.add.text(W * 0.62, midY, `Lv.${kLvl}`, {
        fontSize: '12px', fontFamily: 'Arial', color: '#1ABC9C',
        stroke: '#000000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(5));

      rowTexts.push(this.add.text(panelX + panelW - 12, midY,
        `${player.coins.toLocaleString()} 💰`, {
          fontSize: '13px', fontFamily: 'Arial Black',
          color: isMe ? '#FFE066' : '#FFD700',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1, 0.5).setDepth(5));

      rowTexts.forEach(t => t.setAlpha(0));
      this.tweens.add({
        targets: rowTexts, alpha: 1, duration: 280,
        delay: 120 + i * 55, ease: 'Power2',
      });
    };

    rows.forEach((player, i) => drawRow(player, i, player.name === myName));

    // Append "· · ·" divider + player's own row when outside top 10
    if (meEntry) {
      const divY   = startY + rows.length * rowH;
      const meRowI = rows.length + 1;

      bgG.lineStyle(1, 0x2A2A5A, 0.45);
      bgG.lineBetween(panelX + 10, divY, panelX + panelW - 10, divY);

      this.add.text(panelX + panelW / 2, divY + rowH / 2, '· · ·', {
        fontSize: '14px', fontFamily: 'Arial Black', color: '#334466',
      }).setOrigin(0.5).setDepth(5);

      drawRow(meEntry, meRowI, true);
    }
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
