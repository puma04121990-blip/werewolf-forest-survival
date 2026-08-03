import { soundManager } from '../systems/SoundManager.js';
import { isPortraitMode } from '../utils/orientation.js';

const RARITY_STYLE = {
    new: { stroke: 0x44ff88, fill: 0x0f2a18, label: '#66ffaa' },
    upgrade: { stroke: 0x44aaff, fill: 0x0f1a2a, label: '#88ccff' },
    weapon: { stroke: 0x00ffcc, fill: 0x1a1a2e, label: '#00ffcc' },
    passive: { stroke: 0xffcc44, fill: 0x2a220f, label: '#ffdd66' }
};

export class LevelUpPanel {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
    }

    show(options, onSelectCallback) {
        soundManager.playLevelUp();

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const isPortrait = isPortraitMode();

        this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);

        const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);
        bg.setInteractive();
        this.container.add(bg);

        const titleY = isPortrait ? 56 : 88;
        const title = this.scene.add.text(width / 2, titleY, 'НОВЫЙ УРОВЕНЬ!', {
            fontSize: isPortrait ? '30px' : '40px',
            fill: '#ffe600',
            fontStyle: 'bold',
            stroke: '#221100',
            strokeThickness: 6
        }).setOrigin(0.5);
        this.container.add(title);

        const hint = this.scene.add.text(width / 2, titleY + (isPortrait ? 32 : 40), 'Выбери усиление', {
            fontSize: '15px',
            fill: '#aabbaa'
        }).setOrigin(0.5);
        this.container.add(hint);

        if (isPortrait) {
            this.layoutPortrait(options, width, height, titleY, onSelectCallback);
        } else {
            this.layoutLandscape(options, width, height, onSelectCallback);
        }
    }

    layoutPortrait(options, width, height, titleY, onSelectCallback) {
        const cardW = Math.min(520, width * 0.82);
        const cardH = 118;
        const totalH = options.length * (cardH + 14);
        let startY = (height - totalH) / 2 + cardH / 2 + 16;
        if (startY < titleY + 70) startY = titleY + 76;

        options.forEach((opt, idx) => {
            const cardX = width / 2;
            const cardY = startY + idx * (cardH + 14);
            this.buildCard(opt, cardX, cardY, cardW, cardH, true, onSelectCallback);
        });
    }

    layoutLandscape(options, width, height, onSelectCallback) {
        const cardWidth = 250;
        const cardHeight = 320;
        const gap = 280;
        const startX = width / 2 - ((options.length - 1) * gap) / 2;

        options.forEach((opt, idx) => {
            const cardX = startX + idx * gap;
            const cardY = height / 2 + 36;
            this.buildCard(opt, cardX, cardY, cardWidth, cardHeight, false, onSelectCallback);
        });
    }

    buildCard(opt, cardX, cardY, cardW, cardH, horizontal, onSelectCallback) {
        const rarity = opt.rarity || (opt.type === 'passive' ? 'passive' : 'weapon');
        const style = RARITY_STYLE[rarity] || RARITY_STYLE.weapon;

        const cardBg = this.scene.add.rectangle(cardX, cardY, cardW, cardH, style.fill, 0.96);
        cardBg.setStrokeStyle(3, style.stroke);
        cardBg.setInteractive({ useHandCursor: true });

        let icon, name, desc, badge;

        if (horizontal) {
            icon = this.scene.add.text(cardX - cardW / 2 + 40, cardY, opt.icon || '⚡', {
                fontSize: '38px'
            }).setOrigin(0.5);

            if (opt.badge) {
                badge = this.scene.add.text(cardX + cardW / 2 - 14, cardY - cardH / 2 + 16, opt.badge, {
                    fontSize: '12px',
                    fill: style.label,
                    fontStyle: 'bold',
                    backgroundColor: '#00000088',
                    padding: { x: 6, y: 3 }
                }).setOrigin(1, 0.5);
            }

            name = this.scene.add.text(cardX - cardW / 2 + 76, cardY - 22, opt.name, {
                fontSize: '17px',
                fill: '#ffffff',
                fontStyle: 'bold',
                wordWrap: { width: cardW - 120 }
            }).setOrigin(0, 0.5);

            desc = this.scene.add.text(cardX - cardW / 2 + 76, cardY + 18, opt.description, {
                fontSize: '13px',
                fill: style.label,
                wordWrap: { width: cardW - 120 }
            }).setOrigin(0, 0.5);
        } else {
            icon = this.scene.add.text(cardX, cardY - 95, opt.icon || '⚡', { fontSize: '52px' }).setOrigin(0.5);

            if (opt.badge) {
                badge = this.scene.add.text(cardX, cardY - 48, opt.badge, {
                    fontSize: '13px',
                    fill: style.label,
                    fontStyle: 'bold',
                    backgroundColor: '#000000aa',
                    padding: { x: 8, y: 4 }
                }).setOrigin(0.5);
            }

            name = this.scene.add.text(cardX, cardY - 10, opt.name, {
                fontSize: '17px',
                fill: '#ffffff',
                fontStyle: 'bold',
                align: 'center',
                wordWrap: { width: cardW - 28 }
            }).setOrigin(0.5);

            desc = this.scene.add.text(cardX, cardY + 60, opt.description, {
                fontSize: '14px',
                fill: style.label,
                align: 'center',
                wordWrap: { width: cardW - 32 }
            }).setOrigin(0.5);
        }

        cardBg.on('pointerover', () => {
            cardBg.setStrokeStyle(4, 0xffe600);
            cardBg.setScale(1.03);
        });
        cardBg.on('pointerout', () => {
            cardBg.setStrokeStyle(3, style.stroke);
            cardBg.setScale(1);
        });
        cardBg.on('pointerdown', () => {
            soundManager.playButtonClick && soundManager.playButtonClick();
            this.hide();
            onSelectCallback(opt);
        });

        const items = [cardBg, icon, name, desc];
        if (badge) items.push(badge);
        this.container.add(items);

        // Pop-in
        cardBg.setScale(0.85);
        cardBg.setAlpha(0);
        this.scene.tweens.add({
            targets: [cardBg, icon, name, desc, badge].filter(Boolean),
            alpha: 1,
            scale: 1,
            duration: 180,
            delay: Math.random() * 60,
            ease: 'Back.easeOut'
        });
    }

    hide() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}
