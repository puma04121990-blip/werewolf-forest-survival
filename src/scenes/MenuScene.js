import { soundManager } from '../systems/SoundManager.js';
import { isPortraitMode } from '../utils/orientation.js';
import { BALANCE } from '../config.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const isPortrait = isPortraitMode();

        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1f3823, 0.25);
        for (let x = 0; x < width; x += 40) grid.lineBetween(x, 0, x, height);
        for (let y = 0; y < height; y += 40) grid.lineBetween(0, y, width, y);

        // Soft moons
        const moon = this.add.circle(width * 0.82, height * 0.18, 36, 0xddffee, 0.12);
        this.add.circle(width * 0.82 - 8, height * 0.18 - 4, 28, 0x0b140d, 1);

        const titleY = isPortrait ? height * 0.22 : height / 3 - 30;
        const subtitleY = isPortrait ? height * 0.30 : height / 3 + 30;
        const titleSize = isPortrait ? '44px' : '56px';
        const subtitleSize = isPortrait ? '22px' : '30px';

        this.add.text(width / 2, titleY, 'ОБОРОТЕНЬ', {
            fontSize: titleSize,
            fill: '#88ffaa',
            fontStyle: 'bold',
            shadow: { blur: 16, color: '#00ff66', fill: true }
        }).setOrigin(0.5);

        this.add.text(width / 2, subtitleY, 'ЛЕСНОЕ ВЫЖИВАНИЕ', {
            fontSize: subtitleSize,
            fill: '#ffe600',
            fontStyle: 'bold',
            letterSpacing: isPortrait ? 2 : 4
        }).setOrigin(0.5);

        // Best run
        let bestText = 'Пока нет рекордов — стань первым';
        try {
            const best = JSON.parse(localStorage.getItem(BALANCE.storageKey) || 'null');
            if (best) {
                const bm = Math.floor(best.time / 60).toString().padStart(2, '0');
                const bs = (best.time % 60).toString().padStart(2, '0');
                bestText = `Рекорд: ${bm}:${bs}  ·  ${best.kills} убийств  ·  ур. ${best.level}`;
            }
        } catch (e) { /* ignore */ }

        this.add.text(width / 2, subtitleY + (isPortrait ? 36 : 44), bestText, {
            fontSize: isPortrait ? '13px' : '15px',
            fill: '#88aa99'
        }).setOrigin(0.5);

        const initialIcon = soundManager.isMuted ? '🔇' : '🔊';
        const muteBtn = this.add.text(width - 50, 28, initialIcon, {
            fontSize: '30px'
        }).setInteractive({ useHandCursor: true });

        muteBtn.on('pointerdown', () => {
            const muted = soundManager.toggleMute();
            muteBtn.setText(muted ? '🔇' : '🔊');
            soundManager.playButtonClick();
        });

        const btnY = isPortrait ? height * 0.50 : height / 2 + 50;
        const btnW = isPortrait ? Math.min(280, width * 0.65) : 280;
        const btnBg = this.add.rectangle(width / 2, btnY, btnW, 58, 0x00ff88, 0.2);
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

        // Feature chips
        const chips = ['7 видов оружия', 'Комбо-система', 'Боссы с фазами', 'Рекорды'];
        const chipY = btnY + (isPortrait ? 70 : 80);
        const chipText = chips.join('  ·  ');
        this.add.text(width / 2, chipY, chipText, {
            fontSize: isPortrait ? '12px' : '14px',
            fill: '#668877',
            align: 'center',
            wordWrap: { width: width * 0.9 }
        }).setOrigin(0.5);

        const hintY = isPortrait ? height - 48 : height - 56;
        const hintText = isPortrait
            ? 'Тап — Бег   ·   2-й палец — Рывок'
            : 'WASD / Тап — Бег  |  Пробел / 2-й палец — Рывок  |  P / ⏸ — Пауза';

        this.add.text(width / 2, hintY, hintText, {
            fontSize: isPortrait ? '13px' : '15px',
            fill: '#88bb99',
            align: 'center'
        }).setOrigin(0.5);
    }
}
