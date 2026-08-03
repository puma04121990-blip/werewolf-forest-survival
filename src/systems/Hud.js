import { soundManager } from './SoundManager.js';
import { isTouchDevice, isPortraitMode } from '../utils/orientation.js';

const WEAPON_ICONS = {
    blaster: '🐾',
    spread: '🐺',
    orbital: '🌕',
    shield: '🩸',
    lightning: '⚡',
    rockets: '👻',
    mines: '🔮'
};

export class Hud {
    constructor(scene) {
        this.scene = scene;

        // Track UI pointer ids so movement doesn't steal dash taps
        if (!scene.uiPointers) scene.uiPointers = new Set();

        this.hpBar = scene.add.graphics().setScrollFactor(0).setDepth(100);
        this.xpBar = scene.add.graphics().setScrollFactor(0).setDepth(100);
        this.dashBar = scene.add.graphics().setScrollFactor(0).setDepth(100);

        this.scoreText = scene.add.text(20, 18, 'УБИТО: 0', {
            fontSize: '18px',
            fill: '#88ffaa',
            fontStyle: 'bold',
            stroke: '#001a0a',
            strokeThickness: 3
        }).setScrollFactor(0).setDepth(100);

        this.timerText = scene.add.text(scene.scale.width / 2, 16, '00:00', {
            fontSize: '22px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

        this.waveText = scene.add.text(scene.scale.width / 2, 42, 'ВОЛНА 1', {
            fontSize: '13px',
            fill: '#aaccbb',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

        // Difficulty / daily tag under wave
        const rc = scene.runConfig;
        let modeLabel = '';
        if (rc?.isDaily) modeLabel = '📅 DAILY';
        if (rc?.difficulty && rc.difficulty.id !== 'normal') {
            modeLabel += (modeLabel ? ' · ' : '') + `${rc.difficulty.icon} ${rc.difficulty.name}`;
        }
        this.modeText = scene.add.text(scene.scale.width / 2, 56, modeLabel, {
            fontSize: '11px',
            fill: rc?.difficulty?.color || '#889988',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100).setVisible(!!modeLabel);

        this.levelText = scene.add.text(scene.scale.width - 100, 18, 'УР 1', {
            fontSize: '20px',
            fill: '#ffe600',
            fontStyle: 'bold',
            stroke: '#221100',
            strokeThickness: 3
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

        this.hpText = scene.add.text(24, scene.scale.height - 52, '', {
            fontSize: '13px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(101);

        this.comboText = scene.add.text(scene.scale.width - 24, 70, '', {
            fontSize: '20px',
            fill: '#ff8844',
            fontStyle: 'bold',
            stroke: '#220800',
            strokeThickness: 3
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(100).setAlpha(0);

        this.weaponStrip = scene.add.text(20, 48, '', {
            fontSize: '16px',
            fill: '#cceeee'
        }).setScrollFactor(0).setDepth(100);

        // Passive stacks: «⚔️ Жажда крови ×3»
        this.passiveStrip = scene.add.text(20, 72, '', {
            fontSize: '13px',
            fill: '#ffdd88',
            fontStyle: 'bold',
            stroke: '#1a1000',
            strokeThickness: 3,
            wordWrap: { width: Math.min(420, scene.scale.width * 0.55) }
        }).setScrollFactor(0).setDepth(100);

        // Curses: «☠️ Кровавый договор ×2»
        this.curseStrip = scene.add.text(20, 92, '', {
            fontSize: '12px',
            fill: '#ff6688',
            fontStyle: 'bold',
            stroke: '#1a0508',
            strokeThickness: 3,
            wordWrap: { width: Math.min(420, scene.scale.width * 0.55) }
        }).setScrollFactor(0).setDepth(100);

        this._lastPassiveKey = '';
        this._lastCurseKey = '';

        // Active relic buffs (shield / xp2 / slow)
        this.buffStrip = scene.add.text(scene.scale.width / 2, 58, '', {
            fontSize: '14px',
            fill: '#ddeeff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

        // Mute
        const initialIcon = soundManager.isMuted ? '🔇' : '🔊';
        this.muteBtn = scene.add.text(scene.scale.width - 48, 16, initialIcon, {
            fontSize: '24px'
        }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });

        this.muteBtn.on('pointerdown', (pointer) => {
            this.markUiPointer(pointer);
            const muted = soundManager.toggleMute();
            this.muteBtn.setText(muted ? '🔇' : '🔊');
            soundManager.playButtonClick();
        });
        this.muteBtn.on('pointerup', (p) => this.clearUiPointer(p));
        this.muteBtn.on('pointerout', (p) => this.clearUiPointer(p));

        // Pause button (mobile-friendly)
        this.pauseBtn = scene.add.text(scene.scale.width - 88, 16, '⏸', {
            fontSize: '22px'
        }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });

        this.pauseBtn.on('pointerdown', (pointer) => {
            this.markUiPointer(pointer);
            if (scene.isLevelingUp) return;
            soundManager.playButtonClick();
            scene.scene.pause();
            scene.scene.launch('PauseScene');
        });
        this.pauseBtn.on('pointerup', (p) => this.clearUiPointer(p));
        this.pauseBtn.on('pointerout', (p) => this.clearUiPointer(p));

        // Mobile dash button (bottom-right) — not only 2nd finger
        this.dashBtn = null;
        this.dashBtnGfx = null;
        this.dashBtnIcon = null;
        this.dashBtnLabel = null;
        this.dashBtnReady = true;
        this.createMobileDashButton();

        // Boss bar
        this.bossContainer = scene.add.container(scene.scale.width / 2, 68).setScrollFactor(0).setVisible(false).setDepth(100);
        this.bossBar = scene.add.graphics();
        this.bossText = scene.add.text(0, -20, '⚔ БОСС', {
            fontSize: '15px',
            fill: '#ff4477',
            fontStyle: 'bold',
            stroke: '#220011',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.bossPhaseText = scene.add.text(0, 20, '', {
            fontSize: '12px',
            fill: '#ffaaaa'
        }).setOrigin(0.5);
        this.bossContainer.add([this.bossBar, this.bossText, this.bossPhaseText]);

        this.toastText = scene.add.text(scene.scale.width / 2, scene.scale.height * 0.28, '', {
            fontSize: '28px',
            fill: '#ffe600',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
    }

    showToast(message, color = '#ffe600') {
        this.toastText.setText(message);
        this.toastText.setColor(color);
        this.toastText.setAlpha(1);
        this.toastText.setScale(0.6);
        this.scene.tweens.killTweensOf(this.toastText);
        this.scene.tweens.add({
            targets: this.toastText,
            scale: 1,
            duration: 180,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this.toastText,
                    alpha: 0,
                    delay: 900,
                    duration: 400
                });
            }
        });
    }

    update(player, currentXp, xpToNextLevel, level, kills, timeInSeconds, boss, combo, difficulty, weaponSystem, upgradeSystem) {
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;

        // XP bar top
        this.xpBar.clear();
        this.xpBar.fillStyle(0x0a1a12, 0.85);
        this.xpBar.fillRect(0, 0, w, 8);
        const xpPercent = Phaser.Math.Clamp(currentXp / Math.max(1, xpToNextLevel), 0, 1);
        this.xpBar.fillStyle(0x00ff88, 1);
        this.xpBar.fillRect(0, 0, w * xpPercent, 8);
        this.xpBar.fillStyle(0x88ffcc, 0.5);
        this.xpBar.fillRect(0, 0, w * xpPercent, 2);

        // HP bar bottom-left
        this.hpBar.clear();
        if (player && player.active) {
            const barW = 200;
            const barH = 18;
            const barX = 20;
            const barY = h - 36;

            this.hpBar.fillStyle(0x111111, 0.85);
            this.hpBar.fillRoundedRect(barX, barY, barW, barH, 4);

            const hpPercent = Phaser.Math.Clamp(player.health / player.maxHealth, 0, 1);
            const hpColor = hpPercent > 0.5 ? 0x22cc66 : hpPercent > 0.25 ? 0xddaa22 : 0xff2244;
            this.hpBar.fillStyle(hpColor, 1);
            this.hpBar.fillRoundedRect(barX, barY, barW * hpPercent, barH, 4);
            this.hpBar.lineStyle(2, 0xffffff, 0.35);
            this.hpBar.strokeRoundedRect(barX, barY, barW, barH, 4);

            this.hpText.setPosition(barX + 4, barY - 16);
            this.hpText.setText(`${Math.ceil(player.health)} / ${Math.ceil(player.maxHealth)}`);

            // Dash cooldown bar under HP
            const dashY = barY + barH + 6;
            const dashRatio = player.getDashCooldownRatio();
            this.dashBar.clear();
            this.dashBar.fillStyle(0x111111, 0.75);
            this.dashBar.fillRoundedRect(barX, dashY, barW, 8, 3);
            this.dashBar.fillStyle(dashRatio >= 1 ? 0x66ffcc : 0x4488aa, 1);
            this.dashBar.fillRoundedRect(barX, dashY, barW * dashRatio, 8, 3);
        }

        this.scoreText.setText(`УБИТО: ${kills}`);
        this.levelText.setText(`УР ${level}`);
        this.waveText.setText(`ВОЛНА ${difficulty}`);

        const mins = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
        const secs = (timeInSeconds % 60).toString().padStart(2, '0');
        this.timerText.setText(`${mins}:${secs}`);

        // Combo
        if (combo >= 3) {
            this.comboText.setText(`КОМБО ×${combo}`);
            this.comboText.setAlpha(1);
            const scale = 1 + Math.min(0.35, combo * 0.01);
            this.comboText.setScale(scale);
        } else {
            this.comboText.setAlpha(0);
        }

        // Weapon strip (+ evolutions as ✨)
        if (weaponSystem) {
            const parts = [];
            const shownEvo = new Set();
            Object.keys(WEAPON_ICONS).forEach(key => {
                if (weaponSystem.weapons[key]?.merged) return;
                const evoId = weaponSystem.getEvolutionOwningWeapon?.(key);
                if (evoId) {
                    if (shownEvo.has(evoId)) return;
                    shownEvo.add(evoId);
                    const evo = weaponSystem.getActiveEvolutions?.().find(e => e.id === evoId);
                    parts.push(`${evo?.icon || '✨'}✨`);
                    return;
                }
                const lvl = weaponSystem.getWeaponLevel(key);
                if (lvl > 0) parts.push(`${WEAPON_ICONS[key]}${lvl}`);
            });
            this.weaponStrip.setText(parts.join('  '));
        }

        // Passive + curse stack counters
        this.updatePassiveStrip(upgradeSystem, w);
        this.updateCurseStrip(upgradeSystem, w);
        this.updateBuffStrip();

        // Mobile dash button cooldown ring
        this.updateMobileDashButton(player);

        // Boss
        if (boss && boss.active) {
            this.bossContainer.setVisible(true);
            this.bossBar.clear();
            const bWidth = Math.min(420, w * 0.72);
            const bHeight = 14;
            this.bossBar.fillStyle(0x1a0008, 0.92);
            this.bossBar.fillRoundedRect(-bWidth / 2, 0, bWidth, bHeight, 3);
            const bPercent = Phaser.Math.Clamp(boss.health / boss.maxHealth, 0, 1);
            this.bossBar.fillStyle(0xff1144, 1);
            this.bossBar.fillRoundedRect(-bWidth / 2, 0, bWidth * bPercent, bHeight, 3);
            this.bossBar.lineStyle(1, 0xff6688, 0.5);
            this.bossBar.strokeRoundedRect(-bWidth / 2, 0, bWidth, bHeight, 3);

            const title = boss.bossTitle || '⚔ БОСС';
            this.bossText.setText(title);
            const phaseLabel = boss.phase === 3 ? 'ФАЗА III — ЯРОСТЬ' : boss.phase === 2 ? 'ФАЗА II' : 'ФАЗА I';
            this.bossPhaseText.setText(phaseLabel);
        } else {
            this.bossContainer.setVisible(false);
        }
    }

    markUiPointer(pointer) {
        if (!pointer || !this.scene.uiPointers) return;
        this.scene.uiPointers.add(pointer.id);
    }

    clearUiPointer(pointer) {
        if (!pointer || !this.scene.uiPointers) return;
        this.scene.uiPointers.delete(pointer.id);
    }

    createMobileDashButton() {
        // Always show on touch; also show on narrow screens for hybrid devices
        const show = isTouchDevice() || (typeof window !== 'undefined' && window.innerWidth < 900);
        if (!show) return;

        const scene = this.scene;
        const w = scene.scale.width;
        const h = scene.scale.height;
        const portrait = isPortraitMode();
        const r = portrait ? 42 : 48;
        const cx = w - (portrait ? 52 : 64);
        const cy = h - (portrait ? 78 : 72);

        this.dashBtnGfx = scene.add.graphics().setScrollFactor(0).setDepth(120);
        this.dashBtnHit = scene.add.circle(cx, cy, r + 8, 0x000000, 0.001)
            .setScrollFactor(0)
            .setDepth(121)
            .setInteractive({ useHandCursor: true });

        this.dashBtnIcon = scene.add.text(cx, cy - 6, '💨', {
            fontSize: portrait ? '28px' : '32px'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(122);

        this.dashBtnLabel = scene.add.text(cx, cy + 18, 'РЫВОК', {
            fontSize: '11px',
            fill: '#ccffee',
            fontStyle: 'bold',
            stroke: '#001a10',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(122);

        this.dashBtnR = r;
        this.dashBtnCx = cx;
        this.dashBtnCy = cy;

        this.dashBtnHit.on('pointerdown', (pointer) => {
            this.markUiPointer(pointer);
            if (scene.isLevelingUp) return;
            const player = scene.player;
            if (!player || !player.active) return;

            const ok = player.tryDash();
            if (ok) {
                // Press feedback
                this.dashBtnIcon.setScale(0.85);
                scene.tweens.add({
                    targets: [this.dashBtnIcon, this.dashBtnLabel],
                    scale: 1,
                    duration: 120,
                    ease: 'Back.easeOut'
                });
            } else {
                // Not ready — subtle shake
                scene.tweens.add({
                    targets: this.dashBtnIcon,
                    x: cx + 4,
                    yoyo: true,
                    duration: 50,
                    repeat: 2,
                    onComplete: () => this.dashBtnIcon.setPosition(cx, cy - 6)
                });
            }
        });

        this.dashBtnHit.on('pointerup', (p) => this.clearUiPointer(p));
        this.dashBtnHit.on('pointerout', (p) => this.clearUiPointer(p));

        // Initial draw
        this.drawDashButton(1, true);
    }

    drawDashButton(readyRatio, ready) {
        if (!this.dashBtnGfx) return;
        const g = this.dashBtnGfx;
        const r = this.dashBtnR;
        const cx = this.dashBtnCx;
        const cy = this.dashBtnCy;

        g.clear();
        // Outer ring
        g.fillStyle(0x0a1a14, 0.72);
        g.fillCircle(cx, cy, r + 4);
        g.lineStyle(3, ready ? 0x66ffcc : 0x445566, 0.95);
        g.strokeCircle(cx, cy, r);

        // Cooldown arc (fills as ready)
        if (readyRatio < 1) {
            g.lineStyle(5, 0x338866, 0.9);
            g.beginPath();
            // Phaser arc: from -90deg, sweep by readyRatio * 360
            const start = -Math.PI / 2;
            const end = start + readyRatio * Math.PI * 2;
            g.arc(cx, cy, r - 2, start, end, false);
            g.strokePath();
        } else {
            g.fillStyle(0x22aa77, 0.22);
            g.fillCircle(cx, cy, r - 4);
        }

        if (this.dashBtnLabel) {
            this.dashBtnLabel.setColor(ready ? '#ccffee' : '#778888');
            this.dashBtnLabel.setAlpha(ready ? 1 : 0.7);
        }
        if (this.dashBtnIcon) {
            this.dashBtnIcon.setAlpha(ready ? 1 : 0.55);
        }
    }

    updateMobileDashButton(player) {
        if (!this.dashBtnGfx || !player) return;
        const ratio = player.getDashCooldownRatio();
        const ready = ratio >= 1 && player.canDash && !player.isDashing;
        this.drawDashButton(ratio, ready);
    }

    /**
     * Show owned passives with stack counts.
     * Few stacks → full name «⚔️ Жажда крови ×3»
     * Many → compact «⚔️×3  🛡️×2» so HUD stays readable
     */
    updatePassiveStrip(upgradeSystem, screenW) {
        if (!this.passiveStrip) return;
        if (!upgradeSystem || !upgradeSystem.getPassiveStacksForHud) {
            this.passiveStrip.setText('');
            return;
        }

        const stacks = upgradeSystem.getPassiveStacksForHud();
        if (stacks.length === 0) {
            this.passiveStrip.setText('');
            this._lastPassiveKey = '';
            return;
        }

        const key = stacks.map(s => `${s.id}:${s.stacks}`).join('|');
        // Always refresh layout width; skip text rebuild only if same content
        this.passiveStrip.setWordWrapWidth(Math.min(440, screenW * 0.55));

        if (key === this._lastPassiveKey) return;
        this._lastPassiveKey = key;

        // Full labels when ≤4 distinct passives; compact when more
        const useFull = stacks.length <= 4;
        const text = useFull
            ? stacks.map(s => s.short).join('   ')
            : stacks.map(s => s.compact).join('  ');

        this.passiveStrip.setText(text);

        // Subtle pop when stacks change
        this.passiveStrip.setScale(1.08);
        this.scene.tweens.add({
            targets: this.passiveStrip,
            scale: 1,
            duration: 120,
            ease: 'Back.easeOut'
        });
    }

    updateBuffStrip() {
        if (!this.buffStrip) return;
        const relics = this.scene.relicSystem;
        if (!relics || !relics.getActiveBuffs) {
            this.buffStrip.setText('');
            return;
        }
        const buffs = relics.getActiveBuffs();
        if (buffs.length === 0) {
            this.buffStrip.setText('');
            return;
        }
        const text = buffs.map(b => {
            const sec = Math.ceil(b.remain / 1000);
            return `${b.icon}${sec}s`;
        }).join('  ');
        this.buffStrip.setText(text);
        this.buffStrip.setPosition(this.scene.scale.width / 2, 58);
    }

    updateCurseStrip(upgradeSystem, screenW) {
        if (!this.curseStrip) return;
        if (!upgradeSystem || !upgradeSystem.getCurseStacksForHud) {
            this.curseStrip.setText('');
            return;
        }

        const curses = upgradeSystem.getCurseStacksForHud();
        if (curses.length === 0) {
            this.curseStrip.setText('');
            this._lastCurseKey = '';
            return;
        }

        const key = curses.map(c => `${c.id}:${c.stacks}`).join('|');
        this.curseStrip.setWordWrapWidth(Math.min(440, screenW * 0.55));
        if (key === this._lastCurseKey) return;
        this._lastCurseKey = key;

        const text = curses.length <= 3
            ? curses.map(c => c.short).join('   ')
            : curses.map(c => c.compact).join('  ');
        this.curseStrip.setText(text);
        this.curseStrip.setScale(1.08);
        this.scene.tweens.add({
            targets: this.curseStrip,
            scale: 1,
            duration: 120,
            ease: 'Back.easeOut'
        });
    }
}
