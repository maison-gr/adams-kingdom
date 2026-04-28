import Phaser from 'phaser';
import { GameState }  from '../GameState.js';
import { drawBuilding, BUILDING_COLORS } from '../utils/buildingRenderer.js';
import { burstParticles, upgradeEffect }  from '../effects/juice.js';
import { recordAttack, syncPlayer } from '../api/client.js';

// Coins stolen per hit based on building level
const STEAL_TABLE = [0, 80, 220, 500];

export class AttackScene extends Phaser.Scene {
  constructor() { super('AttackScene'); }

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  init(data) {
    this.target   = data.target   || null;   // { id, name, coins, buildings }
    this.deviceId = data.deviceId || '';
    this.tapsLeft = 1;                        // player gets 1 tap (upgradeable later)
    this.done     = false;
  }

  create() {
    const { width: W, height: H } = this.scale;

    this._buildBackground(W, H);
    this._buildVillage(W, H);
    this._buildHUD(W, H);
    this._buildReturnButton(W, H);

    // Animate in: zoom out from close-up
    this.cameras.main.setZoom(2.0);
    this.cameras.main.zoomTo(1.0, 650, 'Cubic.easeOut');
  }

  // ── Background ───────────────────────────────────────────────────────────────

  _buildBackground(W, H) {
    // Night sky gradient simulation
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x0D1B2A, 0x0D1B2A, 0x1A3A5C, 0x1A3A5C, 1);
    sky.fillRect(0, 0, W, H * 0.72);

    // Stars
    const stars = this.add.graphics();
    stars.fillStyle(0xFFFFFF, 1);
    for (let i = 0; i < 55; i++) {
      const sx = Phaser.Math.Between(0, W);
      const sy = Phaser.Math.Between(0, H * 0.6);
      const sr = Math.random() < 0.15 ? 1.5 : 0.8;
      stars.fillCircle(sx, sy, sr);
    }

    // Moon
    const moon = this.add.graphics();
    moon.fillStyle(0xFFF8DC, 1);
    moon.fillCircle(W * 0.82, H * 0.10, 22);
    moon.fillStyle(0x1A3A5C, 1);
    moon.fillCircle(W * 0.85, H * 0.09, 17);   // crescent cut

    // Ground
    this.groundY = H * 0.74;
    const gnd = this.add.graphics();
    gnd.fillStyle(0x1C4A18, 1);
    gnd.fillRect(0, this.groundY - 4, W, H - this.groundY + 4);
    gnd.fillStyle(0x2D6B28, 1);
    gnd.fillRect(0, this.groundY - 4, W, 10);

    // Subtle ground stripe
    gnd.fillStyle(0x3A8832, 0.45);
    gnd.fillRect(0, this.groundY - 4, W, 4);
  }

  // ── Enemy village ────────────────────────────────────────────────────────────

  _buildVillage(W, H) {
    const groundY   = this.groundY;
    const buildings = this.target?.buildings ?? [2, 2, 1, 3, 2, 1];
    const name      = this.target?.name      ?? 'Unknown';

    // Victim name banner
    const banner = this.add.text(W / 2, H * 0.06, `⚔  ${name}'s Village`, {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#FF4444',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Pulse the banner
    this.tweens.add({
      targets: banner, scaleX: 1.05, scaleY: 1.05,
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Buildings
    this.bldgData = [];
    for (let i = 0; i < 6; i++) {
      const x   = (W / 7) * (i + 1);
      const lvl = buildings[i];
      const g   = this.add.graphics().setDepth(2);
      drawBuilding(g, x, groundY, i, lvl);

      // Invisible hit area
      const hit = this.add.rectangle(x, groundY - 38, 52, 84, 0xFFFFFF, 0)
        .setDepth(3)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (!this.done && this.tapsLeft > 0 && lvl > 0) {
          hit.setFillStyle(0xFFFFFF, 0.14);
        }
      });
      hit.on('pointerout',  () => hit.setFillStyle(0xFFFFFF, 0));
      hit.on('pointerdown', () => this._onTapBuilding(i, x, groundY, lvl, g, hit));

      this.bldgData.push({ g, x, groundY, index: i, level: lvl, hit });
    }
  }

  // ── HUD ──────────────────────────────────────────────────────────────────────

  _buildHUD(W, H) {
    const tapsText = this.add.text(W / 2, H * 0.14, `Attacks left: ${this.tapsLeft}`, {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5);
    this.tapsText = tapsText;

    this.resultText = this.add.text(W / 2, H * 0.80, '', {
      fontSize: '22px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000', strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
  }

  // ── Return button ─────────────────────────────────────────────────────────────

  _buildReturnButton(W, H) {
    const bg = this.add.graphics().setDepth(8);
    bg.fillStyle(0x222222, 0.92);
    bg.fillRoundedRect(W / 2 - 70, H * 0.88 - 1, 140, 40, 10);
    bg.lineStyle(2, 0x888888, 0.8);
    bg.strokeRoundedRect(W / 2 - 70, H * 0.88 - 1, 140, 40, 10);

    const btn = this.add.text(W / 2, H * 0.88 + 19, 'Return Home', {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#FFD700' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#FFFFFF' }));
    btn.on('pointerdown', () => this._returnHome());
  }

  // ── Attack logic ──────────────────────────────────────────────────────────────

  _onTapBuilding(index, x, groundY, level, g, hit) {
    if (this.done || this.tapsLeft <= 0) return;
    if (level === 0) {
      this._showResult('Already ruined!', '#AAAAAA');
      return;
    }

    this.tapsLeft--;
    this.tapsText.setText(`Attacks left: ${this.tapsLeft}`);

    const stolen = STEAL_TABLE[Math.min(level, 3)];
    GameState.addCoins(stolen);

    // Destroy the building (drop to ruins)
    const newLevel = 0;
    drawBuilding(g, x, groundY, index, newLevel);
    this.bldgData[index].level = newLevel;

    // Hit effect: shake + burst
    this.cameras.main.shake(220, 0.014);
    burstParticles(this, x, groundY - 30, [0xFF4444, 0xFF8C00, 0xFFD700, 0xCCCCCC], 14);

    this._showResult(`+${stolen.toLocaleString()} COINS!`, '#FFD700');

    // Disable remaining hit areas if no taps left
    if (this.tapsLeft <= 0) {
      this.done = true;
      this.bldgData.forEach(b => b.hit.disableInteractive());
      this.time.delayedCall(1800, () => this._returnHome());
    }

    // Fire-and-forget API calls
    const targetId = this.target?._id;
    if (targetId) {
      recordAttack(targetId, index, stolen).catch(() => {});
    }
    syncPlayer(GameState).catch(() => {});
  }

  _showResult(msg, color) {
    const { width: W, height: H } = this.scale;
    this.resultText.setText(msg).setStyle({ color }).setAlpha(1);
    this.tweens.add({
      targets: this.resultText,
      y: H * 0.76, alpha: 0,
      duration: 1600, ease: 'Quad.easeOut',
      onComplete: () => {
        this.resultText.setY(H * 0.80).setAlpha(0);
      },
    });
  }

  // ── Scene transition ──────────────────────────────────────────────────────────

  _returnHome() {
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('AttackScene');
      this.scene.wake('GameScene');
    });
  }
}
