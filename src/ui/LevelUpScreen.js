/**
 * Level-up card UI (v4 — safe selectOption, no handlers-after-hide).
 * New filename forces browsers/CDN to drop cached LevelUpPanel.js.
 */
import { soundManager } from '../systems/SoundManager.js';
import { isPortraitMode } from '../utils/orientation.js';

const RARITY_STYLE = {
    new: { stroke: 0x44ff88, fill: 0x0f2a18, label: '#66ffaa' },
    upgrade: { stroke: 0x44aaff, fill: 0x0f1a2a, label: '#88ccff' },
    weapon: { stroke: 0x00ffcc, fill: 0x1a1a2e, label: '#00ffcc' },
    passive: { stroke: 0xffcc44, fill: 0x2a220f, label: '#ffdd66' },
    evolution: { stroke: 0xff66aa, fill: 0x2a1020, label: '#ff99cc' },
    curse: { stroke: 0xaa2244, fill: 0x1a080e, label: '#ff6688' }
};

/**
 * Level-up UI with select / ban modes, reroll & ban buttons, synergy lines.
 *
 * show(options, {
 *   onSelect(opt),
 *   onReroll() => newOptions | null,
 *   onBan(opt) => newOptions | null,  // after ban, refresh remaining cards
 *   rerollsLeft, bansLeft
 * })
 */
