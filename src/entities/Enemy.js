import { soundManager } from '../systems/SoundManager.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type = 'chaser', difficultyLevel = 1) {
        super(scene, x, y, 'enemy_' + type);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.type = type;
        this.difficultyLevel = difficultyLevel;
        this.isBoss = false;
        this.initTypeStats(type, difficultyLevel);
        this.lastShootTime = 0;
        this.phase = 1;
    }

    initTypeStats(type, difficulty = 1) {
        const d = Math.max(0, difficulty - 1);
        const hpMul = 1 + d * 0.14;
        const dmgMul = 1 + d * 0.09;
        const spdMul = 1 + d * 0.03;

        switch (type) {
            case 'scout':
                this.maxHealth = 14 * hpMul;
                this.speed = 165 * spdMul;
                this.damage = 3 * dmgMul;
                this.xpValue = 10 + Math.floor(d * 1.5);
                this.setScale(0.8);
                break;
            case 'tank':
                this.maxHealth = 95 * hpMul;
                this.speed = 55 * spdMul;
                this.damage = 14 * dmgMul;
                this.xpValue = 42 + Math.floor(d * 4);
                this.setScale(1.4);
                break;
            case 'shooter':
                this.maxHealth = 32 * hpMul;
                this.speed = 95 * spdMul;
                this.damage = 5 * dmgMul;
                this.xpValue = 22 + Math.floor(d * 2.5);
                this.setScale(1.0);
                break;
            case 'elite':
                this.maxHealth = 140 * hpMul;
                this.speed = 110 * spdMul;
                this.damage = 12 * dmgMul;
                this.xpValue = 70 + Math.floor(d * 6);
                this.setScale(1.25);
                break;
            case 'boss':
                // Boss scales hard with wave index (difficulty)
                this.maxHealth = (550 + d * 180) * (1 + d * 0.08);
                this.speed = 48 + Math.min(25, d * 2);
                this.damage = 18 + d * 2.5;
                this.xpValue = 280 + d * 40;
                this.setScale(2.15);
                this.isBoss = true;
                break;
            case 'chaser':
            default:
                this.maxHealth = 28 * hpMul;
                this.speed = 105 * spdMul;
                this.damage = 7 * dmgMul;
                this.xpValue = 15 + Math.floor(d * 2);
                this.setScale(1.0);
                break;
        }

        this.health = this.maxHealth;
        this.setTint(this.getTintForType(type));
    }

    getTintForType(type) {
        switch (type) {
            case 'scout': return 0x00ff88;
            case 'tank': return 0xff3300;
            case 'shooter': return 0xcc00ff;
            case 'elite': return 0xffaa00;
            case 'boss': return 0xff0055;
            case 'chaser':
            default: return 0xff9900;
        }
    }

    update(time, delta) {
        const player = this.scene.player;
        if (!this.active || !player || !player.active) return;

        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.setRotation(angle + Math.PI / 2);

        if (this.type === 'shooter') {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (dist < 240) {
                this.setVelocity(-Math.cos(angle) * this.speed, -Math.sin(angle) * this.speed);
            } else if (dist > 360) {
                this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            } else {
                // Strafe
                this.setVelocity(-Math.sin(angle) * this.speed * 0.7, Math.cos(angle) * this.speed * 0.7);
            }

            const shootCd = Math.max(1400, 2300 - this.difficultyLevel * 80);
            if (time - this.lastShootTime > shootCd) {
                this.lastShootTime = time;
                this.scene.fireEnemyBullet(this.x, this.y, angle, 260 + this.difficultyLevel * 5, 5 + this.difficultyLevel * 0.4);
            }
        } else if (this.type === 'elite') {
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            if (time - this.lastShootTime > 2800) {
                this.lastShootTime = time;
                for (let i = -1; i <= 1; i++) {
                    this.scene.fireEnemyBullet(this.x, this.y, angle + i * 0.2, 280, 7);
                }
            }
        } else if (this.type === 'boss') {
            this.updateBoss(time, player, angle);
        } else {
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        }
    }

    updateBoss(time, player, angle) {
        const hpRatio = this.health / this.maxHealth;
        if (hpRatio < 0.35) this.phase = 3;
        else if (hpRatio < 0.65) this.phase = 2;
        else this.phase = 1;

        const spd = this.speed * (this.phase === 3 ? 1.35 : this.phase === 2 ? 1.15 : 1);
        this.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);

        const attackCd = this.phase === 3 ? 1800 : this.phase === 2 ? 2400 : 3000;
        if (time - this.lastShootTime > attackCd) {
            this.lastShootTime = time;
            if (this.phase >= 3) {
                this.bossSpiralAttack();
            } else if (this.phase >= 2) {
                this.bossRingAttack(14);
                this.scene.time.delayedCall(350, () => {
                    if (this.active) this.bossRingAttack(10, 0.3);
                });
            } else {
                this.bossRingAttack(10);
            }
            this.scene.cameras.main.shake(120, 0.012);
            this.scene.events.emit('bossAttack', this);
        }
    }

    bossRingAttack(bulletCount = 10, angleOffset = 0) {
        for (let i = 0; i < bulletCount; i++) {
            const a = (i * Math.PI * 2) / bulletCount + angleOffset;
            this.scene.fireEnemyBullet(this.x, this.y, a, 220 + this.phase * 20, 6 + this.phase);
        }
    }

    bossSpiralAttack() {
        const count = 16;
        for (let i = 0; i < count; i++) {
            const a = (i * Math.PI * 2) / count + this.scene.gameTime * 0.002;
            this.scene.fireEnemyBullet(this.x, this.y, a, 200 + (i % 4) * 25, 7);
        }
    }

    takeDamage(amount, isCrit = false, opts = {}) {
        if (!this.active) return 0;

        const dealt = Math.min(this.health, amount);
        this.health -= amount;

        // Continuous aura/orbital ticks: rare floating numbers to avoid spam
        const showNum = opts.forceNumber || isCrit || amount >= 8 || Math.random() < 0.12;
        if (showNum && !opts.silent) {
            this.scene.showDamageNumber(this.x, this.y - 10, amount, isCrit);
        }

        if (!opts.silent) {
            this.setTint(0xffffff);
            this.scene.time.delayedCall(70, () => {
                if (this.active) {
                    this.setTint(this.getTintForType(this.type));
                }
            });
        }

        if (this.health <= 0) {
            this.die();
        }
        return dealt;
    }

    die() {
        soundManager.playExplosion();

        // Death particles
        for (let i = 0; i < (this.isBoss ? 14 : 6); i++) {
            const c = this.scene.add.circle(this.x, this.y, 3 + Math.random() * 4, this.getTintForType(this.type), 0.9);
            const a = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 60;
            this.scene.tweens.add({
                targets: c,
                x: this.x + Math.cos(a) * dist,
                y: this.y + Math.sin(a) * dist,
                alpha: 0,
                scale: 0.2,
                duration: 280 + Math.random() * 200,
                onComplete: () => c.destroy()
            });
        }

        let xp = this.xpValue;
        // Boss and elite drop richer orbs (split for juicier pickup)
        if (this.isBoss) {
            this.scene.spawnXpOrb(this.x, this.y, Math.floor(xp * 0.5));
            this.scene.spawnXpOrb(this.x + 18, this.y - 10, Math.floor(xp * 0.3));
            this.scene.spawnXpOrb(this.x - 14, this.y + 12, Math.floor(xp * 0.2));
            this.scene.spawnHealthPickup(this.x, this.y, true);
            this.scene.cameras.main.shake(250, 0.02);
        } else {
            this.scene.spawnXpOrb(this.x, this.y, xp);
            const dropRoll = Math.random();
            const chance = this.type === 'tank' ? 0.18 : this.type === 'elite' ? 0.25 : 0.09;
            if (dropRoll < chance) {
                this.scene.spawnHealthPickup(this.x, this.y, false);
            }
        }

        this.scene.events.emit('enemyKilled', this);
        this.destroy();
    }
}
