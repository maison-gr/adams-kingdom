/**
 * Premium building renderer — 6 unique architectural styles × 4 levels.
 * Shared by GameScene and AttackScene.
 */

export const BUILDING_COLORS = [
  0x27AE60,  // 0 Farm     — fresh green
  0x8E44AD,  // 1 Mill     — mystic purple
  0x2980B9,  // 2 Barracks — steel blue
  0xE67E22,  // 3 Market   — warm orange
  0xC0392B,  // 4 Castle   — crimson
  0xF39C12,  // 5 Palace   — royal gold
];

const ROOF_COLORS = [
  0x7B1818,  // Farm: dark red barn
  0x3D1258,  // Mill: deep violet cone
  0x12243E,  // Barracks: navy battlements
  0x7D3A08,  // Market: burnt sienna gable
  0x4A0C0C,  // Castle: near-black battlements
  0x7A5200,  // Palace: antique gold dome
];

// ── Colour utilities ─────────────────────────────────────────────────────────

function darken(hex, f) {
  const r = Math.max(0, Math.round(((hex >> 16) & 0xFF) * (1 - f)));
  const g = Math.max(0, Math.round(((hex >>  8) & 0xFF) * (1 - f)));
  const b = Math.max(0, Math.round(( hex        & 0xFF) * (1 - f)));
  return (r << 16) | (g << 8) | b;
}

function lighten(hex, f) {
  const add = Math.round(f * 220);
  const r = Math.min(255, ((hex >> 16) & 0xFF) + add);
  const g = Math.min(255, ((hex >>  8) & 0xFF) + add);
  const b = Math.min(255, ( hex        & 0xFF) + add);
  return (r << 16) | (g << 8) | b;
}

// ── Shared drawing primitives ─────────────────────────────────────────────────

function shadow(g, x, gy, w, h) {
  g.fillStyle(0x000000, 0.20);
  g.fillRect(x - w / 2 + 5, gy - h + 7, w + 5, h);
}

// Front face + right side wall + left highlight + outline
function body3D(g, x, gy, w, h, col, sideW = 7) {
  // Side wall
  g.fillStyle(darken(col, 0.38), 1);
  g.fillRect(x + w / 2, gy - h + 5, sideW, h - 5);
  g.fillStyle(darken(col, 0.55), 1);
  g.fillRect(x + w / 2, gy - h + 5, sideW, 4); // top edge darker

  // Front face
  g.fillStyle(col, 1);
  g.fillRect(x - w / 2, gy - h, w, h);

  // Left highlight
  g.fillStyle(lighten(col, 0.22), 0.38);
  g.fillRect(x - w / 2, gy - h, Math.floor(w * 0.24), h);

  // Top ceiling glint
  g.fillStyle(0xFFFFFF, 0.07);
  g.fillRect(x - w / 2, gy - h, w, Math.floor(h * 0.10));

  // Right shadow on front
  g.fillStyle(0x000000, 0.14);
  g.fillRect(x + Math.floor(w * 0.30), gy - h, Math.floor(w * 0.20), h);

  // Thin outline
  g.lineStyle(1, darken(col, 0.50), 0.55);
  g.strokeRect(x - w / 2, gy - h, w, h);
}

// Gable (triangular) roof
function roofGable(g, x, topY, w, h, col, overhang = 5) {
  // Underside shadow
  g.fillStyle(0x000000, 0.20);
  g.fillTriangle(x - w / 2 - overhang + 2, topY + 3, x + w / 2 + overhang + 5, topY + 3, x + 2, topY - h + 3);

  // Main roof
  g.fillStyle(col, 1);
  g.fillTriangle(x - w / 2 - overhang, topY, x + w / 2 + overhang, topY, x, topY - h);

  // Left face highlight
  g.fillStyle(0xFFFFFF, 0.10);
  g.fillTriangle(x - w / 2 - overhang, topY, x, topY, x, topY - h);

  // Eave line
  g.lineStyle(1, darken(col, 0.30), 0.65);
  g.lineBetween(x - w / 2 - overhang, topY, x + w / 2 + overhang, topY);
}

