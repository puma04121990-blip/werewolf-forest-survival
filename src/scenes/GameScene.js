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
import { BALANCE } from '../config.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        this.gameTime = 0;
        this.kills = 0;
        this.level = 1;
        this.currentXp = 0;
        this.xpToNextLevel = BALANCE.xpBase;
        this.activeBoss = null;
        this.isLevelingUp = false;
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;

        this.createForestBackground();

        this.player = new Player(this, this.scale.width / 2, this.scale.height / 2);

        this.playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
        this.enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
        this.enemies = this.physics.add.group({ runChildUpdate: true });
        this.xpOrbs = this.physics.add.group({ classType: XpOrb, runChildUpdate: true });
        this.healthPickups = this.physics.add.group();
        this.mines = this.physics.add.group({ classType: Mine, runChildUpdate: true });
        this.rockets = this.physics.add.group({ classType: Rocket, runChildUpdate: true });

        this.weaponSystem = new WeaponSystem(this, this.player);
        this.spawner = new Spawner(this, this.player);
        this.upgradeSystem = new UpgradeSystem(this, this.player, this.weaponSystem);
        this.hud = new Hud(this);
        this.levelUpPanel = new LevelUpPanel(this);

        this.physics.add.overlap(this.playerBullets, this.enemies, this.handleBulletEnemyCollision, null, this);
        this.physics.add.overlap(this.enemyBullets, this.player, this.handleEnemyBulletPlayerCollision, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);
        this.physics.add.overlap(this.player, this.xpOrbs, this.handlePlayerXpCollision, null, this);
        this.physics.add.overlap(this.player, this.healthPickups, this.handlePlayerHealthCollision, null, this);

        this.events.on('enemyKilled', this.onEnemyKilled, this);
        this.events.on('bossSpawned', this.onBossSpawned, this);
        this.events.on('playerDied', this.onPlayerDied, this);
        this.events.on('difficultyUp', this.onDifficultyUp, this);

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

        // Soft vignette-like corners via dark circles (cheap depth)
        const fog = this.add.graphics();
        fog.fillStyle(0x050a06, 0.35);
        for (let i = 0; i < 18; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = 40 + Math.random() * 90;
            fog.fillCircle(x, y, r);
        }

        const grid = this.add.graphics();
        grid.lineStyle(1, 0x182f1b, 0.28);
        for (let x = 0; x < width; x += 50) grid.lineBetween(x, 0, x, height);
        for (let y = 0; y < height; y += 50) grid.lineBetween(0, y, width, y);

        // Sparse "trees" silhouettes
        const trees = this.add.graphics();
        trees.fillStyle(0x0d1a10, 0.55);
        for (let i = 0; i < 22; i++) {
            const tx = (i * 97 + 40) % width;
            const ty = (i * 53 + 30) % height;
            trees.fillTriangle(tx, ty - 28, tx + 14, ty + 10, tx - 14, ty + 10);
            trees.fillRect(tx - 3, ty + 8, 6, 12);
        }
    }

    update(time, delta) {
        if (this.isLevelingUp) return;
        if (!this.player || !this.player.active) return;

        this.gameTime += delta;
        const totalSeconds = Math.floor(this.gameTime / 1000);

        // Combo decay
        if (this.combo > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        this.player.update(time, delta);
        this.spawner.update(this.gameTime, delta, this.enemies);
        this.weaponSystem.update(time, delta, this.enemies);

        this.hud.update(
            this.player,
            this.currentXp,
            this.xpToNextLevel,
            this.level,
            this.kills,
            totalSeconds,
            this.activeBoss,
            this.combo,
            this.spawner.difficultyLevel,
            this.weaponSystem
        );
    }

    /** Central damage pipeline: crit + lifesteal */
    dealDamageToEnemy(enemy, baseDamage, opts = {}) {
        if (!enemy || !enemy.active || !this.player) return 0;
        const { damage, isCrit } = this.player.rollDamage(baseDamage);
        const dealt = enemy.takeDamage(damage, isCrit, opts);
        if (dealt > 0) this.player.applyLifesteal(dealt);
        return dealt;
    }

    firePlayerBullet(x, y, angle, speed = 650, damage = 22) {
        const bullet = this.playerBullets.get();
        if (bullet) {
            // Store base damage; crit applied on hit
            bullet.fire(x, y, angle, speed, damage, false, 'bullet');
            bullet.baseDamage = damage;
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

    spawnHealthPickup(x, y, isBoss = false) {
        if (this.healthPickups.countActive() > 20) {
            const firstMed = this.healthPickups.getFirstAlive();
            if (firstMed) firstMed.destroy();
        }
        const med = this.physics.add.sprite(x, y, 'health_pickup');
        med.healAmount = isBoss ? 60 : null; // null = compute on pickup
        this.healthPickups.add(med);

        this.tweens.add({
            targets: med,
            y: y - 6,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    showDamageNumber(x, y, amount, isCrit = false) {
        const txt = this.add.text(x + (Math.random() - 0.5) * 12, y, Math.round(amount).toString(), {
            fontSize: isCrit ? '20px' : '15px',
            fill: isCrit ? '#ffee55' : '#ff3355',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(50);

        if (isCrit) {
            txt.setText('⚔' + Math.round(amount));
        }

        this.tweens.add({
            targets: txt,
            y: y - (isCrit ? 40 : 28),
            alpha: 0,
            scale: isCrit ? 1.3 : 1,
            duration: isCrit ? 650 : 480,
            onComplete: () => txt.destroy()
        });
    }

    handleBulletEnemyCollision(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;
        const base = bullet.baseDamage != null ? bullet.baseDamage : bullet.damage;
        this.dealDamageToEnemy(enemy, base, { forceNumber: true });
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
        let value = orb.value;
        // Combo XP bonus
        if (this.combo >= BALANCE.comboBonusEvery) {
            const steps = Math.floor(this.combo / BALANCE.comboBonusEvery);
            const bonus = Math.min(BALANCE.comboXpBonusCap, steps * BALANCE.comboXpBonus);
            value = Math.floor(value * (1 + bonus));
        }
        this.addXp(value);
        orb.destroy();
    }

    handlePlayerHealthCollision(player, med) {
        if (!med.active) return;

        soundManager.playHeal();
        const amount = med.healAmount != null
            ? med.healAmount
            : BALANCE.healBase + player.maxHealth * BALANCE.healMaxHpPct;
        const healed = player.heal(amount);
        if (healed > 0) {
            const t = this.add.text(player.x, player.y - 24, `+${Math.round(healed)}`, {
                fontSize: '16px',
                fill: '#66ff99',
                fontStyle: 'bold',
                stroke: '#003311',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(50);
            this.tweens.add({
                targets: t,
                y: player.y - 50,
                alpha: 0,
                duration: 500,
                onComplete: () => t.destroy()
            });
        }
        med.destroy();
    }

    addXp(amount) {
        this.currentXp += amount;
        if (this.currentXp >= this.xpToNextLevel && !this.isLevelingUp) {
            this.currentXp -= this.xpToNextLevel;
            this.level += 1;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * BALANCE.xpGrowth);
            this.triggerLevelUp();
        }
    }

    triggerLevelUp() {
        if (this.isLevelingUp) return;
        this.isLevelingUp = true;
        this.physics.pause();

        // Brief heal on level-up (werewolf thrives)
        if (this.player && this.player.active) {
            this.player.heal(8);
        }

        const options = this.upgradeSystem.getRandomOptions(3);
        this.levelUpPanel.show(options, (selectedOpt) => {
            this.upgradeSystem.applyUpgrade(selectedOpt);
            this.physics.resume();
            this.isLevelingUp = false;

            if (this.currentXp >= this.xpToNextLevel) {
                this.currentXp -= this.xpToNextLevel;
                this.level += 1;
                this.xpToNextLevel = Math.floor(this.xpToNextLevel * BALANCE.xpGrowth);
                this.triggerLevelUp();
            }
        });
    }

    onEnemyKilled(enemy) {
        this.kills += 1;
        this.combo += 1;
        this.comboTimer = BALANCE.xpComboWindow;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        if (this.combo > 0 && this.combo % 25 === 0) {
            this.hud.showToast(`КОМБО ×${this.combo}!`, '#ff8844');
        }

        if (enemy === this.activeBoss) {
            this.activeBoss = null;
            this.hud.showToast('ИНКВИЗИТОР ПАЛ', '#ff6688');
        }
    }

    onBossSpawned(boss) {
        this.activeBoss = boss;
        this.hud.showToast('⚔ БОСС: ВЕЛИКИЙ ИНКВИЗИТОР', '#ff2255');
        soundManager.playHowl && soundManager.playHowl();
    }

    onDifficultyUp(level) {
        this.hud.showToast(`ВОЛНА ${level}`, '#88ffaa');
    }

    onPlayerDied() {
        this.saveBestRun();
        this.time.delayedCall(900, () => {
            this.scene.start('GameOverScene', {
                kills: this.kills,
                time: Math.floor(this.gameTime / 1000),
                level: this.level,
                maxCombo: this.maxCombo,
                wave: this.spawner ? this.spawner.difficultyLevel : 1
            });
        });
    }

    saveBestRun() {
        try {
            const key = BALANCE.storageKey;
            const prev = JSON.parse(localStorage.getItem(key) || 'null');
            const run = {
                time: Math.floor(this.gameTime / 1000),
                kills: this.kills,
                level: this.level,
                maxCombo: this.maxCombo
            };
            // Best = longest survival, then kills
            if (!prev || run.time > prev.time || (run.time === prev.time && run.kills > prev.kills)) {
                localStorage.setItem(key, JSON.stringify(run));
            }
        } catch (e) {
            // ignore storage errors
        }
    }
}
