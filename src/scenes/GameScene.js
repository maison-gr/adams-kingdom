import { GameState } from '../GameState.js';
import {
  flyingCoins, burstParticles, goldRain,
  screenShake, upgradeEffect, shieldBubble,
} from '../effects/juice.js';
import { syncPlayer, getRaidTarget, recordAttack } from '../api/client.js';
import { SpinSystem }    from '../systems/SpinSystem.js';
import { RewardSystem }  from '../systems/RewardSystem.js';
import { drawBuilding, BUILDING_COLORS } from '../utils/buildingRenderer.js';

// ─── DATA ────────────────────────────────────────────────────────────────────

const SEGMENTS = [
  { label: '100',    color: 0xC0392B, light: 0xFF7070, type: 'coins',  value: 100  },
  { label: 'ATTACK', color: 0xD35400, light: 0xFFA040, type: 'attack', value: 0    },
  { label: '500',    color: 0x1A8A4A, light: 0x55DD88, type: 'coins',  value: 500  },
  { label: 'SHIELD', color: 0x1A5276, light: 0x5DADE2, type: 'shield', value: 0    },
  { label: 'CHEST',  color: 0x1A5C4A, light: 0x1ABC9C, type: 'chest',  value: 0    },
  { label: 'SPIN+1', color: 0x0E6655, light: 0x40D9B0, type: 'spin',   value: 1    },
  { label: '1000',   color: 0x9A7D0A, light: 0xFFD700, type: 'coins',  value: 1000 },
  { label: 'RAID',   color: 0x1A6B5A, light: 0x1ABC9C, type: 'raid',   value: 0    },
];

const BUILDING_COSTS  = [500, 1500, 3000, 6000, 12000, 25000];
const BUILDING_NAMES  = ['Farm', 'Mill', 'Barracks', 'Market', 'Castle', 'Palace'];

