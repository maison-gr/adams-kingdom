/**
 * SpinSystem — owns all wheel rotation logic.
 *
 * Usage:
 *   const spin = new SpinSystem(SEGMENTS);
 *   spin.spin(scene, renderFn, onDone, { onSlowdown });
 *
 * renderFn(angle)     — called every frame, draw the wheel at this angle
 * onDone(segment,idx) — called once, with the winning segment object + index
 * onSlowdown()        — fired once when Phase 4 (dramatic crawl) begins (~78% through)
 */

const TWO_PI = Math.PI * 2;

// 5-phase piecewise easing: launch → full speed → decel → dramatic crawl → settle
function wheelEase(t) {
  if (t < 0.07) return (t / 0.07) * 0.08;
  if (t < 0.55) return 0.08 + ((t - 0.07) / 0.48) * 0.60;
  if (t < 0.78) return 0.68 + ((t - 0.55) / 0.23) * 0.20;
  const p = (t - 0.78) / 0.22;
  return 0.88 + (0.5 - 0.5 * Math.cos(Math.PI * p)) * 0.12;
}

export class SpinSystem {
  constructor(segments) {
    this.segments   = segments;
    this.spinning   = false;
    this.angle      = 0;
    this._boostType = null;
    this._boostMult = 1;
  }

  get isSpinning() { return this.spinning; }

  // Double (or multiply) the effective weight of all segments of the given type
  setJackpotBoost(type, mult = 2) {
    this._boostType = type;
    this._boostMult = mult;
  }

  clearJackpotBoost() {
    this._boostType = null;
    this._boostMult = 1;
  }

  /**
   * Start a spin.
   * @returns {number} targetIndex — available immediately (useful for pre-fetching)
   */
  spin(scene, renderFn, onDone, { onSlowdown, onNearMissPassthrough } = {}) {
    if (this.spinning) return -1;
    this.spinning = true;

    const n     = this.segments.length;
    const slice = TWO_PI / n;

    // Weighted random selection (with optional boost)
    const totalWeight = this.segments.reduce((s, seg) => {
      const boost = seg.type === this._boostType ? this._boostMult : 1;
      return s + (seg.weight ?? 1) * boost;
    }, 0);
    let roll = Math.random() * totalWeight;
    let targetIndex = n - 1;
    for (let i = 0; i < n; i++) {
      const boost = this.segments[i].type === this._boostType ? this._boostMult : 1;
      roll -= (this.segments[i].weight ?? 1) * boost;
      if (roll <= 0) { targetIndex = i; break; }
    }

    const extraSpins = Phaser.Math.Between(5, 8);

    // Exact angle that perfectly centres targetIndex under the top pointer
    const targetMod  = ((-(targetIndex + 0.5) * slice) % TWO_PI + TWO_PI) % TWO_PI;
    const k          = Math.ceil((this.angle + extraSpins * TWO_PI - targetMod) / TWO_PI);
    const finalAngle = k * TWO_PI + targetMod;

    // Overshoot: 15% of one slice — feels physical without leaving the segment
    const overshoot     = slice * 0.15;
    const startAngle    = this.angle;
    const totalRotation = finalAngle - startAngle;
    const duration      = 4600;
    const startTime     = Date.now();

    // Jackpot passthrough: detect when jackpot segment crosses the top pointer
    const jpIdx       = this.segments.findIndex(s => s.type === 'jackpot');
    const jpPassAngle = ((-(jpIdx + 0.5) * slice) % TWO_PI + TWO_PI) % TWO_PI;

    let slowdownFired = false;
    let prevAngle     = startAngle;

    const animate = () => {
      const t = Math.min((Date.now() - startTime) / duration, 1);

      // Fire onSlowdown once when Phase 4 begins (~78% of animation time)
      if (!slowdownFired && t >= 0.78) {
        slowdownFired = true;
        onSlowdown?.();
      }

      const angle = startAngle + totalRotation * wheelEase(t);
      this.angle  = angle;

      // Detect jackpot crossing the pointer during deceleration phases only
      if (t >= 0.55 && onNearMissPassthrough) {
        const prevN = Math.floor((prevAngle - jpPassAngle) / TWO_PI);
        const currN = Math.floor((angle    - jpPassAngle) / TWO_PI);
        if (currN > prevN) onNearMissPassthrough();
      }
      prevAngle = angle;

      renderFn(angle);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Phase 5: land slightly past target, then bounce back
        this.angle = finalAngle + overshoot;
        renderFn(this.angle);
        this._bounceSettle(scene, finalAngle, renderFn, () => {
          this.spinning = false;
          onDone(this.segments[targetIndex], targetIndex);
        });
      }
    };

    requestAnimationFrame(animate);
    return targetIndex;
  }

  // Tweens from (finalAngle + overshoot) back to finalAngle
  _bounceSettle(scene, finalAngle, renderFn, onComplete) {
    const proxy = { a: this.angle };
    scene.tweens.add({
      targets:    proxy,
      a:          finalAngle,
      duration:   340,
      ease:       'Sine.easeOut',
      onUpdate:   () => { this.angle = proxy.a; renderFn(proxy.a); },
      onComplete: () => { this.angle = finalAngle; renderFn(finalAngle); onComplete(); },
    });
  }
}
