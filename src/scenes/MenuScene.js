import { soundManager } from '../systems/SoundManager.js';
import { isPortraitMode } from '../utils/orientation.js';
import { BALANCE } from '../config.js';
import { MetaProgress } from '../systems/MetaProgress.js';

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

        this.add.circle(width * 0.82, height * 0.18, 36, 0xddffee, 0.12);
        this.add.circle(width * 0.82 - 8, height * 0.18 - 4, 28, 0x0b140d, 1);

        const titleY = isPortrait ? height * 0.18 : height / 3 - 40;
        const subtitleY = isPortrait ? height * 0.26 : height / 3 + 20;
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

        // Best run + meta essence
        let bestText = 'Пока нет рекордов — стань первым';
        try {
            const best = JSON.parse(localStorage.getItem(BALANCE.storageKey) || 'null');
            if (best) {
                const bm = Math.floor(best.time / 60).toString().padStart(2, '0');
                const bs = (best.time % 60).toString().padStart(2, '0');
                bestText = `Рекорд: ${bm}:${bs}  ·  ${best.kills} убийств  ·  ур. ${best.level}`;
            }
        } catch (e) { /* ignore */ }

        this.add.text(width / 2, subtitleY + (isPortrait ? 32 : 40), bestText, {
            fontSize: isPortrait ? '13px' : '15px',
            fill: '#88aa99'
        }).setOrigin(0.5);

        const essence = MetaProgress.getEssence();
        const startW = MetaProgress.getSelectedWeapon();
        const skin = MetaProgress.getSkinMeta(MetaProgress.getSelectedSkin());
        this.add.text(width / 2, subtitleY + (isPortrait ? 54 : 64),
            `🌙 ${essence} эссенции  ·  старт: ${startW}  ·  ${skin.icon} ${skin.name}`, {
            fontSize: isPortrait ? '12px' : '13px',
            fill: '#99bbdd'
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

        const btnY = isPortrait ? height * 0.46 : height / 2 + 40;
        const btnW = isPortrait ? Math.min(280, width * 0.65) : 280;

        this.makeMenuBtn(width / 2, btnY, btnW, 58, 'ВЫЙТИ НА ОХОТУ', 0x00ff88, () => {
            soundManager.playHowl();
            soundManager.startBackgroundMusic();
            this.scene.start('GameScene');
        });

        this.makeMenuBtn(width / 2, btnY + 70, btnW, 48, '🏠 ЛОГОВО · МЕТА', 0xaa88ff, () => {
            soundManager.playButtonClick();
            this.scene.start('MetaScene');
        });

        const chips = ['Мета-разблокировки', 'Эволюции', '3 босса', 'Комбо'];
        this.add.text(width / 2, btnY + 120, chips.join('  ·  '), {
            fontSize: isPortrait ? '12px' : '14px',
            fill: '#668877',
            align: 'center',
            wordWrap: { width: width * 0.9 }
        }).setOrigin(0.5);

        const hintY = isPortrait ? height - 48 : height - 56;
        const hintText = isPortrait
            ? 'Тап — Бег   ·   Рывок — кнопка 💨'
            : 'WASD / Тап — Бег  |  Пробел / 💨 — Рывок  |  P / ⏸ — Пауза';

        this.add.text(width / 2, hintY, hintText, {
            fontSize: isPortrait ? '13px' : '15px',
            fill: '#88bb99',
            align: 'center'
        }).setOrigin(0.5);
    }

    makeMenuBtn(x, y, w, h, label, color, onClick) {
        const btnBg = this.add.rectangle(x, y, w, h, color, 0.2);
        btnBg.setStrokeStyle(3, color);
        btnBg.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(x, y, label, {
            fontSize: h > 50 ? '22px' : '18px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(color, 0.5);
            btnText.setStyle({ fill: '#000000' });
        });
        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(color, 0.2);
            btnText.setStyle({ fill: '#ffffff' });
        });
        btnBg.on('pointerdown', onClick);
    }
}
