import { soundManager } from '../systems/SoundManager.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.finalStats = data || { kills: 0, time: 0, level: 1 };
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const isPortrait = height > width;

        this.add.rectangle(width / 2, height / 2, width, height, 0x0b0c10);

        const titleY = isPortrait ? height * 0.18 : 120;
        const titleSize = isPortrait ? '36px' : '56px';

        this.add.text(width / 2, titleY, 'ИГРА ОКОНЧЕНА', {
            fontSize: titleSize,
            fill: '#ff0055',
            fontStyle: 'bold',
            shadow: { blur: 20, color: '#ff0055', fill: true }
        }).setOrigin(0.5);

        const mins = Math.floor(this.finalStats.time / 60).toString().padStart(2, '0');
        const secs = (this.finalStats.time % 60).toString().padStart(2, '0');

        const statsText = [
            `Время выживания: ${mins}:${secs}`,
            `Уничтожено врагов: ${this.finalStats.kills}`,
            `Итоговый уровень: ${this.finalStats.level}`
        ].join('\n\n');

        this.add.text(width / 2, height / 2 - (isPortrait ? 10 : 20), statsText, {
            fontSize: isPortrait ? '18px' : '22px',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: isPortrait ? 8 : 10
        }).setOrigin(0.5);

        // Restart Button
        const btnY = isPortrait ? height - 90 : height - 120;
        const btnW = isPortrait ? Math.min(240, width * 0.7) : 260;
        const btnBg = this.add.rectangle(width / 2, btnY, btnW, 50, 0x00ffcc, 0.2);
        btnBg.setStrokeStyle(2, 0x00ffcc);
        btnBg.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(width / 2, btnY, 'ИГРАТЬ СНОВА', {
            fontSize: isPortrait ? '18px' : '22px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btnBg.on('pointerdown', () => {
            soundManager.playLaser();
            this.scene.start('GameScene');
        });
    }
}
