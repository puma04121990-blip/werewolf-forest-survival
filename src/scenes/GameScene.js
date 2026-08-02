import { Player } from '../entities/Player.js';
import { Bullet } from '../entities/Bullet.js';
import { XpOrb } from '../entities/XpOrb.js';
import { Mine } from '../entities/Mine.js';
import { Rocket } from '../entities/Rocket.js';
import { Spawner } from '../systems/Spawner.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { Hud } from '../systems/Hud.js';
import { LevelUpPanel } from '../ui/LevelUpPanel.js';
import { soundManager } from '../systems/SoundManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        this.gameTime = 0;
        this.kills = 0;
        this.level = 1;
        this.currentXp = 0;
        this.xpToNextLevel = 40;
        this.activeBoss = null;
        this.isLevelingUp = false;

        // Dark Moonlit Forest Background
        this.createForestBackground();

        // Werewolf Player
        this.player = new Player(this, this.scale.width / 2, this.scale.height / 2);

        // Groups
        this.playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
        this.enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
        this.enemies = this.physics.add.group({ runChildUpdate: true });
        this.xpOrbs = this.physics.add.group({ classType: XpOrb, runChildUpdate: true });
        this.healthPickups = this.physics.add.group();
        this.mines = this.physics.add.group({ classType: Mine, runChildUpdate: true });
        this.rockets = this.physics.add.group({ classType: Rocket, runChildUpdate: true });

        // Systems
        this.weaponSystem = new WeaponSystem(this, this.player);
        this.spawner = new Spawner(this, this.player);
        this.upgradeSystem = new UpgradeSystem(this, this.player, this.weaponSystem);
        this.hud = new Hud(this);
        this.levelUpPanel = new LevelUpPanel(this);

        // Physics Collisions & Overlaps
        this.physics.add.overlap(this.playerBullets, this.enemies, this.handleBulletEnemyCollision, null, this);
        this.physics.add.overlap(this.enemyBullets, this.player, this.handleEnemyBulletPlayerCollision, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);
        this.physics.add.overlap(this.player, this.xpOrbs, this.handlePlayerXpCollision, null, this);
        this.physics.add.overlap(this.player, this.healthPickups, this.handlePlayerHealthCollision, null, this);

        // Event Listeners
        this.events.on('enemyKilled', this.onEnemyKilled, this);
        this.events.on('bossSpawned', (boss) => { this.activeBoss = boss; }, this);
        this.events.on('playerDied', this.onPlayerDied, this);

        // Pause Key
        this.input.keyboard.on('keydown-P', () => {
            if (this.isLevelingUp) return;
            this.scene.pause();
            this.scene.launch('PauseScene');
        });
    }

    createForestBackground() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.add.rectangle(width / 2, height / 2, width, height, 0x0a140d);
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x182f1b, 0.35);
        for (let x = 0; x < width; x += 50) grid.lineBetween(x, 0, x, height);
        for (let y = 0; y < height; y += 50) grid.lineBetween(0, y, width, y);
    }

    update(time, delta) {
        if (this.isLevelingUp) return;
        if (!this.player || !this.player.active) return;

        this.gameTime += delta;
        const totalSeconds = Math.floor(this.gameTime / 1000);

        this.player.update(time, delta);
        this.spawner.update(time, delta, this.enemies);
        this.weaponSystem.update(time, delta, this.enemies);

        // Update HUD
        this.hud.update(
            this.player,
            this.currentXp,
            this.xpToNextLevel,
            this.level,
            this.kills,
            totalSeconds,
            this.activeBoss
        );
    }

    firePlayerBullet(x, y, angle, speed = 650, damage = 22) {
        const bullet = this.playerBullets.get();
        if (bullet) {
            bullet.fire(x, y, angle, speed, damage, false, 'bullet');
        }
    }

    fireEnemyBullet(x, y, angle, speed = 250, damage = 6) {
        const bullet = this.enemyBullets.get();
        if (bullet) {
            bullet.fire(x, y, angle, speed, damage, true, 'enemy_bullet');
        }
    }

    spawnXpOrb(x, y, value) {
        if (this.xpOrbs.countActive() > 140) {
            const firstOrb = this.xpOrbs.getFirstAlive();
            if (firstOrb) firstOrb.destroy();
        }
        const orb = new XpOrb(this, x, y, value);
        this.xpOrbs.add(orb);
    }

    spawnHealthPickup(x, y) {
        if (this.healthPickups.countActive() > 20) {
            const firstMed = this.healthPickups.getFirstAlive();
            if (firstMed) firstMed.destroy();
        }
        const med = this.physics.add.sprite(x, y, 'health_pickup');
        this.healthPickups.add(med);
    }

    showDamageNumber(x, y, amount) {
        const txt = this.add.text(x, y, Math.round(amount).toString(), {
            fontSize: '16px',
            fill: '#ff0033',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: txt,
            y: y - 25,
            alpha: 0,
            duration: 500,
            onComplete: () => txt.destroy()
        });
    }

    handleBulletEnemyCollision(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;
        enemy.takeDamage(bullet.damage);
        bullet.destroy();
    }

    handleEnemyBulletPlayerCollision(player, bullet) {
        if (!bullet.active || !player.active) return;
        player.takeDamage(bullet.damage);
        bullet.destroy();
    }

    handlePlayerEnemyCollision(player, enemy) {
        if (!player.active || !enemy.active) return;
        player.takeDamage(enemy.damage);
    }

    handlePlayerXpCollision(player, orb) {
        if (!orb.active) return;

        soundManager.playXp();
        this.addXp(orb.value);
        orb.destroy();
    }

    handlePlayerHealthCollision(player, med) {
        if (!med.active) return;

        soundManager.playHeal();
        player.heal(30);
        med.destroy();
    }

    addXp(amount) {
        this.currentXp += amount;
        if (this.currentXp >= this.xpToNextLevel && !this.isLevelingUp) {
            this.currentXp -= this.xpToNextLevel;
            this.level += 1;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.3);

            this.triggerLevelUp();
        }
    }

    triggerLevelUp() {
        if (this.isLevelingUp) return;
        this.isLevelingUp = true;
        this.physics.pause();

        const options = this.upgradeSystem.getRandomOptions(3);
        this.levelUpPanel.show(options, (selectedOpt) => {
            this.upgradeSystem.applyUpgrade(selectedOpt);
            this.physics.resume();
            this.isLevelingUp = false;

            if (this.currentXp >= this.xpToNextLevel) {
                this.currentXp -= this.xpToNextLevel;
                this.level += 1;
                this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.3);
                this.triggerLevelUp();
            }
        });
    }

    onEnemyKilled(enemy) {
        this.kills += 1;
        if (enemy === this.activeBoss) {
            this.activeBoss = null;
        }
    }

    onPlayerDied() {
        this.time.delayedCall(1000, () => {
            this.scene.start('GameOverScene', {
                kills: this.kills,
                time: Math.floor(this.gameTime / 1000),
                level: this.level
            });
        });
    }
}