// Conical (pointed) roof for tower/mill
function roofCone(g, x, topY, w, h, col) {
  // Shadow side
  g.fillStyle(darken(col, 0.28), 1);
  g.fillTriangle(x, topY - h, x, topY, x + w / 2 + 2, topY);

  // Main cone
  g.fillStyle(col, 1);
  g.fillTriangle(x - w / 2, topY, x + w / 2, topY, x, topY - h);

  // Left highlight
  g.fillStyle(0xFFFFFF, 0.12);
  g.fillTriangle(x - w / 2, topY, x, topY, x, topY - h);

  // Base ring
  g.fillStyle(darken(col, 0.15), 1);
  g.fillRect(x - w / 2 - 2, topY - 4, w + 4, 5);
}

// Flat top with battlements (crenellations)
function roofBattle(g, x, topY, w, col, count) {
  const bW  = Math.max(4, Math.floor(w / (count * 2 - 1)));
  const gap = Math.floor((w - bW * count) / Math.max(count - 1, 1));
  const step = bW + gap;
  const startX = x - Math.floor((count * step - gap) / 2);

  g.fillStyle(darken(col, 0.10), 1);
  for (let i = 0; i < count; i++) {
    g.fillRect(startX + i * step, topY - 10, bW, 10);
  }
  // Floor strip
  g.fillStyle(darken(col, 0.18), 1);
  g.fillRect(x - w / 2, topY - 2, w, 2);
}

// Window (lit = warm glow, unlit = cool glass)
function win(g, x, y, lit, ww = 9, wh = 12) {
  // Frame
  g.fillStyle(0x000000, 0.45);
  g.fillRect(x - ww / 2 - 1, y - 1, ww + 2, wh + 2);

  // Glass
  g.fillStyle(lit ? 0xFFF5B0 : 0x4A7A9B, lit ? 0.92 : 0.55);
  g.fillRect(x - ww / 2, y, ww, wh);

  // Highlight
  if (lit) {
    g.fillStyle(0xFFFFFF, 0.38);
    g.fillRect(x - ww / 2, y, Math.floor(ww * 0.45), Math.floor(wh * 0.5));
  }

  // Pane lines
  g.lineStyle(0.8, 0x000000, 0.22);
  g.lineBetween(x, y, x, y + wh);
  g.lineBetween(x - ww / 2, y + Math.floor(wh * 0.55), x + ww / 2, y + Math.floor(wh * 0.55));
}

// Arched wooden door
function door(g, x, gy, dw, dh, col) {
  const r = dw / 2;
  // Frame
  g.fillStyle(darken(col, 0.45), 1);
  g.fillRect(x - r - 1, gy - dh - 1, dw + 2, dh + 1);
  g.fillCircle(x, gy - dh, r + 1);
  // Surface
  g.fillStyle(col, 1);
  g.fillRect(x - r, gy - dh, dw, dh);
  g.fillCircle(x, gy - dh, r);
  // Highlight
  g.fillStyle(0xFFFFFF, 0.12);
  g.fillRect(x - r, gy - dh, Math.floor(dw * 0.35), dh);
  // Handle
  g.fillStyle(0xFFD700, 1);
  g.fillCircle(x + r * 0.35, gy - dh / 2, 1.5);
}

// ── Ruins ─────────────────────────────────────────────────────────────────────

