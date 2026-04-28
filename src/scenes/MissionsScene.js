import { MissionSystem } from '../systems/MissionSystem.js';

export class MissionsScene extends Phaser.Scene {
  constructor() { super('MissionsScene'); }

  // ─── LIFECYCLE ──────────────────────────────────────────────────────────────

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Fresh instance reads latest localStorage state
    this.ms = new MissionSystem();

    this._drawBg(W, H);
    this._drawTitlePanel(W);
    this._drawMissions(W);
    this._drawDailyBonus(W, H);
    this._drawCardsBtn(W, H);
    this._drawCloseBtn(W, H);
    this._startTimer(W);
  }

  // ─── BACKGROUND ─────────────────────────────────────────────────────────────

  _drawBg(W, H) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x03031A, 0x03031A, 0x0D0D3A, 0x0D0D3A, 1);
    bg.fillRect(0, 0, W, H);
    for (let i = 0; i < 65; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H * 0.55),
        Phaser.Math.FloatBetween(0.4, 1.6),
        0xFFFFFF,
        Phaser.Math.FloatBetween(0.3, 0.85),
      );
    }
  }

  // ─── TITLE ──────────────────────────────────────────────────────────────────

  _drawTitlePanel(W) {
    const g = this.add.graphics();
    g.fillStyle(0x04211A, 0.04); g.fillRoundedRect(4, 4, W - 8, 82, 17);
    g.fillStyle(0x05051E, 0.90); g.fillRoundedRect(8, 8, W - 16, 74, 14);
    g.fillStyle(0xFFFFFF, 0.05); g.fillRoundedRect(8, 8, W - 16, 36, 14);
    g.lineStyle(2, 0x2ECC71, 0.65); g.strokeRoundedRect(8, 8, W - 16, 74, 14);
    g.lineStyle(1, 0xFFFFFF, 0.07); g.strokeRoundedRect(11, 11, W - 22, 68, 12);

    this.add.text(W / 2, 44, '📋  DAILY MISSIONS', {
      fontSize: '22px', fontFamily: 'Arial Black',
      color: '#2ECC71', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2);

    // Timer placeholder (filled by _startTimer)
    this._timerText = this.add.text(W / 2, 74, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#446655',
    }).setOrigin(0.5).setDepth(2);
  }

  // ─── MISSIONS ───────────────────────────────────────────────────────────────

  _drawMissions(W) {
    const cardX = 20;
    const cardW = W - 40;
    const cardH = 100;
    const gap   = 10;
    let   startY = 98;

    this.ms.missions.forEach((m, i) => {
      const y = startY + i * (cardH + gap);
      this._drawCard(cardX, y, cardW, cardH, m, i);
    });
  }

  _drawCard(x, y, w, h, mission, index) {
    const done    = mission.done;
    const claimed = mission.claimed;

    const bg = this.add.graphics().setDepth(3);
    bg.fillStyle(claimed ? 0x080818 : 0x05051E, 0.92);
    bg.fillRoundedRect(x, y, w, h, 10);
    if (done && !claimed) {
      bg.fillStyle(0x2ECC71, 0.08);
      bg.fillRoundedRect(x, y, w, 40, 10);
    }
    bg.lineStyle(2, claimed ? 0x22334A : done ? 0x2ECC71 : 0x334466, claimed ? 0.30 : 0.75);
    bg.strokeRoundedRect(x, y, w, h, 10);

    const dim = claimed ? 0.35 : 1;

    // Label
    this.add.text(x + 14, y + 18, mission.label, {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: claimed ? '#445566' : '#DDEEFF',
      stroke: '#000000', strokeThickness: 2,
    }).setAlpha(dim).setDepth(4);

    // Reward tag (top-right)
    this.add.text(x + w - 14, y + 18, this._rewardStr(mission.reward), {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: claimed ? '#445566' : '#FFD700',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 0).setAlpha(dim).setDepth(4);

    // Progress bar
    const barX  = x + 14;
    const barY  = y + 52;
    const barW  = claimed || (!done) ? w - 28 : w - 120;
    const pct   = Math.min(mission.progress / mission.target, 1);

    bg.fillStyle(0x0A0A22, 1);
    bg.fillRoundedRect(barX, barY, barW, 13, 6);

    if (pct > 0) {
      bg.fillStyle(claimed ? 0x223344 : done ? 0x2ECC71 : 0x1A7A4A, 1);
      bg.fillRoundedRect(barX, barY, Math.max(barW * pct, 6), 13, 6);
    }

    this.add.text(barX + barW / 2, barY + 6,
      `${Math.min(mission.progress, mission.target)} / ${mission.target}`, {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#AABBCC',
      }).setOrigin(0.5).setAlpha(dim).setDepth(4);

    // CLAIM button — only when done and not yet claimed
    if (done && !claimed) {
      const btnX = x + w - 106;
      const btnY = barY - 5;
      const btnG = this.add.graphics().setDepth(4);
      btnG.fillStyle(0x1A7A3A, 1);
      btnG.fillRoundedRect(btnX, btnY, 92, 30, 8);
      btnG.fillStyle(0x27AE60, 1);
      btnG.fillRoundedRect(btnX, btnY, 92, 22, 8);
      btnG.lineStyle(1.5, 0x2ECC71, 0.85);
      btnG.strokeRoundedRect(btnX, btnY, 92, 30, 8);

      this.add.text(btnX + 46, btnY + 15, 'CLAIM!', {
        fontSize: '13px', fontFamily: 'Arial Black',
        color: '#FFFFFF', stroke: '#0A3A1A', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(5);

      this.add.rectangle(btnX + 46, btnY + 15, 92, 30, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(6)
        .on('pointerdown', () => {
          this.ms.claim(index);
          // Restart scene to reflect new state
          this.cameras.main.fadeOut(160, 0, 0, 0);
          this.time.delayedCall(170, () => this.scene.restart());
        });
    }

    // Claimed tick
    if (claimed) {
      this.add.text(x + w / 2, y + h - 18, '✓  Claimed', {
        fontSize: '11px', fontFamily: 'Arial', color: '#334455',
      }).setOrigin(0.5).setDepth(4);
    }
  }

  _rewardStr(r) {
    if (r.coins)   return `💰 ${r.coins.toLocaleString()}`;
    if (r.spins)   return `🔄 ×${r.spins} spins`;
    if (r.shields) return `🛡️ ×${r.shields}`;
    if (r.chest)   return `🎁 ${r.chest} chest`;
    return '';
  }

  // ─── DAILY BONUS BANNER ────────────────────────────────────────────────────

  _drawDailyBonus(W, H) {
    const allDone = this.ms.allClaimed();
    const y       = H * 0.745;

    const g = this.add.graphics().setDepth(3);
    g.fillStyle(allDone ? 0x0E2A0E : 0x080818, 0.85);
    g.fillRoundedRect(20, y - 28, W - 40, 56, 10);
    g.lineStyle(2, allDone ? 0x2ECC71 : 0x223344, allDone ? 0.70 : 0.30);
    g.strokeRoundedRect(20, y - 28, W - 40, 56, 10);

    this.add.text(W / 2, y, allDone
      ? '🎉  DAILY BONUS CLAIMED! Come back tomorrow.'
      : '🎁  Complete all 3 missions for a Daily Bonus!', {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: allDone ? '#2ECC71' : '#445566',
      stroke: '#000000', strokeThickness: 2,
      align: 'center', wordWrap: { width: W - 60 },
    }).setOrigin(0.5).setDepth(4);
  }

  // ─── COUNTDOWN TIMER ───────────────────────────────────────────────────────

  _startTimer(W) {
    const tick = () => {
      const ms  = this.ms.msUntilReset();
      const h   = Math.floor(ms / 3_600_000);
      const m   = Math.floor((ms % 3_600_000) / 60_000);
      const s   = Math.floor((ms % 60_000)    / 1_000);
      this._timerText?.setText(
        `Resets in ${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
      );
    };
    tick();
    this.time.addEvent({ delay: 1000, loop: true, callback: tick });
  }

  // ─── CLOSE BUTTON ──────────────────────────────────────────────────────────

  _drawCardsBtn(W, H) {
    const bx = W / 2;
    const by = H * 0.840;

    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x0A2050, 1); g.fillRoundedRect(bx - 110, by - 24, 220, 48, 14);
    g.fillStyle(0x1A4A9A, 1); g.fillRoundedRect(bx - 110, by - 24, 220, 34, 14);
    g.fillStyle(0x2266CC, 0.40); g.fillRoundedRect(bx - 106, by - 20, 212, 16, 10);
    g.lineStyle(2, 0xD4A017, 0.75); g.strokeRoundedRect(bx - 110, by - 24, 220, 48, 14);

    this.add.text(bx, by, '🃏  My Card Collection', {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#0A2050', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(6);

    this.add.rectangle(bx, by, 220, 48, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(7)
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.time.delayedCall(210, () => {
          this.scene.stop('MissionsScene');
          this.scene.launch('CardsScene');
        });
      });
  }

  _drawCloseBtn(W, H) {
    const bx = W / 2;
    const by = H * 0.935;

    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x7B2D00, 1); g.fillRoundedRect(bx - 100, by - 28, 200, 56, 16);
    g.fillStyle(0xE67E22, 1); g.fillRoundedRect(bx - 100, by - 28, 200, 42, 16);
    g.fillStyle(0xF5A623, 0.45); g.fillRoundedRect(bx - 96, by - 24, 192, 20, 12);
    g.lineStyle(2.5, 0xFFD700, 0.90); g.strokeRoundedRect(bx - 100, by - 28, 200, 56, 16);

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
          this.scene.stop('MissionsScene');
          this.scene.wake('GameScene');
        });
      });
  }
}
