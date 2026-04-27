<div align="center">

```
 ░█████╗░██████╗░░█████╗░███╗░░░███╗██╗░██████╗
 ██╔══██╗██╔══██╗██╔══██╗████╗░████║╚█║██╔════╝
 ███████║██║░░██║███████║██╔████╔██║░╚╝╚█████╗░
 ██╔══██║██║░░██║██╔══██║██║╚██╔╝██║░░░░╚═══██╗
 ██║░░██║██████╔╝██║░░██║██║░╚═╝░██║░░░██████╔╝
 ╚═╝░░╚═╝╚═════╝░╚═╝░░╚═╝╚═╝░░░░╚═╝░░░╚═════╝░

 ██╗░░██╗██╗███╗░░██╗░██████╗░██████╗░░█████╗░███╗░░░███╗
 ██║░██╔╝██║████╗░██║██╔════╝░██╔══██╗██╔══██╗████╗░████║
 █████╔╝░██║██╔██╗██║██║░░██╗░██║░░██║██║░░██║██╔████╔██║
 ██╔═██╗░██║██║╚████║██║░░╚██╗██║░░██║██║░░██║██║╚██╔╝██║
 ██║░╚██╗██║██║░╚███║╚██████╔╝██████╔╝╚█████╔╝██║░╚═╝░██║
 ╚═╝░░╚═╝╚═╝╚═╝░░╚══╝░╚═════╝░╚═════╝░░╚════╝░╚═╝░░░░╚═╝
```

**A Coin Master-style mobile kingdom builder — spin, attack, raid, build.**