export class LevelUpScreen {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.cardsLayer = null;
        this.actionsLayer = null;
        this.mode = 'select'; // 'select' | 'ban'
        this.handlers = null;
        this.rerollsLeft = 0;
        this.bansLeft = 0;
        this.options = [];
        this.hintText = null;
        this.modeBanner = null;
        this.rerollBtn = null;
        this.banBtn = null;
        this.rerollLabel = null;
        this.banLabel = null;
        this._selectLocked = false;
    }

    /** @deprecated alias */
    static get LevelUpPanel() {
        return LevelUpScreen;
    }

    show(options, handlers = {}) {
        soundManager.playLevelUp();

        // Destroy previous UI without wiping the NEW handlers we are about to set
        this.destroyUiOnly();

        this.handlers = handlers || {};
        this.rerollsLeft = handlers.rerollsLeft ?? 0;
        this.bansLeft = handlers.bansLeft ?? 0;
        this.mode = 'select';
        this.options = options || [];
        this._selectLocked = false;

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const isPortrait = isPortraitMode();

        this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);

        const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);
        bg.setInteractive();
        this.container.add(bg);

        const titleY = isPortrait ? 48 : 72;
        const title = this.scene.add.text(width / 2, titleY, 'НОВЫЙ УРОВЕНЬ!', {
            fontSize: isPortrait ? '28px' : '38px',
            fill: '#ffe600',
            fontStyle: 'bold',
            stroke: '#221100',
            strokeThickness: 6
        }).setOrigin(0.5);
        this.container.add(title);

        this.hintText = this.scene.add.text(width / 2, titleY + (isPortrait ? 28 : 36), 'Выбери усиление', {
            fontSize: '14px',
            fill: '#aabbaa'
        }).setOrigin(0.5);
        this.container.add(this.hintText);

        this.modeBanner = this.scene.add.text(width / 2, titleY + (isPortrait ? 50 : 58), '', {
            fontSize: '15px',
            fill: '#ff6688',
            fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);
        this.container.add(this.modeBanner);

        this.cardsLayer = this.scene.add.container(0, 0);
        this.container.add(this.cardsLayer);

        this.actionsLayer = this.scene.add.container(0, 0);
        this.container.add(this.actionsLayer);

        this.renderCards(options);
        this.renderActionButtons();
    }

    renderCards(options) {
        this.options = options || [];
        if (!this.cardsLayer) return;
        this.cardsLayer.removeAll(true);

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const isPortrait = isPortraitMode();
        const titleY = isPortrait ? 48 : 72;
        const list = this.options;

        if (isPortrait) {
            const cardW = Math.min(540, width * 0.86);
            const cardH = 148;
            const totalH = list.length * (cardH + 10);
            let startY = (height - totalH) / 2 + cardH / 2 + 4;
            if (startY < titleY + 88) startY = titleY + 92;

            list.forEach((opt, idx) => {
                this.buildCard(opt, width / 2, startY + idx * (cardH + 10), cardW, cardH, true);
            });
        } else {
            const cardWidth = 260;
            const cardHeight = 380;
            const gap = 290;
            const startX = width / 2 - ((list.length - 1) * gap) / 2;

            list.forEach((opt, idx) => {
                this.buildCard(opt, startX + idx * gap, height / 2 + 12, cardWidth, cardHeight, false);
            });
        }
    }

    /**
     * Mini ST vs AoE bars for weapon cards.
     * @returns {Phaser.GameObjects.GameObject[]}
     */
    buildDpsChart(opt, cx, cy, maxW) {
        const chart = opt.dpsChart;
        if (!chart) return [];

        const g = this.scene.add.graphics();
        const barH = 7;
        const gap = 4;
        const max = Math.max(chart.max, 1);
        const stW = Math.max(4, (chart.st / max) * maxW);
        const aoeW = Math.max(4, (chart.aoe / max) * maxW);

        // ST bar (cyan)
        g.fillStyle(0x1a2a33, 0.9);
        g.fillRoundedRect(cx - maxW / 2, cy, maxW, barH, 2);
        g.fillStyle(0x44aadd, 1);
        g.fillRoundedRect(cx - maxW / 2, cy, stW, barH, 2);

        // AoE / multi bar (orange) — for pure ST weapons both equal
        g.fillStyle(0x2a2218, 0.9);
        g.fillRoundedRect(cx - maxW / 2, cy + barH + gap, maxW, barH, 2);
        g.fillStyle(0xff9944, 1);
        g.fillRoundedRect(cx - maxW / 2, cy + barH + gap, aoeW, barH, 2);

        const labelSt = this.scene.add.text(cx - maxW / 2 - 2, cy + barH / 2, 'ST', {
            fontSize: '9px',
            fill: '#88ccff',
            fontStyle: 'bold'
        }).setOrigin(1, 0.5);

        const labelAoe = this.scene.add.text(cx - maxW / 2 - 2, cy + barH + gap + barH / 2, 'AoE', {
            fontSize: '9px',
            fill: '#ffaa66',
            fontStyle: 'bold'
        }).setOrigin(1, 0.5);

        return [g, labelSt, labelAoe];
    }

    buildCard(opt, cardX, cardY, cardW, cardH, horizontal) {
        const rarity = opt.rarity || (opt.type === 'passive' ? 'passive' : 'weapon');
        const style = RARITY_STYLE[rarity] || RARITY_STYLE.weapon;
        const hasSynergy = !!(opt.synergyText);

        const cardBg = this.scene.add.rectangle(cardX, cardY, cardW, cardH, style.fill, 0.96);
        cardBg.setStrokeStyle(hasSynergy ? 3 : 3, hasSynergy ? 0xffcc66 : style.stroke);
        cardBg.setInteractive({ useHandCursor: true });

        const nodes = [cardBg];
        let icon, name, desc, badge, synergy, banMark, roleBadge, dpsText;

        if (horizontal) {
            icon = this.scene.add.text(cardX - cardW / 2 + 40, cardY - 12, opt.icon || '⚡', {
                fontSize: '34px'
            }).setOrigin(0.5);
            nodes.push(icon);

            if (opt.badge) {
                badge = this.scene.add.text(cardX + cardW / 2 - 12, cardY - cardH / 2 + 12, opt.badge, {
                    fontSize: '11px',
                    fill: style.label,
                    fontStyle: 'bold',
                    backgroundColor: '#00000088',
                    padding: { x: 5, y: 2 }
                }).setOrigin(1, 0.5);
                nodes.push(badge);
            }

            name = this.scene.add.text(cardX - cardW / 2 + 74, cardY - 42, opt.name, {
                fontSize: '15px',
                fill: '#ffffff',
                fontStyle: 'bold',
                wordWrap: { width: cardW - 110 }
            }).setOrigin(0, 0.5);
            nodes.push(name);

            desc = this.scene.add.text(cardX - cardW / 2 + 74, cardY - 18, opt.description, {
                fontSize: '11px',
                fill: style.label,
                wordWrap: { width: cardW - 110 }
            }).setOrigin(0, 0.5);
            nodes.push(desc);

            // Role + DPS line
            if (opt.roleTag || opt.dpsLine) {
                const roleLine = [opt.roleTag, opt.dpsLine].filter(Boolean).join('  ·  ');
                dpsText = this.scene.add.text(cardX - cardW / 2 + 74, cardY + 10, roleLine, {
                    fontSize: '11px',
                    fill: opt.roleColor || '#aaddff',
                    fontStyle: 'bold',
                    wordWrap: { width: cardW - 110 }
                }).setOrigin(0, 0.5);
                nodes.push(dpsText);
            }

            if (opt.dpsChart) {
                const chartNodes = this.buildDpsChart(opt, cardX + 30, cardY + 32, Math.min(200, cardW - 120));
                nodes.push(...chartNodes);
            }

            if (opt.synergyText) {
                synergy = this.scene.add.text(cardX - cardW / 2 + 74, cardY + 58, opt.synergyText, {
                    fontSize: '11px',
                    fill: '#ffdd77',
                    fontStyle: 'bold',
                    wordWrap: { width: cardW - 110 }
                }).setOrigin(0, 0.5);
                nodes.push(synergy);
            }
        } else {
            icon = this.scene.add.text(cardX, cardY - 130, opt.icon || '⚡', { fontSize: '46px' }).setOrigin(0.5);
            nodes.push(icon);

            if (opt.badge) {
                badge = this.scene.add.text(cardX, cardY - 82, opt.badge, {
                    fontSize: '12px',
                    fill: style.label,
                    fontStyle: 'bold',
                    backgroundColor: '#000000aa',
                    padding: { x: 7, y: 3 }
                }).setOrigin(0.5);
                nodes.push(badge);
            }

            if (opt.roleTag) {
                roleBadge = this.scene.add.text(cardX, cardY - 58, opt.roleTag, {
                    fontSize: '13px',
                    fill: opt.roleColor || '#aaddff',
                    fontStyle: 'bold',
                    backgroundColor: '#00000099',
                    padding: { x: 8, y: 3 }
                }).setOrigin(0.5);
                nodes.push(roleBadge);
            }

            name = this.scene.add.text(cardX, cardY - 28, opt.name, {
                fontSize: '16px',
                fill: '#ffffff',
                fontStyle: 'bold',
                align: 'center',
                wordWrap: { width: cardW - 28 }
            }).setOrigin(0.5);
            nodes.push(name);

            desc = this.scene.add.text(cardX, cardY + 18, opt.description, {
                fontSize: '12px',
                fill: style.label,
                align: 'center',
                wordWrap: { width: cardW - 32 }
            }).setOrigin(0.5);
            nodes.push(desc);

            if (opt.dpsLine) {
                dpsText = this.scene.add.text(cardX, cardY + 62, opt.dpsLine, {
                    fontSize: '12px',
                    fill: '#aaddff',
                    fontStyle: 'bold',
                    align: 'center',
                    wordWrap: { width: cardW - 24 }
                }).setOrigin(0.5);
                nodes.push(dpsText);
            }

            if (opt.dpsChart) {
                const chartNodes = this.buildDpsChart(opt, cardX + 10, cardY + 88, cardW - 70);
                nodes.push(...chartNodes);
            }

            if (opt.synergyText) {
                synergy = this.scene.add.text(cardX, cardY + 128, opt.synergyText, {
                    fontSize: '11px',
                    fill: '#ffdd77',
                    fontStyle: 'bold',
                    align: 'center',
                    wordWrap: { width: cardW - 28 }
                }).setOrigin(0.5);
                nodes.push(synergy);

                if (opt.synergyDetail && opt.synergyDetail !== opt.synergyText) {
                    const detail = this.scene.add.text(cardX, cardY + 148, opt.synergyDetail, {
                        fontSize: '10px',
                        fill: '#ccaa66',
                        align: 'center',
                        wordWrap: { width: cardW - 28 }
                    }).setOrigin(0.5);
                    nodes.push(detail);
                }
            }
        }

        banMark = this.scene.add.text(cardX, cardY, '🚫', {
            fontSize: '42px'
        }).setOrigin(0.5).setAlpha(0).setDepth(5);
        nodes.push(banMark);

        const applyHover = () => {
            if (this.mode === 'ban') {
                cardBg.setStrokeStyle(4, 0xff3355);
                cardBg.setFillStyle(0x3a1018, 1);
                banMark.setAlpha(0.85);
            } else {
                cardBg.setStrokeStyle(4, 0xffe600);
                cardBg.setScale(1.03);
            }
        };
        const clearHover = () => {
            banMark.setAlpha(0);
            cardBg.setScale(1);
            if (this.mode === 'ban') {
                cardBg.setStrokeStyle(3, 0xff6688);
                cardBg.setFillStyle(style.fill, 0.96);
            } else {
                cardBg.setStrokeStyle(3, hasSynergy ? 0xffcc66 : style.stroke);
                cardBg.setFillStyle(style.fill, 0.96);
            }
        };

        cardBg.on('pointerover', applyHover);
        cardBg.on('pointerout', clearHover);
        cardBg.on('pointerdown', () => {
            this.selectOption(opt);
        });

        // Store refs for ban mode restyle
        cardBg.setData('style', style);
        cardBg.setData('hasSynergy', hasSynergy);

        this.cardsLayer.add(nodes);

        cardBg.setScale(0.88);
        cardBg.setAlpha(0);
        this.scene.tweens.add({
            targets: nodes,
            alpha: 1,
            scale: 1,
            duration: 160,
            delay: Math.random() * 50,
            ease: 'Back.easeOut'
        });
    }

    renderActionButtons() {
        if (!this.actionsLayer) return;
        this.actionsLayer.removeAll(true);

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const isPortrait = isPortraitMode();
        const y = isPortrait ? height - 52 : height - 48;
        const gap = isPortrait ? 150 : 180;

        // Reroll
        const rerollEnabled = this.rerollsLeft > 0 && this.mode === 'select';
        this.rerollBtn = this.makeActionButton(
            width / 2 - gap / 2,
            y,
            isPortrait ? 140 : 160,
            `🎲 РЕРОЛЛ (${this.rerollsLeft})`,
            rerollEnabled ? 0x66aaff : 0x445566,
            rerollEnabled,
            () => this.handleReroll()
        );

        // Ban
        const banActive = this.mode === 'ban';
        const banEnabled = this.bansLeft > 0 || banActive;
        const banLabel = banActive
            ? '✖ ОТМЕНА БАНА'
            : `🚫 БАН (${this.bansLeft})`;
        this.banBtn = this.makeActionButton(
            width / 2 + gap / 2,
            y,
            isPortrait ? 140 : 160,
            banLabel,
            banActive ? 0xff6688 : (this.bansLeft > 0 ? 0xcc5566 : 0x445566),
            banEnabled,
            () => this.toggleBanMode()
        );
    }

    makeActionButton(x, y, w, label, color, enabled, onClick) {
        const h = 42;
        const bg = this.scene.add.rectangle(x, y, w, h, color, enabled ? 0.28 : 0.12);
        bg.setStrokeStyle(2, color, enabled ? 1 : 0.4);
        if (enabled) bg.setInteractive({ useHandCursor: true });

        const txt = this.scene.add.text(x, y, label, {
            fontSize: '13px',
            fill: enabled ? '#ffffff' : '#778888',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        if (enabled) {
            bg.on('pointerover', () => bg.setFillStyle(color, 0.5));
            bg.on('pointerout', () => bg.setFillStyle(color, 0.28));
            bg.on('pointerdown', onClick);
        }

        this.actionsLayer.add([bg, txt]);
        return { bg, txt };
    }

    handleReroll() {
        if (this.rerollsLeft <= 0 || this.mode !== 'select') return;
        if (!this.handlers || !this.handlers.onReroll) return;

        soundManager.playButtonClick && soundManager.playButtonClick();
        const next = this.handlers.onReroll(this.options);
        if (!next || next.length === 0) return;

        this.rerollsLeft = Math.max(0, this.rerollsLeft - 1);
        if (this.handlers.onRerollUsed) this.handlers.onRerollUsed(this.rerollsLeft);

        this.renderCards(next);
        this.renderActionButtons();
        if (this.hintText) this.hintText.setText(`Реролл · осталось ${this.rerollsLeft}`);
    }

    toggleBanMode() {
        if (this.mode === 'ban') {
            this.mode = 'select';
            this.modeBanner.setVisible(false);
            this.hintText.setText('Выбери усиление');
            this.renderCards(this.options);
            this.renderActionButtons();
            return;
        }

        if (this.bansLeft <= 0) return;

        this.mode = 'ban';
        this.modeBanner.setText('Выбери карту для БАНА (навсегда в этом забеге)');
        this.modeBanner.setVisible(true);
        this.hintText.setText('Режим бана');
        this.renderCards(this.options);
        this.renderActionButtons();

        // Restyle cards slightly for ban mode
        this.cardsLayer.iterate((child) => {
            if (child.type === 'Rectangle' && child.input) {
                child.setStrokeStyle(3, 0xff6688);
            }
        });
    }

    handleBanClick(opt) {
        if (this.bansLeft <= 0 || !this.handlers || !this.handlers.onBan) return;

        const next = this.handlers.onBan(opt, this.options);
        this.bansLeft = Math.max(0, this.bansLeft - 1);
        if (this.handlers && this.handlers.onBanUsed) this.handlers.onBanUsed(this.bansLeft);

        this.mode = 'select';
        if (this.modeBanner) this.modeBanner.setVisible(false);
        if (this.hintText) {
            this.hintText.setText(next && next.length ? 'Карта забанена · выбери усиление' : 'Выбери усиление');
        }

        if (next && next.length > 0) {
            this.renderCards(next);
        } else {
            this.renderCards((this.options || []).filter(o => o.id !== opt.id));
        }
        this.renderActionButtons();
    }

    /**
     * Safe select: never touch this.handlers after UI teardown.
     */
    selectOption(opt) {
        if (this._selectLocked) return;
        if (this.mode === 'ban') {
            this.handleBanClick(opt);
            return;
        }

        try {
            soundManager.playButtonClick && soundManager.playButtonClick();
        } catch (e) { /* ignore */ }

        const onSelect = this.handlers && typeof this.handlers.onSelect === 'function'
            ? this.handlers.onSelect
            : null;

        this._selectLocked = true;
        this.destroyUiOnly();
        this.handlers = null;
        this.mode = 'select';

        if (onSelect) {
            try {
                onSelect(opt);
            } catch (err) {
                console.error('LevelUp onSelect error', err);
            }
        }
    }

    /** Destroy panel graphics; does NOT clear handlers (show() needs that). */
    destroyUiOnly() {
        if (this.container) {
            try {
                this.container.destroy(true);
            } catch (e) { /* ignore */ }
            this.container = null;
        }
        this.cardsLayer = null;
        this.actionsLayer = null;
        this.hintText = null;
        this.modeBanner = null;
        this.rerollBtn = null;
        this.banBtn = null;
    }

    hide() {
        this.destroyUiOnly();
        this.handlers = null;
        this.mode = 'select';
        this._selectLocked = false;
    }
}
