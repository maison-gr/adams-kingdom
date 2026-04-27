import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { burstParticles } from '../effects/juice.js';
import { syncPlayer }     from '../api/client.js';

// Coin rewards hidden under dig spots (one empty slot guaranteed)
const LOOT_TABLE = [0, 150, 400, 900];

// Spot layout: 4 positions in a 2×2 grid centred on the dig field
const SPOT_OFFSETS = [
  { col: -1, row: -1 },
  { col:  1, row: -1 },
  { col: -1, row:  1 },
  { col:  1, row:  1 },
];

export class RaidScene extends Phaser.Scene {
  constructor() { super('RaidScene'); }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  init(data) {
    this.target    = data.target   || null;
    this.deviceId  = data.deviceId || '';
    this.digsLeft  = 3;
    this.totalWon  = 0;
    this.done      = false;

    // Shuffle loot across 4 spots: one empty guaranteed
    this.loot = Phaser.Utils.Array.Shuffle([...LOOT_TABLE]);
  }

  create() {
    const { width: W, height: H } = this.scale;

    this._buildBackground(W, H);
    this._buildDigField(W, H);
    this._buildHUD(W, H);
    this._buildReturnButton(W, H);

    // Animate in: zoom out from above with downward pan
    this.cameras.main.setZoom(2.0);
    this.cameras.main.setScrollY(-60);
    this.cameras.main.zoomTo(1.0, 700, 'Cubic.easeOut');
    this.tweens.add({ targets: this.cameras.main, scrollY: 0, duration: 600, ease: 'Cubic.easeOut' });
  }

  // ── Background ────────────────────────────────────────────────────────────

  _buildBackground(W, H) {
    // Warm dusk gradient
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1A0A2E, 0x1A0A2E, 0x3D1C00, 0x3D1C00, 1);
    sky.fillRect(0, 0, W, H * 0.55);

