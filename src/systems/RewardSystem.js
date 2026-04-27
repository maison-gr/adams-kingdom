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
    else console.warn(`RewardSystem: unknown segment type "${segment.type}"`);
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
    this._flashScreen(def.lidColor, 0.14, 350);

    this.scene.time.delayedCall(900, () => {
      this.scene.scene.sleep('GameScene');
      this.scene.scene.launch('ChestScene', { chestId: chest.id, chestType: type });
    });
  }

  _on_raid(_segment) {
    this._grantXP('raid');
    this.scene.missionSystem?.progress('raids');
    this.scene._refreshMissionBadge?.();
    audioSystem.raid();
    this._toast('RAID!', '#1ABC9C');
    this._flashScreen(0x1ABC9C, 0.18, 380);

    this.scene.time.delayedCall(900, () => {
      this.scene.scene.sleep('GameScene');
      this.scene.scene.launch('RaidScene', {
        target:   this.scene._raidTarget,
        deviceId: GameState.deviceId,
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
    const { width: W, height: H } = this.scene.scale;
    this._toast(`JACKPOT!  +${amount.toLocaleString()}!`, '#FFD700');
    screenShake(this.scene, 0.016, 500);
    goldRain(this.scene, W, H);
    burstParticles(
      this.scene, this.scene.wheelCx, this.scene.wheelCy,
      [0xFFD700, 0xFF4444, 0xFFFFFF, 0xFF8C00], 32
    );
    flyingCoins(
      this.scene,
      this.scene.wheelCx, this.scene.wheelCy,
      this.scene.coinIconX, this.scene.coinIconY,
      14
    );
  }

  _toast(msg, color) {
    this.scene.showResult(msg, color);
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
