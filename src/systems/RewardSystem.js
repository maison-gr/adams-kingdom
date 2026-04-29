/**
 * RewardSystem — single dispatcher for all spin outcomes.
 *
 * Usage:
 *   const rewards = new RewardSystem(scene);
 *   rewards.handle(segment);   // called after wheel stops
 *
 * Adding a new reward type = add one method + one entry in HANDLERS.
 */

import { GameState } from '../GameState.js';
import {
  flyingCoins, burstParticles, goldRain,
  screenShake, shieldBubble,
} from '../effects/juice.js';
import { CHEST_DEFS, randomChestType } from './ChestSystem.js';
import { audioSystem } from '../effects/AudioSystem.js';

export class RewardSystem {
  constructor(scene) {
    this.scene = scene;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  handle(segment, comboResult = {}) {
    this._combo = comboResult;
    const fn = this[`_on_${segment.type}`];
    if (fn) fn.call(this, segment);
    this.scene.updateHUD();
  }

  // ── Handlers (one per segment type) ────────────────────────────────────────

  _on_coins(segment) {
    const mult   = this._combo?.multiplier ?? 1;
    const amount = Math.round(segment.value * mult);
    GameState.addCoins(amount);
    this._grantXP('coins', mult);
    audioSystem.coin();
    if (amount >= 5000) {
      this._jackpot(amount);
    } else {
      const multStr = mult === Math.floor(mult) ? `${mult}` : mult.toFixed(1);
      this.scene.missionSystem?.progress('coins', amount);
      this.scene._refreshMissionBadge?.();
      const label   = mult > 1
        ? `+${amount.toLocaleString()} Coins!  ×${multStr}`
        : `+${amount.toLocaleString()} Coins!`;
      this._toast(label, '#FFD700');
      flyingCoins(
        this.scene,
        this.scene.wheelCx,
        this.scene.wheelCy - this.scene.wheelR * 0.5,
        this.scene.coinIconX,
        this.scene.coinIconY,
        6
      );
      if (amount >= 300) {
        this.scene.time.delayedCall(1400, () => this._showDoubleReward(amount));
      }
    }
  }

  _on_jackpot(segment) {
    const mult   = this._combo?.multiplier ?? 1;
    const amount = Math.round(segment.value * mult);
    GameState.addCoins(amount);
    this._grantXP('jackpot', mult);
    audioSystem.jackpot();
    this._jackpot(amount);
  }

  _on_attack(_segment) {
    GameState.addAttack();
    this._grantXP('attack');
    this.scene.missionSystem?.progress('attacks');
    this.scene._refreshMissionBadge?.();
    audioSystem.attack();
    this._toast('ATTACK!', '#FF4444');
    this._spawnAttackCracks();
    this._flashScreen(0xFF0000, 0.22, 380);

    // Show target selection panel after flash settles
    this.scene.time.delayedCall(900, () => this.scene._showAttackTargetPanel());
  }

  _on_chest(_segment) {
    this._grantXP('chest');
    this.scene.missionSystem?.progress('chests');
    this.scene._refreshMissionBadge?.();
    const type  = randomChestType();
    const chest = GameState.addChest(type);
    const def   = CHEST_DEFS[type];
    const col   = `#${def.lidColor.toString(16).padStart(6, '0')}`;

    this._toast(`${def.label}!`, col);
    this._spawnChestSuspense();
    this._flashScreen(def.lidColor, 0.14, 350);

    this.scene.time.delayedCall(900, () => {
      this.scene.cameras.main.zoomTo(1.6, 280, 'Cubic.easeIn', false, (_cam, progress) => {
        if (progress === 1) {
          this.scene.scene.sleep('GameScene');
          this.scene.scene.launch('ChestScene', { chestId: chest.id, chestType: type });
        }
      });
    });
  }

  _on_raid(_segment) {
    this._grantXP('raid');
    this.scene.missionSystem?.progress('raids');
    this.scene._refreshMissionBadge?.();
    audioSystem.raid();
    this._toast('RAID!', '#1ABC9C');
    this._spawnRaidShovel();
    this._flashScreen(0x1ABC9C, 0.18, 380);

    this.scene.time.delayedCall(900, () => {
      this.scene.cameras.main.zoomTo(1.6, 280, 'Cubic.easeIn', false, (_cam, progress) => {
        if (progress === 1) {
          this.scene.scene.sleep('GameScene');
          this.scene.scene.launch('RaidScene', {
            target:   this.scene._raidTarget,
            deviceId: GameState.deviceId,
          });
        }
      });
    });
  }

  _on_shield(_segment) {
    GameState.addShield();
    this._grantXP('shield');
    audioSystem.shield();
    this._toast('SHIELD!', '#5DADE2');
    const { width: W, height: H } = this.scene.scale;
    shieldBubble(this.scene, W / 2, H * 0.22);
  }

  _on_spin(segment) {
    GameState.addSpins(segment.value);
    this._grantXP('spin');
    audioSystem.spin();
    this._toast('EXTRA SPIN!', '#2ECC71');
    burstParticles(
      this.scene, this.scene.wheelCx, this.scene.wheelCy,
      [0x2ECC71, 0xFFFFFF, 0x00FF88], 10
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _grantXP(action, mult = 1) {
    const rs = this.scene.rankSystem;
    if (!rs) return;
    const result = rs.award(action, mult);
    this.scene.updateXPBar?.();
    if (result?.rankUp) this.scene._showRankUpOverlay?.(result.def);
  }

  _jackpot(amount = 5000) {
    const sc             = this.scene;
    const { width: W, height: H } = sc.scale;
    const D              = 50;
    const objs           = [];
    const track          = o => { objs.push(o); return o; };

    // 1 ── Dim screen to near-black
    const dim = track(sc.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(D));
    sc.tweens.add({ targets: dim, alpha: 0.88, duration: 280 });

    // 2 ── Burst + shake at wheel
    sc.time.delayedCall(120, () => {
      burstParticles(sc, sc.wheelCx, sc.wheelCy, [0xFFD700, 0xFF4444, 0xFFFFFF, 0xFF8C00], 32);
      screenShake(sc, 0.016, 500);
    });

    // 3 ── "JACKPOT!" title slams in
    const title = track(sc.add.text(W / 2, H * 0.28, '💰 JACKPOT! 💰', {
      fontSize: '44px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(D + 1).setScale(0.1).setAlpha(0));
    sc.time.delayedCall(320, () => {
      sc.tweens.add({ targets: title, scaleX: 1, scaleY: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' });
    });

    // 4 ── Counter rises 0 → amount
    const counter = track(sc.add.text(W / 2, H * 0.45, '+0', {
      fontSize: '56px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(D + 1).setAlpha(0));

    sc.time.delayedCall(620, () => {
      counter.setAlpha(1);
      audioSystem.jackpot();
      goldRain(sc, W, H);
      flyingCoins(sc, sc.wheelCx, sc.wheelCy, sc.coinIconX, sc.coinIconY, 14);

      const t0  = Date.now();
      const dur = 1200;
      const ticker = sc.time.addEvent({
        delay: 16, loop: true,
        callback: () => {
          const p   = Math.min((Date.now() - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          counter.setText(`+${Math.round(amount * eased).toLocaleString()}`);
          if (p >= 1) ticker.remove();
        },
      });
    });

    // 5 ── Double-it prompt
    sc.time.delayedCall(2100, () => this._showJackpotDoublePrompt(amount, W, H, D, objs));
  }

  _showJackpotDoublePrompt(amount, W, H, D, objs) {
    const sc    = this.scene;
    const track = o => { objs.push(o); return o; };

    const fadeIn = o => { sc.tweens.add({ targets: o, alpha: 1, duration: 280 }); return o; };

    fadeIn(track(sc.add.text(W / 2, H * 0.60, `You won ${amount.toLocaleString()} coins!`, {
      fontSize: '16px', fontFamily: 'Arial', color: '#AABBCC',
    }).setOrigin(0.5).setDepth(D + 1).setAlpha(0)));

    // Double button
    const dblY = H * 0.70;
    const dblBg = track(sc.add.graphics().setDepth(D + 1).setAlpha(0));
    dblBg.fillStyle(0x7A4000, 1); dblBg.fillRoundedRect(W / 2 - 130, dblY - 28, 260, 56, 14);
    dblBg.fillStyle(0xD4A017, 1); dblBg.fillRoundedRect(W / 2 - 130, dblY - 28, 260, 38, 14);
    dblBg.fillStyle(0xFFD700, 0.28); dblBg.fillRoundedRect(W / 2 - 126, dblY - 25, 252, 15, 10);
    dblBg.lineStyle(2.5, 0xFFD700, 0.90); dblBg.strokeRoundedRect(W / 2 - 130, dblY - 28, 260, 56, 14);
    fadeIn(dblBg);

    const dblTxt = fadeIn(track(sc.add.text(W / 2, dblY, `▶  Double → ${(amount * 2).toLocaleString()}!`, {
      fontSize: '16px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#5A2A00', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D + 2).setAlpha(0)));

    // Take it button
    const takeY = H * 0.82;
    const takeBg = track(sc.add.graphics().setDepth(D + 1).setAlpha(0));
    takeBg.fillStyle(0x1A2244, 0.90); takeBg.fillRoundedRect(W / 2 - 90, takeY - 18, 180, 36, 10);
    takeBg.lineStyle(1.5, 0x334466, 0.65); takeBg.strokeRoundedRect(W / 2 - 90, takeY - 18, 180, 36, 10);
    fadeIn(takeBg);

    fadeIn(track(sc.add.text(W / 2, takeY, `Take ${amount.toLocaleString()}`, {
      fontSize: '14px', fontFamily: 'Arial Black', color: '#778899',
    }).setOrigin(0.5).setDepth(D + 2).setAlpha(0)));

    const dismiss = () => {
      sc.tweens.add({
        targets: objs, alpha: 0, duration: 280,
        onComplete: () => objs.forEach(o => o.destroy()),
      });
    };

    const autoTimer = sc.time.delayedCall(10000, dismiss);

    const dblHit = track(sc.add.rectangle(W / 2, dblY, 260, 56, 0, 0)
      .setDepth(D + 3).setInteractive({ useHandCursor: true }));
    const takeHit = track(sc.add.rectangle(W / 2, takeY, 180, 36, 0, 0)
      .setDepth(D + 3).setInteractive({ useHandCursor: true }));

    dblHit.on('pointerdown', () => {
      autoTimer.remove();
      dblHit.disableInteractive();
      takeHit.disableInteractive();
      dblTxt.setText('Loading ad...');
      sc.time.delayedCall(2500, () => {
        GameState.addCoins(amount);
        sc.updateHUD?.();
        sc.showResult?.(`DOUBLED! +${(amount * 2).toLocaleString()}`, '#FFD700');
        burstParticles(sc, W / 2, H * 0.45, [0xFFD700, 0xFF8C00, 0xFFFFFF], 28);
        dismiss();
      });
    });

    takeHit.on('pointerdown', () => { autoTimer.remove(); dismiss(); });
  }

  // Floating "?" marks — suspense before chest opens
  _spawnChestSuspense() {
    const sc = this.scene;
    const cx = sc.wheelCx ?? sc.scale.width / 2;
    const cy = sc.wheelCy ?? sc.scale.height * 0.57;

    for (let i = 0; i < 4; i++) {
      const x = cx + Phaser.Math.Between(-55, 55);
      const q = sc.add.text(x, cy, '?', {
        fontSize: `${Phaser.Math.Between(22, 38)}px`, fontFamily: 'Arial Black',
        color: '#1ABC9C', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(60).setAlpha(0);

      sc.tweens.add({
        targets: q, alpha: 1, y: cy - 36,
        duration: 190, delay: i * 120, ease: 'Power2',
        onComplete: () => sc.tweens.add({
          targets: q, alpha: 0, y: cy - 95,
          duration: 480, delay: 80 + i * 55, ease: 'Power2',
          onComplete: () => q.destroy(),
        }),
      });
    }
  }

  // Shovel emoji float from wheel centre on RAID
  _spawnRaidShovel() {
    const sc = this.scene;
    const cx = sc.wheelCx ?? sc.scale.width / 2;
    const cy = sc.wheelCy ?? sc.scale.height * 0.57;

    const shovel = sc.add.text(cx, cy, '⛏️', { fontSize: '38px' })
      .setOrigin(0.5).setDepth(60).setScale(0.5);

    sc.tweens.add({
      targets: shovel,
      y: cy - 95, scaleX: 1.3, scaleY: 1.3, alpha: 0,
      duration: 950, ease: 'Power2',
      onComplete: () => shovel.destroy(),
    });
  }

  // Radiating crack lines on ATTACK
  _spawnAttackCracks() {
    const sc             = this.scene;
    const { width: W, height: H } = sc.scale;
    const g   = sc.add.graphics().setDepth(45).setAlpha(0.90);
    const cx  = W * 0.50 + Phaser.Math.Between(-18, 18);
    const cy  = H * 0.40 + Phaser.Math.Between(-18, 18);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.25, 0.25);
      const len   = Phaser.Math.Between(55, 125);
      const ex    = cx + Math.cos(angle) * len;
      const ey    = cy + Math.sin(angle) * len;
      const mx    = (cx + ex) / 2 + Phaser.Math.Between(-14, 14);
      const my    = (cy + ey) / 2 + Phaser.Math.Between(-14, 14);

      g.lineStyle(2.5, 0xFF2200, 0.90);
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(mx, my); g.lineTo(ex, ey); g.strokePath();

      const bLen   = len * 0.42;
      const bAngle = angle + Phaser.Math.FloatBetween(0.38, 0.85);
      g.lineStyle(1.5, 0xFF5500, 0.60);
      g.beginPath();
      g.moveTo(mx, my);
      g.lineTo(mx + Math.cos(bAngle) * bLen, my + Math.sin(bAngle) * bLen);
      g.strokePath();
    }

    sc.tweens.add({
      targets: g, alpha: 0,
      duration: 580, delay: 180,
      onComplete: () => g.destroy(),
    });
  }

  _toast(msg, color) {
    this.scene.showResult(msg, color);
  }

  _showDoubleReward(amount) {
    const sc = this.scene;
    if (!sc.scene.isActive('GameScene')) return;

    const { width: W, height: H } = sc.scale;
    const D = 35;
    const panelH = 180;
    const panelW = W - 48;
    const panelX = 24;
    const panelY = H * 0.50;
    const objs   = [];
    const track  = obj => { objs.push(obj); return obj; };

    // Backdrop dim
    const dim = track(sc.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(D));
    sc.tweens.add({ targets: dim, alpha: 0.55, duration: 200 });

    // Panel — starts below screen, slides up
    const panel = track(sc.add.graphics().setDepth(D + 1));
    panel.fillStyle(0x05051E, 0.97);
    panel.fillRoundedRect(0, 0, panelW, panelH, 18);
    panel.fillStyle(0xFFD700, 0.07);
    panel.fillRoundedRect(0, 0, panelW, 44, 18);
    panel.lineStyle(2.5, 0xFFD700, 0.80);
    panel.strokeRoundedRect(0, 0, panelW, panelH, 18);
    panel.x = panelX;
    panel.y = H;

    const title = track(sc.add.text(W / 2, H + 28, '2×  DOUBLE IT!', {
      fontSize: '22px', fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(D + 2));

    const sub = track(sc.add.text(W / 2, H + 62, `Watch a short ad to double your\n+${amount.toLocaleString()} coins → +${(amount * 2).toLocaleString()} coins!`, {
      fontSize: '13px', fontFamily: 'Arial', color: '#AABBCC',
      align: 'center', wordWrap: { width: panelW - 40 },
    }).setOrigin(0.5).setDepth(D + 2));

    // Watch Ad button
    const btnY = H + 116;
    const adBg = track(sc.add.graphics().setDepth(D + 2));
    adBg.fillStyle(0x1A6A2A, 1); adBg.fillRoundedRect(W / 2 - 110, btnY - 20, 220, 44, 12);
    adBg.fillStyle(0x27AE60, 1); adBg.fillRoundedRect(W / 2 - 110, btnY - 20, 220, 30, 12);
    adBg.lineStyle(2, 0x2ECC71, 0.90); adBg.strokeRoundedRect(W / 2 - 110, btnY - 20, 220, 44, 12);

    const adTxt = track(sc.add.text(W / 2, btnY + 2, '▶  Watch Ad  ×2', {
      fontSize: '15px', fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#0A3A1A', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D + 3));

    // No thanks link
    const skipTxt = track(sc.add.text(W / 2, btnY + 38, 'No thanks', {
      fontSize: '12px', fontFamily: 'Arial', color: '#445566',
    }).setOrigin(0.5).setDepth(D + 3));

    // Slide everything up
    const targetY = panelY;
    const slideUp = obj => sc.tweens.add({ targets: obj, y: obj.y - (H - targetY), duration: 350, ease: 'Back.easeOut' });
    [panel, title, sub, adBg, adTxt, skipTxt].forEach(slideUp);

    const dismiss = () => {
      sc.tweens.add({
        targets: objs, alpha: 0, duration: 200,
        onComplete: () => objs.forEach(o => o.destroy()),
      });
    };

    // Auto-dismiss after 9 s
    const autoDismiss = sc.time.delayedCall(9000, dismiss);

    const adHit = track(sc.add.rectangle(W / 2, btnY + (H - targetY) + 2, 220, 44, 0x000000, 0)
      .setDepth(D + 4).setInteractive({ useHandCursor: true }));
    sc.tweens.add({ targets: adHit, y: adHit.y - (H - targetY), duration: 350, ease: 'Back.easeOut' });

    adHit.on('pointerdown', () => {
      autoDismiss.remove();
      adHit.disableInteractive();
      adTxt.setText('Loading...');
      sc.time.delayedCall(2500, () => {
        GameState.addCoins(amount);
        sc.updateHUD?.();
        sc.showResult?.(`+${amount.toLocaleString()} bonus!`, '#FFD700');
        flyingCoins(sc, sc.wheelCx, sc.wheelCy - sc.wheelR * 0.5, sc.coinIconX, sc.coinIconY, 8);
        dismiss();
      });
    });

    const skipHit = track(sc.add.rectangle(W / 2, btnY + (H - targetY) + 38, 120, 24, 0x000000, 0)
      .setDepth(D + 4).setInteractive({ useHandCursor: true }));
    sc.tweens.add({ targets: skipHit, y: skipHit.y - (H - targetY), duration: 350, ease: 'Back.easeOut' });
    skipHit.on('pointerdown', () => { autoDismiss.remove(); dismiss(); });

    dim.on('pointerdown', () => { autoDismiss.remove(); dismiss(); });
    dim.setInteractive();
  }

  _flashScreen(color, alpha, duration) {
    const { width: W, height: H } = this.scene.scale;
    const flash = this.scene.add.rectangle(W / 2, H / 2, W, H, color, alpha).setDepth(40);
    this.scene.tweens.add({
      targets: flash, alpha: 0, duration,
      onComplete: () => flash.destroy(),
    });
  }
}
