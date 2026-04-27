import { GameState } from '../GameState.js';

const RESET_MS = 24 * 60 * 60 * 1000;

// Full pool — 3 are picked randomly each reset
const POOL = [
  { id: 'spin_15',    label: 'Spin 15 times',          key: 'spins',    target: 15,   reward: { coins: 500 } },
  { id: 'spin_30',    label: 'Spin 30 times',          key: 'spins',    target: 30,   reward: { spins: 5 } },
  { id: 'raid_2',     label: 'Complete 2 raids',       key: 'raids',    target: 2,    reward: { chest: 'gold' } },
  { id: 'raid_3',     label: 'Complete 3 raids',       key: 'raids',    target: 3,    reward: { coins: 1000 } },
  { id: 'attack_2',   label: 'Attack 2 rivals',        key: 'attacks',  target: 2,    reward: { coins: 800 } },
  { id: 'upgrade_1',  label: 'Upgrade a building',     key: 'upgrades', target: 1,    reward: { spins: 3 } },
  { id: 'upgrade_2',  label: 'Upgrade 2 buildings',    key: 'upgrades', target: 2,    reward: { coins: 600 } },
  { id: 'collect_2k', label: 'Collect 2,000 coins',    key: 'coins',    target: 2000, reward: { shields: 2 } },
  { id: 'chest_1',    label: 'Open a chest',           key: 'chests',   target: 1,    reward: { coins: 300 } },
  { id: 'combo_3',    label: 'Hit a 3× combo streak',  key: 'combo',    target: 3,    reward: { spins: 2 } },
];

export class MissionSystem {
  constructor() {
    this._loadOrReset();
  }

  _loadOrReset() {
    const now     = Date.now();
    const stored  = JSON.parse(localStorage.getItem('missions')  || 'null');
    const resetAt = parseInt(localStorage.getItem('missionsResetAt') || '0');

    if (!stored || stored.length === 0 || now >= resetAt) {
      this._generateNew();
    } else {
      this.missions = stored;
      this.resetAt  = resetAt;
    }
  }

  _generateNew() {
    const shuffled = [...POOL].sort(() => Math.random() - 0.5);
    this.missions  = shuffled.slice(0, 3).map(tpl => ({
      ...tpl, progress: 0, done: false, claimed: false,
    }));
    this.resetAt = Date.now() + RESET_MS;
    this._save();
  }

  _save() {
    localStorage.setItem('missions',        JSON.stringify(this.missions));
    localStorage.setItem('missionsResetAt', String(this.resetAt));
  }

  // Advance all missions whose key matches. Returns true if any newly completed.
  progress(key, amount = 1) {
    let changed = false;
    this.missions.forEach(m => {
      if (m.claimed || m.done || m.key !== key) return;
      m.progress = Math.min(m.progress + amount, m.target);
      if (m.progress >= m.target) { m.done = true; changed = true; }
    });
    if (changed) this._save();
    return changed;
  }

  // Apply reward and mark claimed. Returns the reward object or null.
  claim(index) {
    const m = this.missions[index];
    if (!m || !m.done || m.claimed) return null;
    m.claimed = true;
    this._save();

    const r = m.reward;
    if (r.coins)   GameState.addCoins(r.coins);
    if (r.spins)   GameState.addSpins(r.spins);
    if (r.shields) { for (let i = 0; i < r.shields; i++) GameState.addShield(); }
    if (r.chest)   GameState.addChest(r.chest);
    return r;
  }

  pendingCount()  { return this.missions.filter(m => m.done && !m.claimed).length; }
  allClaimed()    { return this.missions.every(m => m.claimed); }
  msUntilReset()  { return Math.max(0, this.resetAt - Date.now()); }
}
