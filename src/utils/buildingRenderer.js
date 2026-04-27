/**
 * Shared building renderer — used by GameScene and AttackScene.
 * Pure function: no scene references, no side-effects beyond drawing.
 */

export const BUILDING_COLORS = [0x27AE60, 0x8E44AD, 0x2980B9, 0xE67E22, 0xC0392B, 0xF39C12];

function lighten(hex, amount) {
  const add = Math.round(amount * 200);
  const r   = Math.min(255, ((hex >> 16) & 0xFF) + add);
  const g   = Math.min(255, ((hex >>  8) & 0xFF) + add);
  const b   = Math.min(255, ( hex        & 0xFF) + add);
  return (r << 16) | (g << 8) | b;
}

/**
 * Draw or redraw a single building.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} x         — centre X
 * @param {number} groundY   — ground level Y
 * @param {number} index     — 0-5 (determines colour)
 * @param {number} level     — 0 = ruins, 1-3 = built
 */
export function drawBuilding(g, x, groundY, index, level) {
  g.clear();
  const col = BUILDING_COLORS[index];

  if (level === 0) {
    g.fillStyle(0x3A3A3A, 0.75);
    g.fillRect(x - 19, groundY - 36, 38, 36);
    g.fillStyle(0x555555, 0.6);
    g.fillTriangle(x - 23, groundY - 36, x + 23, groundY - 36, x, groundY - 60);
    g.lineStyle(1, 0x222222, 0.5);
    g.strokeRect(x - 19, groundY - 36, 38, 36);
    return;
  }

  const h = 30 + level * 18;

  // Drop shadow
  g.fillStyle(0x000000, 0.22);
  g.fillRect(x - 13, groundY - h + 5, 36, h);

  // Body
  g.fillStyle(col, 1);
  g.fillRect(x - 18, groundY - h, 36, h);

  // Left highlight — 3D illusion
  g.fillStyle(lighten(col, 0.28), 0.45);
  g.fillRect(x - 18, groundY - h, 11, h);

  // Dark right edge
  g.fillStyle(0x000000, 0.15);
  g.fillRect(x + 9, groundY - h, 9, h);

  // Roof
  g.fillStyle(0x922B21, 1);
  g.fillTriangle(x - 24, groundY - h, x + 24, groundY - h, x, groundY - h - 24);
  g.fillStyle(0xFFFFFF, 0.10);
  g.fillTriangle(x - 24, groundY - h, x, groundY - h, x, groundY - h - 24);

  if (level >= 2) {
    g.fillStyle(0xFFF5B0, 0.95);
    g.fillRect(x - 12, groundY - h + 10, 9,  11);
    g.fillRect(x + 3,  groundY - h + 10, 9,  11);
    g.lineStyle(1, 0x000000, 0.3);
    g.strokeRect(x - 12, groundY - h + 10, 9, 11);
    g.strokeRect(x + 3,  groundY - h + 10, 9, 11);
    g.fillStyle(0x4A2C0A, 1);
    g.fillRect(x - 7, groundY - 20, 14, 20);
    g.fillStyle(0x6B3E15, 0.6);
    g.fillRect(x - 7, groundY - 20, 6,  20);
  }

  if (level >= 3) {
    g.fillStyle(0xCCCCCC, 1);
    g.fillRect(x - 1, groundY - h - 24, 2, 22);
    g.fillStyle(0xFFD700, 1);
    g.fillTriangle(x + 1, groundY - h - 24, x + 15, groundY - h - 17, x + 1, groundY - h - 10);
  }
}
