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

        this.add.rectangle(width / 2, height / 2, width, height, 0x0b0c10);

        this.add.text(width / 2, 120, 'ИГРА ОКОНЧЕНА', {
            fontSize: '56px',
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

        this.add.text(width / 2, height / 2 - 20, statsText, {
            fontSize: '22px',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        // Restart Button
        const btnBg = this.add.rectangle(width / 2, height - 120, 260, 50, 0x00ffcc, 0.2);
        btnBg.setStrokeStyle(2, 0x00ffcc);
        btnBg.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(width / 2, height - 120, 'ИГРАТЬ СНОВА', {
            fontSize: '22px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btnBg.on('pointerdown', () => {
            soundManager.playLaser();
            this.scene.start('GameScene');
        });
    }
}
