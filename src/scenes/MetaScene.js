import { soundManager } from '../systems/SoundManager.js';
import { isPortraitMode } from '../utils/orientation.js';
import { MetaProgress, META_UNLOCKS, DEFAULT_WEAPON, DEFAULT_SKIN } from '../systems/MetaProgress.js';

/**
 * Meta shop: spend Essence on starting weapons, skins, extra re-rolls.
 * Also select loadout for next run.
 */
export default class MetaScene extends Phaser.Scene {
    constructor() {
        super('MetaScene');
    }

    create() {
        this.refresh();
    }

    refresh() {
        this.children.removeAll(true);

        const width = this.scale.width;
        const height = this.scale.height;
        const isPortrait = isPortraitMode();
        const essence = MetaProgress.getEssence();

        this.add.rectangle(width / 2, height / 2, width, height, 0x0a100c);

        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1f3823, 0.2);
        for (let x = 0; x < width; x += 40) grid.lineBetween(x, 0, x, height);
        for (let y = 0; y < height; y += 40) grid.lineBetween(0, y, width, y);

        this.add.text(width / 2, isPortrait ? 36 : 40, 'ЛОГОВО · МЕТА', {
            fontSize: isPortrait ? '26px' : '34px',
            fill: '#88ffaa',
            fontStyle: 'bold',
            stroke: '#003311',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(width / 2, isPortrait ? 64 : 72, `🌙 Эссенция: ${essence}`, {
            fontSize: isPortrait ? '16px' : '20px',
            fill: '#ffe600',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, isPortrait ? 86 : 98, 'Зарабатывай эссенцию забегами · открывай старт и скины', {
            fontSize: '12px',
            fill: '#779988'
        }).setOrigin(0.5);

        // --- Selection: start weapon ---
        const selY = isPortrait ? 118 : 130;
        this.add.text(40, selY, 'СТАРТОВОЕ ОРУЖИЕ', {
            fontSize: '12px',
            fill: '#88aacc',
            fontStyle: 'bold'
        });

        const weapons = MetaProgress.getUnlockedStartWeapons();
        const selectedW = MetaProgress.getSelectedWeapon();
        let wx = 40;
        weapons.forEach(w => {
            const active = w.key === selectedW;
            const chip = this.add.rectangle(wx + 50, selY + 28, 100, 36, active ? 0x22aa66 : 0x1a2a22, active ? 0.5 : 0.25);
            chip.setStrokeStyle(2, active ? 0x66ffaa : 0x445544);
            chip.setInteractive({ useHandCursor: true });
            this.add.text(wx + 50, selY + 28, `${w.icon}`, { fontSize: '18px' }).setOrigin(0.5);
            chip.on('pointerdown', () => {
                soundManager.playButtonClick();
                MetaProgress.setSelectedWeapon(w.key);
                this.refresh();
            });
            wx += 108;
        });

        // --- Selection: skin ---
        const skinY = selY + 70;
        this.add.text(40, skinY, 'СКИН', {
            fontSize: '12px',
            fill: '#ccaa88',
            fontStyle: 'bold'
        });

        const skins = MetaProgress.getUnlockedSkins();
        const selectedS = MetaProgress.getSelectedSkin();
        let sx = 40;
        skins.forEach(s => {
            const id = s.id || s.skinId || 'default';
            const active = id === selectedS;
            const chip = this.add.rectangle(sx + 50, skinY + 28, 100, 36, active ? 0xaa7744 : 0x2a2218, active ? 0.45 : 0.25);
            chip.setStrokeStyle(2, active ? 0xffcc88 : 0x554433);
            chip.setInteractive({ useHandCursor: true });
            this.add.text(sx + 50, skinY + 28, `${s.icon || '🐺'}`, { fontSize: '18px' }).setOrigin(0.5);
            chip.on('pointerdown', () => {
                soundManager.playButtonClick();
                MetaProgress.setSelectedSkin(id);
                this.refresh();
            });
            sx += 108;
        });

        const selectedSkinMeta = MetaProgress.getSkinMeta(selectedS);
        this.add.text(width - 40, skinY + 28, `Выбрано: ${selectedSkinMeta.icon} ${selectedSkinMeta.name}`, {
            fontSize: '12px',
            fill: '#aabbaa'
        }).setOrigin(1, 0.5);

        // Extra reroll status
        const extra = MetaProgress.getExtraRerolls();
        this.add.text(width / 2, skinY + 58, `Рероллы level-up: ${MetaProgress.getLevelUpRerolls()} (база +${extra})`, {
            fontSize: '13px',
            fill: '#99bbdd'
        }).setOrigin(0.5);

        // --- Shop list ---
        const shopTop = skinY + 80;
        this.add.text(width / 2, shopTop, 'МАГАЗИН РАЗБЛОКИРОВОК', {
            fontSize: '13px',
            fill: '#aaccbb',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const items = MetaProgress.listShopItems();
        const listTop = shopTop + 18;
        const rowH = isPortrait ? 52 : 48;
        const maxVisible = isPortrait ? 6 : 7;
        const startIdx = this._shopScroll || 0;
        const slice = items.slice(startIdx, startIdx + maxVisible);

        slice.forEach((item, i) => {
            const y = listTop + i * rowH + rowH / 2;
            this.drawShopRow(width, y, item, isPortrait);
        });

        // Scroll buttons if needed
        if (items.length > maxVisible) {
            const by = height - 100;
            if (startIdx > 0) {
                this.makeSmallBtn(width / 2 - 80, by, 70, '▲', () => {
                    this._shopScroll = Math.max(0, startIdx - 1);
                    this.refresh();
                });
            }
            if (startIdx + maxVisible < items.length) {
                this.makeSmallBtn(width / 2 + 80, by, 70, '▼', () => {
                    this._shopScroll = startIdx + 1;
                    this.refresh();
                });
            }
        }

        // Back
        this.makeBtn(width / 2, height - 48, Math.min(240, width * 0.6), '← В МЕНЮ', 0x88aa99, () => {
            soundManager.playButtonClick();
            this.scene.start('MenuScene');
        });
    }

    drawShopRow(width, y, item, isPortrait) {
        const rowW = Math.min(720, width - 48);
        const x0 = width / 2 - rowW / 2;

        const bg = this.add.rectangle(width / 2, y, rowW, isPortrait ? 46 : 42, 0x121a14, 0.85);
        bg.setStrokeStyle(1, item.unlocked ? 0x336644 : 0x2a3a30);

        this.add.text(x0 + 16, y, `${item.icon}  ${item.name}`, {
            fontSize: isPortrait ? '13px' : '14px',
            fill: item.unlocked ? '#88cc99' : '#e8fff0',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        this.add.text(x0 + 16, y + 14, item.desc, {
            fontSize: '10px',
            fill: '#667766'
        }).setOrigin(0, 0.5);

        if (item.unlocked) {
            this.add.text(x0 + rowW - 16, y, 'ОТКРЫТО', {
                fontSize: '12px',
                fill: '#66aa77',
                fontStyle: 'bold'
            }).setOrigin(1, 0.5);
        } else if (!item.reqOk) {
            this.add.text(x0 + rowW - 16, y, '🔒 нужно пред.', {
                fontSize: '11px',
                fill: '#886655'
            }).setOrigin(1, 0.5);
        } else {
            const label = `🌙 ${item.cost}`;
            const can = item.canBuy;
            const btn = this.add.rectangle(x0 + rowW - 56, y, 88, 32, can ? 0x4466aa : 0x333333, can ? 0.45 : 0.25);
            btn.setStrokeStyle(2, can ? 0x88aaff : 0x555555);
            this.add.text(x0 + rowW - 56, y, label, {
                fontSize: '13px',
                fill: can ? '#ffffff' : '#888888',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            if (can) {
                btn.setInteractive({ useHandCursor: true });
                btn.on('pointerdown', () => {
                    const res = MetaProgress.unlock(item.id);
                    if (res.ok) {
                        soundManager.playLevelUp && soundManager.playLevelUp();
                        // Auto-select new weapon/skin
                        if (item.category === 'weapon') MetaProgress.setSelectedWeapon(item.weaponKey);
                        if (item.category === 'skin') MetaProgress.setSelectedSkin(item.skinId);
                        this.refresh();
                    } else {
                        soundManager.playButtonClick();
                    }
                });
            }
        }
    }

    makeBtn(x, y, w, label, color, onClick) {
        const bg = this.add.rectangle(x, y, w, 44, color, 0.2);
        bg.setStrokeStyle(2, color);
        bg.setInteractive({ useHandCursor: true });
        this.add.text(x, y, label, {
            fontSize: '16px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        bg.on('pointerover', () => bg.setFillStyle(color, 0.4));
        bg.on('pointerout', () => bg.setFillStyle(color, 0.2));
        bg.on('pointerdown', onClick);
    }

    makeSmallBtn(x, y, w, label, onClick) {
        const bg = this.add.rectangle(x, y, w, 32, 0x334433, 0.4);
        bg.setStrokeStyle(1, 0x668866);
        bg.setInteractive({ useHandCursor: true });
        this.add.text(x, y, label, { fontSize: '14px', fill: '#ccffdd' }).setOrigin(0.5);
        bg.on('pointerdown', onClick);
    }
}
