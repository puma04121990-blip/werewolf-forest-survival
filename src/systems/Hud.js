import { soundManager } from './SoundManager.js';

export class Hud {
    constructor(scene) {
        this.scene = scene;

        this.hpBar = scene.add.graphics();
        this.xpBar = scene.add.graphics();

        this.scoreText = scene.add.text(20, 20, 'УБИТО: 0', {
            fontSize: '20px',
            fill: '#00ff88',
            fontStyle: 'bold'
        }).setScrollFactor(0);

        this.timerText = scene.add.text(scene.scale.width / 2, 20, '00:00', {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0).setScrollFactor(0);

        this.levelText = scene.add.text(scene.scale.width - 110, 20, 'УР 1', {
            fontSize: '22px',
            fill: '#ffe600',
            fontStyle: 'bold'
        }).setOrigin(1, 0).setScrollFactor(0);

        // Mute / Unmute Toggle Button (🔊 / 🔇)
        const initialIcon = soundManager.isMuted ? '🔇' : '🔊';
        this.muteBtn = scene.add.text(scene.scale.width - 45, 18, initialIcon, {
            fontSize: '26px'
        }).setScrollFactor(0).setInteractive({ useHandCursor: true });

        this.muteBtn.on('pointerdown', () => {
            const muted = soundManager.toggleMute();
            this.muteBtn.setText(muted ? '🔇' : '🔊');
            soundManager.playButtonClick();
        });

        // Boss Bar
        this.bossContainer = scene.add.container(scene.scale.width / 2, 60).setScrollFactor(0).setVisible(false);
        this.bossBar = scene.add.graphics();
        this.bossText = scene.add.text(0, -18, 'БОСС', { fontSize: '16px', fill: '#ff0055', fontStyle: 'bold' }).setOrigin(0.5);
        this.bossContainer.add([this.bossBar, this.bossText]);

        this.hpBar.setScrollFactor(0);
        this.xpBar.setScrollFactor(0);
    }

    update(player, currentXp, xpToNextLevel, level, kills, timeInSeconds, boss) {
        // Draw XP Bar (Top of screen)
        this.xpBar.clear();
        this.xpBar.fillStyle(0x1a2e1d, 0.8);
        this.xpBar.fillRect(0, 0, this.scene.scale.width, 10);

        const xpPercent = Phaser.Math.Clamp(currentXp / xpToNextLevel, 0, 1);
        this.xpBar.fillStyle(0x00ff88, 1);
        this.xpBar.fillRect(0, 0, this.scene.scale.width * xpPercent, 10);

        // Draw HP Bar (Bottom left)
        this.hpBar.clear();
        if (player && player.active) {
            const barW = 180;
            const barH = 16;
            const barX = 20;
            const barY = this.scene.scale.height - 35;

            this.hpBar.fillStyle(0x222222, 0.8);
            this.hpBar.fillRect(barX, barY, barW, barH);

            const hpPercent = Phaser.Math.Clamp(player.health / player.maxHealth, 0, 1);
            this.hpBar.fillStyle(hpPercent > 0.3 ? 0x00ff88 : 0xff0055, 1);
            this.hpBar.fillRect(barX, barY, barW * hpPercent, barH);

            this.hpBar.lineStyle(2, 0xffffff, 0.5);
            this.hpBar.strokeRect(barX, barY, barW, barH);
        }

        // Texts
        this.scoreText.setText(`УБИТО: ${kills}`);
        this.levelText.setText(`УР ${level}`);

        const mins = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
        const secs = (timeInSeconds % 60).toString().padStart(2, '0');
        this.timerText.setText(`${mins}:${secs}`);

        // Boss Bar (адаптивная ширина для portrait)
        if (boss && boss.active) {
            this.bossContainer.setVisible(true);
            this.bossBar.clear();
            const bWidth = Math.min(400, this.scene.scale.width * 0.7);
            const bHeight = 14;

            this.bossBar.fillStyle(0x222222, 0.9);
            this.bossBar.fillRect(-bWidth / 2, 0, bWidth, bHeight);

            const bPercent = Phaser.Math.Clamp(boss.health / boss.maxHealth, 0, 1);
            this.bossBar.fillStyle(0xff0055, 1);
            this.bossBar.fillRect(-bWidth / 2, 0, bWidth * bPercent, bHeight);
        } else {
            this.bossContainer.setVisible(false);
        }
    }
}
