const REFILL_INTERVAL = 5 * 60 * 1000; // 1 spin every 5 minutes
const MAX_SPINS = 50;

const NAMES = ['Swift Knight','Bold Baron','Royal Duke','Dark Queen','Storm King',
               'Iron Lord','Golden Mage','Silver Fox','Shadow Prince','Brave Heart'];

function initDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('deviceId', id); }
  return id;
}

function initPlayerName() {
  let name = localStorage.getItem('playerName');
  if (!name) {
    name = NAMES[Math.floor(Math.random() * NAMES.length)];
    localStorage.setItem('playerName', name);
  }
  return name;
}

export const GameState = {
  deviceId:   initDeviceId(),
  playerName: initPlayerName(),
  coins:    parseInt(localStorage.getItem('coins')    || '500'),
  spins:    parseInt(localStorage.getItem('spins')    || '10'),
  shields:  parseInt(localStorage.getItem('shields')  || '0'),
  attacks:  parseInt(localStorage.getItem('attacks')  || '0'),
  buildings: JSON.parse(localStorage.getItem('buildings') || '[0,0,0,0,0,0]'),
  chests:    JSON.parse(localStorage.getItem('chests')    || '[]'),
  refillAt: parseInt(localStorage.getItem('refillAt') || '0'),

  save() {
    localStorage.setItem('coins',    this.coins);
    localStorage.setItem('spins',    this.spins);
    localStorage.setItem('shields',  this.shields);
    localStorage.setItem('attacks',  this.attacks);
    localStorage.setItem('buildings', JSON.stringify(this.buildings));
    localStorage.setItem('chests',    JSON.stringify(this.chests));
    localStorage.setItem('refillAt', this.refillAt);
  },

  addChest(type) {
    const chest = { type, id: Date.now() };
    this.chests.push(chest);
    this.save();
    return chest;
  },

  removeChest(id) {
    this.chests = this.chests.filter(c => c.id !== id);
    this.save();
  },

  // Call on game start and periodically — grants spins earned while away.
  checkRefill() {
    if (this.spins >= MAX_SPINS) return 0;
    const now = Date.now();
    if (!this.refillAt) {
      this.refillAt = now + REFILL_INTERVAL;
      this.save();
      return 0;
    }
    if (now < this.refillAt) return 0;
    const earned = Math.min(
      Math.floor((now - this.refillAt) / REFILL_INTERVAL) + 1,
      MAX_SPINS - this.spins
    );
    this.spins += earned;
    this.refillAt = now + REFILL_INTERVAL;
    this.save();
    return earned;
  },

  msUntilNextSpin() {
    if (this.spins >= MAX_SPINS) return 0;
    return Math.max(0, this.refillAt - Date.now());
  },

  addCoins(amount) { this.coins += amount; this.save(); },
  addSpins(amount) { this.spins = Math.min(this.spins + amount, MAX_SPINS); this.save(); },

  useSpin() {
    if (this.spins <= 0) return false;
    this.spins--;
    if (!this.refillAt) {
      this.refillAt = Date.now() + REFILL_INTERVAL;
    }
    this.save();
    return true;
  },

  addShield()  { this.shields++; this.save(); },
  addAttack()  { this.attacks++; this.save(); },
};
