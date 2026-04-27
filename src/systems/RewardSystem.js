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

export class RewardSystem {
  constructor(scene) {
    this.scene = scene;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  handle(segment) {
    const fn = this[`_on_${segment.type}`];
    if (fn) fn.call(this, segment);
    else console.warn(`RewardSystem: unknown segment type "${segment.type}"`);
    this.scene.updateHUD();
  }

  // ── Handlers (one per segment type) ────────────────────────────────────────

  _on_coins(segment) {
    GameState.addCoins(segment.value);
    if (segment.value >= 5000) {
      this._jackpot();
    } else {
      this._toast(`+${segment.value.toLocaleString()} Coins!`, '#FFD700');
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

  _on_attack(_segment) {
    GameState.addAttack();
    this._toast('ATTACK!', '#FF4444');
    this._flashScreen(0xFF0000, 0.22, 380);

    // Transition to AttackScene (launched as an overlay; GameScene sleeps)
    this.scene.time.delayedCall(900, () => {
      this.scene.scene.sleep('GameScene');
      this.scene.scene.launch('AttackScene', {
        target:   this.scene._raidTarget,
        deviceId: GameState.deviceId,
      });
    });
  }

  _on_shield(_segment) {
    GameState.addShield();
    this._toast('SHIELD!', '#5DADE2');
    const { width: W, height: H } = this.scene.scale;
    shieldBubble(this.scene, W / 2, H * 0.22);
  }

  _on_spin(segment) {
    GameState.addSpins(segment.value);
    this._toast('EXTRA SPIN!', '#2ECC71');
    burstParticles(
      this.scene, this.scene.wheelCx, this.scene.wheelCy,
      [0x2ECC71, 0xFFFFFF, 0x00FF88], 10
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _jackpot() {
    const { width: W, height: H } = this.scene.scale;
    this._toast('JACKPOT!  +5,000!', '#FFD700');
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