function drawRuins(g, x, gy, index) {
  const hint = darken(BUILDING_COLORS[index], 0.52);

  // Broken wall pieces at irregular heights
  g.fillStyle(0x383838, 1);
  g.fillRect(x - 22, gy - 42, 13, 42);
  g.fillStyle(0x444444, 1);
  g.fillRect(x - 8,  gy - 25, 11, 25);
  g.fillStyle(0x3C3C3C, 1);
  g.fillRect(x + 5,  gy - 35, 14, 35);

  // Faint original colour hints
  g.fillStyle(hint, 0.32);
  g.fillRect(x - 22, gy - 42, 13, 42);
  g.fillRect(x + 5,  gy - 35, 14, 35);

  // Broken roof remnant (angled left)
  g.fillStyle(0x2A1414, 0.62);
  g.fillTriangle(x - 24, gy - 42, x + 7, gy - 42, x - 10, gy - 58);

  // Rubble at base
  g.fillStyle(0x555555, 0.82);
  [[x-20,gy-5,8,5],[x-10,gy-3,6,3],[x+7,gy-6,8,6],[x+16,gy-3,5,3],[x-24,gy-2,5,2]].forEach(
    ([rx,ry,rw,rh]) => g.fillRect(rx, ry, rw, rh)
  );

  // Moss
  g.fillStyle(0x2D6B28, 0.52);
  g.fillCircle(x - 15, gy - 42, 4.5);
  g.fillCircle(x + 11,  gy - 35, 3.5);
  g.fillCircle(x - 3,   gy - 25, 2.5);

  // Cracks
  g.lineStyle(1, 0x1A1A1A, 0.55);
  g.lineBetween(x - 16, gy - 42, x - 14, gy - 28);
  g.lineBetween(x + 12,  gy - 35, x + 10, gy - 18);
}

// ── Building 0: Farm ──────────────────────────────────────────────────────────

function drawFarm(g, x, gy, level) {
  const col  = BUILDING_COLORS[0];
  const roof = ROOF_COLORS[0];
  const w    = 46;
  const bh   = level === 1 ? 40 : level === 2 ? 56 : 70;

  shadow(g, x, gy, w, bh);
  body3D(g, x, gy, w, bh, col, 7);
  roofGable(g, x, gy - bh, w, 22, roof, 6);

  // Large barn door
  door(g, x, gy, 13, 22, 0x4A2C0A);

  if (level >= 2) {
    // Barn windows (cross-pane)
    win(g, x - 13, gy - bh + 16, true, 11, 13);
    win(g, x + 3,  gy - bh + 16, true, 11, 13);
    // Hay bales flanking door
    g.fillStyle(0xC9990C, 1);
    g.fillRect(x - 22, gy - 10, 9, 10);
    g.fillRect(x + 14,  gy - 10, 9, 10);
    g.lineStyle(1, 0x8B6B00, 0.8);
    g.strokeRect(x - 22, gy - 10, 9, 10);
    g.strokeRect(x + 14,  gy - 10, 9, 10);
    // Hay stripes
    g.lineStyle(0.8, 0xA07C00, 0.5);
    g.lineBetween(x - 21, gy - 6, x - 14, gy - 6);
    g.lineBetween(x + 15,  gy - 6, x + 22, gy - 6);
  }

  if (level >= 3) {
    // Silo to the right of barn
    g.fillStyle(darken(col, 0.14), 1);
    g.fillRect(x + 27, gy - 62, 14, 62);
    g.fillStyle(lighten(col, 0.10), 0.30);
    g.fillRect(x + 27, gy - 62, 5, 62);
    g.fillStyle(darken(roof, 0.08), 1);
    g.fillEllipse(x + 34, gy - 62, 16, 10);
    g.lineStyle(1, darken(col, 0.45), 0.6);
    g.strokeRect(x + 27, gy - 62, 14, 62);
    // Weathervane on roof peak
    const tipY = gy - bh - 22;
    g.fillStyle(0xCCCCCC, 1);
    g.fillRect(x - 1, tipY - 12, 2, 12);
    g.fillStyle(0xFFD700, 1);
    g.fillTriangle(x + 1, tipY - 12, x + 13, tipY - 6, x + 1, tipY);
  }
}

// ── Building 1: Mill ─────────────────────────────────────────────────────────

