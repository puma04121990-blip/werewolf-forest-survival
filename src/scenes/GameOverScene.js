import { soundManager } from '../systems/SoundManager.js';
import { isPortraitMode } from '../utils/orientation.js';
import { BALANCE } from '../config.js';
import {
    formatDeathCause,
    buildDamageBreakdown,
    buildShareText
} from '../systems/RunStats.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { DIFFICULTIES, RunSettings } from '../systems/RunSettings.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.finalStats = data || {
            kills: 0,
            time: 0,
            level: 1,
            maxCombo: 0,
            wave: 1,
            deathCause: null,
            damageByWeapon: {},
            difficultyId: 'normal',
            isDaily: false,
            dailyResult: null,
            essenceMul: 1
        };
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const isPortrait = isPortraitMode();
        const stats = this.finalStats;

        this.add.rectangle(width / 2, height / 2, width, height, 0x0b0c10);

        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1f3823, 0.2);
        for (let x = 0; x < width; x += 40) grid.lineBetween(x, 0, x, height);
        for (let y = 0; y < height; y += 40) grid.lineBetween(0, y, width, y);

        const titleY = isPortrait ? height * 0.08 : 56;
        this.add.text(width / 2, titleY, 'ИГРА ОКОНЧЕНА', {
            fontSize: isPortrait ? '32px' : '48px',
            fill: '#ff0055',
            fontStyle: 'bold',
            shadow: { blur: 18, color: '#ff0055', fill: true }
        }).setOrigin(0.5);

        // Death cause
        const death = formatDeathCause(stats.deathCause);
        this.add.text(width / 2, titleY + (isPortrait ? 36 : 44), 'УБИЛ ТЕБЯ', {
            fontSize: '12px',
            fill: '#886666',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, titleY + (isPortrait ? 56 : 68), death.line, {
            fontSize: isPortrait ? '16px' : '20px',
            fill: '#ff8899',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: width * 0.88 }
        }).setOrigin(0.5);

        // Core stats
        const mins = Math.floor(stats.time / 60).toString().padStart(2, '0');
        const secs = (stats.time % 60).toString().padStart(2, '0');
        const coreY = titleY + (isPortrait ? 92 : 110);

        const diff = DIFFICULTIES[stats.difficultyId] || DIFFICULTIES.normal;
        const modeTag = stats.isDaily ? `📅 DAILY` : 'Охота';
        const coreLine = `${modeTag}  ${diff.icon} ${diff.name}   ⏱ ${mins}:${secs}   💀 ${stats.kills}   Ур.${stats.level}   Волна ${stats.wave || 1}`;
        this.add.text(width / 2, coreY, coreLine, {
            fontSize: isPortrait ? '11px' : '14px',
            fill: '#cceeee',
            align: 'center',
            wordWrap: { width: width * 0.92 }
        }).setOrigin(0.5);

        if (stats.isDaily && stats.dailyResult) {
            const dr = stats.dailyResult;
            const msg = dr.isNew
                ? '★ НОВЫЙ РЕКОРД DAILY!'
                : `Daily best: ${Math.floor(dr.best.time / 60)}:${String(dr.best.time % 60).padStart(2, '0')} / ${dr.best.kills}`;
            this.add.text(width / 2, coreY + 18, msg, {
                fontSize: '13px',
                fill: dr.isNew ? '#ffe600' : '#99aacc',
                fontStyle: 'bold'
            }).setOrigin(0.5);
        }

        // Damage breakdown
        const breakdown = buildDamageBreakdown(stats.damageByWeapon || {});
        const dmgTitleY = coreY + (isPortrait ? 28 : 36);
        this.add.text(width / 2, dmgTitleY, 'УРОН ПО ОРУЖИЮ', {
            fontSize: '12px',
            fill: '#886666',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const barMaxW = Math.min(420, width * 0.72);
        const barX = width / 2 - barMaxW / 2;
        let rowY = dmgTitleY + 18;
        const rowH = isPortrait ? 22 : 26;
        const maxRows = isPortrait ? 5 : 6;
        const rows = breakdown.slice(0, maxRows);

        if (rows.length === 0) {
            this.add.text(width / 2, rowY + 8, 'Нет зафиксированного урона', {
                fontSize: '13px',
                fill: '#667766'
            }).setOrigin(0.5);
            rowY += 28;
        } else {
            const maxDmg = rows[0].damage || 1;
            rows.forEach((row, i) => {
                const y = rowY + i * rowH;
                const g = this.add.graphics();
                g.fillStyle(0x1a221c, 0.9);
                g.fillRoundedRect(barX, y, barMaxW, rowH - 6, 3);
                const fillW = Math.max(4, (row.damage / maxDmg) * barMaxW);
                const col = i === 0 ? 0x44ff99 : 0x339966;
                g.fillStyle(col, 0.85);
                g.fillRoundedRect(barX, y, fillW, rowH - 6, 3);

                this.add.text(barX + 6, y + (rowH - 6) / 2, `${row.icon} ${row.name}`, {
                    fontSize: isPortrait ? '11px' : '13px',
                    fill: '#ffffff',
                    fontStyle: 'bold'
                }).setOrigin(0, 0.5);

                this.add.text(barX + barMaxW - 6, y + (rowH - 6) / 2, `${row.pct}%`, {
                    fontSize: isPortrait ? '11px' : '13px',
                    fill: '#ccffdd',
                    fontStyle: 'bold'
                }).setOrigin(1, 0.5);
            });
            rowY += rows.length * rowH + 4;
        }

        // Best run
        let bestLine = 'Рекорд: —';
        try {
            const best = JSON.parse(localStorage.getItem(BALANCE.storageKey) || 'null');
            if (best) {
                const bm = Math.floor(best.time / 60).toString().padStart(2, '0');
                const bs = (best.time % 60).toString().padStart(2, '0');
                bestLine = `Рекорд: ${bm}:${bs} · ${best.kills} убийств · ур. ${best.level}`;
                const isNew = stats.time >= best.time && stats.kills >= best.kills;
                if (isNew) bestLine = '★ НОВЫЙ РЕКОРД! · ' + bestLine.replace('Рекорд: ', '');
            }
        } catch (e) { /* ignore */ }

        this.add.text(width / 2, rowY + 10, bestLine, {
            fontSize: isPortrait ? '12px' : '14px',
            fill: '#ffe600',
            align: 'center',
            wordWrap: { width: width * 0.85 }
        }).setOrigin(0.5);

        // Meta essence reward (once per game-over screen)
        const award = MetaProgress.awardRun(stats);
        this.add.text(width / 2, rowY + 32, `+${award.earned} 🌙 эссенции  ·  всего ${award.total}`, {
            fontSize: isPortrait ? '14px' : '16px',
            fill: '#aaddff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Buttons
        const btnY = isPortrait ? height - 168 : height - 170;
        const btnW = isPortrait ? Math.min(260, width * 0.7) : 260;

        this.makeButton(width / 2, btnY, btnW, '📋 ПОДЕЛИТЬСЯ', 0xffcc44, () => {
            this.shareScore();
        });

        this.makeButton(width / 2, btnY + 48, btnW, 'ИГРАТЬ СНОВА', 0x00ffcc, () => {
            soundManager.playLaser();
            const runConfig = RunSettings.buildRunConfig({
                mode: stats.isDaily ? 'daily' : 'casual',
                difficulty: stats.difficultyId || 'normal'
            });
            this.scene.start('GameScene', { runConfig });
        });

        this.makeButton(width / 2, btnY + 92, btnW, '🏠 ЛОГОВО (МЕТА)', 0xaa88ff, () => {
            soundManager.playButtonClick();
            this.scene.start('MetaScene');
        }, true);

        this.makeButton(width / 2, btnY + 132, isPortrait ? Math.min(220, width * 0.6) : 220, 'В МЕНЮ', 0x88aa99, () => {
            soundManager.playButtonClick();
            this.scene.start('MenuScene');
        }, true);

        this.shareToast = this.add.text(width / 2, height * 0.5, '', {
            fontSize: '18px',
            fill: '#88ffaa',
            fontStyle: 'bold',
            backgroundColor: '#001a0888',
            padding: { x: 14, y: 8 }
        }).setOrigin(0.5).setAlpha(0).setDepth(50);
    }

    async shareScore() {
        soundManager.playButtonClick();
        const text = buildShareText(this.finalStats);

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Оборотень: Лесное Выживание',
                    text
                });
                this.flashToast('Отправлено!');
                return;
            }
        } catch (e) {
            // user cancelled or share failed — fall through to clipboard
            if (e && e.name === 'AbortError') return;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                this.flashToast('Скопировано в буфер!');
                return;
            }
        } catch (e) { /* ignore */ }

        // Fallback: hidden textarea
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            this.flashToast('Скопировано в буфер!');
        } catch (e) {
            this.flashToast('Не удалось скопировать');
            console.log(text);
        }
    }

    flashToast(msg) {
        if (!this.shareToast) return;
        this.shareToast.setText(msg);
        this.shareToast.setAlpha(1);
        this.tweens.killTweensOf(this.shareToast);
        this.tweens.add({
            targets: this.shareToast,
            alpha: 0,
            delay: 1400,
            duration: 400
        });
    }

    makeButton(x, y, w, label, color, onClick, small = false) {
        const h = small ? 40 : 46;
        const btnBg = this.add.rectangle(x, y, w, h, color, 0.18);
        btnBg.setStrokeStyle(2, color);
        btnBg.setInteractive({ useHandCursor: true });

        this.add.text(x, y, label, {
            fontSize: small ? '15px' : '18px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setFillStyle(color, 0.4));
        btnBg.on('pointerout', () => btnBg.setFillStyle(color, 0.18));
        btnBg.on('pointerdown', onClick);
    }
}
