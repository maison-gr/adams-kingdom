// Tracks combo streak, multiplier tiers, and Fever Mode.
// Lives on GameScene as this.comboSystem — shared via scene reference.

const FEVER_THRESHOLD = 8;   // streak hits needed to ignite Fever
const FEVER_DURATION  = 10;  // spins while Fever is active
const STREAK_BREAKERS = new Set(['shield']);

export class ComboSystem {
  constructor() {
    this.streak      = 0;
    this.feverActive = false;
    this.feverLeft   = 0;
  }

  // Call once per spin with the winning segment type.
  // Returns a descriptor consumed by GameScene + RewardSystem.
  record(type) {
    // Shield kills the streak
    if (STREAK_BREAKERS.has(type)) {
      const wasInFever = this.feverActive;
      this.streak      = 0;
      this.feverActive = false;
      this.feverLeft   = 0;
      return { multiplier: 1, streakBroken: true, feverEnded: wasInFever };
    }

    // Already in Fever — count down
    if (this.feverActive) {
      this.feverLeft--;
      const ended = this.feverLeft <= 0;
      if (ended) { this.feverActive = false; this.streak = 0; }
      return {
        multiplier:  2,
        feverActive: !ended,
        feverLeft:   this.feverLeft,
        feverEnded:  ended,
      };
    }

    // Normal streak growth
    this.streak++;

    if (this.streak >= FEVER_THRESHOLD) {
      this.feverActive = true;
      this.feverLeft   = FEVER_DURATION;
      this.streak      = 0;
      return { multiplier: 2, feverTriggered: true, feverLeft: FEVER_DURATION };
    }

    return {
      multiplier: this.streak >= 5 ? 2 : this.streak >= 3 ? 1.5 : 1,
      streak: this.streak,
    };
  }

  // Current multiplier without recording a new spin (used for display)
  get multiplier() {
    if (this.feverActive)  return 2;
    if (this.streak >= 5)  return 2;
    if (this.streak >= 3)  return 1.5;
    return 1;
  }
}
