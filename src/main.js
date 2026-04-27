import Phaser from 'phaser';
import { BootScene }        from './scenes/BootScene.js';
import { GameScene }        from './scenes/GameScene.js';
import { AttackScene }      from './scenes/AttackScene.js';
import { RaidScene }        from './scenes/RaidScene.js';
import { ChestScene }       from './scenes/ChestScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';
import { MissionsScene }    from './scenes/MissionsScene.js';
import { CardsScene }       from './scenes/CardsScene.js';

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 854,
  backgroundColor: '#0a0a2e',
  parent: 'game',
  audio: { noAudio: true },   // AudioSystem.js uses its own Web Audio context
  scene: [BootScene, GameScene, AttackScene, RaidScene, ChestScene, LeaderboardScene, MissionsScene, CardsScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
