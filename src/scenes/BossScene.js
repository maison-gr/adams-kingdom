import { SEGMENTS }              from '../constants/segments.js';
import { GameState }             from '../GameState.js';
import { audioSystem }           from '../effects/AudioSystem.js';
import { burstParticles, screenShake } from '../effects/juice.js';
import { adService }                   from '../services/AdService.js';

export class BossScene extends Phaser.Scene {
  constructor() { super('BossScene'); }

  init(data) {
    this._village      = data.village || 1;
    this._bossHp       = 200;
    this._bossMaxHp    = 200;
    this._attacksLeft  = 5;
    this._spinning     = false;
    this._blocked      = false;
    this._wheelAngle   = 0;
    this._segAngles    = [];
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this._drawDungeonBg(W, H);
    this._drawBoss(W, H);
    this._drawHpBar(W);
    this._drawAttacksCounter(W);
    this._drawWheel(W, H);
    this._drawSpinBtn(W, H);
    this._drawResultText(W, H);
    this._startTorchAnimation();

    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  // ─── BACKGROUND ────────────────────────────────────────────────────────────

  _drawDungeonBg(W, H) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050005, 0x050005, 0x150010, 0x150010, 1);
    bg.fillRect(0, 0, W, H);

    // Stone floor grid
    const floor = this.add.graphics();
    floor.lineStyle(1, 0x1A0A10, 0.5);
    for (let x = 0; x < W; x += 36) floor.lineBetween(x, H * 0.58, x, H);
    for (let y = Math.round(H * 0.58); y < H; y += 22) floor.lineBetween(0, y, W, y);

    // Chains on sides
    const chains = this.add.graphics();
    for (let y = 0; y < H * 0.55; y += 18) {
      chains.fillStyle(0x3A3A3A, 0.55);
      chains.fillEllipse(10, y, 9, 15);
      chains.fillEllipse(W - 10, y, 9, 15);
      chains.lineStyle(1, 0x555555, 0.3);
      chains.strokeEllipse(10, y, 9, 15);
      chains.strokeEllipse(W - 10, y, 9, 15);
    }

    // Torch brackets
    const brackets = this.add.graphics();
    brackets.fillStyle(0x222222, 1);
    brackets.fillRoundedRect(22, H * 0.30 + 18, 24, 10, 2);
    brackets.fillRoundedRect(W - 46, H * 0.30 + 18, 24, 10, 2);
    brackets.fillStyle(0x553300, 1);
    brackets.fillRect(30, H * 0.30 + 26, 10, 22);
    brackets.fillRect(W - 40, H * 0.30 + 26, 10, 22);