[![Phaser](https://img.shields.io/badge/Phaser-3.88-blue?style=for-the-badge&logo=javascript)](https://phaser.io)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor-6-119EFF?style=for-the-badge&logo=capacitor)](https://capacitorjs.com)
[![Node](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)

*Named after Adam 👦 and Ghofrane 👩 — built by [MaisonGR](https://github.com/maison-gr)*

</div>

---

## ✨ What is Adam's Kingdom?

A fully playable mobile game built with **Phaser.js + Capacitor** — no Unity, no native code, just web tech packaged as a real iOS/Android app.

Spin a gold wheel. Win coins to upgrade your kingdom. Attack rival villages. Dig for buried treasure. Open chests for rare rewards. Every spin matters.

---

## 🎮 Gameplay Loop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   SPIN WHEEL  ──▶  Land on segment  ──▶  Reward triggers   │
│        ▲                                       │           │
│        │         ┌────────────────────────────┘           │
│        │         ▼                                         │
│   Use coins  ◀── COINS      ──▶  Upgrade buildings         │
│        │         ATTACK     ──▶  Destroy enemy building     │
│        │         RAID       ──▶  Dig 3 spots for treasure   │
│        │         CHEST      ──▶  Open for random rewards    │
│        │         SHIELD     ──▶  Protect your buildings     │
│        └─────    SPIN +1    ──▶  Free extra spin            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🎡 The Wheel

| Segment | Color | What Happens |
|:-------:|:------:|:-------------|
| 💰 100 coins | Red | Instant coins added |
| ⚔️ ATTACK | Orange | Launch AttackScene — destroy an enemy building & steal |
| 💰 500 coins | Green | Instant coins added |
| 🛡️ SHIELD | Blue | Protect one building from the next attack |
| 🎁 CHEST | Teal | Win a Wooden / Silver / Golden chest |
| 🔄 SPIN +1 | Emerald | Free extra spin granted |
| 💰 1000 coins | Gold | Instant coins added |
| ⛏️ RAID | Dark teal | Launch RaidScene — dig 3 of 4 spots for buried coins |

### 🏰 Your Kingdom

Six buildings that grow through **4 upgrade levels** — from crumbling ruins to a towering palace:

```
Farm  ──▶  Mill  ──▶  Barracks  ──▶  Market  ──▶  Castle  ──▶  Palace
 [0]        [1]          [2]            [3]           [4]          [5]
Ruins   →  Built   →  Windows   →  Flagpole   (each with 4 upgrade levels)
```

### 🎁 Chest Tiers

| Chest | Rarity | Rewards |
|:-----:|:------:|:--------|
| 🪵 Wooden | 65% | 50–200 coins · 1 spin · 1 shield |
| 🥈 Silver | 28% | 300–1,000 coins · 2 spins · 2 shields |
| 🥇 Golden | 7% | 1,000–5,000 coins · 3 spins · 3 shields |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+**
- A modern browser (Chrome / Safari)
- *(Optional)* MongoDB Atlas for the social backend

### Client

```bash
git clone https://github.com/maison-gr/adams-kingdom.git
cd adams-kingdom

npm install
npm run dev        # → http://localhost:3000
```

### Backend *(optional — game runs fully offline without it)*

```bash
cd server
cp .env.example .env     # paste your MONGO_URI
npm install
npm run dev              # → http://localhost:3001
```

Then add to your project root `.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

### Production Build

```bash
npm run build            # output → dist/
```

---

## 📱 Mobile (iOS & Android)

Packaged as a **real native app** via Capacitor — no browser bar, no webview chrome.

```bash
npm run build

npx cap add android      # first time only
npx cap sync             # every build
npx cap open android     # opens Android Studio → Run
```

> Requires **Android Studio** for Android · **Xcode 14+** for iOS

---

## 🗂️ Project Structure

```
adams-kingdom/
│
├── src/
│   ├── main.js                    Phaser config + scene registry
│   ├── GameState.js               All state, localStorage, spin refill timer
│   │
│   ├── scenes/
│   │   ├── BootScene.js           Splash / preload
│   │   ├── GameScene.js           Main: wheel · kingdom · HUD · spin button
│   │   ├── AttackScene.js         Enemy village — tap to destroy + steal coins
│   │   ├── RaidScene.js           Dig field — 3 picks, hidden coin loot
│   │   └── ChestScene.js          Opening ceremony — lid pop + reward cards
│   │
│   ├── systems/
│   │   ├── SpinSystem.js          Wheel physics: ease-out quart + bounce-settle
│   │   ├── RewardSystem.js        Single dispatcher for all spin outcomes
│   │   └── ChestSystem.js         Chest types, reward tables, weighted picks
│   │
│   ├── utils/
│   │   └── buildingRenderer.js    Shared drawBuilding() — GameScene + AttackScene
│   │
│   ├── effects/
│   │   └── juice.js               VFX: flyingCoins · burstParticles · goldRain
│   │                                    screenShake · upgradeEffect · shieldBubble
│   └── api/
│       └── client.js              Offline-safe REST client
│
├── server/
│   └── src/
│       ├── index.js               Express entry point
│       ├── models/Player.js       Mongoose schema
│       └── routes/players.js      /sync  /raid-target  /attack/:id  /leaderboard
│
├── index.html
├── vite.config.js
└── capacitor.config.json
```

---

## 🗺️ Roadmap

```
Phase 1 — Core loop ████████████████████ 100%
Phase 2 — Social     ███████████░░░░░░░░░  55%
Phase 3 — Monetise   ░░░░░░░░░░░░░░░░░░░░   0%
Phase 4 — Ship       ░░░░░░░░░░░░░░░░░░░░   0%
```

**Phase 1 — Core loop** ✅
- [x] Spin wheel — ease-out quart physics + bounce-settle
- [x] Kingdom with 6 buildings × 4 upgrade levels
- [x] SpinSystem + RewardSystem architecture
- [x] AttackScene — tap enemy building, steal coins
- [x] RaidScene — dig field, 3 picks, hidden loot
- [x] ChestScene — lid-pop ceremony, 3 typed reward cards
- [x] Chest inventory with Wooden / Silver / Golden tiers
- [x] Spin refill timer (1 spin / 5 min, up to 50)

**Phase 2 — Social** 🔨
- [x] Node.js + MongoDB backend — player sync, raid targets
- [x] Capacitor 6 — iOS + Android packaging
- [ ] In-game leaderboard screen
- [ ] Push notifications (daily free spins)

**Phase 3 — Monetize** 📋
- [ ] AdMob rewarded video ads — extra spins
- [ ] In-app purchases — coin packs, spin bundles

**Phase 4 — Ship** 📋
- [ ] Google Play Store submission
- [ ] Apple App Store submission

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|:------|:-----------|:----|
| Game engine | Phaser.js 3.88 | Mature 2D canvas/WebGL — mobile-friendly |
| Build | Vite 5.4 | Sub-second HMR, ES module output |
| Native | Capacitor 6 | WebView wrapper — one codebase, both stores |
| Backend | Express + Mongoose | Thin REST API, offline-tolerant client |
| Database | MongoDB Atlas | Schemaless player docs, free tier |
| State | localStorage | Instant, offline-first, no login required |

---

<div align="center">

Made with ❤️ by **Raed Fadhlaoui** — [MaisonGR](https://github.com/maison-gr)

*For Adam and Ghofrane* 👨‍👩‍👦

</div>
