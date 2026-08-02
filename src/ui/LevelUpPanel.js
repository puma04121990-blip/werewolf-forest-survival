import { soundManager } from '../systems/SoundManager.js';

export class LevelUpPanel {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
    }

    show(options, onSelectCallback) {
        soundManager.playLevelUp();

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);

        const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        bg.setInteractive();
        this.container.add(bg);

        const title = this.scene.add.text(width / 2, 110, 'НОВЫЙ УРОВЕНЬ!', {
            fontSize: '38px',
            fill: '#ffe600',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(title);

        const cardWidth = 260;
        const cardHeight = 340;
        const startX = width / 2 - (options.length - 1) * 150;

        options.forEach((opt, idx) => {
            const cardX = startX + idx * 300;
            const cardY = height / 2 + 25;

            const cardBg = this.scene.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0x1a1a2e, 0.95);
            cardBg.setStrokeStyle(3, 0x00ffcc);
            cardBg.setInteractive({ useHandCursor: true });

            const icon = this.scene.add.text(cardX, cardY - 90, opt.icon || '⚡', { fontSize: '52px' }).setOrigin(0.5);
            const name = this.scene.add.text(cardX, cardY - 25, opt.name, {
                fontSize: '18px',
                fill: '#ffffff',
                fontStyle: 'bold',
                align: 'center',
                wordWrap: { width: cardWidth - 24 }
            }).setOrigin(0.5);

            const desc = this.scene.add.text(cardX, cardY + 55, opt.description, {
                fontSize: '14px',
                fill: '#00ffcc',
                align: 'center',
                wordWrap: { width: cardWidth - 30 }
            }).setOrigin(0.5);

            cardBg.on('pointerover', () => {
                cardBg.setStrokeStyle(4, 0xffe600);
                cardBg.setFillStyle(0x2a2a4e, 1.0);
            });

            cardBg.on('pointerout', () => {
                cardBg.setStrokeStyle(3, 0x00ffcc);
                cardBg.setFillStyle(0x1a1a2e, 0.95);
            });

            cardBg.on('pointerdown', () => {
                this.hide();
                onSelectCallback(opt);
            });

            this.container.add([cardBg, icon, name, desc]);
        });
    }

    hide() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}