function drawMill(g, x, gy, level) {
  const col  = BUILDING_COLORS[1];
  const roof = ROOF_COLORS[1];
  const w    = 30;
  const bh   = level === 1 ? 46 : level === 2 ? 64 : 84;

  shadow(g, x, gy, w, bh);
  body3D(g, x, gy, w, bh, col, 6);

  // Stone block texture (mortar lines)
  g.lineStyle(0.8, darken(col, 0.42), 0.32);
  for (let sy = gy - bh + 8; sy < gy - 4; sy += 9) {
    g.lineBetween(x - w / 2 + 1, sy, x + w / 2 - 1, sy);
  }
  // Offset vertical joints (alternating rows)
  g.lineStyle(0.6, darken(col, 0.38), 0.22);
  for (let sy = gy - bh + 12; sy < gy - 4; sy += 18) {
    g.lineBetween(x, sy, x, sy + 9);
    g.lineBetween(x - 10, sy + 9, x - 10, sy + 18);
    g.lineBetween(x + 10, sy + 9, x + 10, sy + 18);
  }

  roofCone(g, x, gy - bh, w + 4, 30, roof);
  door(g, x, gy, 10, 19, 0x3D1F0A);

  if (level >= 2) {
    // Porthole window
    g.fillStyle(0xFFF5B0, 0.90);
    g.fillCircle(x, gy - bh + 22, 7);
    g.fillStyle(0xFFFFFF, 0.32);
    g.fillCircle(x - 2, gy - bh + 20, 3.5);
    g.lineStyle(2, darken(col, 0.5), 0.85);
    g.strokeCircle(x, gy - bh + 22, 7);
    // Corner quoins
    g.fillStyle(lighten(col, 0.14), 0.45);
    [gy-bh+2, gy-bh+20, gy-bh+38, gy-22].forEach(qy => {
      g.fillRect(x - w / 2 - 1, qy, 5, 7);
      g.fillRect(x + w / 2 - 4, qy, 5, 7);
    });
  }

  if (level >= 3) {
    // Windmill blades (4 sails radiating from cone tip)
    const sx = x, sy = gy - bh - 26;
    [[-40,0],[40,0],[0,-40],[0,40]].forEach(([dx, dy]) => {
      const ex = sx + dx * 0.52, ey = sy + dy * 0.52;
      g.fillStyle(lighten(col, 0.16), 0.88);
      g.fillRect(Math.min(sx, ex) - 3, Math.min(sy, ey) - 3,
                 Math.abs(dx) * 0.52 + 6, Math.abs(dy) * 0.52 + 6);
      g.fillStyle(darken(col, 0.20), 0.6);
      g.fillRect(Math.min(sx, ex) - 1, Math.min(sy, ey) - 1,
                 Math.abs(dx) * 0.52 + 2, Math.abs(dy) * 0.52 + 2);
    });
    g.fillStyle(0xD4A017, 1);
    g.fillCircle(sx, sy, 4);
  }
}

// ── Building 2: Barracks ──────────────────────────────────────────────────────

function drawBarracks(g, x, gy, level) {
  const col  = BUILDING_COLORS[2];
  const w    = 48;
  const bh   = level === 1 ? 44 : level === 2 ? 60 : 78;

  shadow(g, x, gy, w, bh);
  body3D(g, x, gy, w, bh, col, 8);
  roofBattle(g, x, gy - bh, w, col, 5);

  // Reinforced door
  door(g, x, gy, 13, 22, 0x1C0E08);
  // Door metal bands
  g.fillStyle(0x4A4A4A, 0.75);
  g.fillRect(x - 7, gy - 16, 14, 2);
  g.fillRect(x - 7, gy - 8,  14, 2);

  if (level >= 2) {
    // Arrow-slit windows (tall narrow)
    [-14, 14].forEach(dx => {
      g.fillStyle(0x000000, 0.80);
      g.fillRect(x + dx - 2, gy - bh + 12, 4, 18);
      g.fillStyle(0xFFF5B0, 0.22);
      g.fillRect(x + dx - 1, gy - bh + 13, 2, 16);
    });
    // Torches flanking door
    [-1, 1].forEach(s => {
      const tx = x + s * 10;
      g.fillStyle(0x6B3A1F, 1);
      g.fillRect(tx - 1, gy - 35, 2, 10);
      g.fillStyle(0xFF8C00, 0.92);
      g.fillCircle(tx, gy - 37, 3.5);
      g.fillStyle(0xFFD700, 0.55);
      g.fillCircle(tx, gy - 37, 2);
    });
  }

  if (level >= 3) {
    // Side watchtower (left)
    const tx = x - w / 2 - 9;
    g.fillStyle(darken(col, 0.08), 1);
    g.fillRect(tx - 7, gy - bh - 14, 14, bh + 14);
    g.fillStyle(lighten(col, 0.10), 0.28);
    g.fillRect(tx - 7, gy - bh - 14, 5, bh + 14);
    // Tower battlements
    [-4, 1].forEach(bx => g.fillRect(tx + bx, gy - bh - 22, 4, 8));
    // Tower slit
    g.fillStyle(0x000000, 0.78);
    g.fillRect(tx - 2, gy - bh - 4, 4, 16);
    // Wall link
    g.fillStyle(darken(col, 0.12), 0.6);
    g.fillRect(x - w / 2 - 9, gy - bh + 4, 9, 8);
    // Flag on main building
    g.fillStyle(0xBBBBBB, 1);
    g.fillRect(x + 18, gy - bh - 26, 2, 22);
    g.fillStyle(0xFF4444, 1);
    g.fillTriangle(x + 20, gy - bh - 26, x + 34, gy - bh - 19, x + 20, gy - bh - 12);
  }
}