// ─── SCENE ───────────────────────────────────────────────────────────────────

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.spinSystem    = new SpinSystem(SEGMENTS);
    this.rewardSystem  = new RewardSystem(this);
    this.wheelAngle    = 0;
    this.attackOverlay = [];
    this.attackBldgs   = [];
    this.stars         = [];
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    GameState.checkRefill();
    this._raidTarget  = null;
    syncPlayer(GameState);
    this.events.on('wake', () => this.updateHUD());
    // Re-sync every 60 s
    this.time.addEvent({ delay: 60000, loop: true, callback: () => syncPlayer(GameState) });

    this.drawBackground(W, H);
    this.drawKingdom(W, H);
    this.drawWheel(W, H);
    this.drawHUD(W, H);
    this.drawSpinButton(W, H);
    this.drawWatchAdArea(W, H);
    this.drawResultText(W, H);
    this.animateStars();
  }

  update() {
    if (GameState.spins > 0 || !this.refillCountdown) return;
    const ms = GameState.msUntilNextSpin();
    if (ms > 0) {
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      this.refillCountdown.setText(`Free spin in ${mins}:${secs.toString().padStart(2, '0')}`);
    } else {
      const earned = GameState.checkRefill();
      if (earned > 0) this.updateHUD();
    }
  }

  // ─── BACKGROUND ────────────────────────────────────────────────────────────

  drawBackground(W, H) {
    // Deep space gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x03031A, 0x03031A, 0x0D0D3A, 0x0D0D3A, 1);
    bg.fillRect(0, 0, W, H);

    // Nebula clouds — soft coloured glow patches
    const neb = this.add.graphics();
    [
      [W * 0.12, H * 0.10, 130, 0x3A0A90, 0.08],
      [W * 0.85, H * 0.16,  90, 0x0A2E90, 0.07],
      [W * 0.50, H * 0.36, 160, 0x1A0A5A, 0.06],
      [W * 0.30, H * 0.22,  70, 0x0A5A3A, 0.05],
    ].forEach(([x, y, r, c, a]) => { neb.fillStyle(c, a); neb.fillCircle(x, y, r); });

    // Moon with halo
    const moon = this.add.graphics();
    moon.fillStyle(0xFFE8C0, 0.06); moon.fillCircle(W * 0.88, H * 0.09, 38);
    moon.fillStyle(0xFFE8C0, 0.10); moon.fillCircle(W * 0.88, H * 0.09, 28);
    moon.fillStyle(0xFFF5D0, 1);    moon.fillCircle(W * 0.88, H * 0.09, 18);
    moon.fillStyle(0xFFFFFF, 0.55); moon.fillCircle(W * 0.84, H * 0.08, 10);
    moon.fillStyle(0xE8D0A0, 0.35); moon.fillCircle(W * 0.91, H * 0.10, 7);

    // Stars — two size classes
    for (let i = 0; i < 110; i++) {
      const big = Math.random() < 0.12;
      const r   = big ? Phaser.Math.FloatBetween(1.4, 2.6) : Phaser.Math.FloatBetween(0.5, 1.2);
      const a   = Phaser.Math.FloatBetween(0.4, 1.0);
      this.stars.push(
        this.add.circle(
          Phaser.Math.Between(0, W),
          Phaser.Math.Between(0, H * 0.50),
          r, 0xFFFFFF, a
        )
      );
    }

    // Distant landscape silhouette (castle city on the horizon)
    const sil = this.add.graphics();
    const silY = H * 0.268;
    sil.fillStyle(0x070718, 0.72);

    // Rolling hills (filled circles anchored at silY)
    [[0.04,70],[0.16,90],[0.28,68],[0.44,100],[0.60,75],[0.76,95],[0.92,70]]
      .forEach(([fx, r]) => sil.fillCircle(W * fx, silY, r));

    // Distant towers
    [[0.20, 68, 13, 60], [0.45, 82, 18, 72], [0.72, 65, 11, 50]]
      .forEach(([fx, topOff, tw, th]) => {
        sil.fillRect(W*fx - tw/2, silY - topOff, tw, th);
        // Battlements
        for (let b = 0; b < 3; b++) {
          sil.fillRect(W*fx - 5 + b*4, silY - topOff - 6, 3, 6);
        }
      });

    // Fill ground below silhouette
    sil.fillRect(0, silY - 2, W, 8);
  }

  animateStars() {
    this.stars.forEach(star => {
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: Phaser.Math.FloatBetween(0.05, 0.3) },
        duration: Phaser.Math.Between(1400, 4200),
        delay:    Phaser.Math.Between(0, 3500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  // ─── KINGDOM ───────────────────────────────────────────────────────────────

  drawKingdom(W, H) {
    const groundY = H * 0.28;

    // ── Ground layers (back → front) ──────────────────────────────────────────
    const ground = this.add.graphics();

    // Dark earth fill below ground line
    ground.fillStyle(0x111E0C, 1);
    ground.fillRect(0, groundY + 16, W, 60);

    // Main grass — 4 tones for depth
    ground.fillStyle(0x1A3C14, 1);
    ground.fillRect(0, groundY - 4, W, 30);
    ground.fillStyle(0x225219, 1);
    ground.fillRect(0, groundY - 4, W, 18);
    ground.fillStyle(0x2C6620, 1);
    ground.fillRect(0, groundY - 4, W, 9);
    ground.fillStyle(0x389028, 1);
    ground.fillRect(0, groundY - 4, W, 3);
    ground.fillStyle(0x48AA36, 0.45);
    ground.fillRect(0, groundY - 4, W, 1);

    // Cobblestone / dirt path running full width
    const pathY = groundY + 5;
    ground.fillStyle(0x7A6A54, 0.68);
    ground.fillRect(0, pathY, W, 15);
    ground.lineStyle(1, 0x5A4A38, 0.40);
    for (let sx = 4; sx < W; sx += 22) {
      ground.strokeRect(sx, pathY + 2, 18, 11);
    }
    // Path highlight top edge
    ground.fillStyle(0xAA9880, 0.28);
    ground.fillRect(0, pathY, W, 2);

    // ── Buildings ─────────────────────────────────────────────────────────────
    this.buildingGraphics = [];
    for (let i = 0; i < 6; i++) {
      const x = (W / 7) * (i + 1);
      const g = this.add.graphics();
      drawBuilding(g, x, groundY, i, GameState.buildings[i]);
      this.buildingGraphics.push({ g, x, groundY, index: i });
    }

    // ── Bushes between buildings ───────────────────────────────────────────────
    [1.5, 2.5, 3.5, 4.5, 5.5].forEach(frac => {
      const bx = (W / 7) * frac;
      const bg = this.add.graphics();
      bg.fillStyle(0x165210, 1);
      bg.fillCircle(bx,     groundY - 3,  9);
      bg.fillStyle(0x1E6618, 1);
      bg.fillCircle(bx - 7, groundY - 6,  7);
      bg.fillCircle(bx + 7, groundY - 6,  7);
      bg.fillStyle(0x288A22, 0.85);
      bg.fillCircle(bx,     groundY - 12, 5.5);
      // Berry highlights
      bg.fillStyle(0xFF5555, 0.72);
      bg.fillCircle(bx - 4, groundY - 9,  1.8);
      bg.fillCircle(bx + 5, groundY - 6,  1.5);
    });
  }

  refreshKingdom() {
    this.buildingGraphics.forEach(({ g, x, groundY, index }) => {
      drawBuilding(g, x, groundY, index, GameState.buildings[index]);
    });
  }

  // ─── WHEEL ─────────────────────────────────────────────────────────────────

  drawWheel(W, H) {
    const cx = W / 2;
    const cy = H * 0.57;
    const r  = W * 0.38;
    this.wheelCx = cx;
    this.wheelCy = cy;
    this.wheelR  = r;

    // Drop shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.30);
    shadow.fillCircle(cx + 7, cy + 9, r + 3);

    this.wheelGraphics = this.add.graphics();
    this.wheelLabels   = [];
    this.drawWheelGraphics(0);

    // Pointer shadow
    const ptrShadow = this.add.graphics();
    ptrShadow.fillStyle(0x000000, 0.3);
    ptrShadow.fillTriangle(cx - 12 + 3, cy - r - 7 + 3, cx + 12 + 3, cy - r - 7 + 3, cx + 3, cy - r + 17 + 3);

    // Pointer
    const ptr = this.add.graphics();
    ptr.fillStyle(0xFFFFFF, 1);
    ptr.fillTriangle(cx - 12, cy - r - 7, cx + 12, cy - r - 7, cx, cy - r + 17);
    ptr.lineStyle(2, 0x000000, 0.7);
    ptr.strokeTriangle(cx - 12, cy - r - 7, cx + 12, cy - r - 7, cx, cy - r + 17);

    // Hub: layered gold metallic look
    this.add.circle(cx, cy, 26, 0x7B5800, 1);
    this.add.circle(cx, cy, 23, 0xD4A017, 1);
    this.add.circle(cx, cy, 19, 0xFFD700, 1);
    this.add.circle(cx, cy, 11, 0xFFF8DC, 0.85);
    const hubRim = this.add.circle(cx, cy, 24);
    hubRim.setStrokeStyle(2, 0x5C3D00);
  }

  drawWheelGraphics(rotation) {
    const g     = this.wheelGraphics;
    const cx    = this.wheelCx;
    const cy    = this.wheelCy;
    const r     = this.wheelR;
    const n     = SEGMENTS.length;
    const slice = (Math.PI * 2) / n;

    g.clear();
    this.wheelLabels.forEach(t => t.destroy());
    this.wheelLabels = [];

    for (let i = 0; i < n; i++) {
      const startAngle = rotation + i * slice - Math.PI / 2;
      const endAngle   = startAngle + slice;
      const mid        = startAngle + slice / 2;
      const seg        = SEGMENTS[i];

      // Base fill
      g.fillStyle(seg.color, 1);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r, startAngle, endAngle, false);
      g.closePath();
      g.fillPath();

      // Inner gradient simulation (lighter arc)
      g.fillStyle(seg.light, 0.22);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r * 0.66, startAngle, endAngle, false);
      g.closePath();
      g.fillPath();

      // Core glow
      g.fillStyle(0xFFFFFF, 0.06);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r * 0.35, startAngle, endAngle, false);
      g.closePath();
      g.fillPath();

      // Divider lines
      g.lineStyle(1.5, 0x000000, 0.28);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r, startAngle, endAngle, false);
      g.closePath();
      g.strokePath();

      // Label
      const lx  = cx + Math.cos(mid) * r * 0.72;
      const ly  = cy + Math.sin(mid) * r * 0.72;
      const fz  = seg.label.length > 5 ? '11px' : '13px';
      const lbl = this.add.text(lx, ly, seg.label, {
        fontSize: fz,
        fontFamily: 'Arial Black',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);
      this.wheelLabels.push(lbl);
    }

    // Multi-layer golden glow border
    [
      [16, 0xFFD700, 0.06],
      [10, 0xFFD700, 0.15],
      [ 6, 0xFFD700, 0.45],
      [ 3, 0xFFF5CC, 0.95],
    ].forEach(([lw, col, a]) => {
      g.lineStyle(lw, col, a);
      g.strokeCircle(cx, cy, r);
    });

    // Thin inner dark ring (polish)
    g.lineStyle(1.5, 0x000000, 0.18);
    g.strokeCircle(cx, cy, r - 2);
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  drawHUD(W, H) {
    const panel = this.add.graphics();

    // Outer glow ring
    panel.fillStyle(0xFFD700, 0.04);
    panel.fillRoundedRect(4, 4, W - 8, 82, 17);

    // Main glass panel
    panel.fillStyle(0x05051E, 0.82);
    panel.fillRoundedRect(8, 8, W - 16, 74, 14);

    // Glass sheen (top half lighter)
    panel.fillStyle(0xFFFFFF, 0.05);
    panel.fillRoundedRect(8, 8, W - 16, 36, 14);

    // Gold border + inner silver line
    panel.lineStyle(2, 0xFFD700, 0.60);
    panel.strokeRoundedRect(8, 8, W - 16, 74, 14);
    panel.lineStyle(1, 0xFFFFFF, 0.07);
    panel.strokeRoundedRect(11, 11, W - 22, 68, 12);

    // ── Three stat capsules ───────────────────────────────────────────────────
    const items = [
      { x: W * 0.17, color: 0xFFD700, label: 'COINS'   },
      { x: W * 0.50, color: 0x5DADE2, label: 'SHIELDS' },
      { x: W * 0.83, color: 0x2ECC71, label: 'SPINS'   },
    ];

    items.forEach(({ x, color, label }) => {
      // Capsule bg
      panel.fillStyle(color, 0.12);
      panel.fillRoundedRect(x - 52, 28, 104, 33, 16);
      panel.lineStyle(1.5, color, 0.65);
      panel.strokeRoundedRect(x - 52, 28, 104, 33, 16);
      // Top glint inside capsule
      panel.fillStyle(0xFFFFFF, 0.06);
      panel.fillRoundedRect(x - 50, 29, 100, 14, 10);

      // Small icon dot
      panel.fillStyle(color, 0.90);
      panel.fillCircle(x - 32, 44, 5);
      panel.fillStyle(0xFFFFFF, 0.35);
      panel.fillCircle(x - 33, 43, 2.5);

      this.add.text(x - 22, 74, label, {
        fontSize: '8px', fontFamily: 'Arial Black',
        color: `#${color.toString(16).padStart(6, '0')}`, alpha: 0.70,
      }).setOrigin(0.5);
    });

    this.coinIconX = W * 0.17;
    this.coinIconY = 45;

    // Stat values — offset right of the icon dot
    this.coinsText = this.add.text(W * 0.17 + 4, 45, `${GameState.coins.toLocaleString()}`, {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#FFD700',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.shieldText = this.add.text(W * 0.50 + 4, 45, `${GameState.shields}`, {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#5DADE2',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.spinsText = this.add.text(W * 0.83 + 4, 45, `${GameState.spins}`, {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#2ECC71',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Chest inventory badge — appears below HUD when chests are waiting
    this._chestBadgeBg = this.add.graphics().setDepth(1);
    this.chestBadgeText = this.add.text(W / 2, 96, '', {
      fontSize: '11px', fontFamily: 'Arial Black',
      color: '#1ABC9C', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(2);

    const badgeHit = this.add.zone(W / 2, 96, 200, 22).setDepth(3).setInteractive({ useHandCursor: true });
    badgeHit.on('pointerdown', () => {
      if (GameState.chests.length === 0) return;
      const chest = GameState.chests[0];
      this.scene.sleep('GameScene');
      this.scene.launch('ChestScene', { chestId: chest.id, chestType: chest.type });
    });

    this._refreshChestBadge(W);
  }

  _refreshChestBadge(W = this.scale.width) {
    const n = GameState.chests.length;
    this._chestBadgeBg.clear();
    if (n === 0) { this.chestBadgeText.setText(''); return; }

    this._chestBadgeBg.fillStyle(0x1ABC9C, 0.18);
    this._chestBadgeBg.fillRoundedRect(W / 2 - 90, 85, 180, 22, 11);
    this._chestBadgeBg.lineStyle(1.5, 0x1ABC9C, 0.6);
    this._chestBadgeBg.strokeRoundedRect(W / 2 - 90, 85, 180, 22, 11);
    this.chestBadgeText.setText(`🎁  ${n} chest${n > 1 ? 's' : ''} — tap to open!`);
  }

  // ─── SPIN BUTTON ───────────────────────────────────────────────────────────

  drawSpinButton(W, H) {
    const bx = W / 2;
    const by = H * 0.875;

    // Outer glow (pulsed separately)
    this.spinGlow = this.add.graphics();
    this._drawSpinGlow(bx, by);

    this.tweens.add({
      targets: this.spinGlow,
      alpha: 0.35,
      yoyo: true, repeat: -1,
      duration: 850, ease: 'Sine.easeInOut',
    });

    // Button container (for press-scale feedback)
    this.spinBtnContainer = this.add.container(bx, by);

    const bg = this.add.graphics();
    // Dark base
    bg.fillStyle(0x7B2D00, 1);
    bg.fillRoundedRect(-114, -37, 228, 74, 22);
    // Main body
    bg.fillStyle(0xE67E22, 1);
    bg.fillRoundedRect(-114, -37, 228, 56, 22);
    // Top shine
    bg.fillStyle(0xF5A623, 0.55);
    bg.fillRoundedRect(-110, -34, 220, 24, 16);
    // Gold border
    bg.lineStyle(3, 0xFFD700, 0.9);
    bg.strokeRoundedRect(-114, -37, 228, 74, 22);

    this.spinBtnText = this.add.text(0, 2, 'SPIN', {
      fontSize: '34px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#7B2D00', strokeThickness: 5,
    }).setOrigin(0.5);

    this.spinBtnContainer.add([bg, this.spinBtnText]);

    // Idle pulse
    this.spinPulseTween = this.tweens.add({
      targets: this.spinBtnContainer,
      scaleX: 1.055, scaleY: 1.055,
      yoyo: true, repeat: -1,
      duration: 880, ease: 'Sine.easeInOut',
    });

    // Hit area stays in world space
    const hit = this.add.rectangle(bx, by, 228, 74, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerdown', () => {
      this.tweens.add({
        targets: this.spinBtnContainer,
        scaleX: 0.91, scaleY: 0.91,
        duration: 65, ease: 'Power2', yoyo: true,
      });
      this.onSpin();
    });
    hit.on('pointerover', () => this.spinGlow.setAlpha(1));
    hit.on('pointerout',  () => this.spinGlow.setAlpha(0.65));

    this.drawBuildButtons(W, H);
  }

  _drawSpinGlow(x, y) {
    const g = this.spinGlow;
    g.clear();
    g.fillStyle(0xFF8C00, 0.10);
    g.fillRoundedRect(x - 130, y - 46, 260, 92, 28);
    g.fillStyle(0xFF8C00, 0.06);
    g.fillRoundedRect(x - 144, y - 55, 288, 110, 36);
  }

  // ─── WATCH AD ──────────────────────────────────────────────────────────────

  drawWatchAdArea(W, H) {
    const bx = W / 2;
    const by = H * 0.93;

    this.adBtnBg = this.add.graphics();
    this.adBtnBg.fillStyle(0x1A7A3A, 1);
    this.adBtnBg.fillRoundedRect(bx - 125, by - 22, 250, 44, 14);
    this.adBtnBg.fillStyle(0x27AE60, 1);
    this.adBtnBg.fillRoundedRect(bx - 125, by - 22, 250, 28, 14);
    this.adBtnBg.lineStyle(2, 0x2ECC71, 0.9);
    this.adBtnBg.strokeRoundedRect(bx - 125, by - 22, 250, 44, 14);

    this.adBtnText = this.add.text(bx, by, 'Watch Ad  +5 Spins', {
      fontSize: '17px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#0A4A20', strokeThickness: 3,
    }).setOrigin(0.5);

    this.adBtnHit = this.add.rectangle(bx, by, 250, 44, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.adBtnHit.on('pointerdown', () => this.onWatchAd());

    this.refillCountdown = this.add.text(bx, by + 30, '', {
      fontSize: '12px', fontFamily: 'Arial', color: '#888888',
    }).setOrigin(0.5);

    this.setWatchAdVisible(GameState.spins === 0);
  }

  setWatchAdVisible(visible) {
    this.adBtnBg.setVisible(visible);
    this.adBtnText.setVisible(visible);
    this.refillCountdown.setVisible(visible);
    if (visible) this.adBtnHit.setInteractive({ useHandCursor: true });
    else this.adBtnHit.disableInteractive();
  }

  onWatchAd() {
    this.adBtnHit.disableInteractive();
    this.adBtnText.setText('Watching...');
    this.refillCountdown.setText('');
    this.time.delayedCall(2500, () => {
      GameState.addSpins(5);
      this.adBtnText.setText('Watch Ad  +5 Spins');
      this.updateHUD();
      this.showResult('+5 Spins!', '#2ECC71');
    });
  }

  // ─── BUILD BUTTONS ─────────────────────────────────────────────────────────

  drawBuildButtons(W, H) {
    this.buildBtnText = this.add.text(W / 2, H * 0.977, 'Tap building to upgrade', {
      fontSize: '13px', fontFamily: 'Arial', color: '#888888',
    }).setOrigin(0.5);

    this.buildingGraphics.forEach(({ x, groundY, index }) => {
      const hit = this.add.rectangle(x, groundY - 62, 60, 132, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.onBuildingTap(index));
    });
  }

  // ─── RESULT TEXT ───────────────────────────────────────────────────────────

  drawResultText(W, H) {
    this.resultText = this.add.text(W / 2, H * 0.73, '', {
      fontSize: '36px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);
  }

  // ─── SPIN LOGIC ────────────────────────────────────────────────────────────

  onSpin() {
    if (this.spinSystem.isSpinning) return;
    if (!GameState.useSpin()) {
      this.showResult('No spins left!', '#FF4444');
      return;
    }

    this.spinBtnText.setText('...');
    if (this.spinPulseTween) this.spinPulseTween.pause();
    if (this.spinGlow)       this.spinGlow.setVisible(false);

    const targetIndex = this.spinSystem.spin(
      this,
      angle => { this.wheelAngle = angle; this.drawWheelGraphics(angle); },
      (segment) => this._onWheelStopped(segment)
    );

    // Pre-fetch raid target the moment the spin starts (gives 4s head-start)
    const spinType = targetIndex >= 0 ? SEGMENTS[targetIndex].type : '';
    if (spinType === 'attack' || spinType === 'raid') {
      getRaidTarget(GameState.deviceId).then(t => { this._raidTarget = t; });
    }
  }

  _onWheelStopped(segment) {
    burstParticles(this, this.wheelCx, this.wheelCy - this.wheelR, [segment.color, segment.light, 0xFFFFFF], 14);

    this.time.delayedCall(180, () => {
      this.applyOutcome(segment);
      if (this.spinPulseTween) this.spinPulseTween.resume();
      if (this.spinGlow)       this.spinGlow.setVisible(true);
    });
  }

  applyOutcome(segment) {
    this.spinBtnText.setText('SPIN');
    this.rewardSystem.handle(segment);
  }

  showResult(msg, color) {
    this.resultText
      .setText(msg)
      .setColor(color)
      .setAlpha(1)
      .setPosition(this.scale.width / 2, this.scale.height * 0.73)
      .setScale(1.4);

    this.tweens.add({
      targets: this.resultText,
      scaleX: 1, scaleY: 1,
      duration: 220, ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: this.resultText,
      alpha: 0,
      y: this.scale.height * 0.73 - 55,
      duration: 1700,
      delay: 750,
      ease: 'Power2',
      onComplete: () => {
        this.resultText.setAlpha(0).setScale(1);
        this.resultText.y = this.scale.height * 0.73;
      },
    });
  }

  // ─── BUILDING TAP ──────────────────────────────────────────────────────────

  onBuildingTap(index) {
    const cost    = BUILDING_COSTS[index];
    const current = GameState.buildings[index];

    if (current >= 3) { this.showResult('Max level!', '#AAAAAA'); return; }
    if (GameState.coins < cost) {
      this.showResult(`Need ${cost.toLocaleString()} coins`, '#FF4444');
      return;
    }

    GameState.addCoins(-cost);
    GameState.buildings[index]++;
    GameState.save();
    this.refreshKingdom();
    this.showResult(`${BUILDING_NAMES[index]} upgraded!`, '#2ECC71');
    this.updateHUD();

    const { x, groundY } = this.buildingGraphics[index];
    upgradeEffect(this, x, groundY - 30, BUILDING_COLORS[index]);
  }

  // ─── ATTACK OVERLAY (kept as fallback; replaced by AttackScene in Step 3) ──

  showAttackOverlay() {
    const W = this.scale.width;
    const H = this.scale.height;
    const D = 20;
    const add = obj => { obj.setDepth(D); this.attackOverlay.push(obj); return obj; };

    // Use real player if available, else fall back to fake
    const FALLBACK_NAMES = ['King Leo', 'Queen Maya', 'Baron Fritz', 'Lady Zara', 'Duke Rex'];
    const real = this._raidTarget;
    const victimName  = real?.name  || Phaser.Utils.Array.GetRandom(FALLBACK_NAMES);
    const victimBldgs = real?.buildings || Array.from({ length: 6 }, () => Phaser.Math.Between(0, 3));
    const victimId    = real?._id || null;

    add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88));
    add(this.add.text(W / 2, H * 0.09, 'ATTACK!', {
      fontSize: '44px', fontFamily: 'Arial Black', color: '#FF4444',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5));
    add(this.add.text(W / 2, H * 0.17, `Raiding ${victimName}'s Kingdom`, {
      fontSize: '17px', fontFamily: 'Arial', color: '#CCCCCC',
    }).setOrigin(0.5));

    const groundY = H * 0.42;
    const gnd = this.add.graphics().setDepth(D);
    gnd.fillStyle(0x1C4A18, 1);
    gnd.fillRect(0, groundY - 4, W, 30);
    gnd.fillStyle(0x2D6B28, 1);
    gnd.fillRect(0, groundY - 4, W, 12);
    this.attackOverlay.push(gnd);

    this.attackBldgs = [];
    for (let i = 0; i < 6; i++) {
      const x = (W / 7) * (i + 1);
      const level = victimBldgs[i];
      const g = this.add.graphics().setDepth(D);
      drawBuilding(g, x, groundY, i, level);
      this.attackOverlay.push(g);

      const hit = this.add.rectangle(x, groundY - 35, 52, 80, 0xFFFFFF, 0)
        .setDepth(D + 1).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => hit.setFillStyle(0xFFFFFF, 0.14));
      hit.on('pointerout',  () => hit.setFillStyle(0xFFFFFF, 0));
      hit.on('pointerdown', () => this.onAttackBuilding(i, x, groundY, level, victimId));
      this.attackOverlay.push(hit);
      this.attackBldgs.push({ hit });
    }

    add(this.add.text(W / 2, H * 0.56, 'Tap a building to attack!', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#FFD700',
    }).setOrigin(0.5));

    const skipBg = this.add.graphics().setDepth(D);
    skipBg.fillStyle(0x333333, 1);
    skipBg.fillRoundedRect(W / 2 - 58, H * 0.63, 116, 38, 10);
    this.attackOverlay.push(skipBg);
    add(this.add.text(W / 2, H * 0.63 + 19, 'Skip', {
      fontSize: '16px', fontFamily: 'Arial', color: '#AAAAAA',
    }).setOrigin(0.5));
    const skipHit = this.add.rectangle(W / 2, H * 0.63 + 19, 116, 38, 0x000000, 0)
      .setDepth(D + 1).setInteractive({ useHandCursor: true });
    skipHit.on('pointerdown', () => this.closeAttackOverlay());
    this.attackOverlay.push(skipHit);
  }

  onAttackBuilding(index, x, groundY, level, victimId = null) {
    this.attackBldgs.forEach(b => b.hit.disableInteractive());
    const D = 22;
    const W = this.scale.width;

    // Explosion particles
    const colors = [0xFF4444, 0xF39C12, 0xFFD700, 0xFFFFFF];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const p = this.add
        .circle(x, groundY - 40, Phaser.Math.Between(5, 13), Phaser.Utils.Array.GetRandom(colors))
        .setDepth(D);
      this.attackOverlay.push(p);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * 60,
        y: groundY - 40 + Math.sin(angle) * 60,
        alpha: 0, scale: 0.1, duration: 700, ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }

    // Flash
    const flash = this.add.rectangle(x, groundY - 35, 52, 80, 0xFF2200, 0.8).setDepth(D);
    this.attackOverlay.push(flash);
    this.tweens.add({ targets: flash, alpha: 0, duration: 450 });

    const stolen = level === 0
      ? Phaser.Math.Between(50, 150)
      : level * Phaser.Math.Between(250, 420);
    GameState.addCoins(stolen);
    this.updateHUD();

    if (victimId) recordAttack(victimId, index, stolen);

    const stealText = this.add.text(W / 2, groundY - 95,
      `+${stolen.toLocaleString()} coins stolen!`, {
        fontSize: '24px', fontFamily: 'Arial Black',
        color: '#FFD700', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(D);
    this.attackOverlay.push(stealText);
    this.tweens.add({
      targets: stealText,
      y: stealText.y - 65,
      alpha: 0,
      duration: 1600, ease: 'Power2', delay: 350,
    });

    this.time.delayedCall(2000, () => this.closeAttackOverlay());
  }

  closeAttackOverlay() {
    this.attackOverlay.forEach(o => o.destroy());
    this.attackOverlay = [];
    this.attackBldgs   = [];
  }

  // ─── HUD UPDATE ────────────────────────────────────────────────────────────

  updateHUD() {
    this.coinsText.setText(`${GameState.coins.toLocaleString()}`);
    this.spinsText.setText(`${GameState.spins}`);
    this.shieldText.setText(`${GameState.shields}`);
    this.setWatchAdVisible(GameState.spins === 0);
    this._refreshChestBadge();

    // Coin value bounce
    this.tweens.killTweensOf(this.coinsText);
    this.coinsText.setScale(1);
    this.tweens.add({
      targets: this.coinsText,
      scaleX: 1.35, scaleY: 1.35,
      duration: 140, yoyo: true, ease: 'Power2',
    });
  }
}
