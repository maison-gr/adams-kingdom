export const STREAK_REWARDS = [
  { day: 1, icon: '🎰', label: '+10 Spins',              reward: { spins: 10 } },
  { day: 2, icon: '💰', label: '+500 Coins',             reward: { coins: 500 } },
  { day: 3, icon: '🎁', label: '1 Gold Chest',           reward: { chest: 'gold' } },
  { day: 4, icon: '🎰', label: '+20 Spins',              reward: { spins: 20 } },
  { day: 5, icon: '💰', label: '+2,000 Coins',           reward: { coins: 2000 } },
  { day: 6, icon: '🛡️', label: '1 Shield  +10 Spins',   reward: { shield: 1, spins: 10 } },
  { day: 7, icon: '🏆', label: '+5K Coins  +30 Spins',  reward: { coins: 5000, spins: 30 } },
];

export class LoginStreak {
  constructor() {
    this.streak    = parseInt(localStorage.getItem('loginStreak')  || '0');
    this.lastLogin = parseInt(localStorage.getItem('loginLastDay') || '0');
  }

  // Returns null if already claimed today; else { reward, streak, dayDef }
  check() {
    const today = Math.floor(Date.now() / 86400000);
    if (this.lastLogin === today) return null;

    if (this.lastLogin < today - 1) this.streak = 0; // streak broken by absence

    this.streak    = (this.streak % 7) + 1;
    this.lastLogin = today;
    localStorage.setItem('loginStreak',  String(this.streak));
    localStorage.setItem('loginLastDay', String(today));

    const dayDef = STREAK_REWARDS[this.streak - 1];
    return { reward: dayDef.reward, streak: this.streak, dayDef };
  }
}
