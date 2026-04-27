export const CHEST_DEFS = {
  wood: {
    label:     'Wooden Chest',
    bodyColor: 0x6B3A1F,
    darkColor: 0x3D1F0A,
    lidColor:  0x8B4513,
    bandColor: 0x3D1F0A,
    gemColor:  0xC8A060,
  },
  silver: {
    label:     'Silver Chest',
    bodyColor: 0x556070,
    darkColor: 0x3A4550,
    lidColor:  0x7090A0,
    bandColor: 0x3A4550,
    gemColor:  0xAAC8DD,
  },
  gold: {
    label:     'Golden Chest',
    bodyColor: 0x9A7010,
    darkColor: 0x6A4A00,
    lidColor:  0xD4A000,
    bandColor: 0x6A4A00,
    gemColor:  0xFF4444,
  },
};

const REWARD_TABLES = {
  wood: [
    { type: 'coins',  value: 50,   weight: 30 },
    { type: 'coins',  value: 100,  weight: 25 },
    { type: 'coins',  value: 200,  weight: 15 },
    { type: 'spins',  value: 1,    weight: 20 },
    { type: 'shield', value: 1,    weight: 10 },
  ],
  silver: [
    { type: 'coins',  value: 300,  weight: 25 },
    { type: 'coins',  value: 600,  weight: 20 },
    { type: 'coins',  value: 1000, weight: 10 },
    { type: 'spins',  value: 2,    weight: 25 },
    { type: 'shield', value: 2,    weight: 20 },
  ],
  gold: [
    { type: 'coins',  value: 1000, weight: 20 },
    { type: 'coins',  value: 2500, weight: 15 },
    { type: 'coins',  value: 5000, weight: 5  },
    { type: 'spins',  value: 3,    weight: 30 },
    { type: 'shield', value: 3,    weight: 30 },
  ],
};

function weightedPick(items) {
  const total = items.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return { ...item };
  }
  return { ...items[items.length - 1] };
}

export function generateRewards(chestType, count = 3) {
  const table = REWARD_TABLES[chestType] || REWARD_TABLES.wood;
  return Array.from({ length: count }, () => weightedPick(table));
}

export function randomChestType() {
  const r = Math.random();
  if (r < 0.07) return 'gold';
  if (r < 0.35) return 'silver';
  return 'wood';
}