// ── Building 3: Market ────────────────────────────────────────────────────────

function drawMarket(g, x, gy, level) {
  const col  = BUILDING_COLORS[3];
  const roof = ROOF_COLORS[3];
  const w    = 42;
  const bh   = level === 1 ? 42 : level === 2 ? 58 : 74;

  shadow(g, x, gy, w, bh);
  body3D(g, x, gy, w, bh, col, 7);
  roofGable(g, x, gy - bh, w, 22, roof, 5);

  // Wide entrance arch
  door(g, x, gy, 14, 24, 0x3D1F0A);

  if (level >= 2) {
    // Striped canvas awning
    const awY = gy - Math.floor(bh * 0.5);
    const colors = [0xFFF5A0, darken(col, 0.08)];
    for (let s = 0; s < 6; s++) {
      g.fillStyle(colors[s % 2], 0.95);
      g.fillRect(x - w / 2 - 8 + s * 8, awY, 8, 10);
    }
    g.lineStyle(1, darken(col, 0.40), 0.65);
    g.strokeRect(x - w / 2 - 8, awY, w + 16, 10);
    // Awning fringe (triangles along bottom)
    g.fillStyle(col, 0.9);
    for (let f = 0; f < 7; f++) {
      const fx = x - w / 2 - 7 + f * 8;
      g.fillTriangle(fx, awY + 10, fx + 6, awY + 10, fx + 3, awY + 15);
    }
    // Goods crates on ground
    [[x-20,gy-9,9,9],[x+12,gy-9,9,9]].forEach(([cx,cy,cw,ch]) => {
      g.fillStyle(0x7B4E2A, 1);
      g.fillRect(cx, cy, cw, ch);
      g.lineStyle(1, 0x503015, 0.7);
      g.strokeRect(cx, cy, cw, ch);
      g.lineStyle(0.8, 0x503015, 0.4);
      g.lineBetween(cx, cy + ch/2, cx + cw, cy + ch/2);
    });
    // Shop windows
    win(g, x - 11, gy - bh + 14, true, 11, 13);
    win(g, x + 2,  gy - bh + 14, true, 11, 13);
  }

  if (level >= 3) {
    // Hanging sign banner
    const bY = gy - bh * 0.65;
    g.fillStyle(darken(col, 0.22), 0.92);
    g.fillRect(x - 17, bY, 34, 14);
    g.fillStyle(0xFFD700, 1);
    g.fillRect(x - 15, bY + 3, 30, 2);
    g.fillRect(x - 15, bY + 8, 30, 2);
    // Banner string & tassels
    g.lineStyle(1, 0xFFD700, 0.7);
    [-12,-4,4,12].forEach(sx => {
      g.lineBetween(x+sx, bY+14, x+sx-2, bY+20);
      g.fillStyle(0xFFD700, 0.8);
      g.fillCircle(x+sx-2, bY+21, 2);
    });
    // Upper display window
    win(g, x, gy - bh + 7, true, 22, 14);
    g.lineStyle(1.5, 0xFFD700, 0.65);
    g.strokeRect(x - 12, gy - bh + 6, 24, 16);
  }
}

