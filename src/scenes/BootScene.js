export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    // Scale factor: never shrink below design baseline, grow up to 1.5× on tablets
    const S = Math.max(1, Math.min(W / 480, 1.5));

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

    // Subtle star field
    for (let i = 0; i < 50; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H * 0.85),
        Phaser.Math.FloatBetween(0.4, 1.4) * S,
        0xFFFFFF,
        Phaser.Math.FloatBetween(0.2, 0.7),
      );
    }

    // "ADAM'S" — slams down from above
    const line1 = this.add.text(W / 2, H * 0.40, "ADAM'S", {
      fontSize: `${Math.round(54 * S)}px`, fontFamily: 'Arial Black',
      color: '#FFD700', stroke: '#000000', strokeThickness: Math.round(8 * S),
    }).setOrigin(0.5).setScale(0.08).setAlpha(0);

    // "KINGDOM" — rises from below
    const line2 = this.add.text(W / 2, H * 0.54, 'KINGDOM', {
      fontSize: `${Math.round(54 * S)}px`, fontFamily: 'Arial Black',
      color: '#FFFFFF', stroke: '#FFD700', strokeThickness: Math.round(6 * S),
    }).setOrigin(0.5).setScale(0.08).setAlpha(0);

    // Crown drops onto the title
    const crown = this.add.text(W / 2, H * 0.18, '👑', { fontSize: `${Math.round(52 * S)}px` })
      .setOrigin(0.5).setAlpha(0);

    // Subtitle
    const sub = this.add.text(W / 2, H * 0.64, 'Spin  ·  Build  ·  Conquer', {
      fontSize: `${Math.round(17 * S)}px`, fontFamily: 'Arial',
      color: '#AAAACC',
    }).setOrigin(0.5).setAlpha(0);

    // Gold underline bar
    const bar = this.add.rectangle(W / 2, H * 0.61, 0, Math.round(2 * S), 0xFFD700, 0.7)
      .setAlpha(0);

    // ── Sequence ─────────────────────────────────────────────────────────────

    // 0ms: ADAM'S slams in
    this.tweens.add({
      targets: line1, scaleX: 1, scaleY: 1, alpha: 1,
      duration: 260, ease: 'Back.easeOut',
    });

    // 160ms: KINGDOM slams in
    this.tweens.add({
      targets: line2, scaleX: 1, scaleY: 1, alpha: 1,
      duration: 260, delay: 160, ease: 'Back.easeOut',
    });

    // 380ms: Crown bounces down
    this.time.delayedCall(360, () => {
      this.tweens.add({
        targets: crown, y: H * 0.32, alpha: 1,
        duration: 380, ease: 'Bounce.easeOut',
      });
    });

    // 600ms: Gold bar sweeps in
    this.tweens.add({
      targets: bar, width: Math.round(220 * S), alpha: 1,
      duration: 340, delay: 560, ease: 'Cubic.easeOut',
    });

    // 650ms: Subtitle fades in
    this.tweens.add({
      targets: sub, alpha: 1,
      duration: 380, delay: 620,
    });

    // 300ms: Camera flash on logo slam
    this.time.delayedCall(40, () => {
      const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xFFD700, 0.25);
      this.tweens.add({ targets: flash, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
    });

    // 1700ms: Transition to GameScene
    this.time.delayedCall(1700, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    });
  }
}
