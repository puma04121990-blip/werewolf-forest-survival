import { soundManager } from '../systems/SoundManager.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const isPortrait = height > width;

        // Background Forest Grid Lines
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1f3823, 0.25);
        for (let x = 0; x < width; x += 40) grid.lineBetween(x, 0, x, height);
        for (let y = 0; y < height; y += 40) grid.lineBetween(0, y, width, y);

        // Adaptive title sizes & positions
        const titleY = isPortrait ? height * 0.28 : height / 3 - 20;
        const subtitleY = isPortrait ? height * 0.36 : height / 3 + 40;
        const titleSize = isPortrait ? '42px' : '56px';
        const subtitleSize = isPortrait ? '22px' : '32px';

        this.add.text(width / 2, titleY, 'ОБОРОТЕНЬ', {
            fontSize: titleSize,
            fill: '#88ffaa',
            fontStyle: 'bold',
            shadow: { blur: 15, color: '#00ff66', fill: true }
        }).setOrigin(0.5);

        this.add.text(width / 2, subtitleY, 'ЛЕСНОЕ ВЫЖИВАНИЕ', {
            fontSize: subtitleSize,
            fill: '#ffe600',
            fontStyle: 'bold',
            letterSpacing: isPortrait ? 2 : 4
        }).setOrigin(0.5);

        // Mute Button
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
        const btnY = isPortrait ? height * 0.55 : height / 2 + 60;
        const btnW = isPortrait ? Math.min(260, width * 0.7) : 280;
        const btnBg = this.add.rectangle(width / 2, btnY, btnW, 60, 0x00ff88, 0.2);
        btnBg.setStrokeStyle(3, 0x00ff88);
        btnBg.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(width / 2, btnY, 'ВЫЙТИ НА ОХОТУ', {
            fontSize: isPortrait ? '20px' : '24px',
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

        // Instructions — компактнее в portrait
        const hintY = isPortrait ? height - 40 : height - 60;
        const hintText = isPortrait
            ? 'Тап — Бег  |  2-й палец — Рывок'
            : 'WASD / Тап — Бег  |  Пробел / 2-й палец — Рывок  |  P — Пауза';

        this.add.text(width / 2, hintY, hintText, {
            fontSize: isPortrait ? '13px' : '15px',
            fill: '#88bb99',
            align: 'center'
        }).setOrigin(0.5);
    }
}