// ── Building 4: Castle ────────────────────────────────────────────────────────

function drawCastle(g, x, gy, level) {
  const col  = BUILDING_COLORS[4];
  const w    = 40;
  const bh   = level === 1 ? 56 : level === 2 ? 76 : 98;

  shadow(g, x, gy, w, bh);
  body3D(g, x, gy, w, bh, col, 8);
  roofBattle(g, x, gy - bh, w, col, 6);

  // Portcullis gate
  const gW = 16;
  g.fillStyle(0x120808, 1);
  g.fillRect(x - gW / 2, gy - 28, gW, 28);
  g.fillCircle(x, gy - 28, gW / 2);
  // Portcullis bars
  g.lineStyle(2, 0x3A3A3A, 0.9);
  [-5, 0, 5].forEach(dx => g.lineBetween(x + dx, gy - 26, x + dx, gy));
  [-20, -13].forEach(dy => g.lineBetween(x - gW/2, gy + dy, x + gW/2, gy + dy));
  // Gate arch keystone
  g.fillStyle(lighten(col, 0.14), 0.55);
  g.fillRect(x - 3, gy - 34, 6, 8);

  if (level >= 2) {
    // Cross arrow-loop windows
    const crossY = gy - Math.floor(bh * 0.6);
    [-12, 12].forEach(dx => {
      g.fillStyle(0x000000, 0.80);
      g.fillRect(x + dx - 2, crossY, 4, 18);
      g.fillRect(x + dx - 6, crossY + 6, 12, 4);
      g.fillStyle(0xFFF5B0, 0.18);
      g.fillRect(x + dx - 1, crossY + 1, 2, 16);
    });
    // Stone coursing
    g.lineStyle(0.8, darken(col, 0.45), 0.28);
    for (let sy = gy - bh + 8; sy < gy - 30; sy += 9) {
      g.lineBetween(x - w/2 + 2, sy, x + w/2 - 2, sy);
    }
    // Wall torches
    [-1, 1].forEach(s => {
      const tx = x + s * (w/2 - 4);
      g.fillStyle(0xFF8C00, 0.9);
      g.fillCircle(tx, gy - bh + 10, 3.5);
      g.fillStyle(0xFFD700, 0.5);
      g.fillCircle(tx, gy - bh + 10, 1.8);
    });
  }

  if (level >= 3) {
    // Flanking turrets
    [-1, 1].forEach(side => {
      const tx = x + side * (w / 2 + 8);
      const th = bh + 18;
      g.fillStyle(darken(col, 0.06), 1);
      g.fillRect(tx - 7, gy - th, 14, th);
      g.fillStyle(lighten(col, 0.10), 0.25);
      g.fillRect(tx - 7, gy - th, 5, th);
      // Turret battlements
      [-4, 1].forEach(bx => g.fillRect(tx + bx, gy - th - 8, 4, 8));
      // Turret slit
      g.fillStyle(0x000000, 0.78);
      g.fillRect(tx - 1, gy - th + 14, 3, 12);
    });
    // Dual flags
    [-16, 16].forEach((dx, si) => {
      g.fillStyle(0xBBBBBB, 1);
      g.fillRect(x + dx, gy - bh - 28, 2, 24);
      g.fillStyle(si === 0 ? 0xFFD700 : 0xFF4444, 1);
      g.fillTriangle(x+dx+2, gy-bh-28, x+dx+16, gy-bh-21, x+dx+2, gy-bh-14);
    });
  }
}

// ── Building 5: Palace ────────────────────────────────────────────────────────

