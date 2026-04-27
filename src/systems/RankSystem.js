// Player identity progression: XP → Rank → Title
// Ranks gate cosmetic changes and leaderboard identity.

export const RANKS = [
  { rank: 0, title: 'Peasant',  color: 0x888888, xpNeeded: 500  },
  { rank: 1, title: 'Knight',   color: 0x4A9ECC, xpNeeded: 1500 },
  { rank: 2, title: 'Baron',    color: 0x2ECC71, xpNeeded: 3500 },
  { rank: 3, title: 'Count',    color: 0xE67E22, xpNeeded: 7000 },
  { rank: 4, title: 'Duke',     color: 0x9B59B6, xpNeeded: 14000 },
  { rank: 5, title: 'King',     color: 0xE74C3C, xpNeeded: 28000 },
  { rank: 6, title: 'Emperor',  color: 0xFFD700, xpNeeded: Infinity },
];

// XP awarded per action type
const XP_TABLE = {
  coins:       5,
  attack:      30,
  raid:        25,
  chest:       20,
  shield:      8,
  spin:        10,
  jackpot:     80,
  upgrade:     40,
  combo3:      15,
  feverTrigger: 50,
  missionDone: 60,
};

export class RankSystem {
  constructor() {
    this.xp   = parseInt(localStorage.getItem('playerXP')   || '0');
    this.rank = parseInt(localStorage.getItem('playerRank') || '0');
  }

  _save() {
    localStorage.setItem('playerXP',   String(this.xp));
    localStorage.setItem('playerRank', String(this.rank));
  }

  // Add XP for a named action. Returns { rankUp, newRank } if rank changed.
  award(action, multiplier = 1) {
    const base = XP_TABLE[action] ?? 5;
    this.xp += Math.round(base * multiplier);

    const prevRank = this.rank;
    while (
      this.rank < RANKS.length - 1 &&
      this.xp >= this._totalXpForRank(this.rank + 1)
    ) {
      this.rank++;
    }

    this._save();

    if (this.rank > prevRank) {
      return { rankUp: true, newRank: this.rank, def: RANKS[this.rank] };
    }
    return { rankUp: false };
  }

  // XP needed from 0 to reach a given rank
  _totalXpForRank(targetRank) {
    let total = 0;
    for (let r = 0; r < targetRank; r++) total += RANKS[r].xpNeeded;
    return total;
  }

  get currentDef()    { return RANKS[this.rank]; }
  get xpIntoRank()    { return this.xp - this._totalXpForRank(this.rank); }
  get xpForNextRank() { return RANKS[this.rank]?.xpNeeded ?? Infinity; }
  get progressPct()   { return Math.min(this.xpIntoRank / this.xpForNextRank, 1); }
  get isMaxRank()     { return this.rank >= RANKS.length - 1; }
}
