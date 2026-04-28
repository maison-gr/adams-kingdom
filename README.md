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
**Premium hand-crafted visuals — every building drawn with code, no sprites required.**

[![Phaser](https://img.shields.io/badge/Phaser-3.88-blue?style=for-the-badge&logo=javascript)](https://phaser.io)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor-6-119EFF?style=for-the-badge&logo=capacitor)](https://capacitorjs.com)
[![Node](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![AdMob](https://img.shields.io/badge/AdMob-6.2-EA4335?style=for-the-badge&logo=googleads)](https://admob.google.com)

*Named after Adam 👦 and Ghofrane 👩 — built by [MaisonGR](https://github.com/maison-gr)*

</div>

---

## ✨ What is Adam's Kingdom?

A fully playable mobile game built with **Phaser.js + Capacitor** — no Unity, no native code, just web tech packaged as a real iOS/Android app.

Spin a gold wheel. Win coins to upgrade your kingdom. Attack rival villages. Dig for buried treasure. Open chests for rare cards and rewards. Fight dungeon bosses every 5 villages. Climb the rank ladder from Peasant to Emperor. Every spin matters.

Every pixel is drawn with **Phaser Graphics primitives** — no external art assets, no sprite sheets, no audio files. The game features synthesized Web Audio API sounds including a procedural pentatonic BGM, a deep-sky night background with glowing moon halo and distant city silhouette, a cobblestone kingdom path lined with bushes, 6 architecturally distinct buildings that evolve across 4 levels, and a glass-morphism HUD panel with inner glow and double-border styling.

---

## 🎮 Gameplay Loop

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   SPIN WHEEL  ──▶  Land on segment  ──▶  Reward triggers        │
│        ▲                                       │                 │
│        │         ┌─────────────────────────────┘                │
│        │         ▼                                               │
│   Use coins  ◀── COINS      ──▶  Upgrade buildings              │
│        │         ATTACK     ──▶  Choose target · destroy · steal │
│        │         RAID       ──▶  Dig 3 spots for buried treasure │
│        │         CHEST      ──▶  Open for cards + random rewards │
│        │         SHIELD     ──▶  Protect your buildings          │
│        └─────    SPIN +1    ──▶  Free extra spin                 │
│                                                                  │
│   Combo streak  ──▶  Fever mode (×2 rewards, 5 spins)           │
│   Complete village  ──▶  Advance to next village · bonus reward  │
│   Every 5 villages ──▶  ☠️  BOSS FIGHT  ──▶  Spin to deal dmg  │
│   Daily login  ──▶  7-day streak rewards                        │
│   Collect 30 cards  ──▶  Claim set rewards                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 🎡 The Wheel

| Segment | Color | What Happens |
|:-------:|:-----:|:-------------|
| 💰 100 coins | Red | Instant coins added |
| ⚔️ ATTACK | Orange | Target-select panel → AttackScene: destroy & steal |
| 💰 500 coins | Green | Instant coins added |
| 🛡️ SHIELD | Blue | Protect one building from the next attack |
| 🎰 JACKPOT | Gold | 5,000 coins + gold rain + screen shake |
| 🎁 CHEST | Teal | Win a Wooden / Silver / Golden chest (auto-opens) |
| 🔄 SPIN +1 | Emerald | Free extra spin granted |
| 💰 1,000 coins | Yellow-Gold | Instant coins added |
| ⛏️ RAID | Dark teal | RaidScene: dig 3 of 4 spots for buried coins |

### ☠️ Boss Fight

Every **5 villages** a dungeon boss fight launches automatically after the village-complete ceremony. You face the **Shadow King** in a torch-lit dungeon:

- Spin a special boss wheel to deal damage — each segment has its own effect:

| Segment | Effect |
|:-------:|:-------|
| ⚔️ ATTACK | 60 HP damage |
| 💰 COINS | Damage scaled to coin value |
| 🎰 JACKPOT | 120 HP + screen shake + burst particles |
| 🛡️ SHIELD | Block the boss's next counterattack |
| 🔄 SPIN +1 | 25 HP + bonus attack charge |
| 🎁 CHEST | 30 HP + loot |
| ⛏️ RAID | 45 HP + gold steal |

- After each player spin there is a **30% chance** the boss counterattacks — stealing 80–200 coins with a red screen flash
- If HP reaches 0: **Victory** — earn `5,000 + village × 500` coins + 50 spins + interstitial ad
- If coins run out: **Defeat** overlay appears — watch a **rewarded ad** to continue with full HP restored

### 🔥 Combo System & Fever Mode

- Landing the **same segment type twice in a row** starts a streak (displayed above the wheel hub)
- 3+ identical results in a row unlocks a **×1.5 multiplier** and XP bonus
- 5 identical results triggers **Fever Mode** — a double-gold ring pulses around the wheel and all rewards are **×2** for the next 5 spins
- A near-miss (landing adjacent to JACKPOT) plays a descending whoosh effect

### 🏰 Your Kingdom

Six architecturally distinct buildings, each growing through **4 upgrade levels** — from crumbling ruins to a towering palace:

```
Farm  ──▶  Mill  ──▶  Barracks  ──▶  Market  ──▶  Castle  ──▶  Palace
 [0]        [1]          [2]            [3]           [4]          [5]
Ruins   →  Built   →  Windows   →  Flagpole   (each with 4 upgrade levels)
```

| Building | Style | Signature Features |
|:--------:|:-----:|:-------------------|
| 🌾 Farm | Barn red + gable roof | Hay door, fence posts, weathervane at max level |
| 🌬️ Mill | Tall amber tower | Rotating cross sails, cone cap, arched door |
| ⚔️ Barracks | Slate blue fortress | Crenellated battlements, arrow-slit windows, gate arch |
| 🏪 Market | Warm terracotta | Awning canopy, stall windows, hanging lanterns at max level |
| 🏰 Castle | Dark stone keep | Flanking round towers, portcullis, pennant flag |
| 🏛️ Palace | Royal purple dome | Onion dome with gold spire, colonnaded facade, ornate crown |

All buildings are rendered entirely with **Phaser Graphics primitives** — 3D body illusion (lit face, side wall, roof), hand-placed windows, doors, and level-specific decorations.

**Village progression**: upgrade all 6 buildings to max → Village Complete ceremony → advance to the next village. Building costs scale by `1 + (village − 1) × 0.4` per village, and passive income grows with your buildings.

### 🎁 Chest Tiers & Card Drops

| Chest | Rarity | Coins | Spins | Shields | Cards drawn |
|:-----:|:------:|:-----:|:-----:|:-------:|:-----------:|
| 🪵 Wooden | 65% | 50–200 | 1 | 1 | 1 card (common-weighted) |
| 🥈 Silver | 28% | 300–1,000 | 2 | 2 | 2 cards (rare-weighted) |
| 🥇 Golden | 7% | 1,000–5,000 | 3 | 3 | 3 cards (gold-weighted) |

### 🃏 Card Collection

30 cards spread across 5 themed sets (6 cards each — 3 rarities):

| Set | Icon | Reward for completing |
|:----|:----:|:----------------------|
| Peasant's Life | 🌾 | 2,000 coins · 10 spins |
| Knight's Arsenal | ⚔️ | 4,000 coins · 20 spins |
| Baron's Domain | 🏰 | 8,000 coins · 35 spins |
| Count's Treasury | 💎 | 15,000 coins · 50 spins |
| Emperor's Glory | 🏆 | 30,000 coins · 100 spins |

Cards drop automatically when opening chests. Collect all 6 in a set → flash ceremony → claim the coin + spin reward in the **Card Collection** screen (accessible from the Missions screen).

### ⭐ Rank / XP System

7 ranks — earn XP on every action:

| Rank | Title | XP to next |
|:----:|:-----:|:----------:|
| 0 | Peasant | 500 |
| 1 | Knight | 1,500 |
| 2 | Baron | 3,500 |
| 3 | Count | 7,000 |
| 4 | Duke | 14,000 |
| 5 | King | 28,000 |
| 6 | Emperor | — (max) |

XP awarded per action: spin (10), coin win (5), attack (30), raid (25), chest (20), shield (8), jackpot (80), upgrade (40), combo×3 (15), fever trigger (50), mission complete (60). Rank-up triggers a full-screen overlay ceremony with burst particles and a fanfare sound.

### 💰 Passive Income & Offline Earnings

Each building level passively generates coins per minute (0 / 5 / 15 / 40 at levels 0–3). Income accrues for up to **4 hours** while the game is closed and is collected on next launch via the "Welcome Back!" screen.

### 🔥 Daily Login Streak

Return each day to claim escalating rewards on a 7-day cycle:

| Day | Reward |
|:---:|:-------|
| 1 | +10 Spins |
| 2 | +500 Coins |
| 3 | 1 Gold Chest |
| 4 | +20 Spins |
| 5 | +2,000 Coins |
| 6 | 1 Shield + 10 Spins |
| 7 | +5,000 Coins + 30 Spins |

Missing a day resets the streak.

### 📋 Daily Missions

Three randomized missions reset every 24 hours (e.g. *"Spin 5 times"*, *"Upgrade 2 buildings"*, *"Open a chest"*). Completing all 3 unlocks a **Daily Bonus**. Mission notifications appear as a badge on the clipboard icon in the HUD.

---

## 🔊 Audio & Game Feel

All sounds are **synthesized at runtime** using the Web Audio API — no audio files bundled.

**Background Music** plays a procedural pentatonic arpeggio (C major: 261–659 Hz triangle oscillators) with a C2 bass drone every 4 beats. BGM and sound effects can each be toggled independently in the **Settings** screen.

| Event | Sound |
|:------|:------|
| Wheel spinning | Rapid square-wave tick (80-millisecond interval) |
| Wheel stop | Low sine thud |
| Near-miss | Descending sawtooth whoosh |
| Coin win | Ascending 3-note jingle |
| Jackpot | 5-note fanfare + overtone layer |
| Attack / Raid | Aggressive sweep / mid ascending arpeggio |
| Shield | Soft bell chord |
| Extra spin | Quick triangle arpeggio |
| Fever mode | Rising sawtooth power-up |
| Chest open | Dramatic reveal sweep + jingle |
| Rank up | 6-note ascending fanfare |
| Set complete | 4-note sting with overtones |
| Village complete | Grand melody + bass chord |
| Building upgrade | Rising triangle tone |

Haptic feedback fires via `navigator.vibrate()` on major events. Sound and music controls are in the **Settings** screen (gear icon, bottom-right corner).

New players see a one-time **tutorial hint** ("Tap SPIN to play! 👆") that auto-dismisses on first spin.

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

Packaged as a **real native app** via Capacitor — no browser bar, no WebView chrome.

```bash
npm run build
npx cap sync             # copy web assets + plugins into android/
npx cap open android     # opens Android Studio → Run on device/emulator
```

> Requires **Android Studio** + **Java 17** for Android · **Xcode 14+** for iOS

### Signed Release Build (Google Play)

1. Generate a keystore (one-time):
   ```bash
   keytool -genkeypair -v -keystore android/adams-kingdom-release.keystore \
     -alias adamskingdom -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Create `android/key.properties` (gitignored):
   ```
   storePassword=YOUR_STORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=adamskingdom
   storeFile=../adams-kingdom-release.keystore
   ```

3. Build signed AAB:
   ```bash
   cd android
   ./gradlew bundleRelease
   # output: android/app/build/outputs/bundle/release/app-release.aab
   ```

> Keep the keystore backed up — losing it means you cannot update the app on Google Play.

### AdMob Setup

`AdService.js` ships with **test unit IDs**. Before publishing:

1. Register the app at [admob.google.com](https://admob.google.com) and create ad units.
2. Replace the test IDs in [src/services/AdService.js](src/services/AdService.js):
   ```js
   const INTERSTITIAL_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY';
   const REWARDED_ID     = 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY';
   const BANNER_ID       = 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY';
   ```
3. Replace the test app ID in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <meta-data
     android:name="com.google.android.gms.ads.APPLICATION_ID"
     android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
   ```
4. In `capacitor.config.json` set `initializeForTesting: false`.

### App Icon & Splash

To regenerate or re-sync Android densities:

```bash
node generate-assets.mjs       # regenerate resources/icon.png + resources/splash.png
npx @capacitor/assets generate  # push all densities into android/
```

---

## 🗂️ Project Structure

```
adams-kingdom/
│
├── src/
│   ├── main.js                    Phaser config + scene registry
│   ├── GameState.js               All state, localStorage, spin refill,
│   │                              passive income, village progression
│   │
│   ├── constants/
│   │   └── segments.js            Shared wheel segment definitions (weight, color, type)
│   │
│   ├── scenes/
│   │   ├── BootScene.js           Splash / preload
│   │   ├── GameScene.js           Main: wheel · kingdom · HUD · modals
│   │   │                          (rank-up, village-complete, offline earnings,
│   │   │                           login streak, attack target panel, rival banner)
│   │   ├── AttackScene.js         Enemy village — tap to destroy + steal coins
│   │   ├── RaidScene.js           Dig field — 3 picks, hidden coin loot
│   │   ├── BossScene.js           Boss fight every 5 villages — Shadow King dungeon
│   │   ├── ChestScene.js          Opening ceremony — lid pop + reward cards + card reveal
│   │   ├── LeaderboardScene.js    Top-10 leaderboard (coins), synced from backend
│   │   ├── MissionsScene.js       Daily missions list, countdown timer, Cards button
│   │   ├── CardsScene.js          Card collection — 5 set panels, claim rewards
│   │   └── SettingsScene.js       Player name, sound/music toggles, reset progress
│   │
│   ├── systems/
│   │   ├── SpinSystem.js          Wheel physics: ease-out quart + bounce-settle
│   │   ├── RewardSystem.js        Single dispatcher for all spin outcomes
│   │   ├── ChestSystem.js         Chest types, reward tables, weighted picks
│   │   ├── ComboSystem.js         Streak tracking, ×1.5 multiplier, Fever mode
│   │   ├── MissionSystem.js       Daily missions, 24-hr reset, progress tracking
│   │   ├── RivalSystem.js         Offline rival attacks, revenge queue
│   │   ├── RankSystem.js          7-tier XP system, rank-up detection
│   │   ├── LoginStreak.js         7-day login streak, reward definitions
│   │   └── CardSystem.js          30-card collection, chest drop logic, set claims
│   │
│   ├── utils/
│   │   └── buildingRenderer.js    Shared drawBuilding() — GameScene + AttackScene
│   │
│   ├── effects/
│   │   ├── juice.js               VFX: flyingCoins · burstParticles · goldRain
│   │   │                               screenShake · upgradeEffect · shieldBubble
│   │   │                               nearMissFlash · feverActivate · streakBurst
│   │   └── AudioSystem.js         Synthesized Web Audio API sounds (14 SFX),
│   │                              procedural pentatonic BGM, mute/music toggles
│   │
│   ├── services/
│   │   └── AdService.js           AdMob wrapper — rewarded + interstitial + banner;
│   │                              browser-safe (resolves immediately outside app)
│   │
│   └── api/
│       └── client.js              Offline-safe REST client
│
├── server/
│   └── src/
│       ├── index.js               Express entry point
│       ├── models/Player.js       Mongoose schema
│       └── routes/players.js     /sync  /raid-target  /attack/:id  /leaderboard
│
├── resources/
│   ├── icon.png                   1024×1024 app icon (crown + castle, gold/navy)
│   └── splash.png                 2732×2732 splash screen source
│
├── generate-assets.mjs            Generates icon/splash PNGs from inline SVG via sharp
├── index.html
├── vite.config.js
└── capacitor.config.json
```

---

## 🗺️ Roadmap

```
Sprint 1 — Core loop     ████████████████████ 100%  ✅
Sprint 2 — Social        ████████████████████ 100%  ✅
Sprint 3 — Progression   ████████████████████ 100%  ✅
Sprint 4 — Retention     ████████████████████ 100%  ✅
Sprint 5A — Cards        ████████████████████ 100%  ✅
Sprint 5B — Audio/Feel   ████████████████████ 100%  ✅
Sprint 6 — Boss/Settings ████████████████████ 100%  ✅
Phase 3 — Monetize       ████████████████░░░░  80%  🔧
Phase 4 — Ship           ████░░░░░░░░░░░░░░░░  20%  🔧
```

**Sprint 1 — Core loop** ✅
- [x] Spin wheel — ease-out quart physics + bounce-settle
- [x] Kingdom with 6 buildings × 4 upgrade levels
- [x] SpinSystem + RewardSystem architecture
- [x] AttackScene — tap enemy building, steal coins
- [x] RaidScene — dig field, 3 picks, hidden loot
- [x] ChestScene — lid-pop ceremony, 3 typed reward cards
- [x] Chest inventory with Wooden / Silver / Golden tiers
- [x] Spin refill timer (1 spin / 5 min, up to 50)
- [x] Major UI/UX overhaul — unique building art, night sky, glass-morphism HUD

**Sprint 2 — Social** ✅
- [x] Node.js + MongoDB backend — player sync, raid targets
- [x] Capacitor 6 — iOS + Android packaging
- [x] In-game leaderboard screen (top 10 by coins)
- [x] Combo system — streak tracking, ×1.5 multiplier
- [x] Fever mode — ×2 rewards for 5 spins after 5-streak
- [x] Near-miss flash effect adjacent to JACKPOT
- [x] Rival system — offline attack notifications + revenge queue

**Sprint 3 — Progression** ✅
- [x] Rank / XP system — 7 tiers (Peasant → Emperor), XP bar in HUD
- [x] Rank-up ceremony — full-screen overlay with burst particles + fanfare
- [x] Passive income — per-building coins/min, 4-hour offline cap
- [x] Offline earnings screen — "Welcome Back!" modal on next launch

**Sprint 4 — Retention** ✅
- [x] Village progression — costs scale per village, all-max triggers ceremony
- [x] Village Complete ceremony — advance + bonus spins/coins reward
- [x] Daily login streak — 7-day cycle, escalating rewards, miss = reset
- [x] Daily missions system — 3 missions, 24-hr reset, HUD badge counter

**Sprint 5A — Card Collection** ✅
- [x] 30-card collection across 5 themed sets (common / rare / gold rarities)
- [x] Cards drop automatically from chests (1–3 per chest, rarity-weighted)
- [x] Card reveal row in ChestScene after opening
- [x] CardsScene — 5 set panels, collected/uncollected slots, CLAIM button
- [x] Set Complete ceremony — flash overlay + set-complete sound
- [x] "My Card Collection" shortcut button in MissionsScene

**Sprint 5B — Audio & Game Feel** ✅
- [x] AudioSystem — 14 synthesized Web Audio API sounds (no audio files)
- [x] Haptic feedback via `navigator.vibrate()` on major events
- [x] Spin tick timer during wheel spin; wheelStop / nearMiss landing sounds
- [x] Per-outcome sounds: coin, jackpot, attack, raid, shield, extra spin
- [x] Ceremony sounds: fever, rank-up, set-complete, village-complete, upgrade
- [x] Mute toggle button (🔊/🔇) with localStorage persistence
- [x] First-time tutorial hint — bouncing arrow auto-dismissed on first spin

**Sprint 6 — Boss Fight & Settings** ✅
- [x] BossScene — Shadow King dungeon fight, torch animations, boss sprite, HP bar
- [x] Boss wheel with outcome damage map and 30% counterattack mechanic
- [x] Defeat overlay with "Watch Ad" rewarded ad to continue
- [x] Victory reward: `5000 + village × 500` coins + 50 spins
- [x] SettingsScene — change player name (DOM input overlay), sound/music toggles, reset progress
- [x] Settings gear button repositioned to bottom-right corner
- [x] Mute button removed from main HUD, consolidated into Settings
- [x] Procedural pentatonic BGM (triangle oscillators + C2 bass drone)
- [x] ACTIVATE! button centered in Lucky Spin Boost banner

**Phase 3 — Monetize** 🔧
- [x] AdMob integration — rewarded ads (boss continue) + interstitials (village transitions)
- [x] AdService wrapper — browser-safe, graceful fallback
- [x] Test ad unit IDs wired; production IDs ready to swap in
- [ ] In-app purchases — coin packs, spin bundles

**Phase 4 — Ship** 🔧
- [x] App icon + splash screen (1024×1024 / 2732×2732 generated from SVG)
- [x] Android signing config (keystore + key.properties)
- [x] Signed release AAB buildable via `./gradlew bundleRelease`
- [ ] Replace test AdMob IDs with live production IDs
- [ ] Push notifications (daily free spin reminder)
- [ ] Google Play Store submission
- [ ] Apple App Store submission

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|:------|:-----------|:----|
| Game engine | Phaser.js 3.88 | Mature 2D canvas/WebGL — mobile-friendly |
| Build | Vite 5.4 | Sub-second HMR, ES module output |
| Native | Capacitor 6 | WebView wrapper — one codebase, both stores |
| Ads | @capacitor-community/admob 6.2.0 | Rewarded + interstitial ads; Java 17 compatible |
| Backend | Express + Mongoose | Thin REST API, offline-tolerant client |
| Database | MongoDB Atlas | Schemaless player docs, free tier |
| Audio | Web Audio API | Synthesized SFX + procedural BGM — zero audio files |
| State | localStorage | Instant, offline-first, no login required |
| Runtime | Java 17 + AGP 8.1.4 | Android build toolchain |

---

<div align="center">

Made with ❤️ by **Raed Fadhlaoui** — [MaisonGR](https://github.com/maison-gr)

*For Adam and Ghofrane* 👨‍👩‍👦

</div>
