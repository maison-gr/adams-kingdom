// Shared wheel segment definitions — used by GameScene and BossScene.
export const SEGMENTS = [
  { label: 'COIN\nBURST',    color: 0x8B0000, light: 0xFF4D4D, type: 'coins',   value: 100,  weight: 10 },
  { label: 'SUPER\nATTACK',  color: 0xA83200, light: 0xFF6A1A, type: 'attack',  value: 0,    weight: 8  },
  { label: 'GOLD\nRUSH',     color: 0x0F6B2E, light: 0x2ECC71, type: 'coins',   value: 500,  weight: 9  },
  { label: 'MEGA\nSHIELD',   color: 0x0A2E6E, light: 0x3498DB, type: 'shield',  value: 0,    weight: 7  },
  { label: '💰 JACKPOT 💰',  color: 0x3B2000, light: 0xFFD700, type: 'jackpot', value: 5000, weight: 1  },
  { label: 'MYSTERY\nCHEST', color: 0x0D4A3A, light: 0x1ABC9C, type: 'chest',   value: 0,    weight: 6  },
  { label: 'FREE\nSPIN',     color: 0x004D22, light: 0x00FF7F, type: 'spin',    value: 1,    weight: 9  },
  { label: 'BIG\nWIN',       color: 0x7A5200, light: 0xFFA500, type: 'coins',   value: 1000, weight: 7  },
  { label: 'MEGA\nRAID',     color: 0x0A4A5A, light: 0x00BFFF, type: 'raid',    value: 0,    weight: 8  },
];
