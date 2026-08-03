import { soundManager } from '../systems/SoundManager.js';
import { isPortraitMode } from '../utils/orientation.js';
import { BALANCE } from '../config.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import {
    RunSettings,
    DIFFICULTIES,
    getDailySeedInfo
} from '../systems/RunSettings.js';

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

        const titleY = isPortrait ? height * 0.12 : height * 0.18;
        const subtitleY = isPortrait ? height * 0.19 : height * 0.26;

        this.add.text(width / 2, titleY, 'ОБОРОТЕНЬ', {
            fontSize: isPortrait ? '40px' : '52px',
            fill: '#88ffaa',
            fontStyle: 'bold',
            shadow: { blur: 16, color: '#00ff66', fill: true }
        }).setOrigin(0.5);

        this.add.text(width / 2, subtitleY, 'ЛЕСНОЕ ВЫЖИВАНИЕ', {
            fontSize: isPortrait ? '20px' : '28px',
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

        this.add.text(width / 2, subtitleY + 28, bestText, {
            fontSize: isPortrait ? '12px' : '14px',
            fill: '#88aa99'
        }).setOrigin(0.5);

        const essence = MetaProgress.getEssence();
        const skin = MetaProgress.getSkinMeta(MetaProgress.getSelectedSkin());
        this.add.text(width / 2, subtitleY + 48,
            `🌙 ${essence}  ·  ${skin.icon} ${skin.name}`, {
            fontSize: '12px',
            fill: '#99bbdd'
        }).setOrigin(0.5);

        // —— Difficulty selector ——
        const diffY = subtitleY + (isPortrait ? 78 : 88);
        this.add.text(width / 2, diffY, 'СЛОЖНОСТЬ', {
            fontSize: '11px',
            fill: '#778888',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const selectedDiff = RunSettings.getDifficultyId();
        const ids = Object.keys(DIFFICULTIES);
        const chipW = isPortrait ? 96 : 120;
        const gap = chipW + 12;
        const startX = width / 2 - ((ids.length - 1) * gap) / 2;

        ids.forEach((id, i) => {
            const d = DIFFICULTIES[id];
            const active = id === selectedDiff;
            const x = startX + i * gap;
            const bg = this.add.rectangle(x, diffY + 28, chipW, 40, active ? 0x224433 : 0x151c18, active ? 0.7 : 0.35);
            bg.setStrokeStyle(2, active ? Phaser.Display.Color.HexStringToColor(d.color).color : 0x445544);
            bg.setInteractive({ useHandCursor: true });
            this.add.text(x, diffY + 28, `${d.icon} ${d.name}`, {
                fontSize: isPortrait ? '11px' : '13px',
                fill: active ? d.color : '#aabbaa',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            bg.on('pointerdown', () => {
                soundManager.playButtonClick();
                RunSettings.setDifficultyId(id);
                this.scene.restart();
            });
        });

        const cur = RunSettings.getDifficulty();
        this.add.text(width / 2, diffY + 58, cur.desc, {
            fontSize: '11px',
            fill: '#667766'
        }).setOrigin(0.5);

        // Daily best
        const daily = getDailySeedInfo();
        const dailyBest = RunSettings.getTodayDailyBest(selectedDiff);
        let dailyLine = `📅 Daily ${daily.dateKey}  ·  seed ${daily.seed.toString(16).slice(0, 6)}…`;
        if (dailyBest) {
            const bm = Math.floor(dailyBest.time / 60).toString().padStart(2, '0');
            const bs = (dailyBest.time % 60).toString().padStart(2, '0');
            dailyLine += `  ·  лучший: ${bm}:${bs} / ${dailyBest.kills}`;
        } else {
            dailyLine += '  ·  ещё нет рекорда';
        }
        this.add.text(width / 2, diffY + 78, dailyLine, {
            fontSize: isPortrait ? '10px' : '12px',
            fill: '#8899aa'
        }).setOrigin(0.5);

        // Mute
        const initialIcon = soundManager.isMuted ? '🔇' : '🔊';
        const muteBtn = this.add.text(width - 50, 28, initialIcon, {
            fontSize: '30px'
        }).setInteractive({ useHandCursor: true });
        muteBtn.on('pointerdown', () => {
            const muted = soundManager.toggleMute();
            muteBtn.setText(muted ? '🔇' : '🔊');
            soundManager.playButtonClick();
        });

        const btnY = isPortrait ? height * 0.52 : height * 0.58;
        const btnW = isPortrait ? Math.min(300, width * 0.72) : 300;

        this.makeMenuBtn(width / 2, btnY, btnW, 54, 'ВЫЙТИ НА ОХОТУ', 0x00ff88, () => {
            soundManager.playHowl();
            soundManager.startBackgroundMusic();
            const runConfig = RunSettings.buildRunConfig({ mode: 'casual' });
            this.scene.start('GameScene', { runConfig });
        });

        this.makeMenuBtn(width / 2, btnY + 62, btnW, 48, '📅 DAILY RUN', 0xff8866, () => {
            soundManager.playHowl();
            soundManager.startBackgroundMusic();
            const runConfig = RunSettings.buildRunConfig({ mode: 'daily' });
            this.scene.start('GameScene', { runConfig });
        });

        this.makeMenuBtn(width / 2, btnY + 118, btnW, 44, '🏠 ЛОГОВО · МЕТА', 0xaa88ff, () => {
            soundManager.playButtonClick();
            this.scene.start('MetaScene');
        });

        const hintY = isPortrait ? height - 40 : height - 48;
        this.add.text(width / 2, hintY, isPortrait
            ? 'Тап — Бег  ·  💨 Рывок'
            : 'WASD — Бег  |  Пробел / 💨 — Рывок  |  P — Пауза', {
            fontSize: '12px',
            fill: '#88bb99'
        }).setOrigin(0.5);
    }

    makeMenuBtn(x, y, w, h, label, color, onClick) {
        const btnBg = this.add.rectangle(x, y, w, h, color, 0.2);
        btnBg.setStrokeStyle(3, color);
        btnBg.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(x, y, label, {
            fontSize: h > 50 ? '20px' : '16px',
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
