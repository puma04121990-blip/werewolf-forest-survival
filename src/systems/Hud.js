import { soundManager } from './SoundManager.js';

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

        // Mute
        const initialIcon = soundManager.isMuted ? '🔇' : '🔊';
        this.muteBtn = scene.add.text(scene.scale.width - 48, 16, initialIcon, {
            fontSize: '24px'
        }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });

        this.muteBtn.on('pointerdown', () => {
            const muted = soundManager.toggleMute();
            this.muteBtn.setText(muted ? '🔇' : '🔊');
            soundManager.playButtonClick();
        });

        // Pause button (mobile-friendly)
        this.pauseBtn = scene.add.text(scene.scale.width - 88, 16, '⏸', {
            fontSize: '22px'
        }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });

        this.pauseBtn.on('pointerdown', () => {
            if (scene.isLevelingUp) return;
            soundManager.playButtonClick();
            scene.scene.pause();
            scene.scene.launch('PauseScene');
        });

        // Boss bar
        this.bossContainer = scene.add.container(scene.scale.width / 2, 68).setScrollFactor(0).setVisible(false).setDepth(100);
        this.bossBar = scene.add.graphics();
        this.bossText = scene.add.text(0, -20, '⚔ ВЕЛИКИЙ ИНКВИЗИТОР', {
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

    update(player, currentXp, xpToNextLevel, level, kills, timeInSeconds, boss, combo, difficulty, weaponSystem) {
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

        // Weapon strip
        if (weaponSystem) {
            const parts = [];
            Object.keys(WEAPON_ICONS).forEach(key => {
                const lvl = weaponSystem.getWeaponLevel(key);
                if (lvl > 0) parts.push(`${WEAPON_ICONS[key]}${lvl}`);
            });
            this.weaponStrip.setText(parts.join('  '));
        }

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

            const phaseLabel = boss.phase === 3 ? 'ФАЗА III — ЯРОСТЬ' : boss.phase === 2 ? 'ФАЗА II' : 'ФАЗА I';
            this.bossPhaseText.setText(phaseLabel);
        } else {
            this.bossContainer.setVisible(false);
        }
    }
}
