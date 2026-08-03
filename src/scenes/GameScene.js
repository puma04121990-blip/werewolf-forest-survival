import { Player } from '../entities/Player.js';
import { Bullet } from '../entities/Bullet.js';
import { XpOrb, XP_TIER, splitXpValues } from '../entities/XpOrb.js';
import { Mine } from '../entities/Mine.js';
import { Rocket } from '../entities/Rocket.js';
import { Spawner } from '../systems/Spawner.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { Hud } from '../systems/Hud.js';
import { LevelUpPanel } from '../ui/LevelUpPanel.js';
import { soundManager } from '../systems/SoundManager.js';
import { BALANCE } from '../config.js';
import { RunStatsTracker } from '../systems/RunStats.js';

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
        this.runStats = new RunStatsTracker();

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
        this.upgradeSystem.resetRunState();
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
        // During level-up vacuum, still animate orbs into the player
        if (this.isLevelingUp) {
            if (this._vacuumActive) {
                this.xpOrbs.getChildren().forEach(orb => {
                    if (orb.active && orb.update) orb.update(time, delta);
                });
                this.tryVacuumPickup();
            }
            return;
        }
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
            this.weaponSystem,
            this.upgradeSystem
        );
    }

    /** Central damage pipeline: crit + lifesteal + damage tracking */
    dealDamageToEnemy(enemy, baseDamage, opts = {}) {
        if (!enemy || !enemy.active || !this.player) return 0;
        const { damage, isCrit } = this.player.rollDamage(baseDamage);
        const dealt = enemy.takeDamage(damage, isCrit, opts);
        if (dealt > 0) {
            this.player.applyLifesteal(dealt);
            if (opts.source) this.runStats.addDamage(opts.source, dealt);
        }
        return dealt;
    }

    firePlayerBullet(x, y, angle, speed = 650, damage = 22, weaponKey = 'blaster') {
        const bullet = this.playerBullets.get();
        if (bullet) {
            // Store base damage; crit applied on hit
            bullet.fire(x, y, angle, speed, damage, false, 'bullet');
            bullet.baseDamage = damage;
            bullet.weaponKey = weaponKey;
        }
    }

    /**
     * Enemy projectiles scale with wave difficulty:
     * early = slower (readable), late = faster (pressure).
     * @param {number} [baseSpeed] unscaled design speed (default from BALANCE)
     */
    getEnemyBulletSpeed(baseSpeed) {
        const base = baseSpeed != null ? baseSpeed : BALANCE.enemyBulletDefaultBase;
        const wave = this.spawner ? this.spawner.difficultyLevel : 1;
        const mul = Math.min(
            BALANCE.enemyBulletSpeedMulCap,
            BALANCE.enemyBulletSpeedStartMul + (wave - 1) * BALANCE.enemyBulletSpeedPerWave
        );
        return base * mul;
    }

    fireEnemyBullet(x, y, angle, speed = null, damage = 6, sourceEnemy = null) {
        const bullet = this.enemyBullets.get();
        if (bullet) {
            const finalSpeed = this.getEnemyBulletSpeed(speed);
            bullet.fire(x, y, angle, finalSpeed, damage, true, 'enemy_bullet');
            const enemyType = sourceEnemy
                ? (typeof sourceEnemy === 'string' ? sourceEnemy : sourceEnemy.type)
                : 'shooter';
            bullet.enemyType = enemyType;
            bullet.hitKind = 'bullet';
        }
    }

    /**
     * Spawn a single XP orb.
     * @param {number} x
     * @param {number} y
     * @param {number} value
     * @param {{ tier?: string, scatter?: boolean }} [opts]
     */
    spawnXpOrb(x, y, value, opts = {}) {
        if (!opts._skipCap) this.enforceXpOrbCap();
        const orb = new XpOrb(this, x, y, value, opts);
        this.xpOrbs.add(orb);
        return orb;
    }

    /**
     * Split a large XP drop into multiple tiered orbs with scatter.
     */
    spawnXpBurst(x, y, totalValue) {
        const pieces = splitXpValues(totalValue);
        const n = pieces.length;
        pieces.forEach((p, i) => {
            const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
            const dist = n > 1 ? 12 + Math.random() * 22 : 0;
            this.spawnXpOrb(
                x + Math.cos(ang) * dist,
                y + Math.sin(ang) * dist,
                p.value,
                { tier: p.tier, scatter: true }
            );
        });
    }

    /** Cap active orbs: merge oldest greens into one cyan instead of hard delete */
    enforceXpOrbCap() {
        const max = BALANCE.xpOrbMaxActive;
        while (this.xpOrbs.countActive() >= max) {
            const greens = this.xpOrbs.getChildren().filter(
                o => o.active && o.tier === XP_TIER.GREEN
            );
            if (greens.length >= 2) {
                const a = greens[0];
                const b = greens[1];
                const nx = (a.x + b.x) / 2;
                const ny = (a.y + b.y) / 2;
                const sum = a.value + b.value;
                a.destroy();
                b.destroy();
                this.spawnXpOrb(nx, ny, sum, { scatter: false, _skipCap: true });
            } else {
                const oldest = this.xpOrbs.getChildren()
                    .filter(o => o.active)
                    .sort((a, b) => (b.age || 0) - (a.age || 0))[0];
                if (oldest) oldest.destroy();
                else break;
            }
        }
    }

    /** Vacuum every orb toward the player (level-up reward) */
    startXpVacuum() {
        this._vacuumActive = true;
        this.xpOrbs.getChildren().forEach(orb => {
            if (orb.active && orb.startVacuum) orb.startVacuum();
        });
    }

    tryVacuumPickup() {
        if (!this.player || !this.player.active) return;
        this.xpOrbs.getChildren().forEach(orb => {
            if (!orb.active || orb.collected) return;
            const dist = Phaser.Math.Distance.Between(orb.x, orb.y, this.player.x, this.player.y);
            if (dist < 28) {
                this.collectXpOrb(orb, { vacuum: true });
            }
        });
    }

    collectXpOrb(orb, flags = {}) {
        if (!orb || !orb.active || orb.collected) return;
        orb.collected = true;

        let value = orb.value;
        // Combo multiplies XP on pickup (not vacuum bulk — already earned)
        if (!flags.skipComboBonus && this.combo >= BALANCE.comboBonusEvery) {
            const steps = Math.floor(this.combo / BALANCE.comboBonusEvery);
            const bonus = Math.min(BALANCE.comboXpBonusCap, steps * BALANCE.comboXpBonus);
            value = Math.floor(value * (1 + bonus));
        }

        // Moon orbs get a flat rarity bonus
        if (orb.tier === XP_TIER.MOON) {
            value = Math.floor(value * 1.15);
        }

        if (!flags.silent) {
            soundManager.playXp();
            this.showXpPickup(orb.x, orb.y, value, orb.tier);
        }

        // Pop VFX
        const color = orb.tier === XP_TIER.GOLD ? 0xffd700
            : orb.tier === XP_TIER.MOON ? 0xcc88ff
            : orb.tier === XP_TIER.CYAN ? 0x44eeff
            : 0x44ff88;
        const ring = this.add.circle(orb.x, orb.y, 6, color, 0.55).setDepth(40);
        this.tweens.add({
            targets: ring,
            radius: 22,
            alpha: 0,
            duration: 220,
            onComplete: () => ring.destroy()
        });

        this.addXp(value);
        orb.destroy();
    }

    showXpPickup(x, y, amount, tier = XP_TIER.GREEN) {
        if (!BALANCE.xpOrbShowPickupText) return;
        // Don't spam tiny greens every frame during vacuum
        if (tier === XP_TIER.GREEN && amount < 15 && Math.random() > 0.35) return;

        const color = tier === XP_TIER.GOLD ? '#ffd700'
            : tier === XP_TIER.MOON ? '#ddaaff'
            : tier === XP_TIER.CYAN ? '#66eeff'
            : '#88ffaa';
        const size = tier === XP_TIER.MOON || tier === XP_TIER.GOLD ? '16px' : '13px';
        const label = tier === XP_TIER.MOON ? `☾ +${amount}` : `+${amount}`;

        const t = this.add.text(x, y - 8, label, {
            fontSize: size,
            fill: color,
            fontStyle: 'bold',
            stroke: '#001108',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(55);

        this.tweens.add({
            targets: t,
            y: y - 36,
            alpha: 0,
            duration: 480,
            onComplete: () => t.destroy()
        });
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
        this.dealDamageToEnemy(enemy, base, {
            forceNumber: true,
            source: bullet.weaponKey || 'blaster'
        });
        bullet.destroy();
    }

    handleEnemyBulletPlayerCollision(player, bullet) {
        if (!bullet.active || !player.active) return;
        player.takeDamage(bullet.damage, {
            kind: 'bullet',
            enemyType: bullet.enemyType || 'shooter'
        });
        bullet.destroy();
    }

    handlePlayerEnemyCollision(player, enemy) {
        if (!player.active || !enemy.active) return;
        // During dash: I-frames block damage; body strike is handled in Player.updateDashCombat
        if (player.isDashing || player.isInvulnerable) return;
        player.takeDamage(enemy.damage, {
            kind: 'contact',
            enemyType: enemy.type || 'chaser'
        });
    }

    handlePlayerXpCollision(player, orb) {
        if (!orb.active || orb.collected) return;
        this.collectXpOrb(orb);
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

        // Vacuum all essence into the werewolf before the upgrade panel
        this.startXpVacuum();
        this.hud.showToast('ЭССЕНЦИЯ ЛУНЫ', '#88ffcc');

        const finishVacuumAndShow = () => {
            // Instantly absorb any leftovers (edge of map / stuck)
            this.xpOrbs.getChildren().forEach(orb => {
                if (orb.active && !orb.collected) {
                    this.collectXpOrb(orb, { vacuum: true, silent: true, skipComboBonus: true });
                }
            });
            this._vacuumActive = false;

            if (this.player && this.player.active) {
                this.player.heal(8);
            }

            this.openLevelUpPanel();
        };

        // Let orbs fly in for a short beat, then force-collect
        this.time.delayedCall(420, finishVacuumAndShow);
    }

    openLevelUpPanel() {
        const cardCount = BALANCE.levelUpCardCount || 3;
        let currentOptions = this.upgradeSystem.getRandomOptions(cardCount);

        const finishSelect = (selectedOpt) => {
            this.upgradeSystem.applyUpgrade(selectedOpt);
            this.physics.resume();
            this.isLevelingUp = false;

            if (this.currentXp >= this.xpToNextLevel) {
                this.currentXp -= this.xpToNextLevel;
                this.level += 1;
                this.xpToNextLevel = Math.floor(this.xpToNextLevel * BALANCE.xpGrowth);
                this.triggerLevelUp();
            }
        };

        this.levelUpPanel.show(currentOptions, {
            rerollsLeft: BALANCE.levelUpRerolls ?? 2,
            bansLeft: BALANCE.levelUpBans ?? 1,

            onSelect: finishSelect,

            /** Reroll: avoid current hand if possible */
            onReroll: (shown) => {
                const avoid = (shown || []).map(o => o.id);
                currentOptions = this.upgradeSystem.getRandomOptions(cardCount, [], avoid);
                return currentOptions;
            },

            /**
             * Ban one card for the rest of the run, then refill that slot
             * (and keep the other two if still valid).
             */
            onBan: (bannedOpt, shown) => {
                this.upgradeSystem.banOption(bannedOpt.id);
                this.hud.showToast(`🚫 БАН: ${bannedOpt.name}`, '#ff6688');

                const keep = (shown || []).filter(o => o.id !== bannedOpt.id);
                const need = Math.max(0, cardCount - keep.length);
                const exclude = [
                    bannedOpt.id,
                    ...keep.map(o => o.id)
                ];
                const refill = this.upgradeSystem.getRandomOptions(need, exclude, []);
                currentOptions = [...keep, ...refill];
                // Re-enrich synergies for kept cards (loadout unchanged, but OK)
                currentOptions = currentOptions.map(o => this.upgradeSystem.enrichOption(o));
                return currentOptions;
            }
        });
    }

    onEnemyKilled(enemy) {
        this.kills += 1;
        this.combo += 1;
        this.comboTimer = BALANCE.xpComboWindow;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // Combo moon orb — rare purple essence
        if (this.combo > 0 && this.combo % BALANCE.xpOrbComboMoonEvery === 0) {
            const bonus = BALANCE.xpOrbComboMoonValue + Math.floor(this.combo * 0.8);
            const ox = enemy && enemy.x != null ? enemy.x : this.player.x;
            const oy = enemy && enemy.y != null ? enemy.y : this.player.y;
            this.spawnXpOrb(ox, oy - 20, bonus, { tier: XP_TIER.MOON, scatter: true });
            this.hud.showToast(`☾ ЛУННАЯ ЭССЕНЦИЯ  ×${this.combo}`, '#ddaaff');
        } else if (this.combo > 0 && this.combo % 25 === 0) {
            this.hud.showToast(`КОМБО ×${this.combo}!`, '#ff8844');
        }

        if (enemy === this.activeBoss) {
            this.activeBoss = null;
            const fallen = enemy.bossShortName || 'БОСС';
            this.hud.showToast(`${fallen} ПАЛ`, '#ff6688');
        }
    }

    onBossSpawned(boss) {
        this.activeBoss = boss;
        const title = boss.bossTitle || '⚔ БОСС';
        this.hud.showToast(title, boss.bossToastColor || '#ff2255');
        soundManager.playHowl && soundManager.playHowl();
    }

    /**
     * Delayed ground hazard (witch blood pool / beast shockwave zone).
     * @param {number} x
     * @param {number} y
     * @param {{ radius?: number, delay?: number, damage?: number, color?: number, enemyType?: string }} opts
     */
    spawnBossHazard(x, y, opts = {}) {
        const radius = opts.radius || 70;
        const delay = opts.delay || 700;
        const damage = opts.damage || 12;
        const color = opts.color || 0xaa0066;
        const enemyType = opts.enemyType || 'boss_witch';

        const warn = this.add.circle(x, y, 12, color, 0.25).setDepth(8);
        warn.setStrokeStyle(2, color, 0.8);
        this.tweens.add({
            targets: warn,
            radius,
            alpha: 0.45,
            duration: delay,
            ease: 'Sine.easeOut'
        });

        this.time.delayedCall(delay, () => {
            if (warn.active) {
                this.tweens.add({
                    targets: warn,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => warn.destroy()
                });
            }
            const blast = this.add.circle(x, y, radius * 0.4, color, 0.55).setDepth(9);
            this.tweens.add({
                targets: blast,
                radius,
                alpha: 0,
                duration: 280,
                onComplete: () => blast.destroy()
            });
            this.cameras.main.shake(80, 0.008);

            const player = this.player;
            if (player && player.active) {
                const dist = Phaser.Math.Distance.Between(x, y, player.x, player.y);
                if (dist < radius) {
                    player.takeDamage(damage, {
                        kind: 'slam',
                        enemyType
                    });
                }
            }
        });
    }

    onDifficultyUp(level) {
        this.hud.showToast(`ВОЛНА ${level}`, '#88ffaa');
    }

    onPlayerDied() {
        if (this.runStats) this.runStats.recordDeath();
        this.saveBestRun();
        const snap = this.runStats ? this.runStats.getSnapshot() : {};
        this.time.delayedCall(900, () => {
            this.scene.start('GameOverScene', {
                kills: this.kills,
                time: Math.floor(this.gameTime / 1000),
                level: this.level,
                maxCombo: this.maxCombo,
                wave: this.spawner ? this.spawner.difficultyLevel : 1,
                deathCause: snap.deathCause || null,
                damageByWeapon: snap.damageByWeapon || {}
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
