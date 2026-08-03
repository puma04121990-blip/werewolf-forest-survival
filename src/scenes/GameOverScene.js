import { soundManager } from '../systems/SoundManager.js';
import { isPortraitMode } from '../utils/orientation.js';
import { BALANCE } from '../config.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.finalStats = data || { kills: 0, time: 0, level: 1, maxCombo: 0, wave: 1 };
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const isPortrait = isPortraitMode();

        this.add.rectangle(width / 2, height / 2, width, height, 0x0b0c10);

        // subtle grid
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1f3823, 0.2);
        for (let x = 0; x < width; x += 40) grid.lineBetween(x, 0, x, height);
        for (let y = 0; y < height; y += 40) grid.lineBetween(0, y, width, y);

        const titleY = isPortrait ? height * 0.14 : 100;
        this.add.text(width / 2, titleY, 'ИГРА ОКОНЧЕНА', {
            fontSize: isPortrait ? '36px' : '52px',
            fill: '#ff0055',
            fontStyle: 'bold',
            shadow: { blur: 20, color: '#ff0055', fill: true }
        }).setOrigin(0.5);

        const mins = Math.floor(this.finalStats.time / 60).toString().padStart(2, '0');
        const secs = (this.finalStats.time % 60).toString().padStart(2, '0');

        const stats = [
            { label: 'Время', value: `${mins}:${secs}` },
            { label: 'Убито', value: `${this.finalStats.kills}` },
            { label: 'Уровень', value: `${this.finalStats.level}` },
            { label: 'Волна', value: `${this.finalStats.wave || 1}` },
            { label: 'Макс. комбо', value: `×${this.finalStats.maxCombo || 0}` }
        ];

        const startStatsY = isPortrait ? height * 0.28 : height * 0.32;
        stats.forEach((s, i) => {
            const y = startStatsY + i * (isPortrait ? 32 : 36);
            this.add.text(width / 2 - 100, y, s.label, {
                fontSize: isPortrait ? '16px' : '18px',
                fill: '#88aa99'
            }).setOrigin(0, 0.5);
            this.add.text(width / 2 + 100, y, s.value, {
                fontSize: isPortrait ? '18px' : '20px',
                fill: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(1, 0.5);
        });

        // Best run
        let bestLine = 'Рекорд: —';
        try {
            const best = JSON.parse(localStorage.getItem(BALANCE.storageKey) || 'null');
            if (best) {
                const bm = Math.floor(best.time / 60).toString().padStart(2, '0');
                const bs = (best.time % 60).toString().padStart(2, '0');
                bestLine = `Рекорд: ${bm}:${bs} · ${best.kills} убийств · ур. ${best.level}`;
                const isNew = this.finalStats.time >= best.time && this.finalStats.kills >= best.kills;
                if (isNew) bestLine = '★ НОВЫЙ РЕКОРД! · ' + bestLine.replace('Рекорд: ', '');
            }
        } catch (e) { /* ignore */ }

        this.add.text(width / 2, isPortrait ? height * 0.58 : height * 0.62, bestLine, {
            fontSize: isPortrait ? '13px' : '15px',
            fill: '#ffe600',
            align: 'center',
            wordWrap: { width: width * 0.85 }
        }).setOrigin(0.5);

        const btnY = isPortrait ? height - 120 : height - 130;
        this.makeButton(width / 2, btnY, isPortrait ? Math.min(260, width * 0.7) : 260, 'ИГРАТЬ СНОВА', 0x00ffcc, () => {
            soundManager.playLaser();
            this.scene.start('GameScene');
        });

        this.makeButton(width / 2, btnY + 58, isPortrait ? Math.min(220, width * 0.6) : 220, 'В МЕНЮ', 0x88aa99, () => {
            soundManager.playButtonClick();
            this.scene.start('MenuScene');
        }, true);
    }

    makeButton(x, y, w, label, color, onClick, small = false) {
        const h = small ? 44 : 52;
        const btnBg = this.add.rectangle(x, y, w, h, color, 0.18);
        btnBg.setStrokeStyle(2, color);
        btnBg.setInteractive({ useHandCursor: true });

        const txt = this.add.text(x, y, label, {
            fontSize: small ? '16px' : '20px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setFillStyle(color, 0.4));
        btnBg.on('pointerout', () => btnBg.setFillStyle(color, 0.18));
        btnBg.on('pointerdown', onClick);
    }
}