function drawPalace(g, x, gy, level) {
  const col  = BUILDING_COLORS[5];
  const roof = ROOF_COLORS[5];
  const w    = 52;
  const bh   = level === 1 ? 58 : level === 2 ? 78 : 100;

  shadow(g, x, gy, w + 4, bh);
  body3D(g, x, gy, w, bh, col, 9);

  // Ornate horizontal frieze band
  const frY = gy - Math.floor(bh * 0.42);
  g.fillStyle(lighten(col, 0.20), 0.55);
  g.fillRect(x - w / 2, frY, w, 6);
  g.lineStyle(0.5, darken(col, 0.40), 0.5);
  g.strokeRect(x - w / 2, frY, w, 6);
  // Frieze gems
  g.fillStyle(0xFFD700, 0.85);
  for (let fx = x - w / 2 + 5; fx < x + w / 2 - 4; fx += 8) {
    g.fillCircle(fx, frY + 3, 1.5);
  }

  // Onion dome
  const domeY = gy - bh;
  g.fillStyle(darken(roof, 0.05), 1);
  g.fillRect(x - 18, domeY - 5, 36, 7);
  g.fillStyle(roof, 1);
  g.fillEllipse(x, domeY - 18, 38, 28);
  g.fillStyle(lighten(roof, 0.22), 0.42);
  g.fillEllipse(x - 6, domeY - 22, 18, 16);
  g.fillStyle(lighten(roof, 0.12), 1);
  g.fillEllipse(x, domeY - 28, 16, 14);

  // Grand entrance
  door(g, x, gy, 16, 28, 0x3D1F0A);
  // Gold arch trim
  g.lineStyle(2, 0xFFD700, 0.88);
  g.strokeRect(x - 9, gy - 28, 18, 28);
  g.strokeCircle(x, gy - 28, 9);

  if (level >= 2) {
    // Tall arched windows
    [-16, 16].forEach(dx => {
      win(g, x + dx, gy - Math.floor(bh * 0.75), true, 10, 18);
      g.lineStyle(1.5, 0xFFD700, 0.68);
      g.strokeRect(x + dx - 6, gy - Math.floor(bh * 0.75) - 1, 12, 20);
      // Arch top on window
      g.strokeCircle(x + dx, gy - Math.floor(bh * 0.75) - 1, 6);
    });
    // Column pilasters on facade
    [-1, 1].forEach(s => {
      const cx = x + s * (w / 2 - 4);
      g.fillStyle(lighten(col, 0.24), 0.48);
      g.fillRect(cx - 3, gy - bh, 5, bh);
      g.lineStyle(0.5, darken(col, 0.30), 0.35);
      g.strokeRect(cx - 3, gy - bh, 5, bh);
    });
  }

  if (level >= 3) {
    // Central golden spire on dome
    g.fillStyle(0xBBBBBB, 1);
    g.fillRect(x - 1, gy - bh - 38, 2, 14);
    g.fillStyle(0xFFD700, 1);
    g.fillCircle(x, gy - bh - 38, 4);
    g.fillTriangle(x - 2, gy - bh - 42, x + 2, gy - bh - 42, x, gy - bh - 55);
    // Grand entrance steps
    g.fillStyle(lighten(col, 0.12), 0.65);
    g.fillRect(x - w/2 - 4, gy - 5, w + 8, 5);
    g.fillRect(x - w/2 - 8, gy,     w + 16, 4);
    // Gate pillar posts
    [-1, 1].forEach(s => {
      const px = x + s * (w / 2 + 14);
      g.fillStyle(lighten(col, 0.24), 1);
      g.fillRect(px - 3, gy - 36, 6, 36);
      g.fillStyle(0xFFD700, 1);
      g.fillCircle(px, gy - 36, 5);
      g.lineStyle(1, darken(col, 0.4), 0.6);
      g.strokeRect(px - 3, gy - 36, 6, 36);
    });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

const BUILDERS = [drawFarm, drawMill, drawBarracks, drawMarket, drawCastle, drawPalace];

export function drawBuilding(g, x, groundY, index, level) {
  g.clear();
  if (level === 0) { drawRuins(g, x, groundY, index); return; }
  BUILDERS[index]?.(g, x, groundY, level);
}
