const REFILL_INTERVAL  = 5 * 60 * 1000; // 1 spin every 5 minutes
const MAX_SPINS        = 50;
const PASSIVE_CAP_MS   = 4 * 60 * 60 * 1000; // cap passive earn at 4 hours
const PASSIVE_PER_LVL  = [0, 5, 15, 40];     // coins per minute per building level

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
  refillAt:       parseInt(localStorage.getItem('refillAt')       || '0'),
  passiveCoinsAt: parseInt(localStorage.getItem('passiveCoinsAt') || '0'),

  save() {
    localStorage.setItem('coins',    this.coins);
    localStorage.setItem('spins',    this.spins);
    localStorage.setItem('shields',  this.shields);
    localStorage.setItem('attacks',  this.attacks);
    localStorage.setItem('buildings', JSON.stringify(this.buildings));
    localStorage.setItem('chests',    JSON.stringify(this.chests));
    localStorage.setItem('refillAt',       this.refillAt);
    localStorage.setItem('passiveCoinsAt', this.passiveCoinsAt);
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

  checkPassiveIncome() {
    const now = Date.now();
    if (!this.passiveCoinsAt) {
      this.passiveCoinsAt = now;
      this.save();
      return 0;
    }
    const elapsed = Math.min(now - this.passiveCoinsAt, PASSIVE_CAP_MS);
    const minutes = elapsed / 60000;
    const rate    = this.buildings.reduce((s, lvl) => s + (PASSIVE_PER_LVL[lvl] ?? 0), 0);
    const earned  = Math.floor(rate * minutes);
    this.passiveCoinsAt = now;
    if (earned > 0) this.addCoins(earned); else this.save();
    return earned;
  },

  passiveRatePerHour() {
    const rate = this.buildings.reduce((s, lvl) => s + (PASSIVE_PER_LVL[lvl] ?? 0), 0);
    return Math.round(rate * 60);
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
