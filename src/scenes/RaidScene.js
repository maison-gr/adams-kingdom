import Phaser    from 'phaser';
import { GameState }                    from '../GameState.js';
import { burstParticles, flyingCoins }  from '../effects/juice.js';
import { audioSystem }                  from '../effects/AudioSystem.js';
import { syncPlayer }                   from '../api/client.js';

// One slot is always empty; rest are random loot values
const LOOT_TABLE   = [0, 150, 400, 900];
const SPOT_OFFSETS = [
  { col: -1, row: -1 }, { col:  1, row: -1 },
  { col: -1, row:  1 }, { col:  1, row:  1 },
];

export class RaidScene extends Phaser.Scene {
  constructor() { super('RaidScene'); }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  init(data) {
    this.target   = data.target   || null;
    this.deviceId = data.deviceId || '';
    this.digsLeft = 3;
    this.totalWon = 0;
    this.done     = false;
    this.loot     = Phaser.Utils.Array.Shuffle([...LOOT_TABLE]);
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this._S = Math.max(1, Math.min(W / 480, 1.4));

    this._buildBackground(W, H);
    this._buildDigArea(W, H);
    this._buildSpots(W, H);
    this._buildHUD(W, H);
    this._buildReturnButton(W, H);
    this._buildResultText(W, H);

    // Entry: fade + zoom
    this.cameras.main.fadeIn(380, 0, 0, 0);
    this.cameras.main.setZoom(1.85);
    this.cameras.main.setScroll(0, -H * 0.08);
    this.cameras.main.zoomTo(1.0, 780, 'Cubic.easeOut');
    this.tweens.add({ targets: this.cameras.main, scrollY: 0, duration: 680, ease: 'Cubic.easeOut' });
  }

  // ── Background ────────────────────────────────────────────────────────────

  _buildBackground(W, H) {
    // Sky: deep indigo to warm amber dusk
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x0C0720, 0x0C0720, 0x5C2A00, 0x4A1800, 1);
    sky.fillRect(0, 0, W, H * 0.62);

    // Horizon amber glow
    const hGlow = this.add.graphics();
    hGlow.fillGradientStyle(0x8B3A00, 0x8B3A00, 0x200800, 0x200800, 0.55);
    hGlow.fillRect(0, H * 0.45, W, H * 0.20);

