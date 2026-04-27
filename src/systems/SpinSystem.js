/**
 * SpinSystem — owns all wheel rotation logic.
 *
 * Usage:
 *   const spin = new SpinSystem(SEGMENTS);
 *   spin.spin(scene, renderFn, onDone);
 *
 * renderFn(angle)  — called every frame, draw the wheel at this angle
 * onDone(segment)  — called once, with the winning segment object
 */

const TWO_PI = Math.PI * 2;

export class SpinSystem {
  constructor(segments) {
    this.segments = segments;
    this.spinning = false;
    this.angle    = 0;           // current wheel rotation in radians (accumulates)
  }

  get isSpinning() { return this.spinning; }

  /**
   * Start a spin.
   * @returns {number} targetIndex — available immediately (useful for pre-fetching)
   */
  spin(scene, renderFn, onDone) {
    if (this.spinning) return -1;
    this.spinning = true;

    const n     = this.segments.length;
    const slice = TWO_PI / n;

    // Weighted random selection — segments with no weight default to 1
    const totalWeight = this.segments.reduce((s, seg) => s + (seg.weight ?? 1), 0);
    let roll = Math.random() * totalWeight;
    let targetIndex = n - 1;
    for (let i = 0; i < n; i++) {
      roll -= (this.segments[i].weight ?? 1);
      if (roll <= 0) { targetIndex = i; break; }
    }
    const extraSpins  = Phaser.Math.Between(5, 8);

    // Exact angle that perfectly centers targetIndex under the top pointer:
    //   rotation ≡ -(targetIndex + 0.5) * slice  (mod 2π)
    const targetMod  = ((-(targetIndex + 0.5) * slice) % TWO_PI + TWO_PI) % TWO_PI;
    const k          = Math.ceil((this.angle + extraSpins * TWO_PI - targetMod) / TWO_PI);
    const finalAngle = k * TWO_PI + targetMod;

    // Overshoot: 15% of one slice (~7° for 8 segments) — big enough to feel,
    // small enough never to visually leave the winning segment.
    const overshoot     = slice * 0.15;
    const startAngle    = this.angle;
    const totalRotation = finalAngle - startAngle;
    const duration      = 4200;
    const startTime     = Date.now();

    // Ease-out quart: aggressive deceleration, feels like a real weighted wheel
    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

    const animate = () => {
      const t     = Math.min((Date.now() - startTime) / duration, 1);
      const angle = startAngle + totalRotation * easeOutQuart(t);
      this.angle  = angle;
      renderFn(angle);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Phase 2: land past the target, then bounce back to exact position
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

  // Tweens from current angle (finalAngle + overshoot) back to finalAngle
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
