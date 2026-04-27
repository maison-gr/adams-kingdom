import Phaser from 'phaser';
import { BootScene }   from './scenes/BootScene.js';
import { GameScene }   from './scenes/GameScene.js';
import { AttackScene } from './scenes/AttackScene.js';
import { RaidScene }   from './scenes/RaidScene.js';

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 854,
  backgroundColor: '#0a0a2e',
  parent: 'game',
  scene: [BootScene, GameScene, AttackScene, RaidScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