    // Stars (sparse dusk sky)
    for (let i = 0; i < 85; i++) {
      const big   = Math.random() < 0.09;
      const r     = big ? Phaser.Math.FloatBetween(1.1, 2.0) : Phaser.Math.FloatBetween(0.4, 1.0);
      const alpha = Phaser.Math.FloatBetween(0.30, 0.85);
      const star  = this.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H * 0.46),
        r, 0xFFFFFF, alpha
      );
      this.tweens.add({
        targets: star,
        alpha: { from: alpha, to: alpha * 0.12 },
        duration: Phaser.Math.Between(1100, 3800),
        delay:    Phaser.Math.Between(0, 2800),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // Full amber moon with layered glow
    const moon = this.add.graphics();
    moon.fillStyle(0xFF6600, 0.06); moon.fillCircle(W * 0.80, H * 0.12, 46);
    moon.fillStyle(0xFF8800, 0.11); moon.fillCircle(W * 0.80, H * 0.12, 34);
    moon.fillStyle(0xFFD060, 1);    moon.fillCircle(W * 0.80, H * 0.12, 22);
    moon.fillStyle(0xFFE88A, 0.55); moon.fillCircle(W * 0.77, H * 0.11, 9);
    moon.fillStyle(0xCC5500, 0.18); moon.fillCircle(W * 0.82, H * 0.13, 12);

    // Hill silhouettes
    const hills = this.add.graphics();
    hills.fillStyle(0x080410, 0.92);
    [[0.0, 72], [0.14, 92], [0.28, 75], [0.43, 105], [0.60, 84], [0.76, 96], [0.90, 70], [1.0, 58]]
      .forEach(([fx, r]) => hills.fillCircle(W * fx, H * 0.57, r));
    hills.fillRect(0, H * 0.57, W, H * 0.43);

    // Tree silhouettes (pine shapes)
    const trees = this.add.graphics();
    trees.fillStyle(0x060310, 0.97);
    const treePositions = [
      [0.05, H * 0.56, 28, 72], [0.14, H * 0.53, 22, 60],
      [0.87, H * 0.57, 26, 68], [0.96, H * 0.54, 20, 56],
    ];
    treePositions.forEach(([fx, baseY, tw, th]) => {
      const tx = W * fx;
      trees.fillTriangle(tx, baseY - th,        tx - tw,       baseY - th * 0.30, tx + tw,       baseY - th * 0.30);
      trees.fillTriangle(tx, baseY - th * 0.65, tx - tw * 0.8, baseY - th * 0.06, tx + tw * 0.8, baseY - th * 0.06);
      trees.fillRect(tx - tw * 0.14, baseY - th * 0.08, tw * 0.28, th * 0.10);
    });

    // Ground layers
    const gY        = H * 0.58;
    this._groundY   = gY;
    const gnd = this.add.graphics();
    gnd.fillStyle(0x1A0C04, 1);
    gnd.fillRect(0, gY + 10, W, H - gY - 10);
    gnd.fillStyle(0x3C1C08, 1);
    gnd.fillRect(0, gY,  W, 14);
    gnd.fillStyle(0x285A10, 1);
    gnd.fillRect(0, gY - 6, W, 9);
    gnd.fillStyle(0x38821A, 0.75);
    gnd.fillRect(0, gY - 9, W, 5);
    gnd.fillStyle(0x48A828, 0.50);
    gnd.fillRect(0, gY - 11, W, 3);

    // Grass tufts
    for (let i = 0; i < 22; i++) {
      const tx  = Phaser.Math.Between(4, W - 4);
      const tg  = this.add.graphics();
      const h2  = Phaser.Math.Between(9, 15);
      tg.fillStyle(0x387818, 0.85);
      tg.fillTriangle(tx - 3, gY - 6, tx + 3, gY - 6, tx, gY - 6 - h2);
      tg.fillStyle(0x4A9A22, 0.60);
      tg.fillTriangle(tx,     gY - 7, tx + 5, gY - 7, tx + 2, gY - 7 - (h2 - 4));
    }

    // Atmospheric ground fog
    const fog = this.add.graphics();
    fog.fillStyle(0x1E0C04, 0.38);
    fog.fillRect(0, gY - 16, W, 24);
    fog.fillStyle(0x100804, 0.20);
    fog.fillRect(0, gY - 26, W, 14);
  }

  // ── Dig area ──────────────────────────────────────────────────────────────

  _buildDigArea(W, H) {
    const S     = this._S;
    const gY    = this._groundY;
    const areaW = Math.min(W * 0.84, 370);
    const areaH = Math.min(H * 0.24, 200);
    const areaX = W / 2 - areaW / 2;
    const areaY = gY + 18;

    this._digCx = W / 2;
    this._digCy = areaY + areaH / 2;
    this._digAW = areaW;
    this._digAH = areaH;

    // ── Soil background ────────────────────────────────────────────────────
    const soil = this.add.graphics().setDepth(1);
    soil.fillStyle(0x3E1E09, 1);
    soil.fillRoundedRect(areaX, areaY, areaW, areaH, 10);

    // Horizontal soil strata lines
    soil.lineStyle(1, 0x2E1406, 0.55);
    for (let y = areaY + 18; y < areaY + areaH - 8; y += 15)
      soil.lineBetween(areaX + 8, y, areaX + areaW - 8, y);

    // Vertical crack lines
    soil.lineStyle(1, 0x4E2810, 0.28);
    for (let x = areaX + 26; x < areaX + areaW - 8; x += 38)
      soil.lineBetween(x, areaY + 6, x, areaY + areaH - 6);

    // Edge vignette (inner shadow)
    soil.fillStyle(0x000000, 0.22);
    soil.fillRoundedRect(areaX, areaY, areaW, 16, { tl: 10, tr: 10, bl: 0, br: 0 });
    soil.fillRoundedRect(areaX, areaY + areaH - 16, areaW, 16, { tl: 0, tr: 0, bl: 10, br: 10 });

    // Scattered pebbles
    const pebbleG = this.add.graphics().setDepth(2);
    pebbleG.fillStyle(0x6A4828, 0.65);
    for (let p = 0; p < 12; p++) {
      const px = areaX + 14 + Math.random() * (areaW - 28);
      const py = areaY + 10 + Math.random() * (areaH - 20);
      pebbleG.fillEllipse(px, py, Math.random() * 6 + 3, Math.random() * 4 + 2);
    }

    // ── Wooden frame ───────────────────────────────────────────────────────
    const frame = this.add.graphics().setDepth(3);

    // Horizontal planks (top & bottom)
    const plankH = 20;
    [[areaX - 12, areaY - plankH / 2], [areaX - 12, areaY + areaH - plankH / 2]]
      .forEach(([px, py]) => {
        frame.fillStyle(0x5C3010, 1);
        frame.fillRoundedRect(px, py, areaW + 24, plankH, 4);
        // Wood grain
        frame.lineStyle(1, 0x7A4A20, 0.35);
        for (let gx = px + 8; gx < px + areaW + 20; gx += 28)
          frame.lineBetween(gx, py + 2, gx, py + plankH - 2);
        // Plank top shine
        frame.fillStyle(0xFFFFFF, 0.06);
        frame.fillRoundedRect(px + 2, py + 1, areaW + 20, 5, 2);
      });

    // Vertical stakes at corners
    const stakeColor = 0x6A3A18;
    const stakeW     = 12;
    [[areaX - 10, areaY], [areaX + areaW - 2, areaY]].forEach(([sx, sy]) => {
      frame.fillStyle(stakeColor, 1);
      frame.fillRect(sx, sy - 26, stakeW, areaH + 46);
      // Pointed top
      frame.fillTriangle(sx, sy - 26, sx + stakeW, sy - 26, sx + stakeW / 2, sy - 40);
      // Stake shine edge
      frame.fillStyle(0xFFFFFF, 0.08);
      frame.fillRect(sx + 1, sy - 26, 2, areaH + 44);
    });

    // Decorative rope along top plank (dashed)
    frame.lineStyle(2, 0xAA7733, 0.50);
    for (let rx = areaX; rx < areaX + areaW - 14; rx += 18)
      frame.lineBetween(rx, areaY - 4, rx + 12, areaY - 9);

    // Gold nails at plank ends
    [[areaX + 12, areaY], [areaX + areaW - 12, areaY],
     [areaX + 12, areaY + areaH], [areaX + areaW - 12, areaY + areaH]]
      .forEach(([nx, ny]) => {
        frame.fillStyle(0xFFD700, 0.80);
        frame.fillCircle(nx, ny, 4.5);
        frame.fillStyle(0xFFFFFF, 0.35);
        frame.fillCircle(nx - 1.2, ny - 1.2, 1.8);
      });

    // Outer glow border
    frame.lineStyle(2.5, 0xAA7722, 0.60);
    frame.strokeRoundedRect(areaX - 12, areaY - plankH / 2, areaW + 24, areaH + plankH, 6);

    // ── Lanterns ───────────────────────────────────────────────────────────
    this._placeLantern(areaX - 36, areaY + areaH / 2);
    this._placeLantern(areaX + areaW + 36, areaY + areaH / 2);
  }

  _placeLantern(cx, cy) {
    const g = this.add.graphics().setDepth(3);

    // Post
    g.fillStyle(0x3A2A10, 1);
    g.fillRect(cx - 3, cy - 48, 7, 58);
    g.fillStyle(0xFFFFFF, 0.06);
    g.fillRect(cx - 2, cy - 48, 2, 56);

    // Bracket arm
    g.fillStyle(0x5A4020, 1);
    g.fillRect(cx - 2, cy - 50, 20, 5);

    // Lantern body
    const lx = cx + 18;
    const ly = cy - 56;
    g.fillStyle(0x150E04, 1);
    g.fillRoundedRect(lx - 9, ly, 18, 24, 4);
    g.lineStyle(1.5, 0x8A6A30, 0.85);
    g.strokeRoundedRect(lx - 9, ly, 18, 24, 4);
    // Lantern top cap
    g.fillStyle(0x4A3010, 1);
    g.fillTriangle(lx - 10, ly, lx + 10, ly, lx, ly - 8);

    // Lantern outer glow (ADD blend)
    const glow = this.add.graphics().setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
    glow.fillStyle(0xFF7700, 0.16); glow.fillCircle(lx, ly + 12, 36);
    glow.fillStyle(0xFF5500, 0.08); glow.fillCircle(lx, ly + 12, 56);

    // Flame
    const flame = this.add.graphics().setDepth(4);
    flame.fillStyle(0xFFBB00, 0.95); flame.fillEllipse(lx, ly + 10, 8, 11);
    flame.fillStyle(0xFFEE66, 0.70); flame.fillEllipse(lx, ly + 7,  4,  7);
    flame.fillStyle(0xFFFFCC, 0.50); flame.fillEllipse(lx, ly + 5,  2,  4);

    // Flicker tween on glow
    this.tweens.add({
      targets: glow,
      alpha: { from: 1.0, to: 0.40 },
      duration: Phaser.Math.Between(360, 640),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: flame,
      scaleX: { from: 1.0, to: 1.18 }, scaleY: { from: 1.0, to: 0.82 },
      duration: Phaser.Math.Between(280, 480),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ── Dig spots ─────────────────────────────────────────────────────────────

  _buildSpots(W, H) {
    const S    = this._S;
    const cx   = this._digCx;
    const cy   = this._digCy;
    const gapX = this._digAW * 0.28;
    const gapY = this._digAH * 0.26;

    this.spots = SPOT_OFFSETS.map((off, i) => {
      const x = cx + off.col * gapX;
      const y = cy + off.row * gapY;

      const mound = this.add.graphics().setDepth(5);
      this._drawMound(mound, x, y);

      // Hover glow ring
      const glowRing = this.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      glowRing.fillStyle(0xFFD700, 0.24);
      glowRing.fillCircle(x, y, 38);
      glowRing.fillStyle(0xFFD700, 0.10);
      glowRing.fillCircle(x, y, 52);

      // Hit zone
      const hit = this.add.circle(x, y, 36, 0xFFFFFF, 0)
        .setDepth(6)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (this.done || this.digsLeft <= 0 || this.spots[i].dug) return;
        this.tweens.killTweensOf(glowRing);
        this.tweens.add({ targets: glowRing, alpha: 1, duration: 140, ease: 'Sine.easeOut' });
        this.tweens.killTweensOf(mound);
        this.tweens.add({ targets: mound, scaleX: 1.10, scaleY: 1.10, duration: 140, ease: 'Back.easeOut' });
      });
      hit.on('pointerout', () => {
        this.tweens.killTweensOf(glowRing);
        this.tweens.add({ targets: glowRing, alpha: 0, duration: 200 });
        this.tweens.killTweensOf(mound);
        this.tweens.add({ targets: mound, scaleX: 1, scaleY: 1, duration: 140 });
      });
      hit.on('pointerdown', () => this._onDig(i, x, y, mound, glowRing, hit));

      return { x, y, mound, glowRing, hit, dug: false };
    });

    // Stagger entrance
    this.spots.forEach((spot, i) => {
      spot.mound.setAlpha(0).setScale(0.4);
      this.tweens.add({
        targets: spot.mound, alpha: 1, scaleX: 1, scaleY: 1,
        duration: 380, delay: 680 + i * 100, ease: 'Back.easeOut',
      });
    });
  }

  _drawMound(g, x, y) {
    g.clear();

    // Drop shadow
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(x + 4, y + 6, 58, 24);

    // Mound base
    g.fillStyle(0x6A3E1A, 1);
    g.fillEllipse(x, y + 2, 54, 28);

    // Mid highlight
    g.fillStyle(0x8A5A2E, 1);
    g.fillEllipse(x - 1, y - 2, 46, 22);

    // Top shine
    g.fillStyle(0xA87848, 0.55);
    g.fillEllipse(x - 3, y - 6, 30, 12);

    // Subtle soil grain lines
    g.lineStyle(0.8, 0x5A3010, 0.40);
    g.lineBetween(x - 15, y - 1, x + 12, y + 2);
    g.lineBetween(x - 8,  y - 5, x + 16, y - 3);

    // Golden cross marker
    g.lineStyle(3, 0xFFD700, 1.0);
    g.lineBetween(x - 12, y - 4, x + 12, y - 4);
    g.lineBetween(x, y - 14, x, y + 6);

    // Cross shine (top of vertical bar)
    g.fillStyle(0xFFFFCC, 0.80);
    g.fillRect(x - 1.5, y - 14, 3, 5);
    // Cross shine (left of horizontal bar)
    g.fillRect(x - 12, y - 6, 5, 3);

    // Small sparkles around cross
    g.fillStyle(0xFFD700, 0.60);
    g.fillCircle(x - 13, y - 4, 2);
    g.fillCircle(x + 14, y - 4, 2);
    g.fillCircle(x,      y - 15, 2);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _buildHUD(W, H) {
    const S    = this._S;
    const name = (this.target?.name ?? 'Unknown Village').toUpperCase();

    // ── Glass panel ────────────────────────────────────────────────────────
    const panel = this.add.graphics().setDepth(7);
    // Outer glow
    panel.fillStyle(0x1ABC9C, 0.04);
    panel.fillRoundedRect(4, 4, W - 8, 118, 17);
    // Main body
    panel.fillStyle(0x05101A, 0.88);
    panel.fillRoundedRect(8, 8, W - 16, 110, 14);
    // Glass sheen
    panel.fillStyle(0xFFFFFF, 0.05);
    panel.fillRoundedRect(8, 8, W - 16, 36, 14);
    // Teal border
    panel.lineStyle(2, 0x1ABC9C, 0.65);
    panel.strokeRoundedRect(8, 8, W - 16, 110, 14);
    panel.lineStyle(1, 0xFFFFFF, 0.06);
    panel.strokeRoundedRect(11, 11, W - 22, 104, 12);

    // ── Left icon capsule (raid icon) ─────────────────────────────────────
    const iconX = 36;
    panel.fillStyle(0x0A2A1E, 0.80);
    panel.fillCircle(iconX, 36, 20);
    panel.lineStyle(1.5, 0x1ABC9C, 0.75);
    panel.strokeCircle(iconX, 36, 20);
    panel.fillStyle(0xFFFFFF, 0.15);
    panel.fillCircle(iconX - 6, 28, 10);

    this.add.text(iconX, 36, '⛏️', { fontSize: `${Math.round(20 * S)}px` })
      .setOrigin(0.5).setDepth(8);

    // ── Village name & title ───────────────────────────────────────────────
    this.add.text(W / 2, 23, name, {
      fontSize: `${Math.round(12 * S)}px`, fontFamily: 'Arial Black',
      color: '#5DCCBB', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(8);

    const titleTxt = this.add.text(W / 2, 45, 'RAIDING VILLAGE', {
      fontSize: `${Math.round(20 * S)}px`, fontFamily: 'Arial Black',
      color: '#1ABC9C', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(8);

    // Subtle pulse on title
    this.tweens.add({
      targets: titleTxt, scaleX: 1.03, scaleY: 1.03,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Picks counter (shovel icons) ───────────────────────────────────────
    const picksLabelX = W / 2 - Math.round(40 * S);
    this.add.text(picksLabelX, 83, 'PICKS', {
      fontSize: `${Math.round(10 * S)}px`, fontFamily: 'Arial Black', color: '#6688AA',
    }).setOrigin(1, 0.5).setDepth(8);

    this._pickTexts = [];
    for (let i = 0; i < 3; i++) {
      const px = picksLabelX + 6 + Math.round(26 * S) * (i + 0.5);
      const t  = this.add.text(px, 83, '⛏', {
        fontSize: `${Math.round(22 * S)}px`,
      }).setOrigin(0.5).setDepth(8);
      this._pickTexts.push(t);
    }

    // ── Total coins won ────────────────────────────────────────────────────
    const coinBoxX = W - 16;
    panel.fillStyle(0xFFD700, 0.12);
    panel.fillRoundedRect(coinBoxX - 110, 64, 110, 44, 10);
    panel.lineStyle(1.5, 0xFFD700, 0.45);
    panel.strokeRoundedRect(coinBoxX - 110, 64, 110, 44, 10);

    this.add.text(coinBoxX - 106, 76, '💰', {
      fontSize: `${Math.round(20 * S)}px`,
    }).setOrigin(0, 0.5).setDepth(8);

    this.add.text(coinBoxX - 70, 70, 'WON', {
      fontSize: `${Math.round(9 * S)}px`, fontFamily: 'Arial Black', color: '#AA8833',
    }).setOrigin(0, 0).setDepth(8);

    this.totalText = this.add.text(coinBoxX - 14, 85, '0', {
      fontSize: `${Math.round(20 * S)}px`, fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(8);

    // ── Digs remaining text (below HUD, above dig field) ──────────────────
    this.digsText = this.add.text(W / 2, 130, `3 digs remaining`, {
      fontSize: `${Math.round(14 * S)}px`, fontFamily: 'Arial Black',
      color: '#FFCC44', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(7).setAlpha(0.92);
  }

  _refreshPickIcons() {
    if (!this._pickTexts) return;
    this._pickTexts.forEach((t, i) => {
      t.setAlpha(i < this.digsLeft ? 1 : 0.22);
      if (i === this.digsLeft && !this.done) {
        // Animate the next pick icon that got used
        t.setScale(1.4);
        this.tweens.add({ targets: t, scaleX: 1, scaleY: 1, duration: 280, ease: 'Back.easeOut' });
      }
    });

    const remaining = this.digsLeft;
    this.digsText.setText(
      remaining > 0
        ? `${remaining} dig${remaining > 1 ? 's' : ''} remaining`
        : 'Digging complete!'
    );
    if (remaining === 0) {
      this.tweens.add({
        targets: this.digsText,
        color: '#1ABC9C',
        duration: 300,
      });
    }
  }

  // ── Return button ─────────────────────────────────────────────────────────

  _buildReturnButton(W, H) {
    const S  = this._S;
    const bx = W / 2;
    const by = H * 0.944;
    const bw = Math.min(W * 0.58, 270);
    const bh = 56;

    const g = this.add.graphics().setDepth(8);

    const _draw = (hover) => {
      g.clear();
      g.fillStyle(hover ? 0x1E5C28 : 0x163E1C, 1);
      g.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 18);
      g.fillStyle(hover ? 0x2ECC71 : 0x1FAB58, 1);
      g.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh * 0.72, 18);
      g.fillStyle(0xFFFFFF, hover ? 0.14 : 0.09);
      g.fillRoundedRect(bx - bw / 2 + 5, by - bh / 2 + 4, bw - 10, bh * 0.28, 10);
      g.lineStyle(2.5, hover ? 0x3AEEA0 : 0x1ABC9C, hover ? 1 : 0.85);
      g.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 18);
    };
    _draw(false);

    const btn = this.add.text(bx, by, '← Back to Kingdom', {
      fontSize: `${Math.round(18 * S)}px`, fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#0A2A14', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => { _draw(true);  btn.setStyle({ color: '#AAFFCC' }); });
    btn.on('pointerout',  () => { _draw(false); btn.setStyle({ color: '#FFFFFF' }); });
    btn.on('pointerdown', () => {
      this.tweens.add({ targets: btn, scaleX: 0.93, scaleY: 0.93, duration: 70, yoyo: true });
      this._returnHome();
    });
  }

  // ── Floating result text ───────────────────────────────────────────────────

  _buildResultText(W, H) {
    const S = this._S;
    this.resultText = this.add.text(W / 2, H * 0.57, '', {
      fontSize: `${Math.round(38 * S)}px`, fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000', strokeThickness: 6, align: 'center',
    }).setOrigin(0.5).setDepth(14).setAlpha(0);
  }

  // ── Dig logic ─────────────────────────────────────────────────────────────

  _onDig(i, x, y, mound, glowRing, hit) {
    if (this.done || this.digsLeft <= 0 || this.spots[i].dug) return;

    this.spots[i].dug = true;
    this.digsLeft--;
    hit.disableInteractive();

    // Kill hover effects
    this.tweens.killTweensOf(glowRing);
    this.tweens.add({ targets: glowRing, alpha: 0, duration: 120 });
    this.tweens.killTweensOf(mound);

    if (this.digsLeft === 0) {
      this.done = true;
      this.spots.forEach(s => { if (!s.dug) s.hit.disableInteractive(); });
    }

    this._refreshPickIcons();

    // Squash → vanish → reveal hole
    this.tweens.add({
      targets: mound, scaleX: 1.35, scaleY: 0.25, alpha: 0,
      duration: 190, ease: 'Back.easeIn',
      onComplete: () => {
        mound.setScale(1).setAlpha(1);
        const coins = this.loot[i];
        this._animateHole(mound, x, y, coins);
        this._revealLoot(x, y, coins);
      },
    });

    if (this.done) {
      this.time.delayedCall(2800, () => this._returnHome());
    }
  }

  _animateHole(g, x, y, coins) {
    // Dirt burst
    const burst = this.add.graphics().setDepth(10);
    const dirts  = [0x7A4A22, 0x9A6A3A, 0x5A3010, 0xAA8050];
    for (let d = 0; d < 10; d++) {
      const angle = (d / 10) * Math.PI * 2;
      const dist  = Phaser.Math.Between(14, 40);
      burst.fillStyle(dirts[d % dirts.length], Phaser.Math.FloatBetween(0.65, 0.95));
      burst.fillCircle(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist * 0.55,
        Phaser.Math.Between(3, 7),
      );
    }
    this.tweens.add({ targets: burst, alpha: 0, duration: 680, delay: 80, onComplete: () => burst.destroy() });

    this.cameras.main.shake(200, 0.011);

    // Draw the hole
    g.clear().setDepth(5).setScale(1).setAlpha(1);

    // Outer shadow
    g.fillStyle(0x000000, 0.38);
    g.fillEllipse(x + 4, y + 6, 64, 28);

    // Mound rim remains
    g.fillStyle(0x7A4A22, 1);
    g.fillEllipse(x, y - 3, 62, 22);

    // Hole interior
    g.fillStyle(0x08040A, 1);
    g.fillEllipse(x, y, 54, 20);

    // Inner hole depth (very dark)
    g.fillStyle(0x030205, 1);
    g.fillEllipse(x + 1, y + 2, 42, 14);

    // Rim highlights
    g.fillStyle(0x9A6A3A, 0.65);
    g.fillEllipse(x - 20, y - 7, 22, 10);
    g.fillEllipse(x + 18, y - 6, 20, 9);

    if (coins > 0) {
      // Coin pile glint in hole
      g.fillStyle(0xFFD700, 0.85);
      g.fillEllipse(x, y + 1, 30, 12);
      g.fillStyle(0xFFEE44, 0.55);
      g.fillEllipse(x - 2, y - 1, 16, 6);
      g.fillStyle(0xFFFFCC, 0.40);
      g.fillEllipse(x - 4, y - 3, 8, 4);

      // Persistent coin glow (ADD blend, looping)
      const coinGlow = this.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
      coinGlow.fillStyle(0xFFAA00, 0.32);
      coinGlow.fillCircle(x, y, 32);
      this.tweens.add({
        targets: coinGlow, alpha: { from: 1.0, to: 0.28 },
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    } else {
      // Empty — faint cobweb lines
      g.lineStyle(1, 0x333333, 0.32);
      g.lineBetween(x - 12, y - 2, x + 12, y - 2);
      g.lineBetween(x, y - 8, x, y + 5);
      g.lineBetween(x - 8, y - 6, x + 8, y + 3);
    }

    // Pop-in scale animation on the hole
    g.setScale(0.18);
    this.tweens.add({ targets: g, scaleX: 1, scaleY: 1, duration: 250, ease: 'Back.easeOut' });
  }

  _revealLoot(x, y, coins) {
    const W = this.scale.width;
    const H = this.scale.height;
    const S = this._S;

    if (coins > 0) {
      this.totalWon += coins;
      GameState.addCoins(coins);

      // Animate total counter
      this._animateCounter(this.totalWon, coins);

      // Particles
      burstParticles(this, x, y - 8, [0xFFD700, 0xFF8C00, 0xFFF5A0, 0xFFCC44], 18);

      // Flying coins toward HUD
      flyingCoins(this, x, y, W - 60, 88, 4);

      // Result text
      const isJackpot = coins >= 900;
      const isBig     = coins >= 400;
      const msg  = isJackpot ? `💰 JACKPOT!\n+${coins.toLocaleString()}` : `+${coins.toLocaleString()}`;
      const col  = '#FFD700';
      this._showResult(msg, col, isJackpot ? 46 : isBig ? 40 : 34);

      if (isJackpot) {
        this.cameras.main.shake(300, 0.018);
        const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xFFD700, 0.20).setDepth(20);
        this.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
        audioSystem.jackpot?.();
      } else {
        this.cameras.main.shake(140, 0.008);
      }
    } else {
      this._showResult('Empty…', '#7A9BAD', 28);
    }

    syncPlayer(GameState).catch(() => {});
  }

  _animateCounter(target, delta) {
    // Briefly flash the total text gold→white on increase
    const prev = target - delta;
    let current = prev;
    const step  = Math.max(1, Math.floor(delta / 12));
    const timer = this.time.addEvent({
      delay: 40, repeat: Math.ceil(delta / step),
      callback: () => {
        current = Math.min(current + step, target);
        this.totalText.setText(current.toLocaleString());
      },
    });
    // Bounce scale
    this.tweens.add({
      targets: this.totalText, scaleX: 1.35, scaleY: 1.35,
      duration: 120, yoyo: true, ease: 'Back.easeOut',
    });
  }

  _showResult(msg, color, fontPx) {
    const W = this.scale.width;
    const H = this.scale.height;
    const S = this._S;
    const startY = this._digCy - 14;

    this.tweens.killTweensOf(this.resultText);
    this.resultText
      .setText(msg)
      .setStyle({ color, fontSize: `${Math.round(fontPx * S)}px` })
      .setPosition(W / 2, startY + 30)
      .setScale(0.55)
      .setAlpha(1);

    this.tweens.add({
      targets: this.resultText, scaleX: 1, scaleY: 1, y: startY,
      duration: 230, ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: this.resultText, alpha: 0, y: startY - 70,
      duration: 1500, delay: 800, ease: 'Quad.easeIn',
      onComplete: () => this.resultText.setAlpha(0),
    });
  }

  // ── Scene transition ───────────────────────────────────────────────────────

  _returnHome() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('RaidScene');
      this.scene.wake('GameScene');
    });
  }
}