    this._ltx = 35;          this._lty = H * 0.30 + 22;
    this._rtx = W - 35;     this._rty = H * 0.30 + 22;
    this._ltFlame = this.add.graphics().setDepth(3);
    this._rtFlame = this.add.graphics().setDepth(3);
  }

  // ─── BOSS ──────────────────────────────────────────────────────────────────

  _drawBoss(W, H) {
    this.add.text(W / 2, H * 0.055, 'THE SHADOW KING', {
      fontSize: '19px', fontFamily: 'Arial Black',
      color: '#CC0000', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(5);

    const cx = W / 2;
    const cy = H * 0.285;

    this._bossG = this.add.graphics().setDepth(4);
    this._renderBoss(cx, cy);

    this._eye1 = this.add.circle(cx - 14, cy - 18, 6, 0xFF0000, 1).setDepth(6);
    this._eye2 = this.add.circle(cx + 14, cy - 18, 6, 0xFF0000, 1).setDepth(6);
    this.tweens.add({
      targets: [this._eye1, this._eye2],
      alpha: 0.25, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    this._bossCX = cx;
    this._bossCY = cy;
  }

  _renderBoss(cx, cy) {
    const g = this._bossG;
    g.clear();

    // Cape
    g.fillStyle(0x1A001E, 1);
    g.fillTriangle(cx - 52, cy + 62, cx + 52, cy + 62, cx, cy - 38);

    // Body
    g.fillStyle(0x0D0018, 1);
    g.fillRoundedRect(cx - 36, cy - 8, 72, 68, 5);

    // Head
    g.fillStyle(0x0D0018, 1);
    g.fillCircle(cx, cy - 24, 36);

    // Crown base
    g.fillStyle(0x880000, 1);
    g.fillRect(cx - 36, cy - 54, 72, 10);

    // Crown spikes
    g.fillStyle(0xAA0000, 1);
    [-28, -14, 0, 14, 28].forEach(ox => {
      g.fillTriangle(cx + ox - 7, cy - 54, cx + ox + 7, cy - 54, cx + ox, cy - 74);
    });
    g.fillStyle(0xFFD700, 0.6);
    [-28, -14, 0, 14, 28].forEach(ox => {
      g.fillCircle(cx + ox, cy - 54, 3);
    });

    // Left shield arm
    g.fillStyle(0x3A1A08, 1);
    g.fillRoundedRect(cx - 64, cy - 4, 20, 36, 4);
    g.lineStyle(1.5, 0x664422, 0.9);
    g.strokeRoundedRect(cx - 64, cy - 4, 20, 36, 4);
    g.fillStyle(0xAA3300, 1);
    g.fillCircle(cx - 54, cy + 14, 5);

    // Right sword arm
    g.fillStyle(0x8899AA, 1);
    g.fillRect(cx + 36, cy - 4, 4, 52);  // blade
    g.fillRect(cx + 26, cy - 6, 24, 7);  // crossguard
    g.fillStyle(0xFFCC00, 1);
    g.fillCircle(cx + 38, cy - 7, 4);    // pommel
  }

  // ─── HP BAR ────────────────────────────────────────────────────────────────

  _drawHpBar(W) {
    const panelG = this.add.graphics().setDepth(4);
    panelG.fillStyle(0x0A0A16, 0.92);
    panelG.fillRoundedRect(W * 0.08, 72, W * 0.84, 42, 8);
    panelG.lineStyle(1.5, 0x880000, 0.75);
    panelG.strokeRoundedRect(W * 0.08, 72, W * 0.84, 42, 8);

    const bgG = this.add.graphics().setDepth(4);
    bgG.fillStyle(0x220000, 1);
    bgG.fillRoundedRect(W * 0.08 + 8, 80, W * 0.84 - 16, 22, 5);

    this._hpFillG  = this.add.graphics().setDepth(5);
    this._hpLbl    = this.add.text(W / 2, 91, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(6);

    this._hpBarX = W * 0.08 + 8;
    this._hpBarW = W * 0.84 - 16;
    this._updateHpBar();
  }

  _updateHpBar() {
    const pct  = Math.max(0, this._bossHp / this._bossMaxHp);
    const fill = Math.max(0, this._hpBarW * pct);
    this._hpFillG.clear();
    if (fill > 0) {
      const col = pct > 0.5 ? 0xCC0000 : pct > 0.25 ? 0xFF4400 : 0xFF0000;
      this._hpFillG.fillStyle(col, 1);
      this._hpFillG.fillRoundedRect(this._hpBarX, 80, fill, 22, 5);
    }
    this._hpLbl.setText(`${Math.max(0, this._bossHp)} / ${this._bossMaxHp} HP`);
  }

  // ─── ATTACKS COUNTER ───────────────────────────────────────────────────────

  _drawAttacksCounter(W) {
    this._atkTxt = this.add.text(W / 2, 122, '', {
      fontSize: '13px', fontFamily: 'Arial Black',
      color: '#FFAA44', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);
    this._updateAtkTxt();
  }

  _updateAtkTxt() {
    this._atkTxt.setText(`⚔️  Attacks remaining: ${this._attacksLeft}`);
  }

  // ─── WHEEL ─────────────────────────────────────────────────────────────────

  _drawWheel(W, H) {
    const cx = W / 2;
    const cy = H * 0.665;
    const r  = Math.min(W * 0.44, 110);

    this._cx = cx; this._cy = cy; this._r = r;

    const container = this.add.container(cx, cy).setDepth(10);
    const wg = this.add.graphics();

    const totalW = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
    let angle = -Math.PI / 2;

    SEGMENTS.forEach(seg => {
      const arc = (seg.weight / totalW) * Math.PI * 2;
      const mid = angle + arc / 2;

      wg.fillStyle(seg.color, 1);
      wg.slice(0, 0, r, angle, angle + arc, false);
      wg.fillPath();

      wg.fillStyle(seg.light, 0.10);
      wg.slice(0, 0, r * 0.96, angle + 0.03, angle + arc - 0.03, false);
      wg.fillPath();

      // Radial divider
      wg.lineStyle(1.2, 0x000000, 0.55);
      wg.lineBetween(0, 0, Math.cos(angle) * r, Math.sin(angle) * r);

      // Label
      const lx = Math.cos(mid) * r * 0.66;
      const ly = Math.sin(mid) * r * 0.66;
      const rotateDeg = Phaser.Math.RadToDeg(mid) + 90;
      seg.label.split('\n').forEach((line, li, arr) => {
        const off = (li - (arr.length - 1) / 2) * 10;
        const t = this.add.text(
          lx + Math.cos(mid) * off,
          ly + Math.sin(mid) * off,
          line,
          { fontSize: '7px', fontFamily: 'Arial Black', color: '#FFFFFF', stroke: '#000', strokeThickness: 2 }
        ).setOrigin(0.5).setAngle(rotateDeg);
        container.add(t);
      });

      this._segAngles.push({ seg, mid, start: angle, end: angle + arc });
      angle += arc;
    });

    // Outer rings
    wg.lineStyle(3, 0x880000, 0.9);
    wg.strokeCircle(0, 0, r);
    wg.lineStyle(1, 0xCC2200, 0.35);
    wg.strokeCircle(0, 0, r + 5);

    // Center cap
    wg.fillStyle(0x0D0014, 1);
    wg.fillCircle(0, 0, r * 0.13);
    wg.lineStyle(2, 0x660000, 0.8);
    wg.strokeCircle(0, 0, r * 0.13);

    container.addAt(wg, 0);
    this._wheel = container;

    // Pointer
    const ptr = this.add.graphics().setDepth(12);
    ptr.fillStyle(0xFFD700, 1);
    ptr.fillTriangle(cx, cy - r - 4, cx - 9, cy - r - 20, cx + 9, cy - r - 20);
    ptr.lineStyle(1.5, 0xAA7700, 1);
    ptr.strokeTriangle(cx, cy - r - 4, cx - 9, cy - r - 20, cx + 9, cy - r - 20);
  }

  // ─── SPIN BUTTON ───────────────────────────────────────────────────────────

  _drawSpinBtn(W, H) {
    const bx = W / 2;
    const by = H * 0.925;

    this._btnG = this.add.graphics().setDepth(12);
    this._redrawBtn(bx, by, false);

    this._btnTxt = this.add.text(bx, by, '⚔️  ATTACK!', {
      fontSize: '22px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#6B0000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(13);

    this._btnHit = this.add.rectangle(bx, by, 240, 56, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(14)
      .on('pointerdown',  () => this._doSpin())
      .on('pointerover',  () => this._redrawBtn(bx, by, true))
      .on('pointerout',   () => this._redrawBtn(bx, by, false));
  }

  _redrawBtn(bx, by, hover) {
    const g = this._btnG;
    g.clear();
    g.fillStyle(0x6B0000, 1); g.fillRoundedRect(bx - 120, by - 28, 240, 56, 16);
    g.fillStyle(hover ? 0xFF2200 : 0xCC1A00, 1); g.fillRoundedRect(bx - 120, by - 28, 240, 40, 16);
    g.fillStyle(0xFF4400, 0.30); g.fillRoundedRect(bx - 116, by - 24, 232, 18, 12);
    g.lineStyle(2.5, hover ? 0xFF8800 : 0xFF4400, 0.85);
    g.strokeRoundedRect(bx - 120, by - 28, 240, 56, 16);
  }

  // ─── RESULT TEXT ───────────────────────────────────────────────────────────

  _drawResultText(W, H) {
    this._resultTxt = this.add.text(W / 2, H * 0.802, '', {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#FFAA44', stroke: '#000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(12);
  }

  // ─── TORCH ANIMATION ───────────────────────────────────────────────────────

  _startTorchAnimation() {
    let f = 0;
    this.time.addEvent({
      delay: 110, loop: true, callback: () => {
        f++;
        this._flickerTorch(this._ltFlame, this._ltx, this._lty, f);
        this._flickerTorch(this._rtFlame, this._rtx, this._rty, f);
      },
    });
  }

  _flickerTorch(g, cx, ty, f) {
    g.clear();
    const j = Math.sin(f * 1.1) * 3.5;
    g.fillStyle(0xFF8800, 0.88); g.fillEllipse(cx, ty - 5 + j * 0.3, 13, 18 + j);
    g.fillStyle(0xFFEE00, 0.65); g.fillEllipse(cx, ty - 9 + j * 0.5, 7, 12 + j * 0.5);
    g.fillStyle(0xFFFFFF, 0.20); g.fillEllipse(cx, ty - 13 + j, 3.5, 6);
  }

  // ─── SPIN LOGIC ────────────────────────────────────────────────────────────

  _doSpin() {
    if (this._spinning || this._attacksLeft <= 0) return;
    this._spinning = true;
    this._btnHit.disableInteractive();
    this._resultTxt.setText('');

    // Weighted pick
    const totalW = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
    let rand = Math.random() * totalW;
    let picked = 0;
    for (let i = 0; i < SEGMENTS.length; i++) {
      rand -= SEGMENTS[i].weight;
      if (rand <= 0) { picked = i; break; }
    }
    const { seg, mid } = this._segAngles[picked];

    // Calculate target rotation to land segment at top (−90°)
    const segDeg   = Phaser.Math.RadToDeg(mid);
    const needed   = ((-90 - segDeg) % 360 + 360) % 360;
    const currNorm = ((this._wheelAngle % 360) + 360) % 360;
    let   diff     = needed - currNorm;
    if (diff <= 0) diff += 360;
    const spins = (4 + Math.floor(Math.random() * 4)) * 360;
    const target = this._wheelAngle + diff + spins;

    audioSystem.spinLaunch();

    this.tweens.add({
      targets: this._wheel,
      angle: target,
      duration: 3600,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this._wheelAngle = target;
        audioSystem.wheelStop();
        this.time.delayedCall(220, () => this._applyResult(seg));
      },
    });
  }

  _applyResult(seg) {
    let damage = 0;
    let msg    = '';
    let isCrit = false;

    switch (seg.type) {
      case 'coins': {
        damage = Math.round(seg.value / 20);
        GameState.addCoins(seg.value);
        msg = `💰 +${seg.value.toLocaleString()} coins  |  ⚔️ ${damage} DMG`;
        audioSystem.coin();
        break;
      }
      case 'attack':
        damage = 60;
        msg    = `⚔️  SUPER ATTACK! ${damage} DMG`;
        audioSystem.attack();
        break;
      case 'jackpot':
        damage = 120;
        isCrit = true;
        msg    = `💥 CRITICAL HIT! ${damage} DMG!`;
        audioSystem.jackpot();
        screenShake(this, 0.025, 500);
        burstParticles(this, this._bossCX, this._bossCY, [0xFF0000, 0xFF6600, 0xFFFF00], 28);
        break;
      case 'shield':
        this._blocked = true;
        msg = `🛡️  SHIELD! Boss can't counterattack`;
        audioSystem.shield();
        break;
      case 'spin':
        damage = 25;
        this._attacksLeft++;
        msg = `🎰 FREE ATTACK GAINED!  |  ${damage} DMG`;
        audioSystem.spin();
        break;
      case 'chest': {
        damage = 30;
        const loot = 200 + Math.floor(Math.random() * 300);
        GameState.addCoins(loot);
        msg = `🎁 CHEST LOOTED! +${loot}  |  ${damage} DMG`;
        audioSystem.chest();
        break;
      }
      case 'raid': {
        damage = 45;
        const gold = 300 + Math.floor(Math.random() * 200);
        GameState.addCoins(gold);
        msg = `💀 RAIDED TREASURY! +${gold}  |  ${damage} DMG`;
        audioSystem.raid();
        break;
      }
      default:
        damage = 20;
        msg = `${damage} DMG`;
    }

    this._bossHp = Math.max(0, this._bossHp - damage);
    this._attacksLeft--;
    this._updateHpBar();
    this._updateAtkTxt();
    this._resultTxt.setText(msg).setColor(isCrit ? '#FF3300' : '#FFAA44');

    if (damage > 0) {
      this._floatDamage(damage, isCrit);
      this.tweens.add({
        targets: this._bossG, x: this._bossG.x + 8,
        duration: 70, yoyo: true, repeat: 3,
      });
    }

    if (this._bossHp <= 0) {
      this.time.delayedCall(700, () => this._victory());
      return;
    }

    // 30% boss counterattack unless player has shield
    if (!this._blocked && Math.random() < 0.30) {
      this.time.delayedCall(1100, () => this._bossStrike());
    } else {
      this._blocked = false;
      this.time.delayedCall(1100, () => this._afterAction());
    }
  }

  _floatDamage(dmg, isCrit) {
    const t = this.add.text(this._bossCX, this._bossCY - 30, `-${dmg}`, {
      fontSize: isCrit ? '42px' : '28px', fontFamily: 'Arial Black',
      color: isCrit ? '#FF2200' : '#FF7700', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: t, y: this._bossCY - 90, alpha: 0, duration: 1100, ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  _bossStrike() {
    const W = this.scale.width;
    const H = this.scale.height;
    const stolen = 80 + Math.floor(Math.random() * 121);
    GameState.addCoins(-stolen);
    audioSystem.attack();
    screenShake(this, 0.018, 300);

    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xFF0000, 0.32).setDepth(30);
    this.tweens.add({ targets: flash, alpha: 0, duration: 380, onComplete: () => flash.destroy() });

    const msg = this.add.text(W / 2, H * 0.50, `👁  BOSS STRIKES!\n−${stolen} coins`, {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#FF2200',
      stroke: '#000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setDepth(31).setAlpha(0);

    this.tweens.add({
      targets: msg, alpha: 1, duration: 180, yoyo: true, hold: 750,
      onComplete: () => { msg.destroy(); this._blocked = false; this._afterAction(); },
    });
  }

  _afterAction() {
    this._spinning = false;
    if (this._attacksLeft <= 0 && this._bossHp > 0) {
      this.time.delayedCall(350, () => this._defeat());
    } else {
      this._btnHit.setInteractive({ useHandCursor: true });
    }
  }

  // ─── VICTORY ───────────────────────────────────────────────────────────────

  _victory() {
    const W = this.scale.width;
    const H = this.scale.height;
    const D = 50;

    audioSystem.jackpot();
    screenShake(this, 0.03, 700);
    burstParticles(this, this._bossCX, this._bossCY, [0x880000, 0xFF0000, 0xFF6600, 0x330000], 60);
    this.tweens.add({
      targets: [this._bossG, this._eye1, this._eye2],
      alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 550, ease: 'Power2',
    });

    const rewardCoins = 5000 + this._village * 500;
    const rewardSpins = 50;
    GameState.addCoins(rewardCoins);
    GameState.addSpins(rewardSpins);

    this.time.delayedCall(750, () => {
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88).setDepth(D);

      this.add.text(W / 2, H * 0.20, '👑 VICTORY!', {
        fontSize: '48px', fontFamily: 'Arial Black',
        color: '#FFD700', stroke: '#000', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(D + 1);

      this.add.text(W / 2, H * 0.31, 'THE SHADOW KING IS DEFEATED!', {
        fontSize: '13px', fontFamily: 'Arial Black',
        color: '#CC4400', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(D + 1);

      const rwdG = this.add.graphics().setDepth(D + 1);
      rwdG.fillStyle(0x0A0A22, 0.92);
      rwdG.fillRoundedRect(W / 2 - 140, H * 0.39, 280, 88, 12);
      rwdG.lineStyle(2, 0xFFD700, 0.60);
      rwdG.strokeRoundedRect(W / 2 - 140, H * 0.39, 280, 88, 12);

      this.add.text(W / 2, H * 0.44, `💰 +${rewardCoins.toLocaleString()} coins`, {
        fontSize: '22px', fontFamily: 'Arial Black', color: '#FFD700',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(D + 2);

      this.add.text(W / 2, H * 0.505, `🎰 +${rewardSpins} spins`, {
        fontSize: '18px', fontFamily: 'Arial Black', color: '#2ECC71',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(D + 2);

      const btnY = H * 0.67;
      const btnG = this.add.graphics().setDepth(D + 1);
      btnG.fillStyle(0x1A6B00, 1); btnG.fillRoundedRect(W / 2 - 120, btnY - 28, 240, 56, 16);
      btnG.fillStyle(0x27AE60, 1); btnG.fillRoundedRect(W / 2 - 120, btnY - 28, 240, 40, 16);
      btnG.fillStyle(0x3ECC71, 0.35); btnG.fillRoundedRect(W / 2 - 116, btnY - 24, 232, 18, 12);
      btnG.lineStyle(2.5, 0x2ECC71, 0.9); btnG.strokeRoundedRect(W / 2 - 120, btnY - 28, 240, 56, 16);

      this.add.text(W / 2, btnY, '🏆  Claim Rewards!', {
        fontSize: '22px', fontFamily: 'Arial Black', color: '#FFFFFF',
        stroke: '#1A6B00', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(D + 2);

      this.add.rectangle(W / 2, btnY, 240, 56, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(D + 3)
        .on('pointerdown', () => {
          adService.showInterstitial();
          this.cameras.main.fadeOut(280, 0, 0, 0);
          this.time.delayedCall(290, () => {
            this.scene.stop('BossScene');
            this.scene.wake('GameScene');
          });
        });
    });
  }

  // ─── DEFEAT ────────────────────────────────────────────────────────────────

  _defeat() {
    const W = this.scale.width;
    const H = this.scale.height;
    const D = 50;
    const overlay = [];

    audioSystem.nearMiss();

    const addO = o => { overlay.push(o); return o; };

    addO(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.90).setDepth(D));

    addO(this.add.text(W / 2, H * 0.20, '💀 DEFEATED!', {
      fontSize: '44px', fontFamily: 'Arial Black',
      color: '#CC0000', stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(D + 1));

    addO(this.add.text(W / 2, H * 0.32, `Boss survived with ${this._bossHp} HP`, {
      fontSize: '14px', fontFamily: 'Arial', color: '#AA3333',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(D + 1));

    // Watch Ad → +2 attacks
    const adY = H * 0.53;
    const adG = addO(this.add.graphics().setDepth(D + 1));
    adG.fillStyle(0x0A2050, 1); adG.fillRoundedRect(W / 2 - 120, adY - 28, 240, 56, 16);
    adG.fillStyle(0x1A4A9A, 1); adG.fillRoundedRect(W / 2 - 120, adY - 28, 240, 40, 16);
    adG.fillStyle(0x2266CC, 0.35); adG.fillRoundedRect(W / 2 - 116, adY - 24, 232, 18, 12);
    adG.lineStyle(2.5, 0xD4A017, 0.80); adG.strokeRoundedRect(W / 2 - 120, adY - 28, 240, 56, 16);

    addO(this.add.text(W / 2, adY, '📺  Watch Ad (+2 attacks)', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#FFFFFF',
      stroke: '#0A2050', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D + 2));

    addO(this.add.rectangle(W / 2, adY, 240, 56, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D + 3)
      .on('pointerdown', async () => {
        const watched = await adService.showRewarded();
        if (!watched) return;
        overlay.forEach(o => o.destroy());
        this._attacksLeft += 2;
        this._spinning = false;
        this._updateAtkTxt();
        this._btnHit.setInteractive({ useHandCursor: true });
      }));

    // Retreat
    const retY = H * 0.70;
    const retG = addO(this.add.graphics().setDepth(D + 1));
    retG.fillStyle(0x7B2D00, 1); retG.fillRoundedRect(W / 2 - 100, retY - 28, 200, 56, 16);
    retG.fillStyle(0xE67E22, 1); retG.fillRoundedRect(W / 2 - 100, retY - 28, 200, 40, 16);
    retG.lineStyle(2.5, 0xFFD700, 0.90); retG.strokeRoundedRect(W / 2 - 100, retY - 28, 200, 56, 16);

    addO(this.add.text(W / 2, retY, '← Retreat', {
      fontSize: '22px', fontFamily: 'Arial Black', color: '#FFFFFF',
      stroke: '#7B2D00', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(D + 2));

    addO(this.add.rectangle(W / 2, retY, 200, 56, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D + 3)
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(280, 0, 0, 0);
        this.time.delayedCall(290, () => {
          this.scene.stop('BossScene');
          this.scene.wake('GameScene');
        });
      }));
  }
}
