export const CARD_SETS = [
  {
    id: 'peasant', name: "Peasant's Life", icon: '🌾',
    reward: { coins: 2000, spins: 10 },
    cards: [
      { id: 'p1', name: 'Home',      icon: '🏠', rarity: 'common' },
      { id: 'p2', name: 'Wheat',     icon: '🌾', rarity: 'common' },
      { id: 'p3', name: 'Bucket',    icon: '🪣', rarity: 'common' },
      { id: 'p4', name: 'Hut',       icon: '🛖', rarity: 'rare'   },
      { id: 'p5', name: 'Cow',       icon: '🐄', rarity: 'rare'   },
      { id: 'p6', name: 'Sunflower', icon: '🌻', rarity: 'gold'   },
    ],
  },
  {
    id: 'knight', name: "Knight's Arsenal", icon: '⚔️',
    reward: { coins: 4000, spins: 20 },
    cards: [
      { id: 'k1', name: 'Swords',    icon: '⚔️', rarity: 'common' },
      { id: 'k2', name: 'Shield',    icon: '🛡️', rarity: 'common' },
      { id: 'k3', name: 'Bow',       icon: '🏹', rarity: 'common' },
      { id: 'k4', name: 'Dagger',    icon: '🗡️', rarity: 'rare'   },
      { id: 'k5', name: 'Helmet',    icon: '⛑️', rarity: 'rare'   },
      { id: 'k6', name: 'Warhorse',  icon: '🐴', rarity: 'gold'   },
    ],
  },
  {
    id: 'baron', name: "Baron's Domain", icon: '🏰',
    reward: { coins: 8000, spins: 35 },
    cards: [
      { id: 'b1', name: 'Castle',    icon: '🏰', rarity: 'common' },
      { id: 'b2', name: 'Tower',     icon: '🗼', rarity: 'common' },
      { id: 'b3', name: 'Flag',      icon: '🚩', rarity: 'common' },
      { id: 'b4', name: 'Catapult',  icon: '⚙️', rarity: 'rare'   },
      { id: 'b5', name: 'Moat',      icon: '🌊', rarity: 'rare'   },
      { id: 'b6', name: 'Dragon',    icon: '🐉', rarity: 'gold'   },
    ],
  },
  {
    id: 'count', name: "Count's Treasury", icon: '💎',
    reward: { coins: 15000, spins: 50 },
    cards: [
      { id: 'c1', name: 'Coin',      icon: '🪙', rarity: 'common' },
      { id: 'c2', name: 'Diamond',   icon: '💎', rarity: 'common' },
      { id: 'c3', name: 'Crown',     icon: '👑', rarity: 'common' },
      { id: 'c4', name: 'Crystal',   icon: '🔮', rarity: 'rare'   },
      { id: 'c5', name: 'Ring',      icon: '💍', rarity: 'rare'   },
      { id: 'c6', name: 'Orb',       icon: '✨', rarity: 'gold'   },
    ],
  },
  {
    id: 'emperor', name: "Emperor's Glory", icon: '🏆',
    reward: { coins: 30000, spins: 100 },
    cards: [
      { id: 'e1', name: 'Trophy',    icon: '🏆', rarity: 'common' },
      { id: 'e2', name: 'Medal',     icon: '🎖️', rarity: 'common' },
      { id: 'e3', name: 'Map',       icon: '🗺️', rarity: 'common' },
      { id: 'e4', name: 'Eagle',     icon: '🦅', rarity: 'rare'   },
      { id: 'e5', name: 'Palace',    icon: '🏯', rarity: 'rare'   },
      { id: 'e6', name: 'Phoenix',   icon: '🌟', rarity: 'gold'   },
    ],
  },
];

const CARDS_PER_CHEST = { wood: 1, silver: 2, gold: 3 };

const RARITY_WEIGHTS = {
  wood:   { common: 70, rare: 25, gold: 5  },
  silver: { common: 55, rare: 35, gold: 10 },
  gold:   { common: 40, rare: 45, gold: 15 },
};

export class CardSystem {
  constructor() {
    this.collection = JSON.parse(localStorage.getItem('cardCollection')  || '{}');
    this._claimed   = JSON.parse(localStorage.getItem('cardSetsClaimed') || '[]');
  }

  save() {
    localStorage.setItem('cardCollection',  JSON.stringify(this.collection));
    localStorage.setItem('cardSetsClaimed', JSON.stringify(this._claimed));
  }

  // Draw cards from a chest. Returns array of card defs drawn.
  drawFromChest(chestType) {
    const count   = CARDS_PER_CHEST[chestType] ?? 1;
    const weights = RARITY_WEIGHTS[chestType]  ?? RARITY_WEIGHTS.wood;
    const drawn   = [];
    for (let i = 0; i < count; i++) {
      const card = this._pickCard(weights);
      this.collection[card.id] = (this.collection[card.id] || 0) + 1;
      drawn.push(card);
    }
    this.save();
    return drawn;
  }

  completedSets() {
    return CARD_SETS.filter(set => set.cards.every(c => (this.collection[c.id] || 0) > 0));
  }

  unclaimedComplete() {
    return this.completedSets().filter(s => !this._claimed.includes(s.id));
  }

  claimSet(setId) {
    if (!this._claimed.includes(setId)) {
      this._claimed.push(setId);
      this.save();
    }
  }

  get uniqueCount() {
    return CARD_SETS.flatMap(s => s.cards).filter(c => (this.collection[c.id] || 0) > 0).length;
  }

  get totalCards() {
    return CARD_SETS.reduce((sum, s) => sum + s.cards.length, 0);
  }

  _pickCard(weights) {
    const total = weights.common + weights.rare + weights.gold;
    let   roll  = Math.random() * total;
    let   rarity;
    if      (roll < weights.common)                    rarity = 'common';
    else if (roll < weights.common + weights.rare)     rarity = 'rare';
    else                                               rarity = 'gold';

    const pool = CARD_SETS.flatMap(s => s.cards).filter(c => c.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
