// Reusable juice / VFX helpers — all stateless, take (scene, ...) as first arg

export function flyingCoins(scene, fromX, fromY, toX, toY, count = 6) {
  for (let i = 0; i < count; i++) {
    const coin = scene.add
      .circle(
        fromX + Phaser.Math.Between(-18, 18),
        fromY + Phaser.Math.Between(-18, 18),
        7, 0xFFD700
      )
      .setDepth(100)
      .setStrokeStyle(1.5, 0xB8860B);

    scene.tweens.add({
      targets: coin,
      x: toX,
      y: toY,
      scaleX: 0.25,
      scaleY: 0.25,
      alpha: 0,
      duration: 650,
      delay: i * 75,
      ease: 'Cubic.easeIn',
      onComplete: () => coin.destroy(),
    });
  }
}

export function burstParticles(scene, x, y, colors, count = 16) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
    const dist  = Phaser.Math.Between(38, 78);
    const size  = Phaser.Math.Between(4, 11);
    const p = scene.add
      .circle(x, y, size, Phaser.Utils.Array.GetRandom(colors))
      .setDepth(100);

    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      scaleX: 0.05,
      scaleY: 0.05,
      alpha: 0,
      duration: Phaser.Math.Between(420, 820),
      ease: 'Power2.easeOut',
      onComplete: () => p.destroy(),
    });
  }
}

export function goldRain(scene, W, H) {
  for (let i = 0; i < 38; i++) {
    const x     = Phaser.Math.Between(10, W - 10);
    const size  = Phaser.Math.Between(5, 14);
    const delay = Phaser.Math.Between(0, 1800);
    const coin  = scene.add
      .circle(x, -20, size, 0xFFD700)
      .setDepth(100)
      .setStrokeStyle(2, 0xB8860B);

    scene.tweens.add({
      targets: coin,
      y: H + 30,
      duration: Phaser.Math.Between(1100, 2400),
      delay,
      ease: 'Cubic.easeIn',
      onComplete: () => coin.destroy(),
    });
  }
}

export function screenShake(scene, intensity = 0.012, duration = 350) {
  scene.cameras.main.shake(duration, intensity);
}

export function upgradeEffect(scene, x, y, color) {
  for (let i = 0; i < 3; i++) {
    const ring = scene.add
      .circle(x, y, 22, color, 0)
      .setDepth(15)
      .setStrokeStyle(3, color);

    scene.tweens.add({
      targets: ring,
      scaleX: 3.2,
      scaleY: 3.2,
      alpha: 0,
      duration: 680,
      delay: i * 160,
      ease: 'Power2.easeOut',
      onComplete: () => ring.destroy(),
    });
  }
  burstParticles(scene, x, y, [color, 0xFFFFFF, 0xFFD700], 12);
}

export function shieldBubble(scene, x, y) {
  const bubble = scene.add
    .circle(x, y, 12, 0x3498DB, 0.18)
    .setDepth(15)
    .setStrokeStyle(3, 0x00DDFF);

  scene.tweens.add({
    targets: bubble,
    scaleX: 14,
    scaleY: 8,
    alpha: 0,
    duration: 900,
    ease: 'Power2.easeOut',
    onComplete: () => bubble.destroy(),
  });

  const inner = scene.add.circle(x, y, 40, 0x00DDFF, 0.28).setDepth(15);
  scene.tweens.add({
    targets: inner,
    scaleX: 0.2,
    scaleY: 0.2,
    alpha: 0,
    duration: 600,
    ease: 'Power2.easeOut',
    onComplete: () => inner.destroy(),
  });
}
