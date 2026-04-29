import { GameState } from '../GameState.js';
import {
  flyingCoins, burstParticles, goldRain,
  screenShake, upgradeEffect, shieldBubble,
  nearMissFlash, feverActivate, feverEnd, streakBurst,
} from '../effects/juice.js';
import { syncPlayer, getRaidTarget, recordAttack } from '../api/client.js';
import { SpinSystem }    from '../systems/SpinSystem.js';
import { RewardSystem }  from '../systems/RewardSystem.js';
import { ComboSystem }    from '../systems/ComboSystem.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { RivalSystem }   from '../systems/RivalSystem.js';
import { RankSystem }    from '../systems/RankSystem.js';
import { LoginStreak }  from '../systems/LoginStreak.js';
import { drawBuilding, BUILDING_COLORS } from '../utils/buildingRenderer.js';
import { audioSystem } from '../effects/AudioSystem.js';
import { SEGMENTS }    from '../constants/segments.js';
import { adService }            from '../services/AdService.js';
import { NotificationService } from '../services/NotificationService.js';

const BUILDING_COSTS  = [500, 1500, 3000, 6000, 12000, 25000];
const BUILDING_NAMES  = ['Farm', 'Mill', 'Barracks', 'Market', 'Castle', 'Palace'];

// ─── SCENE ───────────────────────────────────────────────────────────────────

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.spinSystem    = new SpinSystem(SEGMENTS);
    this.rewardSystem  = new RewardSystem(this);
    this.comboSystem   = new ComboSystem();
    this.missionSystem = new MissionSystem();
    this.rivalSystem   = new RivalSystem();
    this.wheelAngle    = 0;
    this.attackOverlay = [];
    this.attackBldgs   = [];
    this.stars         = [];
    this._outcomePending       = false;
    this._attackTargetOverlay  = [];
    this._rivalBannerOverlay   = [];
    this.rankSystem            = new RankSystem();
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    GameState.checkRefill();
    const offlineEarned = GameState.checkPassiveIncome();
    const loginBonus    = new LoginStreak().check();
    this._raidTarget  = null;
    syncPlayer(GameState);
    audioSystem.startBGM();
    NotificationService.init();
    adService.init();
    this._villageCompleteShowing = false;
    this.events.on('wake', () => {
      // Smooth zoom-out from whatever state the camera was left in
      this.cameras.main.zoomTo(1.0, 600, 'Cubic.easeOut');
      // Reset any spin overlay that might have been left mid-spin
      this.tweens.killTweensOf(this._dimOverlay);
      if (this._dimOverlay) this._dimOverlay.setAlpha(0);
      this.updateHUD();
      // Re-sync missions — a sub-scene (MissionsScene) may have claimed rewards
      this.missionSystem.sync();
      this._refreshMissionBadge();
      if (!this._villageCompleteShowing && GameState.buildings.every(lvl => lvl >= 3)) {
        this._villageCompleteShowing = true;
        this._showVillageComplete();
      }
    });

    const showOffline = offlineEarned > 0 ? () => this._showOfflineEarnings(offlineEarned) : null;
    if (loginBonus) {
      this.time.delayedCall(300, () => this._showLoginStreakModal(loginBonus, showOffline));
    } else if (offlineEarned > 0) {
      this.time.delayedCall(500, () => this._showOfflineEarnings(offlineEarned));
    }

    // Rival attack banner — delayed enough to not clash with welcome modals
    const rivalAttack = this.rivalSystem.checkOfflineAttack();
    if (rivalAttack) {
      const rivalDelay = loginBonus ? 4500 : (offlineEarned > 0 ? 2000 : 1200);
      this.time.delayedCall(rivalDelay, () => this._showRivalAttackBanner(rivalAttack));
    }
    // Re-sync every 60 s
    this.time.addEvent({ delay: 60000, loop: true, callback: () => syncPlayer(GameState) });

    this._L = this._computeLayout(W, H);
    this.drawBackground(W, H);
    this.drawKingdom(W, H);
    this.drawWheel(W, H);
    this.drawHUD(W, H);
    this.drawSpinButton(W, H);
    this.drawWatchAdArea(W, H);
    this.drawResultText(W, H);
    this.animateStars();

    // Reusable overlay objects — create once at top depth, alpha 0
    this._dimOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(8);
    this._feverTint  = this.add.rectangle(W / 2, H / 2, W, H, 0xFF6600, 0)
      .setDepth(2).setBlendMode(Phaser.BlendModes.ADD);

    this._playOpeningSequence();
    this._startChimneySmoke();
    this._showFirstTimeTutorial(W, H);
    this.time.delayedCall(3200, () => this._initLuckyBoost());
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

  // ─── ADAPTIVE LAYOUT ───────────────────────────────────────────────────────
  // Anchors every element from both ends so nothing overlaps on any phone size.

  _computeLayout(W, H) {
    const hudBottom  = 100;
    const safeBottom = H - Math.max(24, H * 0.04); // respects gesture bar / notch

    // On short screens the watch-ad pill is hidden most of the time (spins rarely hit 0).
    // Don't reserve its 60px slot — give it back to the kingdom and wheel.
    const shortScreen = H < 720;

    const spinBtnCy = shortScreen
      ? safeBottom - 37                    // btn sits flush at safe bottom
      : safeBottom - 23 - 14 - 37;        // room for watch-ad pill below

    const watchAdCy = shortScreen
      ? spinBtnCy + 37 + 14 + 23          // positioned below btn (off-screen, hidden anyway)
      : safeBottom - 23;

    // Content zone: HUD bottom → top of spin button
    const contentBot = spinBtnCy - 37 - 12;
    const contentH   = contentBot - hudBottom;

    // Kingdom occupies top 38% of content zone (enough room for buildings)
    const groundY = hudBottom + Math.round(contentH * 0.38);

    // Wheel fills the rest
    const wheelZoneTop = groundY + 12;
    const wheelZoneH   = contentBot - wheelZoneTop;
    const wheelR = Math.min(W * 0.40, wheelZoneH * 0.46, 200);
    const wheelCy = wheelZoneTop + wheelR + Math.max(0, (wheelZoneH - wheelR * 2) / 2);

    return { groundY, wheelCy, wheelR, spinBtnCy, watchAdCy };
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
          Phaser.Math.Between(0, this._L.groundY - 10),
          r, 0xFFFFFF, a
        )
      );
    }

    // Distant landscape silhouette (castle city on the horizon)
    const sil = this.add.graphics();
    const silY = this._L.groundY - 6;
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
    const groundY = this._L.groundY;

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

    // ── Buildings — pop in left→right on scene open ───────────────────────────
    this.buildingGraphics = [];
    for (let i = 0; i < 6; i++) {
      const x = (W / 7) * (i + 1);
      const g = this.add.graphics().setAlpha(0);
      g.y = 22;
      drawBuilding(g, x, groundY, i, GameState.buildings[i]);
      this.buildingGraphics.push({ g, x, groundY, index: i });
      this.tweens.add({
        targets: g, alpha: 1, y: 0,
        duration: 360, delay: 280 + i * 65, ease: 'Back.easeOut',
      });
    }

    // Ambient warm glow behind each building (ADD blend — free bloom)
    for (let i = 0; i < 6; i++) {
      const x   = (W / 7) * (i + 1);
      const glow = this.add.circle(x, groundY - 36, 30, 0xFFBB44, 0)
        .setDepth(1)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: glow, alpha: 0.09,
        duration: 2000 + i * 280,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: 900 + i * 360,
      });
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
    const cy = this._L.wheelCy;
    const r  = this._L.wheelR;
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

    // Pointer and hub scale proportionally with wheel radius
    const ps = r / 182; // pointer scale factor (baseline 182px)
    const hs = r / 182; // hub scale factor

    // Pointer shadow
    const ptrShadow = this.add.graphics();
    ptrShadow.fillStyle(0x000000, 0.3);
    ptrShadow.fillTriangle(
      cx - Math.round(12 * ps) + 3, cy - r - Math.round(7 * ps) + 3,
      cx + Math.round(12 * ps) + 3, cy - r - Math.round(7 * ps) + 3,
      cx + 3, cy - r + Math.round(17 * ps) + 3,
    );

    // Pointer
    const ptr = this.add.graphics();
    ptr.fillStyle(0xFFFFFF, 1);
    ptr.fillTriangle(
      cx - Math.round(12 * ps), cy - r - Math.round(7 * ps),
      cx + Math.round(12 * ps), cy - r - Math.round(7 * ps),
      cx, cy - r + Math.round(17 * ps),
    );
    ptr.lineStyle(2, 0x000000, 0.7);
    ptr.strokeTriangle(
      cx - Math.round(12 * ps), cy - r - Math.round(7 * ps),
      cx + Math.round(12 * ps), cy - r - Math.round(7 * ps),
      cx, cy - r + Math.round(17 * ps),
    );

    // Hub: layered gold metallic look (scales with wheel)
    this.add.circle(cx, cy, Math.round(26 * hs), 0x7B5800, 1);
    this.add.circle(cx, cy, Math.round(23 * hs), 0xD4A017, 1);
    this.add.circle(cx, cy, Math.round(19 * hs), 0xFFD700, 1);
    this.add.circle(cx, cy, Math.round(11 * hs), 0xFFF8DC, 0.85);
    const hubRim = this.add.circle(cx, cy, Math.round(24 * hs));
    hubRim.setStrokeStyle(2, 0x5C3D00);

    // Fever glow ring (hidden until fever activates)
    this.feverRing = this.add.graphics().setDepth(9).setAlpha(0);

    // Combo HUD — floats above hub, scales with wheel radius
    const comboS = Math.max(1, Math.min(r / 182, 1.4));
    this.comboText = this.add.text(cx, cy - 4, '', {
      fontSize: `${Math.round(14 * comboS)}px`, fontFamily: 'Arial Black',
      color: '#FF6600', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(14);

    this.feverCountText = this.add.text(cx, cy + Math.round(11 * comboS), '', {
      fontSize: `${Math.round(10 * comboS)}px`, fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(14);
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

      // Extra gold shimmer for JACKPOT segment
      if (seg.type === 'jackpot') {
        g.fillStyle(0xFFD700, 0.20);
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, r, startAngle, endAngle, false);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, 0xFFD700, 0.65);
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, r - 1, startAngle, endAngle, false);
        g.closePath();
        g.strokePath();
      }

      // Label — font size scales with wheel radius
      const lx        = cx + Math.cos(mid) * r * 0.72;
      const ly        = cy + Math.sin(mid) * r * 0.72;
      const isJackpot = seg.type === 'jackpot';
      const labelPx   = Math.max(9, Math.min(Math.round(r * 0.072), 14));
      const lbl = this.add.text(lx, ly, seg.label, {
        fontSize: `${labelPx}px`,
        fontFamily: 'Arial Black',
        color: isJackpot ? '#FFD700' : '#FFFFFF',
        stroke: '#000000',
        strokeThickness: isJackpot ? 5 : 4,
        align: 'center',
      }).setOrigin(0.5);
      this.wheelLabels.push(lbl);
    }

    // Star studs at each segment divider on outer rim
    for (let i = 0; i < n; i++) {
      const divAngle = rotation + i * slice - Math.PI / 2;
      const sx = cx + Math.cos(divAngle) * (r - 6);
      const sy = cy + Math.sin(divAngle) * (r - 6);
      g.fillStyle(0xFFD700, 0.90);
      g.fillCircle(sx, sy, 4);
      g.fillStyle(0xFFFFFF, 0.60);
      g.fillCircle(sx - 1, sy - 1, 1.5);
    }

    // Jackpot gold dust — 8 small glinting circles around jackpot segment
    const jpIdx = SEGMENTS.findIndex(s => s.type === 'jackpot');
    const jpMid  = rotation + jpIdx * slice - Math.PI / 2 + slice / 2;
    for (let d = 0; d < 8; d++) {
      const dustAngle = jpMid + (d / 8) * slice * 0.8 - slice * 0.4;
      const dustR     = r * (0.55 + (d % 3) * 0.10);
      const dx = cx + Math.cos(dustAngle) * dustR;
      const dy = cy + Math.sin(dustAngle) * dustR;
      g.fillStyle(0xFFD700, 0.55 + (d % 2) * 0.25);
      g.fillCircle(dx, dy, 2.5 - (d % 3) * 0.5);
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
    // Scale factor: keep fonts at baseline on phones, grow up to 1.4× on tablets
    const S = Math.max(1, Math.min(W / 480, 1.4));
    const panel = this.add.graphics();

    // Outer glow ring
    panel.fillStyle(0xFFD700, 0.04);
    panel.fillRoundedRect(4, 4, W - 8, 100, 17);

    // Main glass panel
    panel.fillStyle(0x05051E, 0.82);
    panel.fillRoundedRect(8, 8, W - 16, 92, 14);

    // Glass sheen (top half lighter)
    panel.fillStyle(0xFFFFFF, 0.05);
    panel.fillRoundedRect(8, 8, W - 16, 36, 14);

    // Gold border + inner silver line
    panel.lineStyle(2, 0xFFD700, 0.60);
    panel.strokeRoundedRect(8, 8, W - 16, 92, 14);
    panel.lineStyle(1, 0xFFFFFF, 0.07);
    panel.strokeRoundedRect(11, 11, W - 22, 86, 12);

    // ── Three stat capsules ───────────────────────────────────────────────────
    const items = [
      { x: W * 0.25, color: 0xFFD700, label: 'COINS'   },
      { x: W * 0.50, color: 0x5DADE2, label: 'SHIELDS' },
      { x: W * 0.75, color: 0x2ECC71, label: 'SPINS'   },
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

      this.add.text(x, 74, label, {
        fontSize: `${Math.round(11 * S)}px`, fontFamily: 'Arial Black',
        color: `#${color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);
    });

    // ── Rank / XP progress bar ────────────────────────────────────────────────
    panel.fillStyle(0x020210, 1);
    panel.fillRoundedRect(90, 84, W - 180, 10, 4);

    this._rankDot    = this.add.graphics().setDepth(2);
    this._xpBarFill  = this.add.graphics().setDepth(2);

    const rankDef0 = this.rankSystem.currentDef;
    const rColHex0 = `#${rankDef0.color.toString(16).padStart(6, '0')}`;
    this._rankTitleText = this.add.text(24, 89, rankDef0.title, {
      fontSize: `${Math.round(11 * S)}px`, fontFamily: 'Arial Black', color: rColHex0,
    }).setOrigin(0, 0.5).setDepth(2);

    const xpInfo0 = this.rankSystem.isMaxRank
      ? `V.${GameState.village} · MAX`
      : `V.${GameState.village} · ${this.rankSystem.xpIntoRank}/${this.rankSystem.xpForNextRank}`;
    this._xpProgressText = this.add.text(W - 10, 89, xpInfo0, {
      fontSize: `${Math.round(11 * S)}px`, fontFamily: 'Arial Black', color: '#8AABBD',
    }).setOrigin(1, 0.5).setDepth(2);

    this.updateXPBar();

    this.coinIconX = W * 0.25;
    this.coinIconY = 45;

    // Stat values — scale with S for readability on tablets
    const statFz = `${Math.round(16 * S)}px`;
    this.coinsText = this.add.text(W * 0.25 + 4, 45, `${GameState.coins.toLocaleString()}`, {
      fontSize: statFz, fontFamily: 'Arial Black', color: '#FFD700',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.shieldText = this.add.text(W * 0.50 + 4, 45, `${GameState.shields}`, {
      fontSize: statFz, fontFamily: 'Arial Black', color: '#5DADE2',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.spinsText = this.add.text(W * 0.75 + 4, 45, `${GameState.spins}`, {
      fontSize: statFz, fontFamily: 'Arial Black', color: '#2ECC71',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Missions button — left side of HUD panel (mirror of trophy button)
    const missX = W * 0.07;
    const missY = 44;
    panel.fillStyle(0x0A2A16, 0.55);
    panel.fillCircle(missX, missY, 22);
    panel.fillStyle(0x27AE60, 0.80);
    panel.fillCircle(missX, missY, 18);
    panel.lineStyle(1.5, 0x2ECC71, 0.70);
    panel.strokeCircle(missX, missY, 18);
    panel.fillStyle(0xFFFFFF, 0.18);
    panel.fillCircle(missX - 5, missY - 6, 9);
    this.add.text(missX, missY + 1, '📋', { fontSize: '17px' }).setOrigin(0.5).setDepth(2);
    this.add.circle(missX, missY, 22, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3)
      .on('pointerdown', () => {
        this.scene.sleep('GameScene');
        this.scene.launch('MissionsScene');
      });

    // Pending-missions notification dot (shown when claims are ready)
    this._missionDot = this.add.circle(missX + 13, missY - 13, 7, 0xFF3333, 1).setDepth(4);
    this._missionDotText = this.add.text(missX + 13, missY - 13, '', {
      fontSize: '9px', fontFamily: 'Arial Black', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(5);
    this._refreshMissionBadge();

    // Leaderboard trophy button — right side of HUD panel
    const lbX = W * 0.93;
    const lbY = 44;
    panel.fillStyle(0x7A5800, 0.55);
    panel.fillCircle(lbX, lbY, 22);
    panel.fillStyle(0xD4A017, 0.80);
    panel.fillCircle(lbX, lbY, 18);
    panel.lineStyle(1.5, 0xFFD700, 0.70);
    panel.strokeCircle(lbX, lbY, 18);
    panel.fillStyle(0xFFF5CC, 0.30);
    panel.fillCircle(lbX - 5, lbY - 6, 9);
    this.add.text(lbX, lbY + 1, '🏆', { fontSize: '17px' }).setOrigin(0.5).setDepth(2);
    this.add.circle(lbX, lbY, 22, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3)
      .on('pointerdown', () => {
        this.scene.sleep('GameScene');
        this.scene.launch('LeaderboardScene');
      });

    // Chest inventory badge — appears below HUD when chests are waiting
    this._chestBadgeBg = this.add.graphics().setDepth(1);
    this.chestBadgeText = this.add.text(W / 2, 114, '', {
      fontSize: '11px', fontFamily: 'Arial Black',
      color: '#1ABC9C', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(2);

    const badgeHit = this.add.zone(W / 2, 114, 200, 22).setDepth(3).setInteractive({ useHandCursor: true });
    badgeHit.on('pointerdown', () => {
      if (GameState.chests.length === 0) return;
      const chest = GameState.chests[0];
      this.scene.sleep('GameScene');
      this.scene.launch('ChestScene', { chestId: chest.id, chestType: chest.type });
    });

    // Settings gear button — bottom right corner
    const setX = W - 32;
    const setY = H - 32;
    const setG = this.add.graphics().setDepth(3);
    setG.fillStyle(0x111122, 0.82);
    setG.fillCircle(setX, setY, 16);
    setG.lineStyle(1.5, 0x334466, 0.70);
    setG.strokeCircle(setX, setY, 16);
    this.add.text(setX, setY, '⚙️', { fontSize: '14px' }).setOrigin(0.5).setDepth(4);
    this.add.circle(setX, setY, 20, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(5)
      .on('pointerdown', () => {
        this.scene.sleep('GameScene');
        this.scene.launch('SettingsScene');
      });

    this._refreshChestBadge(W);
  }

  _refreshChestBadge(W = this.scale.width) {
    const n = GameState.chests.length;
    this._chestBadgeBg.clear();
    if (n === 0) { this.chestBadgeText.setText(''); return; }

    this._chestBadgeBg.fillStyle(0x1ABC9C, 0.18);
    this._chestBadgeBg.fillRoundedRect(W / 2 - 90, 103, 180, 22, 11);
    this._chestBadgeBg.lineStyle(1.5, 0x1ABC9C, 0.6);
    this._chestBadgeBg.strokeRoundedRect(W / 2 - 90, 103, 180, 22, 11);
    this.chestBadgeText.setText(`🎁  ${n} chest${n > 1 ? 's' : ''} — tap to open!`);
  }

  updateXPBar() {
    if (!this._xpBarFill) return;
    const W       = this.scale.width;
    const rs      = this.rankSystem;
    const def     = rs.currentDef;
    const rCol    = def.color;
    const rColHex = `#${rCol.toString(16).padStart(6, '0')}`;
    const barW    = W - 180;
    const pct     = rs.progressPct;

    // Rank dot (dynamic color)
    this._rankDot?.clear();
    this._rankDot?.fillStyle(rCol, 0.90);
    this._rankDot?.fillCircle(16, 89, 4.5);
    this._rankDot?.fillStyle(0xFFFFFF, 0.35);
    this._rankDot?.fillCircle(15, 88, 2.5);

    // XP bar fill
    this._xpBarFill.clear();
    const fillW = rs.isMaxRank ? barW : (pct > 0 ? Math.max(barW * pct, 6) : 0);
    if (fillW > 0) {
      this._xpBarFill.fillStyle(rCol, 0.85);
      this._xpBarFill.fillRoundedRect(90, 84, fillW, 10, 4);
      this._xpBarFill.fillStyle(0xFFFFFF, 0.20);
      this._xpBarFill.fillRoundedRect(90, 84, fillW, 4, 3);
    }

    this._rankTitleText?.setText(def.title).setColor(rColHex);
    const xpInfo = rs.isMaxRank
      ? `V.${GameState.village} · MAX`
      : `V.${GameState.village} · ${rs.xpIntoRank}/${rs.xpForNextRank}`;
    this._xpProgressText?.setText(xpInfo);
  }

  // ─── SPIN BUTTON ───────────────────────────────────────────────────────────

  drawSpinButton(W, H) {
    const bx = W / 2;
    const by = this._L.spinBtnCy;

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
    const by = this._L.watchAdCy;

    // Premium pill teaser
    this.adBtnBg = this.add.graphics();
    this._drawAdPill(bx, by);

    this.adBtnText = this.add.text(bx + 12, by, '📺  Watch Ad  →  +5 Spins', {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#0A3A1A', strokeThickness: 3,
    }).setOrigin(0.5);

    this.adBtnHit = this.add.rectangle(bx, by, 260, 46, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.adBtnHit.on('pointerdown', () => this._openAdSheet(W, H));

    this.refillCountdown = this.add.text(bx, by + 30, '', {
      fontSize: '12px', fontFamily: 'Arial', color: '#888888',
    }).setOrigin(0.5);

    // Gentle glow pulse on the pill
    this.tweens.add({
      targets: this.adBtnBg, alpha: 0.78,
      yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut',
    });

    this.setWatchAdVisible(GameState.spins === 0);
  }

  _drawAdPill(bx, by) {
    const g = this.adBtnBg;
    g.clear();
    g.fillStyle(0x0A2A14, 1);
    g.fillRoundedRect(bx - 130, by - 23, 260, 46, 16);
    g.fillStyle(0x1A7A3A, 1);
    g.fillRoundedRect(bx - 130, by - 23, 260, 32, 16);
    g.fillStyle(0x2ECC71, 0.18);
    g.fillRoundedRect(bx - 126, by - 20, 252, 14, 10);
    g.lineStyle(2, 0x2ECC71, 0.95);
    g.strokeRoundedRect(bx - 130, by - 23, 260, 46, 16);
    // Live-dot
    g.fillStyle(0x00FF7F, 1);
    g.fillCircle(bx - 100, by, 5);
    g.fillStyle(0xFFFFFF, 0.55);
    g.fillCircle(bx - 101, by - 1, 2);
  }

  setWatchAdVisible(visible) {
    this.adBtnBg.setVisible(visible);
    this.adBtnText.setVisible(visible);
    this.refillCountdown.setVisible(visible);
    if (visible) this.adBtnHit.setInteractive({ useHandCursor: true });
    else this.adBtnHit.disableInteractive();
  }

  _openAdSheet(W, H) {
    const D       = 35;
    const sheetH  = 268;
    const objs    = [];
    const track   = o => { objs.push(o); return o; };
    const slideBy = sheetH + 10;

    // Backdrop
    const dim = track(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setDepth(D).setInteractive());
    this.tweens.add({ targets: dim, alpha: 0.60, duration: 220 });

    // Sheet panel — starts below viewport
    const sheet = track(this.add.graphics().setDepth(D + 1).setY(H + 10));
    sheet.fillStyle(0x05051E, 0.98);
    sheet.fillRoundedRect(0, 0, W, sheetH, { tl: 22, tr: 22, bl: 0, br: 0 });
    sheet.fillStyle(0x2ECC71, 0.06);
    sheet.fillRoundedRect(0, 0, W, 50, { tl: 22, tr: 22, bl: 0, br: 0 });
    sheet.lineStyle(2.5, 0x2ECC71, 0.65);
    sheet.strokeRoundedRect(0, 0, W, sheetH, { tl: 22, tr: 22, bl: 0, br: 0 });

    const makeAt = (y, fn) => {
      const o = fn(H + 10 + y);
      return track(o);
    };

    const icon    = makeAt(44,  y => this.add.text(W / 2, y, '📺', { fontSize: '46px' }).setOrigin(0.5).setDepth(D + 2));
    const heading = makeAt(100, y => this.add.text(W / 2, y, '+5 FREE SPINS', {
      fontSize: '26px', fontFamily: 'Arial Black',
      color: '#2ECC71', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(D + 2));
    const sub     = makeAt(132, y => this.add.text(W / 2, y, 'Watch a short ad to earn 5 bonus spins', {
      fontSize: '13px', fontFamily: 'Arial', color: '#778899',
      align: 'center', wordWrap: { width: W - 60 },
    }).setOrigin(0.5).setDepth(D + 2));

    const btnTop = H + 10 + 158;
    const adBg = track(this.add.graphics().setDepth(D + 2));
    adBg.fillStyle(0x1A6A2A, 1); adBg.fillRoundedRect(W / 2 - 120, btnTop, 240, 52, 14);
    adBg.fillStyle(0x27AE60, 1); adBg.fillRoundedRect(W / 2 - 120, btnTop, 240, 36, 14);
    adBg.fillStyle(0xFFFFFF, 0.10); adBg.fillRoundedRect(W / 2 - 116, btnTop + 2, 232, 14, 10);
    adBg.lineStyle(2, 0x2ECC71, 0.90); adBg.strokeRoundedRect(W / 2 - 120, btnTop, 240, 52, 14);

    const btnTxt = makeAt(184, y => this.add.text(W / 2, y, '▶  WATCH NOW', {
      fontSize: '17px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#0A3A1A', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D + 3));

    const skipTxt = makeAt(232, y => this.add.text(W / 2, y, 'No thanks', {
      fontSize: '12px', fontFamily: 'Arial', color: '#445566',
    }).setOrigin(0.5).setDepth(D + 3));

    // Slide all up
    objs.forEach(o => {
      if (o !== dim) this.tweens.add({ targets: o, y: o.y - slideBy, duration: 380, ease: 'Back.easeOut' });
    });

    const dismiss = () => {
      this.tweens.add({
        targets: objs, alpha: 0, duration: 200,
        onComplete: () => objs.forEach(o => o.destroy()),
      });
    };

    // Hit zones (also slide up)
    const btnHit = track(this.add.rectangle(W / 2, H + 10 + 184, 240, 52, 0, 0)
      .setDepth(D + 4).setInteractive({ useHandCursor: true }));
    this.tweens.add({ targets: btnHit, y: btnHit.y - slideBy, duration: 380, ease: 'Back.easeOut' });

    const skipHit = track(this.add.rectangle(W / 2, H + 10 + 232, 140, 28, 0, 0)
      .setDepth(D + 4).setInteractive({ useHandCursor: true }));
    this.tweens.add({ targets: skipHit, y: skipHit.y - slideBy, duration: 380, ease: 'Back.easeOut' });

    btnHit.on('pointerdown', () => {
      btnHit.disableInteractive();
      skipHit.disableInteractive();
      btnTxt.setText('Loading...');
      this.time.delayedCall(2500, () => {
        GameState.addSpins(5);
        this.updateHUD();
        this.showResult('+5 Spins!', '#2ECC71');
        this.setWatchAdVisible(false);
        dismiss();
      });
    });

    skipHit.on('pointerdown', dismiss);
    dim.on('pointerdown', dismiss);
  }

  onWatchAd() { this._openAdSheet(this.scale.width, this.scale.height); }

  // ─── BUILD BUTTONS ─────────────────────────────────────────────────────────

  drawBuildButtons(W, H) {
    const S = Math.max(1, Math.min(W / 480, 1.4));
    this.buildBtnText = this.add.text(W / 2, this._L.spinBtnCy + 44, 'Tap building to upgrade', {
      fontSize: `${Math.round(13 * S)}px`, fontFamily: 'Arial', color: '#AAAAAA',
    }).setOrigin(0.5);

    this.buildingGraphics.forEach(({ x, groundY, index }) => {
      const hit = this.add.rectangle(x, groundY - 62, 60, 132, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.onBuildingTap(index));
    });
  }

  // ─── RESULT TEXT ───────────────────────────────────────────────────────────

  drawResultText(W, H) {
    const S = Math.max(1, Math.min(W / 480, 1.4));
    this.resultText = this.add.text(W / 2, this._L.wheelCy, '', {
      fontSize: `${Math.round(36 * S)}px`, fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: Math.round(6 * S),
    }).setOrigin(0.5).setAlpha(0).setDepth(10);
  }

  // ─── SPIN LOGIC ────────────────────────────────────────────────────────────

  onSpin() {
    if (this.spinSystem.isSpinning || this._outcomePending) return;
    if (!GameState.useSpin()) {
      this.showResult('No spins left!', '#FF4444');
      return;
    }

    this._dismissTutorial();
    this._outcomePending = true;
    this.spinBtnText.setText('...');
    audioSystem.spinLaunch();

    // Spin cinematic: dim world + zoom in on wheel
    this.tweens.killTweensOf(this._dimOverlay);
    this.tweens.add({ targets: this._dimOverlay, alpha: 0.28, duration: 220 });
    this.cameras.main.zoomTo(1.07, 240, 'Sine.easeIn');

    // Tick audio during spin
    this._spinTickTimer = this.time.addEvent({
      delay: 80, loop: true,
      callback: () => audioSystem.tick(),
    });
    this.missionSystem.progress('spins');
    this._refreshMissionBadge();
    if (this.spinPulseTween) this.spinPulseTween.pause();
    if (this.spinGlow)       this.spinGlow.setVisible(false);

    const targetIndex = this.spinSystem.spin(
      this,
      angle => { this.wheelAngle = angle; this.drawWheelGraphics(angle); },
      (segment, idx) => this._onWheelStopped(segment, idx),
      {
        onSlowdown: () => {
          // Phase 4: wheel crawling — tighten tick interval for suspense
          this._spinTickTimer?.remove();
          this._spinTickTimer = this.time.addEvent({
            delay: 38, loop: true,
            callback: () => audioSystem.tick(),
          });
        },
        onNearMissPassthrough: () => this._onJackpotPassthrough(),
      }
    );

    // Pre-fetch raid target the moment the spin starts (gives 4s head-start)
    const spinType = targetIndex >= 0 ? SEGMENTS[targetIndex].type : '';
    if (spinType === 'attack' || spinType === 'raid') {
      getRaidTarget(GameState.deviceId).then(t => { this._raidTarget = t; });
    }
  }

  _onWheelStopped(segment, targetIndex) {
    // Stop tick audio
    this._spinTickTimer?.remove();
    this._spinTickTimer = null;

    const { width: W, height: H } = this.scale;

    // Restore spin cinematic (dim + zoom snap back)
    this.tweens.killTweensOf(this._dimOverlay);
    this.tweens.add({ targets: this._dimOverlay, alpha: 0, duration: 380 });
    this.cameras.main.zoomTo(1.0, 440, 'Back.easeOut');

    burstParticles(this, this.wheelCx, this.wheelCy - this.wheelR,
      [segment.color, segment.light, 0xFFFFFF], 14);

    const nearMiss  = this._isNearMiss(targetIndex);
    const nearMiss2 = !nearMiss && this._isNearMiss2(targetIndex);

    if (nearMiss) {
      audioSystem.nearMiss();
      nearMissFlash(this, W, H);
      this.time.delayedCall(700, () => this._showTryAgainPrompt(W, H));
    } else {
      audioSystem.wheelStop();
      this.cameras.main.shake(200, 0.007);
      if (nearMiss2) this._pulseNearMiss2Tease();
    }

    this.time.delayedCall(nearMiss ? 1900 : 180, () => {
      this.applyOutcome(segment);
      if (this.spinPulseTween) this.spinPulseTween.resume();
      if (this.spinGlow)       this.spinGlow.setVisible(true);
    });
  }

  applyOutcome(segment) {
    this._outcomePending = false;
    this.spinBtnText.setText('SPIN');
    const comboResult = this.comboSystem.record(segment.type);
    this._handleComboEvents(comboResult);
    this.rewardSystem.handle(segment, comboResult);
    this._updateComboHUD();
  }

  _isNearMiss(targetIndex) {
    if (SEGMENTS[targetIndex].type === 'jackpot') return false;
    const n    = SEGMENTS.length;
    const jIdx = SEGMENTS.findIndex(s => s.type === 'jackpot');
    const prev = (jIdx - 1 + n) % n;
    const next = (jIdx + 1) % n;
    return targetIndex === prev || targetIndex === next;
  }

  // ±2 distance from jackpot — softer tease, no delay to outcome
  _isNearMiss2(targetIndex) {
    if (SEGMENTS[targetIndex].type === 'jackpot') return false;
    const n    = SEGMENTS.length;
    const jIdx = SEGMENTS.findIndex(s => s.type === 'jackpot');
    const dist = Math.min(
      Math.abs(targetIndex - jIdx),
      n - Math.abs(targetIndex - jIdx)
    );
    return dist === 2;
  }

  _pulseNearMiss2Tease() {
    const cx = this.wheelCx;
    const cy = this.wheelCy;
    const r  = this.wheelR;
    const g  = this.add.graphics().setDepth(20).setAlpha(0);
    g.lineStyle(5, 0xFFD700, 0.80);
    g.strokeCircle(cx, cy, r + 6);
    g.lineStyle(2, 0xFFFF88, 0.50);
    g.strokeCircle(cx, cy, r + 12);

    this.tweens.add({
      targets: g, alpha: 1,
      duration: 180, ease: 'Power2',
      yoyo: true, repeat: 2,
      onComplete: () => g.destroy(),
    });
  }

  // Jackpot segment crossing the pointer during slowdown — ting + gold flash
  _onJackpotPassthrough() {
    audioSystem.jackpotPassthrough();
    const cx = this.wheelCx;
    const cy = this.wheelCy;
    const r  = this.wheelR;
    const g  = this.add.graphics().setDepth(22).setAlpha(0);
    g.lineStyle(8, 0xFFD700, 0.90);
    g.strokeCircle(cx, cy, r + 4);
    g.lineStyle(3, 0xFFFFAA, 0.60);
    g.strokeCircle(cx, cy, r + 14);

    this.tweens.add({
      targets: g, alpha: 1,
      duration: 80, ease: 'Power2',
      yoyo: true,
      onComplete: () => g.destroy(),
    });
  }

  // "Try Again?" panel — shown 700ms after a ±1 near-miss
  _showTryAgainPrompt(W, H) {
    if (this.spinSystem.isSpinning) return;
    const D    = 55;
    const panY = H * 0.60;
    const objs = [];
    const track = o => { objs.push(o); return o; };

    const dismiss = () => {
      this.tweens.add({
        targets: objs, alpha: 0, duration: 200,
        onComplete: () => objs.forEach(o => o.destroy()),
      });
    };

    const panel = track(this.add.graphics().setDepth(D).setAlpha(0));
    panel.fillStyle(0x0A0A2A, 0.95);
    panel.fillRoundedRect(W / 2 - 140, panY, 280, 126, 16);
    panel.lineStyle(2, 0xFF4400, 0.60);
    panel.strokeRoundedRect(W / 2 - 140, panY, 280, 126, 16);
    this.tweens.add({ targets: panel, alpha: 1, duration: 240 });

    const lbl = track(this.add.text(W / 2, panY + 24, 'So close! Try again?', {
      fontSize: '14px', fontFamily: 'Arial Black', color: '#FF8C44',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(D + 1).setAlpha(0));
    this.tweens.add({ targets: lbl, alpha: 1, duration: 240 });

    const btnBg = track(this.add.graphics().setDepth(D + 1).setAlpha(0));
    btnBg.fillStyle(0x1A6A2A, 1); btnBg.fillRoundedRect(W / 2 - 100, panY + 46, 200, 40, 10);
    btnBg.fillStyle(0x27AE60, 1); btnBg.fillRoundedRect(W / 2 - 100, panY + 46, 200, 27, 10);
    btnBg.lineStyle(2, 0x2ECC71, 0.85); btnBg.strokeRoundedRect(W / 2 - 100, panY + 46, 200, 40, 10);
    this.tweens.add({ targets: btnBg, alpha: 1, duration: 240 });

    const btnTxt = track(this.add.text(W / 2, panY + 66, '▶  Watch Ad  → +1 Spin', {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#0A3A1A', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(D + 2).setAlpha(0));
    this.tweens.add({ targets: btnTxt, alpha: 1, duration: 240 });

    const skipTxt = track(this.add.text(W / 2, panY + 103, 'No thanks', {
      fontSize: '11px', fontFamily: 'Arial', color: '#445566',
    }).setOrigin(0.5).setDepth(D + 2).setAlpha(0));
    this.tweens.add({ targets: skipTxt, alpha: 1, duration: 240 });

    const autoTimer = this.time.delayedCall(6500, dismiss);

    const btnHit = track(this.add.rectangle(W / 2, panY + 66, 200, 40, 0, 0)
      .setDepth(D + 3).setInteractive({ useHandCursor: true }));
    btnHit.on('pointerdown', () => {
      autoTimer.remove();
      btnHit.disableInteractive();
      btnTxt.setText('Loading...');
      this.time.delayedCall(2500, () => {
        GameState.addSpins(1);
        this.updateHUD();
        dismiss();
      });
    });

    const skipHit = track(this.add.rectangle(W / 2, panY + 103, 120, 26, 0, 0)
      .setDepth(D + 3).setInteractive({ useHandCursor: true }));
    skipHit.on('pointerdown', () => { autoTimer.remove(); dismiss(); });
  }

  _handleComboEvents(result) {
    const { width: W, height: H } = this.scale;
    const cx = this.wheelCx;
    const cy = this.wheelCy;

    if (result.feverTriggered) {
      this._rankAward('feverTrigger');
      audioSystem.fever();
      feverActivate(this, W, H);
      this.tweens.killTweensOf(this.feverRing);
      this.feverRing.setAlpha(1);
      this.tweens.add({
        targets: this.feverRing,
        alpha: { from: 0.5, to: 1 },
        yoyo: true, repeat: -1,
        duration: 580, ease: 'Sine.easeInOut',
      });
      this.tweens.killTweensOf(this._feverTint);
      this.tweens.add({ targets: this._feverTint, alpha: 0.08, duration: 450 });
      this._feverTintPulse = this.tweens.add({
        targets: this._feverTint, alpha: 0.04,
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 500,
      });
    } else if (result.feverEnded) {
      feverEnd(this, W, H);
      this.tweens.killTweensOf(this.feverRing);
      this.tweens.add({
        targets: this.feverRing,
        alpha: 0, duration: 600, ease: 'Power2',
      });
      this._feverTintPulse?.stop();
      this._feverTintPulse = null;
      this.tweens.killTweensOf(this._feverTint);
      this.tweens.add({ targets: this._feverTint, alpha: 0, duration: 650 });
    } else if (result.streakBroken && this.comboText) {
      this.tweens.add({
        targets: [this.comboText, this.feverCountText],
        scaleX: 0.1, scaleY: 0.1, alpha: 0,
        duration: 280, ease: 'Power2',
        onComplete: () => {
          this.comboText.setScale(1).setAlpha(1);
          this.feverCountText.setScale(1).setAlpha(1);
        },
      });
    } else if (result.streak && result.streak >= 2) {
      streakBurst(this, cx, cy, result.streak);
      if (result.streak >= 3) {
        this._rankAward('combo3');
        this.missionSystem.progress('combo', result.streak);
        this._refreshMissionBadge();
      }
    }
  }

  _updateComboHUD() {
    const cs  = this.comboSystem;
    const cx  = this.wheelCx;
    const cy  = this.wheelCy;

    this.feverRing.clear();

    if (cs.feverActive) {
      // Pulsing double gold ring around the wheel
      this.feverRing.lineStyle(7, 0xFFD700, 0.75);
      this.feverRing.strokeCircle(cx, cy, this.wheelR + 9);
      this.feverRing.lineStyle(3, 0xFF8C00, 0.50);
      this.feverRing.strokeCircle(cx, cy, this.wheelR + 17);

      this.comboText.setText('🔥').setStyle({ fontSize: '20px', color: '#FFD700' });
      this.feverCountText.setText(`×2  ${cs.feverLeft} left`).setStyle({ color: '#FFCC00' });
    } else if (cs.streak >= 2) {
      this.comboText.setText(`🔥${cs.streak}`).setStyle({ fontSize: '13px', color: '#FF6600' });
      this.feverCountText.setText(
        cs.streak >= 3 ? `×${cs.multiplier === Math.floor(cs.multiplier) ? cs.multiplier : cs.multiplier.toFixed(1)}` : ''
      ).setStyle({ color: '#FFAA44' });
    } else {
      this.comboText.setText('');
      this.feverCountText.setText('');
    }
  }

  showResult(msg, color) {
    this.resultText
      .setText(msg)
      .setColor(color)
      .setAlpha(1)
      .setPosition(this.scale.width / 2, this.scale.height * 0.73)
      .setScale(3.5);

    // Slam-in from oversized → normal (feels like it LANDS)
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
    const villageMultiplier = 1 + (GameState.village - 1) * 0.4;
    const cost    = Math.round(BUILDING_COSTS[index] * villageMultiplier);
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
    audioSystem.upgrade();
    this.showResult(`${BUILDING_NAMES[index]} upgraded!`, '#2ECC71');
    this.updateHUD();
    this._rankAward('upgrade');
    this.missionSystem.progress('upgrades');
    this._refreshMissionBadge();

    if (!this._villageCompleteShowing && GameState.buildings.every(lvl => lvl >= 3)) {
      this._villageCompleteShowing = true;
      this.time.delayedCall(900, () => this._showVillageComplete());
    }

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

  // ─── MISSION BADGE ─────────────────────────────────────────────────────────

  _refreshMissionBadge() {
    if (!this._missionDot) return;
    const n = this.missionSystem.pendingCount();
    this._missionDot.setVisible(n > 0);
    this._missionDotText.setText(n > 0 ? String(n) : '');
  }

  // ─── RIVAL ATTACK BANNER ───────────────────────────────────────────────────

  _showRivalAttackBanner(attackInfo) {
    const W = this.scale.width;
    const D = 30;
    const FY = 8;     // final top edge of panel
    const OFF = -110; // start offset (above screen)

    this._rivalBannerOverlay.forEach(o => o.destroy());
    this._rivalBannerOverlay = [];
    const track = obj => { this._rivalBannerOverlay.push(obj); return obj; };

    const slide = (obj, finalY) => {
      obj.y = finalY + OFF;
      this.tweens.add({ targets: obj, y: finalY, duration: 400, ease: 'Back.easeOut' });
      return obj;
    };

    // Panel background
    const panelG = track(this.add.graphics().setDepth(D));
    panelG.fillStyle(0x1A0000, 0.96);
    panelG.fillRoundedRect(8, FY, W - 16, 88, 12);
    panelG.lineStyle(2, 0xFF4444, 0.65);
    panelG.strokeRoundedRect(8, FY, W - 16, 88, 12);
    slide(panelG, 0);

    slide(track(this.add.text(W / 2, FY + 26, `⚔️  ${attackInfo.rivalName} attacked!`, {
      fontSize: '16px', fontFamily: 'Arial Black',
      color: '#FF4444', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D + 1)), 0);

    slide(track(this.add.text(W / 2, FY + 50, 'A building was damaged while you were away', {
      fontSize: '11px', fontFamily: 'Arial', color: '#BB7777',
    }).setOrigin(0.5).setDepth(D + 1)), 0);

    // REVENGE button
    const rvG = track(this.add.graphics().setDepth(D + 1));
    rvG.fillStyle(0x880000, 1); rvG.fillRoundedRect(W * 0.22 - 56, FY + 64, 112, 26, 7);
    rvG.fillStyle(0xCC1100, 1); rvG.fillRoundedRect(W * 0.22 - 56, FY + 64, 112, 18, 7);
    rvG.lineStyle(1.5, 0xFF4444, 0.7); rvG.strokeRoundedRect(W * 0.22 - 56, FY + 64, 112, 26, 7);
    slide(rvG, 0);

    slide(track(this.add.text(W * 0.22, FY + 77, '💀  REVENGE!', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#FFFFFF',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(D + 2)), 0);

    // Dismiss ✕
    slide(track(this.add.text(W - 26, FY + 18, '✕', {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#554455',
    }).setOrigin(0.5).setDepth(D + 2)), 0);

    const dismiss = () => {
      this.tweens.add({
        targets: this._rivalBannerOverlay, alpha: 0, duration: 220,
        onComplete: () => { this._rivalBannerOverlay.forEach(o => o.destroy()); this._rivalBannerOverlay = []; },
      });
    };

    slide(track(this.add.rectangle(W * 0.22, FY + 77, 112, 26, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D + 3)
      .on('pointerdown', () => {
        this._pendingRevenge = attackInfo.rivalName;
        dismiss();
      })), 0);

    slide(track(this.add.rectangle(W - 26, FY + 18, 36, 36, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D + 3)
      .on('pointerdown', dismiss)), 0);

    this.time.delayedCall(6000, dismiss);
  }

  // ─── ATTACK TARGET PANEL ───────────────────────────────────────────────────

  _showAttackTargetPanel() {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const D  = 25;

    this._attackTargetOverlay.forEach(o => o.destroy());
    this._attackTargetOverlay = [];
    const track = obj => { this._attackTargetOverlay.push(obj); return obj; };
    const close = () => { this._attackTargetOverlay.forEach(o => o.destroy()); this._attackTargetOverlay = []; };

    // Dim backdrop
    track(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.78).setDepth(D));

    // Panel
    const panelG = track(this.add.graphics().setDepth(D));
    const pY = H * 0.37;
    const pH = H * 0.44;
    panelG.fillStyle(0x05051E, 0.97);
    panelG.fillRoundedRect(12, pY, W - 24, pH, 16);
    panelG.lineStyle(2, 0xFF4444, 0.50);
    panelG.strokeRoundedRect(12, pY, W - 24, pH, 16);

    track(this.add.text(W / 2, pY + 26, '⚔️  Choose Your Target', {
      fontSize: '18px', fontFamily: 'Arial Black',
      color: '#FF6644', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D + 1));

    // 3 target cards
    const targets = this.rivalSystem.getTargets(this._raidTarget);
    const cardW   = 124;
    const cardH   = 148;
    const cardY   = pY + 46;
    const xs      = [W * 0.185, W * 0.50, W * 0.815];

    targets.forEach((tgt, i) => {
      const cx   = xs[i];
      const cg   = track(this.add.graphics().setDepth(D + 1));

      // Card bg
      cg.fillStyle(tgt.revenge ? 0x180000 : 0x080820, 0.92);
      cg.fillRoundedRect(cx - cardW / 2, cardY, cardW, cardH, 9);
      if (tgt.revenge) {
        cg.fillStyle(0xFF2200, 0.09);
        cg.fillRoundedRect(cx - cardW / 2, cardY, cardW, 36, 9);
      }
      cg.lineStyle(2, tgt.revenge ? 0xFF3300 : 0x334466, 0.75);
      cg.strokeRoundedRect(cx - cardW / 2, cardY, cardW, cardH, 9);

      // Name
      track(this.add.text(cx, cardY + 17, tgt.name, {
        fontSize: '11px', fontFamily: 'Arial Black',
        color: tgt.revenge ? '#FF6644' : '#DDEEFF',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(D + 2));

      // Kingdom level
      const kLvl = (tgt.buildings || []).reduce((s, v) => s + v, 0);
      track(this.add.text(cx, cardY + 36, `🏰 Lv.${kLvl}`, {
        fontSize: '11px', fontFamily: 'Arial', color: '#1ABC9C',
      }).setOrigin(0.5).setDepth(D + 2));

      // Loot estimate (×1.5 on revenge)
      const loot = tgt.revenge ? Math.round(tgt.loot * 1.5) : tgt.loot;
      track(this.add.text(cx, cardY + 58, `💰 ~${loot.toLocaleString()}`, {
        fontSize: '12px', fontFamily: 'Arial Black', color: '#FFD700',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(D + 2));

      // Attack / Revenge button
      const btnY   = cardY + cardH - 40;
      const btnCol = tgt.revenge ? 0xCC1100 : 0xC0390B;
      const btnLit = tgt.revenge ? 0xFF3300 : 0xE67E22;
      const btnG   = track(this.add.graphics().setDepth(D + 2));
      btnG.fillStyle(btnCol, 1); btnG.fillRoundedRect(cx - 50, btnY, 100, 32, 8);
      btnG.fillStyle(btnLit, 1); btnG.fillRoundedRect(cx - 50, btnY, 100, 22, 8);
      btnG.lineStyle(1.5, tgt.revenge ? 0xFF6644 : 0xFFD700, 0.8);
      btnG.strokeRoundedRect(cx - 50, btnY, 100, 32, 8);

      track(this.add.text(cx, btnY + 16, tgt.revenge ? '💀 REVENGE!' : 'ATTACK!', {
        fontSize: '11px', fontFamily: 'Arial Black',
        color: '#FFFFFF', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(D + 3));

      // Hit area (whole card)
      const hit = track(this.add.rectangle(cx, cardY + cardH / 2, cardW, cardH, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(D + 4));
      hit.on('pointerover', () => cg.setAlpha(0.65));
      hit.on('pointerout',  () => cg.setAlpha(1));
      hit.on('pointerdown', () => {
        close();
        if (tgt.revenge && tgt.rivalRef) this.rivalSystem.clearRevenge(tgt.rivalRef.name);
        if (tgt.isRival && tgt.rivalRef)  this.rivalSystem.onAttacked(tgt.rivalRef.name);
        this.cameras.main.zoomTo(1.5, 320, 'Cubic.easeIn', false, (_cam, progress) => {
          if (progress === 1) {
            this.scene.sleep('GameScene');
            this.scene.launch('AttackScene', {
              target:   { name: tgt.name, buildings: tgt.buildings, _id: tgt._id || null },
              deviceId: GameState.deviceId,
            });
          }
        });
      });
    });

    // Skip button
    const skipY = pY + pH - 30;
    const skipG = track(this.add.graphics().setDepth(D + 1));
    skipG.fillStyle(0x1A1A2E, 1); skipG.fillRoundedRect(W / 2 - 72, skipY - 18, 144, 36, 9);
    skipG.lineStyle(1, 0x334466, 0.6); skipG.strokeRoundedRect(W / 2 - 72, skipY - 18, 144, 36, 9);

    track(this.add.text(W / 2, skipY, 'Skip', {
      fontSize: '16px', fontFamily: 'Arial', color: '#667788',
    }).setOrigin(0.5).setDepth(D + 2));

    track(this.add.rectangle(W / 2, skipY, 144, 36, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D + 3)
      .on('pointerdown', close));
  }

  // ─── OFFLINE EARNINGS SCREEN ──────────────────────────────────────────────

  _showOfflineEarnings(earned) {
    const W = this.scale.width;
    const H = this.scale.height;
    const D = 40;
    const overlay = [];
    const track   = o => { overlay.push(o); return o; };
    const close   = () => overlay.forEach(o => o.destroy());

    track(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(D));

    const cY = H * 0.33;
    const cH = 218;
    const bg = track(this.add.graphics().setDepth(D));
    bg.fillStyle(0x05051E, 0.97);
    bg.fillRoundedRect(24, cY, W - 48, cH, 16);
    bg.lineStyle(2, 0xFFD700, 0.60);
    bg.strokeRoundedRect(24, cY, W - 48, cH, 16);
    bg.fillStyle(0xFFFFFF, 0.04);
    bg.fillRoundedRect(24, cY, W - 48, 42, 16);

    track(this.add.text(W / 2, cY + 26, 'Welcome Back! 🏰', {
      fontSize: '20px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D + 1));

    track(this.add.text(W / 2, cY + 68, 'Your kingdom produced coins\nwhile you were away:', {
      fontSize: '12px', fontFamily: 'Arial', color: '#AABBCC',
      align: 'center', wordWrap: { width: W - 80 },
    }).setOrigin(0.5).setDepth(D + 1));

    track(this.add.text(W / 2, cY + 118, `+${earned.toLocaleString()}`, {
      fontSize: '40px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(D + 1));

    track(this.add.text(W / 2, cY + 152, '💰 coins', {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(D + 1));

    const rate = GameState.passiveRatePerHour();
    if (rate > 0) {
      track(this.add.text(W / 2, cY + 175, `${rate.toLocaleString()} coins/hr passive income`, {
        fontSize: '10px', fontFamily: 'Arial', color: '#445566',
      }).setOrigin(0.5).setDepth(D + 1));
    }

    const btnY = cY + cH - 28;
    const btnG = track(this.add.graphics().setDepth(D + 1));
    btnG.fillStyle(0x1A7A3A, 1); btnG.fillRoundedRect(W / 2 - 92, btnY - 20, 184, 40, 10);
    btnG.fillStyle(0x27AE60, 1); btnG.fillRoundedRect(W / 2 - 92, btnY - 20, 184, 26, 10);
    btnG.lineStyle(2, 0x2ECC71, 0.9); btnG.strokeRoundedRect(W / 2 - 92, btnY - 20, 184, 40, 10);

    track(this.add.text(W / 2, btnY, 'Collect! 💰', {
      fontSize: '19px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#0A4A20', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D + 2));

    track(this.add.rectangle(W / 2, btnY, 184, 40, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D + 3)
      .on('pointerdown', () => {
        flyingCoins(this, W / 2, H * 0.52, this.coinIconX, this.coinIconY, 10);
        close();
        this.updateHUD();
      }));
  }

  // ─── RANK UP CEREMONY ─────────────────────────────────────────────────────

  _showRankUpOverlay(rankDef) {
    const W = this.scale.width;
    const H = this.scale.height;
    const D = 50;
    const overlay = [];
    const track   = o => { overlay.push(o); return o; };
    const dismiss = () => {
      this.tweens.add({
        targets: overlay, alpha: 0, duration: 400,
        onComplete: () => overlay.forEach(o => o.destroy()),
      });
    };

    track(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88).setDepth(D));

    const glowG = track(this.add.graphics().setDepth(D));
    glowG.fillStyle(0xFFD700, 0.06); glowG.fillCircle(W / 2, H * 0.42, 190);
    glowG.fillStyle(0xFFD700, 0.03); glowG.fillCircle(W / 2, H * 0.42, 270);

    const mainTitle = track(this.add.text(W / 2, H * 0.28, 'RANK UP!', {
      fontSize: '54px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setScale(0.1).setDepth(D + 1));
    this.tweens.add({ targets: mainTitle, scaleX: 1, scaleY: 1, duration: 400, ease: 'Back.easeOut' });

    const rCol    = rankDef.color;
    const rColHex = `#${rCol.toString(16).padStart(6, '0')}`;

    const shieldG = track(this.add.graphics().setDepth(D + 1).setAlpha(0));
    shieldG.fillStyle(rCol, 0.15); shieldG.fillCircle(W / 2, H * 0.45, 68);
    shieldG.lineStyle(3, rCol, 0.80); shieldG.strokeCircle(W / 2, H * 0.45, 68);
    this.tweens.add({ targets: shieldG, alpha: 1, duration: 350, delay: 200 });

    const titleTxt = track(this.add.text(W / 2, H * 0.45, rankDef.title, {
      fontSize: '36px', fontFamily: 'Arial Black',
      color: rColHex, stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setDepth(D + 2));
    this.tweens.add({ targets: titleTxt, alpha: 1, duration: 400, delay: 240 });

    const subtxt = track(this.add.text(W / 2, H * 0.57, 'You have earned a new rank!', {
      fontSize: '14px', fontFamily: 'Arial', color: '#AABBCC',
    }).setOrigin(0.5).setAlpha(0).setDepth(D + 1));
    this.tweens.add({ targets: subtxt, alpha: 1, duration: 400, delay: 320 });

    audioSystem.rankUp();
    burstParticles(this, W / 2, H * 0.42, [rCol, 0xFFD700, 0xFFFFFF, 0xFF8C00], 42);
    screenShake(this, 0.013, 420);

    const hintTxt = track(this.add.text(W / 2, H * 0.73, 'Tap to continue', {
      fontSize: '13px', fontFamily: 'Arial', color: '#445566',
    }).setOrigin(0.5).setAlpha(0).setDepth(D + 1));
    this.tweens.add({ targets: hintTxt, alpha: 1, duration: 500, delay: 900 });
    this.time.delayedCall(1400, () => {
      this.tweens.add({ targets: hintTxt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    const hitArea = track(this.add.rectangle(W / 2, H / 2, W, H, 0, 0)
      .setInteractive().setDepth(D + 3).on('pointerdown', dismiss));
    this.time.delayedCall(4500, () => { if (hitArea.active) dismiss(); });
  }

  // ─── VILLAGE COMPLETE ─────────────────────────────────────────────────────

  _showVillageComplete() {
    const W = this.scale.width;
    const H = this.scale.height;
    const D = 45;
    const currentVillage = GameState.village;
    const bonusSpins = 25 + (currentVillage - 1) * 10;
    const bonusCoins = 1500 * currentVillage;

    const overlay = [];
    const track   = o => { overlay.push(o); return o; };
    let   claimed = false;

    const claim = () => {
      if (claimed) return;
      claimed = true;
      this._villageCompleteShowing = false;
      GameState.nextVillage();
      GameState.addSpins(bonusSpins);
      GameState.addCoins(bonusCoins);
      this.refreshKingdom();
      this.updateHUD();
      goldRain(this, W, H);
      this.tweens.add({
        targets: overlay, alpha: 0, duration: 500,
        onComplete: () => overlay.forEach(o => o.destroy()),
      });
      if (currentVillage % 5 === 0) {
        this.time.delayedCall(1200, () => this._launchBossFight(currentVillage));
      } else {
        adService.showInterstitial();
      }
    };

    track(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88).setDepth(D));

    const glowG = track(this.add.graphics().setDepth(D));
    glowG.fillStyle(0xFFD700, 0.07); glowG.fillCircle(W / 2, H * 0.36, 200);

    const mainTxt = track(this.add.text(W / 2, H * 0.20, '🎉 VILLAGE', {
      fontSize: '44px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 7,
    }).setOrigin(0.5).setScale(0.1).setDepth(D + 1));

    const compTxt = track(this.add.text(W / 2, H * 0.31, 'COMPLETE!', {
      fontSize: '44px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 7,
    }).setOrigin(0.5).setScale(0.1).setDepth(D + 1));
    this.tweens.add({ targets: [mainTxt, compTxt], scaleX: 1, scaleY: 1, duration: 420, ease: 'Back.easeOut' });

    const transitionTxt = track(this.add.text(W / 2, H * 0.42,
      `Village ${currentVillage} → Village ${currentVillage + 1}`, {
        fontSize: '17px', fontFamily: 'Arial', color: '#AABBCC',
      }).setOrigin(0.5).setAlpha(0).setDepth(D + 1));
    this.tweens.add({ targets: transitionTxt, alpha: 1, duration: 400, delay: 300 });

    // Reward card
    const rwdG = track(this.add.graphics().setDepth(D + 1).setAlpha(0));
    const rwdY = H * 0.54;
    rwdG.fillStyle(0x0A0A22, 0.88); rwdG.fillRoundedRect(W / 2 - 130, rwdY - 32, 260, 70, 12);
    rwdG.lineStyle(2, 0xFFD700, 0.45); rwdG.strokeRoundedRect(W / 2 - 130, rwdY - 32, 260, 70, 12);
    this.tweens.add({ targets: rwdG, alpha: 1, duration: 400, delay: 360 });

    const coinsRwdTxt = track(this.add.text(W / 2 - 44, rwdY,
      `💰 +${bonusCoins.toLocaleString()}`, {
        fontSize: '18px', fontFamily: 'Arial Black',
        color: '#FFD700', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setAlpha(0).setDepth(D + 2));
    this.tweens.add({ targets: coinsRwdTxt, alpha: 1, duration: 400, delay: 400 });

    const spinsRwdTxt = track(this.add.text(W / 2 + 60, rwdY,
      `🎰 +${bonusSpins}`, {
        fontSize: '18px', fontFamily: 'Arial Black',
        color: '#2ECC71', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setAlpha(0).setDepth(D + 2));
    this.tweens.add({ targets: spinsRwdTxt, alpha: 1, duration: 400, delay: 430 });

    const rwdLblTxt = track(this.add.text(W / 2, rwdY + 22, 'Bonus Reward!', {
      fontSize: '11px', fontFamily: 'Arial', color: '#445566',
    }).setOrigin(0.5).setAlpha(0).setDepth(D + 2));
    this.tweens.add({ targets: rwdLblTxt, alpha: 1, duration: 400, delay: 430 });

    // Build button
    const btnY = H * 0.76;
    const btnG = track(this.add.graphics().setDepth(D + 1));
    btnG.fillStyle(0x7B2D00, 1); btnG.fillRoundedRect(W / 2 - 120, btnY - 28, 240, 56, 14);
    btnG.fillStyle(0xE67E22, 1); btnG.fillRoundedRect(W / 2 - 120, btnY - 28, 240, 40, 14);
    btnG.fillStyle(0xF5A623, 0.50); btnG.fillRoundedRect(W / 2 - 116, btnY - 24, 232, 18, 10);
    btnG.lineStyle(2.5, 0xFFD700, 0.90); btnG.strokeRoundedRect(W / 2 - 120, btnY - 28, 240, 56, 14);

    track(this.add.text(W / 2, btnY, `Build Village ${currentVillage + 1}!`, {
      fontSize: '22px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#7B2D00', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(D + 2));

    track(this.add.rectangle(W / 2, btnY, 240, 56, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D + 3)
      .on('pointerdown', claim));

    audioSystem.villageComplete();
    burstParticles(this, W / 2, H * 0.34, [0xFFD700, 0xFF8C00, 0xFFFFFF, 0x2ECC71], 48);
    screenShake(this, 0.015, 450);
  }

  _launchBossFight(village) {
    this.cameras.main.fadeOut(320, 0, 0, 0);
    this.time.delayedCall(330, () => {
      this.scene.sleep('GameScene');
      this.scene.launch('BossScene', { village });
    });
  }

  // ─── DAILY LOGIN STREAK ───────────────────────────────────────────────────

  _showLoginStreakModal(bonusInfo, afterCallback = null) {
    const W = this.scale.width;
    const H = this.scale.height;
    const D = 42;
    const overlay  = [];
    const track    = o => { overlay.push(o); return o; };
    let   dismissed = false;

    const close = () => {
      if (dismissed) return;
      dismissed = true;
      this.tweens.add({
        targets: overlay, alpha: 0, duration: 300,
        onComplete: () => {
          overlay.forEach(o => o.destroy());
          afterCallback?.();
        },
      });
    };

    track(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.84).setDepth(D));

    const cY = H * 0.26;
    const cH = 378;
    const bg = track(this.add.graphics().setDepth(D));
    bg.fillStyle(0x05051E, 0.97);
    bg.fillRoundedRect(20, cY, W - 40, cH, 16);
    bg.lineStyle(2, 0xFFD700, 0.65);
    bg.strokeRoundedRect(20, cY, W - 40, cH, 16);
    bg.fillStyle(0xFFFFFF, 0.04);
    bg.fillRoundedRect(20, cY, W - 40, 44, 16);

    track(this.add.text(W / 2, cY + 26, `🔥 Day ${bonusInfo.streak} Login Streak!`, {
      fontSize: '20px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D + 1));

    // 7-day dot row
    const dotY   = cY + 70;
    const dotSpan = W - 80;
    const dotGap  = dotSpan / 7;
    for (let d = 1; d <= 7; d++) {
      const dx    = 40 + (d - 1) * dotGap + dotGap / 2;
      const past  = d < bonusInfo.streak;
      const today = d === bonusInfo.streak;
      const dotG  = track(this.add.graphics().setDepth(D + 1));
      const col   = today ? 0xFFD700 : past ? 0xD4A017 : 0x1A2244;
      const a     = today ? 1.0 : past ? 0.80 : 0.55;
      dotG.fillStyle(col, a);
      dotG.fillCircle(dx, dotY, today ? 13 : 9);
      if (today) {
        dotG.lineStyle(2.5, 0xFFFFFF, 0.55);
        dotG.strokeCircle(dx, dotY, 13);
      }
      track(this.add.text(dx, dotY, String(d), {
        fontSize: today ? '11px' : '9px', fontFamily: 'Arial Black',
        color: today ? '#000000' : past ? '#FFFFFF' : '#334466',
      }).setOrigin(0.5).setDepth(D + 2));
    }

    track(this.add.text(W / 2, cY + 106, "TODAY'S REWARD", {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#445566',
    }).setOrigin(0.5).setDepth(D + 1));

    track(this.add.text(W / 2, cY + 158, bonusInfo.dayDef.icon, {
      fontSize: '52px',
    }).setOrigin(0.5).setDepth(D + 1));

    track(this.add.text(W / 2, cY + 218, bonusInfo.dayDef.label, {
      fontSize: '22px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setDepth(D + 1));

    // Claim button
    const btnY = cY + cH - 30;
    const btnG = track(this.add.graphics().setDepth(D + 1));
    btnG.fillStyle(0x7A5800, 1); btnG.fillRoundedRect(W / 2 - 100, btnY - 22, 200, 44, 12);
    btnG.fillStyle(0xD4A017, 1); btnG.fillRoundedRect(W / 2 - 100, btnY - 22, 200, 30, 12);
    btnG.lineStyle(2, 0xFFD700, 0.95); btnG.strokeRoundedRect(W / 2 - 100, btnY - 22, 200, 44, 12);
    btnG.fillStyle(0xFFF5CC, 0.30); btnG.fillRoundedRect(W / 2 - 96, btnY - 18, 192, 12, 8);

    track(this.add.text(W / 2, btnY, 'CLAIM REWARD!', {
      fontSize: '20px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#5C3D00', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D + 2));

    const claimReward = () => {
      const r = bonusInfo.reward;
      if (r.spins)  GameState.addSpins(r.spins);
      if (r.coins)  GameState.addCoins(r.coins);
      if (r.shield) GameState.addShield();
      if (r.chest)  GameState.addChest(r.chest);
      burstParticles(this, W / 2, H * 0.52, [0xFFD700, 0xFF8C00, 0xFFFFFF], 22);
      close();
      this.updateHUD();
    };

    track(this.add.rectangle(W / 2, btnY, 200, 44, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D + 3)
      .on('pointerdown', claimReward));

    // "Double It" ad button
    const adY  = btnY + 56;
    const adG  = track(this.add.graphics().setDepth(D + 1));
    adG.fillStyle(0x004400, 1); adG.fillRoundedRect(W / 2 - 94, adY - 18, 188, 36, 9);
    adG.fillStyle(0x22AA44, 1); adG.fillRoundedRect(W / 2 - 94, adY - 18, 188, 24, 9);
    adG.lineStyle(1.5, 0x44FF88, 0.70); adG.strokeRoundedRect(W / 2 - 94, adY - 18, 188, 36, 9);

    track(this.add.text(W / 2, adY, '📺  Watch Ad → Double It!', {
      fontSize: '12px', fontFamily: 'Arial Black',
      color: '#CCFFCC', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(D + 2));

    track(this.add.rectangle(W / 2, adY, 188, 36, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D + 3)
      .on('pointerdown', () => {
        // Simulated ad — double the reward on completion
        const r = bonusInfo.reward;
        if (r.spins)  GameState.addSpins(r.spins * 2);
        if (r.coins)  GameState.addCoins(r.coins * 2);
        if (r.shield) { GameState.addShield(); GameState.addShield(); }
        if (r.chest)  { GameState.addChest(r.chest); GameState.addChest(r.chest); }
        burstParticles(this, W / 2, H * 0.48, [0x44FF88, 0xFFD700, 0xFFFFFF], 32);
        close();
        this.updateHUD();
      }));

    this.time.delayedCall(10000, close);
  }

  // ─── FIRST-TIME TUTORIAL ──────────────────────────────────────────────────

  _showFirstTimeTutorial(W, H) {
    if (localStorage.getItem('tutStep') === 'done') return;

    const D       = 5;
    const arrowY  = H * 0.875 - 90;

    const hint = this.add.text(W / 2, arrowY, 'Tap SPIN to play!', {
      fontSize: '16px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D);

    const arrow = this.add.text(W / 2, arrowY + 32, '👆', { fontSize: '28px' })
      .setOrigin(0.5).setDepth(D);

    this._tutObjects = [hint, arrow];

    this.tweens.add({
      targets: arrow, y: arrowY + 44,
      duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _dismissTutorial() {
    if (!this._tutObjects) return;
    this._tutObjects.forEach(o => o.destroy());
    this._tutObjects = null;
    localStorage.setItem('tutStep', 'done');
  }

  // ─── RANK AWARD ───────────────────────────────────────────────────────────

  _rankAward(action, mult = 1) {
    const result = this.rankSystem.award(action, mult);
    this.updateXPBar();
    if (result?.rankUp) this._showRankUpOverlay(result.def);
  }

  // ─── OPENING SEQUENCE ────────────────────────────────────────────────────

  _playOpeningSequence() {
    this.cameras.main.setZoom(1.5);
    this.cameras.main.zoomTo(1.0, 700, 'Cubic.easeOut');
  }

  // ─── LUCKY SPIN BOOST ────────────────────────────────────────────────────

  _initLuckyBoost() {
    const COOLDOWN = 60 * 60 * 1000; // 1 hour
    const usedAt   = parseInt(localStorage.getItem('luckyBoostAt') || '0');
    if (Date.now() - usedAt < COOLDOWN) return;
    if (this.spinSystem.isSpinning) return;
    // Wait for the rival-attack banner to clear before stacking another top-banner
    if (this._rivalBannerOverlay?.length > 0) {
      this.time.delayedCall(5000, () => this._initLuckyBoost());
      return;
    }
    this._showLuckyBoostBanner();
  }

  _showLuckyBoostBanner() {
    const { width: W } = this.scale;
    const D    = 35;
    const h    = 82;
    const FY   = 8;
    const OFF  = -h - 10;

    this._luckyBannerObjs?.forEach(o => o.destroy());
    this._luckyBannerObjs = [];
    const track = o => { this._luckyBannerObjs.push(o); return o; };

    const panelG = track(this.add.graphics().setDepth(D));
    panelG.fillStyle(0x1A0040, 0.96);
    panelG.fillRoundedRect(8, FY, W - 16, h, 12);
    panelG.fillStyle(0xFFD700, 0.07);
    panelG.fillRoundedRect(8, FY, W - 16, 32, 12);
    panelG.lineStyle(2, 0xFFD700, 0.75);
    panelG.strokeRoundedRect(8, FY, W - 16, h, 12);
    panelG.y = OFF; this.tweens.add({ targets: panelG, y: 0, duration: 420, ease: 'Back.easeOut' });

    const title = track(this.add.text(W / 2, FY + OFF + 22, '⚡  LUCKY SPIN BOOST  ⚡', {
      fontSize: '14px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D + 1));
    this.tweens.add({ targets: title, y: title.y - OFF, duration: 420, ease: 'Back.easeOut' });

    const sub = track(this.add.text(W / 2, FY + OFF + 42, 'Double jackpot chance for 30 seconds!', {
      fontSize: '11px', fontFamily: 'Arial', color: '#BB99FF',
    }).setOrigin(0.5).setDepth(D + 1));
    this.tweens.add({ targets: sub, y: sub.y - OFF, duration: 420, ease: 'Back.easeOut' });

    // ACTIVATE button
    const activateBg = track(this.add.graphics().setDepth(D + 1));
    activateBg.fillStyle(0x5A1A9A, 1); activateBg.fillRoundedRect(W / 2 - 60, FY + 54, 120, 26, 7);
    activateBg.fillStyle(0x8B2FCC, 1); activateBg.fillRoundedRect(W / 2 - 60, FY + 54, 120, 17, 7);
    activateBg.lineStyle(1.5, 0xBB66FF, 0.80); activateBg.strokeRoundedRect(W / 2 - 60, FY + 54, 120, 26, 7);
    activateBg.y = OFF; this.tweens.add({ targets: activateBg, y: 0, duration: 420, ease: 'Back.easeOut' });

    const activateTxt = track(this.add.text(W / 2, FY + OFF + 67, 'ACTIVATE!', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#FFFFFF',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(D + 2));
    this.tweens.add({ targets: activateTxt, y: activateTxt.y - OFF, duration: 420, ease: 'Back.easeOut' });

    // Dismiss ✕
    const dismissTxt = track(this.add.text(W - 26, FY + OFF + 18, '✕', {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#554466',
    }).setOrigin(0.5).setDepth(D + 2));
    this.tweens.add({ targets: dismissTxt, y: dismissTxt.y - OFF, duration: 420, ease: 'Back.easeOut' });

    const dismissBanner = () => {
      this.tweens.add({
        targets: this._luckyBannerObjs, alpha: 0, duration: 220,
        onComplete: () => { this._luckyBannerObjs?.forEach(o => o.destroy()); this._luckyBannerObjs = []; },
      });
    };

    // Hit zones — start off-screen (same offset as visuals) then slide to final position
    const actHit = track(this.add.rectangle(W / 2, FY + OFF + 67, 120, 26, 0, 0)
      .setDepth(D + 3).setInteractive({ useHandCursor: true }));
    this.tweens.add({ targets: actHit, y: actHit.y - OFF, duration: 420, ease: 'Back.easeOut' });
    actHit.on('pointerdown', () => {
      dismissBanner();
      this.time.delayedCall(240, () => this._activateLuckyBoost());
    });

    const xHit = track(this.add.rectangle(W - 26, FY + OFF + 18, 30, 30, 0, 0)
      .setDepth(D + 3).setInteractive({ useHandCursor: true }));
    this.tweens.add({ targets: xHit, y: xHit.y - OFF, duration: 420, ease: 'Back.easeOut' });
    xHit.on('pointerdown', dismissBanner);

    // Auto-dismiss after 12 s
    this.time.delayedCall(12000, dismissBanner);
  }

  _activateLuckyBoost() {
    localStorage.setItem('luckyBoostAt', String(Date.now()));
    this.spinSystem.setJackpotBoost('jackpot', 2);

    const { width: W, height: H } = this.scale;
    const DURATION = 30;

    // Countdown badge anchored near wheel
    const badgeG = this.add.graphics().setDepth(20);
    const badgeTxt = this.add.text(this.wheelCx, this.wheelCy - this.wheelR - 30, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#FFD700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21);

    let secsLeft = DURATION;
    const drawBadge = () => {
      badgeG.clear();
      badgeG.fillStyle(0x1A0040, 0.85);
      badgeG.fillRoundedRect(this.wheelCx - 60, this.wheelCy - this.wheelR - 42, 120, 22, 7);
      badgeG.lineStyle(1.5, 0xBB66FF, 0.70);
      badgeG.strokeRoundedRect(this.wheelCx - 60, this.wheelCy - this.wheelR - 42, 120, 22, 7);
      badgeTxt.setText(`⚡ BOOST  ${secsLeft}s`);
    };
    drawBadge();

    const ticker = this.time.addEvent({
      delay: 1000, repeat: DURATION - 1,
      callback: () => { secsLeft--; drawBadge(); },
    });

    this.time.delayedCall(DURATION * 1000, () => {
      this.spinSystem.clearJackpotBoost();
      ticker.remove();
      this.tweens.add({
        targets: [badgeG, badgeTxt], alpha: 0, duration: 400,
        onComplete: () => { badgeG.destroy(); badgeTxt.destroy(); },
      });
      this.showResult('Boost ended!', '#BB66FF');
    });
  }

  // ─── CHIMNEY SMOKE ────────────────────────────────────────────────────────

  _startChimneySmoke() {
    this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        if (!this.buildingGraphics?.length) return;
        // Only smoke from buildings that are built (level > 0)
        const active = this.buildingGraphics.filter(
          b => (GameState.buildings[b.index] ?? 0) > 0
        );
        if (!active.length) return;
        const { x, groundY } = active[Phaser.Math.Between(0, active.length - 1)];
        // Building tops sit roughly 50-70px above groundY
        const puff = this.add.circle(
          x + Phaser.Math.Between(-5, 5),
          groundY - 58,
          Phaser.Math.Between(4, 8),
          0xCCCCCC,
          0.30,
        ).setDepth(1);

        this.tweens.add({
          targets: puff,
          y: puff.y - Phaser.Math.Between(28, 48),
          alpha: 0,
          scaleX: 2.2, scaleY: 2.2,
          duration: Phaser.Math.Between(1200, 1800),
          ease: 'Sine.easeOut',
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  // ─── HUD UPDATE ────────────────────────────────────────────────────────────

  updateHUD() {
    this.coinsText.setText(`${GameState.coins.toLocaleString()}`);
    this.spinsText.setText(`${GameState.spins}`);
    this.shieldText.setText(`${GameState.shields}`);
    this.setWatchAdVisible(GameState.spins === 0);
    this._refreshChestBadge();
    this.updateXPBar();

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
