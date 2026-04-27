// AI rival system — 3 persistent rivals per player, simulated offline attacks.

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const RIVAL_NAMES = [
  'Storm Knight', 'Lady Frost',  'Iron Duke',
  'Shadow Fox',   'Golden Sage', 'Dark Empress',
  'Brave Jarl',   'Moon Queen',  'Fire Baron',
  'Crystal Wolf', 'Night Hawk',  'Stone Giant',
];

// Gap before rival can attack again (30 min)
const ATTACK_COOLDOWN = 30 * 60 * 1000;
// Min session gap before checking offline attack (20 min)
const SESSION_GAP = 20 * 60 * 1000;

function buildingsForLevel(level) {
  // Distribute `level` points across 6 buildings (max 3 each), front-loaded
  const arr = [0, 0, 0, 0, 0, 0];
  let pts = Math.min(level, 18);
  for (let i = 5; i >= 0 && pts > 0; i--) {
    const give = Math.min(3, pts);
    arr[i] = give;
    pts   -= give;
  }
  return arr;
}

export class RivalSystem {
  constructor() {
    this._load();
  }

  _load() {
    const stored = JSON.parse(localStorage.getItem('rivals') || 'null');
    if (stored && stored.length === 3) {
      this.rivals = stored;
    } else {
      this._generateRivals();
    }
    this.lastSessionAt = parseInt(localStorage.getItem('lastSessionAt') || '0');
  }

  _generateRivals() {
    const shuffled = shuffle([...RIVAL_NAMES]);
    this.rivals = shuffled.slice(0, 3).map((name, i) => ({
      name,
      level:          4 + i * 3,               // 4 / 7 / 10
      buildings:      buildingsForLevel(4 + i * 3),
      lastAttackedAt: 0,
      revengeReady:   false,
    }));
    this._save();
  }

  _save() {
    localStorage.setItem('rivals', JSON.stringify(this.rivals));
  }

  // Call once on session start.
  // Returns { rivalName, buildingIndex } if a rival attacked while away, else null.
  checkOfflineAttack() {
    const now = Date.now();
    const gap = now - this.lastSessionAt;
    localStorage.setItem('lastSessionAt', String(now));

    if (this.lastSessionAt === 0 || gap < SESSION_GAP) return null;
    if (Math.random() > 0.55) return null;            // 55% chance they attacked

    // Pick a rival that isn't on cooldown
    const eligible = this.rivals.filter(r => now - r.lastAttackedAt > ATTACK_COOLDOWN);
    if (!eligible.length) return null;

    const rival = eligible[Math.floor(Math.random() * eligible.length)];
    rival.revengeReady   = true;
    rival.lastAttackedAt = now;
    this._save();

    return {
      rivalName:     rival.name,
      buildingIndex: Math.floor(Math.random() * 6),
    };
  }

  // Returns 3 target descriptors for the attack-target selection panel.
  // Slots rivals first; swaps last slot for a live online player if provided.
  getTargets(onlinePlayer = null) {
    const targets = this.rivals.map(r => ({
      name:      r.name,
      buildings: r.buildings,
      loot:      r.buildings.reduce((s, v) => s + v * 200, 100),
      revenge:   r.revengeReady,
      isRival:   true,
      rivalRef:  r,
    }));

    if (onlinePlayer) {
      const bldgs = onlinePlayer.buildings || [1, 1, 0, 0, 0, 0];
      targets[2] = {
        name:      onlinePlayer.name || 'Online Player',
        buildings: bldgs,
        loot:      bldgs.reduce((s, v) => s + v * 250, 150),
        revenge:   false,
        isRival:   false,
        _id:       onlinePlayer._id,
      };
    }

    return targets;
  }

  clearRevenge(rivalName) {
    const r = this.rivals.find(rv => rv.name === rivalName);
    if (r) { r.revengeReady = false; this._save(); }
  }

  // Call after the player completes an attack — evolve the rival slightly
  onAttacked(rivalName) {
    const r = this.rivals.find(rv => rv.name === rivalName);
    if (!r) return;
    // Downgrade a random building that was > 0
    const eligible = r.buildings.map((v, i) => ({ v, i })).filter(x => x.v > 0);
    if (eligible.length) {
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      r.buildings[pick.i] = Math.max(0, r.buildings[pick.i] - 1);
      r.level = Math.max(0, r.level - 1);
    }
    this._save();
  }
}
