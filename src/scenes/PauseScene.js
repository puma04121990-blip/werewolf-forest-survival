import { isPortraitMode } from '../utils/orientation.js';

export default class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const isPortrait = isPortraitMode();

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.78);

        const titleY = isPortrait ? 48 : 56;
        this.add.text(width / 2, titleY, 'ПАУЗА', {
            fontSize: isPortrait ? '36px' : '48px',
            fill: '#00ffcc',
            fontStyle: 'bold',
            stroke: '#003322',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(width / 2, titleY + (isPortrait ? 32 : 40), 'Лес замер. Враги ждут.', {
            fontSize: '14px',
            fill: '#88aa99'
        }).setOrigin(0.5);

        // Loadout from paused GameScene
        const game = this.scene.get('GameScene');
        const loadout = game?.upgradeSystem?.getLoadoutSummary?.() || { weapons: [], passives: [] };
        const player = game?.player;

        this.drawLoadout(loadout, player, width, height, isPortrait, titleY);

        const btnY = isPortrait ? height - 72 : height - 80;
        const resumeBtn = this.add.rectangle(width / 2, btnY, 240, 50, 0x00ffcc, 0.2);
        resumeBtn.setStrokeStyle(2, 0x00ffcc);
        resumeBtn.setInteractive({ useHandCursor: true });

        this.add.text(width / 2, btnY, 'ПРОДОЛЖИТЬ', {
            fontSize: '20px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const resume = () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        };

        resumeBtn.on('pointerover', () => resumeBtn.setFillStyle(0x00ffcc, 0.45));
        resumeBtn.on('pointerout', () => resumeBtn.setFillStyle(0x00ffcc, 0.2));
        resumeBtn.on('pointerdown', resume);

        this.input.keyboard.on('keydown-P', resume);
        this.input.keyboard.on('keydown-ESC', resume);
        // Don't bind Space — accidental dash after resume is annoying; keep P/ESC
    }

    drawLoadout(loadout, player, width, height, isPortrait, titleY) {
        const { weapons, passives, curses } = loadout;
        const panelTop = titleY + (isPortrait ? 58 : 70);
        const panelBottom = isPortrait ? height - 100 : height - 110;
        const panelH = panelBottom - panelTop;
        const panelW = Math.min(isPortrait ? width * 0.9 : 720, width - 40);
        const panelX = width / 2;

        // Panel background
        const bg = this.add.graphics();
        bg.fillStyle(0x0c1612, 0.92);
        bg.fillRoundedRect(panelX - panelW / 2, panelTop, panelW, panelH, 12);
        bg.lineStyle(2, 0x2a5a44, 0.85);
        bg.strokeRoundedRect(panelX - panelW / 2, panelTop, panelW, panelH, 12);

        this.add.text(panelX, panelTop + 16, 'ТЕКУЩИЕ УСИЛЕНИЯ', {
            fontSize: '13px',
            fill: '#88bb99',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Two columns on landscape, stacked on portrait
        if (isPortrait) {
            let y = panelTop + 40;
            y = this.drawSection(panelX, y, panelW - 28, 'ОРУЖИЕ', weapons, 0x66ffcc, true);
            y += 8;
            y = this.drawSection(panelX, y, panelW - 28, 'ПАССИВКИ', passives, 0xffdd88, true);
            if (curses && curses.length) {
                y += 8;
                y = this.drawSection(panelX, y, panelW - 28, 'ПРОКЛЯТИЯ', curses, 0xff4466, true);
            }
            y += 10;
            this.drawPlayerStats(panelX, Math.min(y, panelBottom - 36), player, true);
        } else {
            const colW = (panelW - 48) / 2;
            const leftX = panelX - panelW / 4 - 4;
            const rightX = panelX + panelW / 4 + 4;
            const y0 = panelTop + 40;
            this.drawSection(leftX, y0, colW, 'ОРУЖИЕ', weapons, 0x66ffcc, false);
            let ry = this.drawSection(rightX, y0, colW, 'ПАССИВКИ', passives, 0xffdd88, false);
            if (curses && curses.length) {
                this.drawSection(rightX, ry + 8, colW, 'ПРОКЛЯТИЯ', curses, 0xff4466, false);
            }
            this.drawPlayerStats(panelX, panelBottom - 28, player, false);
        }
    }

    /**
     * @returns {number} next Y after section
     */
    drawSection(cx, startY, maxW, title, items, accentColor, center) {
        const hex = '#' + accentColor.toString(16).padStart(6, '0');
        this.add.text(cx, startY, title, {
            fontSize: '12px',
            fill: hex,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        let y = startY + 22;

        if (!items || items.length === 0) {
            this.add.text(cx, y, '— пока пусто —', {
                fontSize: '13px',
                fill: '#556655'
            }).setOrigin(0.5);
            return y + 24;
        }

        const lineH = 22;
        items.forEach((item, i) => {
            const line = item.line || `${item.icon} ${item.name}`;
            // subtle row bg
            if (i % 2 === 0) {
                const g = this.add.graphics();
                g.fillStyle(0xffffff, 0.03);
                g.fillRoundedRect(cx - maxW / 2, y - 9, maxW, lineH - 2, 4);
            }
            this.add.text(cx, y, line, {
                fontSize: '14px',
                fill: '#e8fff4',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            y += lineH;
        });

        return y + 4;
    }

    drawPlayerStats(cx, y, player, compact) {
        if (!player) return;
        const dmg = Math.round((player.damageMultiplier || 1) * 100);
        const rate = Math.round((player.fireRateMultiplier || 1) * 100);
        const crit = Math.round((player.critChance || 0) * 100);
        const armor = Math.round((player.armor || 0) * 100);
        const life = Math.round((player.lifesteal || 0) * 100);
        const hp = `${Math.ceil(player.health)}/${Math.ceil(player.maxHealth)}`;

        const parts = compact
            ? [`HP ${hp}`, `Урон ${dmg}%`, `Скор. ${rate}%`, `Крит ${crit}%`]
            : [
                `HP ${hp}`,
                `Урон ×${(player.damageMultiplier || 1).toFixed(2)}`,
                `Атаки ×${(player.fireRateMultiplier || 1).toFixed(2)}`,
                `Крит ${crit}%`,
                armor > 0 ? `Броня ${armor}%` : null,
                life > 0 ? `Вамп. ${life}%` : null
            ].filter(Boolean);

        this.add.text(cx, y, parts.join('  ·  '), {
            fontSize: compact ? '11px' : '12px',
            fill: '#99bbaa',
            align: 'center',
            wordWrap: { width: this.scale.width * 0.85 }
        }).setOrigin(0.5);
    }
}
