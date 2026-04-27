# Adam's Kingdom

A mobile spin-wheel kingdom builder by MaisonGR, inspired by Coin Master / Dice Dreams.  
Named after Adam (son) and Ghofrane (wife).

## Stack

| Layer | Tech |
|---|---|
| Game engine | Phaser.js 3.88 |
| Build tool | Vite 5.4 |
| Native wrapper | Capacitor 6 (iOS + Android) |
| Backend | Node.js 20 + Express + MongoDB |
| State | localStorage + REST API sync |

## Gameplay Loop

1. **Spin** the wheel — land on coins, attack, raid, shield, or extra spin
2. **Build** your kingdom — upgrade 6 buildings (Farm → Mill → Barracks → Market → Castle → Palace)
3. **Attack** an enemy village — destroy a building and steal their coins
4. **Raid** an enemy's land — dig 3 spots from 4 to uncover buried treasure
5. **Shield** protects your own buildings from incoming attacks

### Wheel Segments

| Segment | Effect |
|---|---|
| 100 / 500 / 1000 coins | Added to your balance instantly |
| ATTACK | Opens AttackScene — tap an enemy building to destroy it |
| RAID | Opens RaidScene — dig 3 of 4 spots for buried coins |
| SHIELD | Protects one building from the next attack |
| SPIN +1 | Grants a free extra spin |

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:3000)
npm run dev

# Production build → dist/
npm run build
```

### Backend (optional — game works offline without it)

```bash
cd server
cp .env.example .env      # add your MONGO_URI
npm install
npm run dev               # http://localhost:3001
```

Set `VITE_API_URL=http://localhost:3001/api` in a `.env` file at the project root to connect.

## Project Structure

```
adams-kingdom/
├── src/
│   ├── main.js                   # Phaser config, scene registry
│   ├── GameState.js              # Game state + localStorage + spin refill timer
│   ├── scenes/
│   │   ├── BootScene.js          # Preload / splash
│   │   ├── GameScene.js          # Main scene: wheel, kingdom, HUD
│   │   ├── AttackScene.js        # Enemy village — tap to destroy a building
│   │   └── RaidScene.js          # Dig field — 3 picks from 4 hidden loot spots
│   ├── systems/
│   │   ├── SpinSystem.js         # Wheel rotation, ease-out + bounce-settle
│   │   └── RewardSystem.js       # Dispatches all spin outcomes
│   ├── utils/
│   │   └── buildingRenderer.js   # Shared drawBuilding() — used by Game + Attack
│   ├── effects/
│   │   └── juice.js              # VFX: flyingCoins, burstParticles, goldRain, shieldBubble…
│   └── api/
│       └── client.js             # Offline-safe REST client (sync, raid target, leaderboard)
├── server/
│   └── src/
│       ├── index.js              # Express entry point
│       ├── models/Player.js      # Mongoose schema
│       └── routes/players.js    # POST /sync, GET /raid-target, POST /attack/:id, GET /leaderboard
├── index.html
├── vite.config.js
└── capacitor.config.json
```

## Capacitor (Mobile Build)

```bash
npm run build
npx cap add android      # or ios
npx cap sync
npx cap open android     # opens Android Studio
```

Requires Android Studio (Android) or Xcode 14+ (iOS).

## Roadmap

- [x] Spin wheel with ease-out + bounce-settle physics
- [x] Kingdom buildings — 4 upgrade levels per building
- [x] SpinSystem + RewardSystem modules
- [x] AttackScene — destroy enemy buildings, steal coins
- [x] RaidScene — dig field with hidden loot
- [x] Node.js + MongoDB backend
- [x] Capacitor 6 config for iOS + Android packaging
- [ ] Chest system — win chests, open for random rewards
- [ ] AdMob rewarded video ads (extra spins)
- [ ] In-app purchases (coin/spin packs)
- [ ] In-game leaderboard screen
- [ ] Publish to Google Play + App Store

## Credits

Built by Raed Fadhlaoui — MaisonGR
