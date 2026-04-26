import { GameState } from '../GameState.js';

const SEGMENTS = [
  { label: '100',    color: 0xe74c3c, type: 'coins',  value: 100  },
  { label: 'ATTACK', color: 0xe67e22, type: 'attack', value: 0    },
  { label: '500',    color: 0x2ecc71, type: 'coins',  value: 500  },
  { label: 'SHIELD', color: 0x3498db, type: 'shield', value: 0    },
  { label: '50',     color: 0x9b59b6, type: 'coins',  value: 50   },
  { label: 'SPIN+1', color: 0x1abc9c, type: 'spin',   value: 1    },
  { label: '1000',   color: 0xf39c12, type: 'coins',  value: 1000 },
  { label: 'JACKPOT',color: 0xe74c3c, type: 'coins',  value: 5000 },
];

const BUILDING_COSTS = [500, 1500, 3000, 6000, 12000, 25000];
const BUILDING_NAMES = ['Farm', 'Mill', 'Barracks', 'Market', 'Castle', 'Palace'];
const BUILDING_COLORS = [0x27ae60, 0x8e44ad, 0x2980b9, 0xe67e22, 0xc0392b, 0xf39c12];

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.isSpinning = false;
    this.wheelAngle = 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.drawBackground(W, H);
    this.drawKingdom(W, H);
    this.drawWheel(W, H);
    this.drawHUD(W, H);
    this.drawSpinButton(W, H);
    this.drawResultText(W, H);
  }

  drawBackground(W, H) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x1a1a4e, 0x1a1a4e, 1);
    bg.fillRect(0, 0, W, H);

    for (let i = 0; i < 60; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H * 0.5),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 1)
      );
    }
  }

  drawKingdom(W, H) {
    const y = H * 0.18;
    const groundY = H * 0.28;

    const ground = this.add.graphics();
    ground.fillStyle(0x2d5a27, 1);
    ground.fillRect(0, groundY - 20, W, 40);

    this.buildingGraphics = [];

    for (let i = 0; i < 6; i++) {
      const x = (W / 7) * (i + 1);
      const level = GameState.buildings[i];
      const g = this.add.graphics();
      this.drawBuilding(g, x, groundY, i, level);
      this.buildingGraphics.push({ g, x, groundY, index: i });
    }
  }

  drawBuilding(g, x, groundY, index, level) {
    g.clear();
    if (level === 0) {
      g.fillStyle(0x555555, 0.5);
      g.fillRect(x - 20, groundY - 40, 40, 40);
      g.fillStyle(0x888888, 0.5);
      g.fillTriangle(x - 24, groundY - 40, x + 24, groundY - 40, x, groundY - 65);
      return;
    }
    const h = 30 + level * 15;
    g.fillStyle(BUILDING_COLORS[index], 1);
    g.fillRect(x - 22, groundY - h, 44, h);
    g.fillStyle(0xc0392b, 1);
    g.fillTriangle(x - 26, groundY - h, x + 26, groundY - h, x, groundY - h - 25);

    if (level >= 2) {
      g.fillStyle(0xecf0f1, 0.8);
      g.fillRect(x - 8, groundY - 20, 16, 20);
    }
  }

  refreshKingdom() {
    this.buildingGraphics.forEach(({ g, x, groundY, index }) => {
      this.drawBuilding(g, x, groundY, index, GameState.buildings[index]);
    });
  }

  drawWheel(W, H) {
    const cx = W / 2;
    const cy = H * 0.57;
    const r = W * 0.38;
    this.wheelCx = cx;
    this.wheelCy = cy;
    this.wheelR = r;

    this.wheelGraphics = this.add.graphics();
    this.wheelLabels = [];
    this.drawWheelGraphics(0);

    const pointer = this.add.graphics();
    pointer.fillStyle(0xffffff, 1);
    pointer.fillTriangle(cx - 14, cy - r - 10, cx + 14, cy - r - 10, cx, cy - r + 18);
    pointer.lineStyle(2, 0x000000, 1);
    pointer.strokeTriangle(cx - 14, cy - r - 10, cx + 14, cy - r - 10, cx, cy - r + 18);

    const hub = this.add.circle(cx, cy, 18, 0xffd700, 1);
    const hubBorder = this.add.circle(cx, cy, 18);
    hubBorder.setStrokeStyle(3, 0x000000);
  }

  drawWheelGraphics(rotation) {
    const g = this.wheelGraphics;
    const cx = this.wheelCx;
    const cy = this.wheelCy;
    const r = this.wheelR;
    const n = SEGMENTS.length;
    const slice = (Math.PI * 2) / n;

    g.clear();
    this.wheelLabels.forEach(t => t.destroy());
    this.wheelLabels = [];

    for (let i = 0; i < n; i++) {
      const startAngle = rotation + i * slice - Math.PI / 2;
      const endAngle = startAngle + slice;
      const mid = startAngle + slice / 2;

      g.fillStyle(SEGMENTS[i].color, 1);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r, startAngle, endAngle, false);
      g.closePath();
      g.fillPath();

      g.lineStyle(2, 0x000000, 0.4);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r, startAngle, endAngle, false);
      g.closePath();
      g.strokePath();

      const lx = cx + Math.cos(mid) * r * 0.68;
      const ly = cy + Math.sin(mid) * r * 0.68;
      const label = this.add.text(lx, ly, SEGMENTS[i].label, {
        fontSize: '13px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      this.wheelLabels.push(label);
    }

    g.lineStyle(4, 0xffd700, 1);
    g.strokeCircle(cx, cy, r);
  }

  drawHUD(W, H) {
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.5);
    panel.fillRoundedRect(10, 10, W - 20, 70, 12);

    this.coinsIcon = this.add.circle(W * 0.12, 45, 14, 0xffd700, 1);
    this.coinsText = this.add.text(W * 0.12 + 20, 45, `${GameState.coins.toLocaleString()}`, {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0, 0.5);

    this.shieldIcon = this.add.circle(W * 0.5 - 20, 45, 14, 0x3498db, 1);
    this.shieldText = this.add.text(W * 0.5, 45, `${GameState.shields}`, {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#3498db',
    }).setOrigin(0, 0.5);

    this.spinsIcon = this.add.circle(W * 0.76, 45, 14, 0x2ecc71, 1);
    this.spinsText = this.add.text(W * 0.76 + 20, 45, `${GameState.spins}`, {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#2ecc71',
    }).setOrigin(0, 0.5);
    this.add.text(W * 0.76 + 48, 45, 'spins', {
      fontSize: '13px', fontFamily: 'Arial', color: '#2ecc71',
    }).setOrigin(0, 0.5);
  }

  drawSpinButton(W, H) {
    const bx = W / 2;
    const by = H * 0.88;

    this.spinBtnBg = this.add.graphics();
    this.drawButton(this.spinBtnBg, bx, by, false);

    this.spinBtnText = this.add.text(bx, by, 'SPIN', {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(bx, by, 200, 60, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hitArea.on('pointerdown', () => this.onSpin());
    hitArea.on('pointerover', () => this.drawButton(this.spinBtnBg, bx, by, true));
    hitArea.on('pointerout', () => this.drawButton(this.spinBtnBg, bx, by, false));

    this.drawBuildButtons(W, H);
  }

  drawButton(g, x, y, hover) {
    g.clear();
    g.fillStyle(hover ? 0xf39c12 : 0xe67e22, 1);
    g.fillRoundedRect(x - 100, y - 30, 200, 60, 16);
    g.lineStyle(3, 0xffd700, 1);
    g.strokeRoundedRect(x - 100, y - 30, 200, 60, 16);
  }

  drawBuildButtons(W, H) {
    const by = H * 0.96;
    this.buildBtnText = this.add.text(W / 2, by, 'Tap building to upgrade', {
      fontSize: '13px', fontFamily: 'Arial', color: '#aaaaaa',
    }).setOrigin(0.5);

    this.buildingGraphics.forEach(({ x, groundY, index }) => {
      const hitArea = this.add.rectangle(x, groundY - 30, 50, 70, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => this.onBuildingTap(index));
    });
  }

  drawResultText(W, H) {
    this.resultText = this.add.text(W / 2, H * 0.73, '', {
      fontSize: '32px', fontFamily: 'Arial Black', color: '#ffd700',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);
  }

  onSpin() {
    if (this.isSpinning) return;
    if (!GameState.useSpin()) {
      this.showResult('No spins left!', '#ff4444');
      return;
    }

    this.isSpinning = true;
    this.spinBtnText.setText('...');

    const targetIndex = Phaser.Math.Between(0, SEGMENTS.length - 1);
    const slice = (Math.PI * 2) / SEGMENTS.length;
    const extraSpins = Phaser.Math.Between(5, 8) * Math.PI * 2;
    const targetAngle = extraSpins + (slice * targetIndex);

    let current = this.wheelAngle;
    const duration = 3500;
    const start = Date.now();

    const animate = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const angle = current + targetAngle * eased;
      this.wheelAngle = angle;
      this.drawWheelGraphics(angle);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.applyOutcome(SEGMENTS[targetIndex]);
      }
    };
    requestAnimationFrame(animate);
  }

  applyOutcome(segment) {
    this.isSpinning = false;
    this.spinBtnText.setText('SPIN');

    if (segment.type === 'coins') {
      GameState.addCoins(segment.value);
      this.showResult(`+${segment.value.toLocaleString()} Coins!`, '#ffd700');
    } else if (segment.type === 'attack') {
      GameState.addAttack();
      this.showResult('ATTACK!', '#e74c3c');
    } else if (segment.type === 'shield') {
      GameState.addShield();
      this.showResult('SHIELD!', '#3498db');
    } else if (segment.type === 'spin') {
      GameState.addSpins(segment.value);
      this.showResult('EXTRA SPIN!', '#2ecc71');
    }

    this.updateHUD();
  }

  showResult(msg, color) {
    this.resultText.setText(msg).setColor(color).setAlpha(1);
    this.tweens.add({
      targets: this.resultText,
      alpha: 0,
      y: this.resultText.y - 40,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        this.resultText.setAlpha(0);
        this.resultText.y = this.scale.height * 0.73;
      },
    });
  }

  onBuildingTap(index) {
    const cost = BUILDING_COSTS[index];
    const current = GameState.buildings[index];
    if (current >= 3) {
      this.showResult('Max level!', '#aaaaaa');
      return;
    }
    if (GameState.coins < cost) {
      this.showResult(`Need ${cost.toLocaleString()} coins`, '#ff4444');
      return;
    }
    GameState.addCoins(-cost);
    GameState.buildings[index]++;
    GameState.save();
    this.refreshKingdom();
    this.showResult(`${BUILDING_NAMES[index]} upgraded!`, '#2ecc71');
    this.updateHUD();
  }

  updateHUD() {
    this.coinsText.setText(`${GameState.coins.toLocaleString()}`);
    this.spinsText.setText(`${GameState.spins}`);
    this.shieldText.setText(`${GameState.shields}`);
  }
}
