export const GameState = {
  coins: parseInt(localStorage.getItem('coins') || '500'),
  spins: parseInt(localStorage.getItem('spins') || '10'),
  shields: parseInt(localStorage.getItem('shields') || '0'),
  attacks: parseInt(localStorage.getItem('attacks') || '0'),
  buildings: JSON.parse(localStorage.getItem('buildings') || '[0,0,0,0,0,0]'),

  save() {
    localStorage.setItem('coins', this.coins);
    localStorage.setItem('spins', this.spins);
    localStorage.setItem('shields', this.shields);
    localStorage.setItem('attacks', this.attacks);
    localStorage.setItem('buildings', JSON.stringify(this.buildings));
  },

  addCoins(amount) {
    this.coins += amount;
    this.save();
  },

  addSpins(amount) {
    this.spins += amount;
    this.save();
  },

  useSpin() {
    if (this.spins > 0) { this.spins--; this.save(); return true; }
    return false;
  },

  addShield() {
    this.shields++;
    this.save();
  },

  addAttack() {
    this.attacks++;
    this.save();
  },
};
