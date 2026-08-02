import { soundManager } from '../systems/SoundManager.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Background Forest Grid Lines
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1f3823, 0.25);
        for (let x = 0; x < width; x += 40) grid.lineBetween(x, 0, x, height);
        for (let y = 0; y < height; y += 40) grid.lineBetween(0, y, width, y);

        // Game Title
        this.add.text(width / 2, height / 3 - 20, 'ОБОРОТЕНЬ', {
            fontSize: '56px',
            fill: '#88ffaa',
            fontStyle: 'bold',
            shadow: { blur: 15, color: '#00ff66', fill: true }
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 3 + 40, 'ЛЕСНОЕ ВЫЖИВАНИЕ', {
            fontSize: '32px',
            fill: '#ffe600',
            fontStyle: 'bold',
            letterSpacing: 4
        }).setOrigin(0.5);

        // Mute Button on Menu
        const initialIcon = soundManager.isMuted ? '🔇' : '🔊';
        const muteBtn = this.add.text(width - 50, 30, initialIcon, {
            fontSize: '32px'
        }).setInteractive({ useHandCursor: true });

        muteBtn.on('pointerdown', () => {
            const muted = soundManager.toggleMute();
            muteBtn.setText(muted ? '🔇' : '🔊');
            soundManager.playButtonClick();
        });

        // Start Button
        const btnBg = this.add.rectangle(width / 2, height / 2 + 60, 280, 60, 0x00ff88, 0.2);
        btnBg.setStrokeStyle(3, 0x00ff88);
        btnBg.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(width / 2, height / 2 + 60, 'ВЫЙТИ НА ОХОТУ', {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(0x00ff88, 0.5);
            btnText.setStyle({ fill: '#000000' });
        });

        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0x00ff88, 0.2);
            btnText.setStyle({ fill: '#ffffff' });
        });

        btnBg.on('pointerdown', () => {
            soundManager.playHowl();
            soundManager.startBackgroundMusic();
            this.scene.start('GameScene');
        });

        // Instructions Text
        this.add.text(width / 2, height - 60, 'WASD / Тап — Бег  |  Пробел / 2-й палец — Рывок  |  P — Пауза', {
            fontSize: '15px',
            fill: '#88bb99'
        }).setOrigin(0.5);
    }
}