    // Stars (sparse — dusk)
    const stars = this.add.graphics();
    stars.fillStyle(0xFFFFFF, 1);
    for (let i = 0; i < 28; i++) {
      stars.fillCircle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H * 0.45),
        Math.random() < 0.12 ? 1.5 : 0.7
      );
    }

    // Moon (low horizon)
    const moon = this.add.graphics();
    moon.fillStyle(0xFFE5A0, 1);
    moon.fillCircle(W * 0.15, H * 0.18, 18);
    moon.fillStyle(0x1A0A2E, 1);
    moon.fillCircle(W * 0.12, H * 0.17, 14);

    // Ground
    this.groundY = H * 0.68;
    const gnd = this.add.graphics();
    gnd.fillStyle(0x5D3A1A, 1);
    gnd.fillRect(0, this.groundY, W, H - this.groundY);
    gnd.fillStyle(0x7D5A2A, 0.6);
    gnd.fillRect(0, this.groundY, W, 8);

    // Dig-field dirt patch
    const patchW = 280;
    const patchH = 120;
    const patchX = W / 2 - patchW / 2;
    const patchY = this.groundY + 10;
    const patch = this.add.graphics();
    patch.fillStyle(0x8B5E2A, 1);
    patch.fillRoundedRect(patchX, patchY, patchW, patchH, 10);
    patch.lineStyle(2, 0xA0722A, 0.7);
    patch.strokeRoundedRect(patchX, patchY, patchW, patchH, 10);

    this.patchCx = W / 2;
    this.patchCy = patchY + patchH / 2;
  }

  // ── Dig spots ─────────────────────────────────────────────────────────────

  _buildDigField(W, H) {
    const cx    = this.patchCx;
    const cy    = this.patchCy;
    const gapX  = 68;
    const gapY  = 30;

    this.spots = SPOT_OFFSETS.map((off, i) => {
      const x = cx + off.col * gapX;
      const y = cy + off.row * gapY;

      // X-mark graphic
      const mark = this.add.graphics().setDepth(3);
      this._drawXMark(mark, x, y, false);

      // Invisible hit zone
      const hit = this.add.circle(x, y, 28, 0xFFFFFF, 0)
        .setDepth(4)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (!this.done && this.digsLeft > 0 && !this.spots[i].dug) {
          mark.setAlpha(0.7);
          this.tweens.add({ targets: mark, scaleX: 1.15, scaleY: 1.15, duration: 120, yoyo: true });
        }
      });
      hit.on('pointerout',  () => mark.setAlpha(1));
      hit.on('pointerdown', () => this._onDig(i, x, y, mark, hit));

      return { x, y, mark, hit, dug: false };
    });
  }

  _drawXMark(g, x, y, revealed) {
    g.clear();
    const color = revealed ? 0x444444 : 0xFFD700;
    const alpha = revealed ? 0.4 : 1;
    g.lineStyle(3, color, alpha);
    const s = 12;
    g.lineBetween(x - s, y - s, x + s, y + s);
    g.lineBetween(x + s, y - s, x - s, y + s);
    // Circle around X
    g.strokeCircle(x, y, s + 4);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _buildHUD(W, H) {
    const name = this.target?.name ?? 'Unknown';

    // Banner
    const banner = this.add.text(W / 2, H * 0.07, `⛏  Raiding ${name}`, {
      fontSize: '18px', fontFamily: 'Arial Black',
      color: '#1ABC9C', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(5);

    this.tweens.add({
      targets: banner, scaleX: 1.04, scaleY: 1.04,
      duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Digs left
    this.digsText = this.add.text(W / 2, H * 0.14, `Digs remaining: ${this.digsLeft}`, {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5);

    // Total won
    this.totalText = this.add.text(W / 2, H * 0.20, 'Total: 0', {
      fontSize: '14px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5);

    // Floating result
    this.resultText = this.add.text(W / 2, H * 0.60, '', {
      fontSize: '24px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
  }

  // ── Return button ─────────────────────────────────────────────────────────

  _buildReturnButton(W, H) {
    const bg = this.add.graphics().setDepth(8);
    bg.fillStyle(0x222222, 0.92);
    bg.fillRoundedRect(W / 2 - 70, H * 0.90 - 1, 140, 40, 10);
    bg.lineStyle(2, 0x888888, 0.8);
    bg.strokeRoundedRect(W / 2 - 70, H * 0.90 - 1, 140, 40, 10);

    const btn = this.add.text(W / 2, H * 0.90 + 19, 'Return Home', {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#FFD700' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#FFFFFF' }));
    btn.on('pointerdown', () => this._returnHome());
  }

  // ── Dig logic ─────────────────────────────────────────────────────────────

  _onDig(i, x, y, mark, hit) {
    if (this.done || this.digsLeft <= 0 || this.spots[i].dug) return;

    this.spots[i].dug = true;
    this.digsLeft--;
    hit.disableInteractive();

    const coins = this.loot[i];

    // Dig animation: quick scale-down + draw hole
    this.tweens.add({
      targets: mark, scaleX: 0.1, scaleY: 0.1, alpha: 0,
      duration: 180, ease: 'Back.easeIn',
      onComplete: () => {
        this._drawHole(mark, x, y, coins);
        this._revealLoot(x, y, coins);
      },
    });

    this.digsText.setText(`Digs remaining: ${this.digsLeft}`);

    if (this.digsLeft === 0) {
      this.done = true;
      this.spots.forEach(s => { if (!s.dug) s.hit.disableInteractive(); });
      this.time.delayedCall(2200, () => this._returnHome());
    }
  }

  _drawHole(g, x, y, coins) {
    g.clear().setScale(1).setAlpha(1).setDepth(3);
    // Dark hole
    g.fillStyle(0x1A0A00, 1);
    g.fillEllipse(x, y, 44, 22);
    g.lineStyle(2, 0x3A2010, 0.8);
    g.strokeEllipse(x, y, 44, 22);

    if (coins > 0) {
      // Gold glint inside
      g.fillStyle(0xFFD700, 0.7);
      g.fillEllipse(x, y + 2, 20, 10);
    }
  }

  _revealLoot(x, y, coins) {
    if (coins > 0) {
      this.totalWon += coins;
      GameState.addCoins(coins);
      this.totalText.setText(`Total: ${this.totalWon.toLocaleString()}`);

      burstParticles(this, x, y, [0xFFD700, 0xFF8C00, 0xFFF5A0], 10);
      this.cameras.main.shake(150, 0.009);
      this._showResult(`+${coins.toLocaleString()}`, '#FFD700');
    } else {
      this._showResult('Empty!', '#AAAAAA');
    }

    syncPlayer(GameState).catch(() => {});
  }

  _showResult(msg, color) {
    const { height: H } = this.scale;
    this.resultText
      .setText(msg)
      .setStyle({ color })
      .setY(H * 0.60)
      .setAlpha(1);

    this.tweens.add({
      targets: this.resultText,
      y: H * 0.54, alpha: 0,
      duration: 1400, ease: 'Quad.easeOut',
      onComplete: () => this.resultText.setAlpha(0),
    });
  }

  // ── Scene transition ───────────────────────────────────────────────────────

  _returnHome() {
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('RaidScene');
      this.scene.wake('GameScene');
    });
  }
}
