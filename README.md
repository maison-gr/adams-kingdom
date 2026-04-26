# Adam's Kingdom

A mobile spin-wheel kingdom builder game by MaisonGR, inspired by Coin Master / Dice Dreams.

## Stack

- **Phaser.js 3** — 2D game framework (renders in browser/WebView)
- **Vite** — dev server and build tool
- **Capacitor** *(planned)* — wraps the web game as a native iOS/Android app

## Gameplay

- Spin the wheel to earn coins, shields, attacks, or extra spins
- Use coins to upgrade 6 kingdom buildings (Farm → Mill → Barracks → Market → Castle → Palace)
- Tap any building to upgrade it if you have enough coins

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
npm run build
# output goes to /dist
```

## Project Structure

```
adams-kingdom/
├── index.html
├── src/
│   ├── main.js          # Phaser game config
│   ├── GameState.js     # State + localStorage persistence
│   └── scenes/
│       ├── BootScene.js
│       └── GameScene.js # Main game: wheel, kingdom, HUD
└── vite.config.js
```

## Roadmap

- [ ] Capacitor setup for Android + iOS packaging
- [ ] Attack mechanics (raid other kingdoms)
- [ ] Node.js + MongoDB backend (leaderboard, social)
- [ ] AdMob rewarded video ads (extra spins)
- [ ] In-app purchases (coin/spin packs)
- [ ] Publish to Google Play + App Store

## Credits

Built by Raed Fadhlaoui — MaisonGR  
Named after Adam (son) and Ghofrane (wife).
