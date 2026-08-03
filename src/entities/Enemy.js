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

        // Attack wind-up (telegraph)
        this.isWindingUp = false;
        this.windUpElapsed = 0;
        this.windUpDuration = 0;
        this.pendingAttack = null;
        this.windUpAngle = 0;

        // Overhead HP for tank / elite
        this.hpBar = null;
        this.warningGfx = null;
        if (type === 'tank' || type === 'elite') {
            this.hpBar = scene.add.graphics().setDepth(25);
            this.warningGfx = scene.add.graphics().setDepth(24);
            this.showHpBar = true;
        } else {
            this.showHpBar = false;
        }
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
                this.slamCooldown = 3400;
                this.slamWindUp = 620;
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
                this.volleyCooldown = 2800;
                this.volleyWindUp = 520;
                break;
            case 'boss':
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

        // Wind-up: slow/stop, draw telegraph, then fire
        if (this.isWindingUp) {
            this.updateWindUp(time, delta, player);
            this.drawHpBar();
            return;
        }

        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.setRotation(angle + Math.PI / 2);

        if (this.type === 'shooter') {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (dist < 240) {
                this.setVelocity(-Math.cos(angle) * this.speed, -Math.sin(angle) * this.speed);
            } else if (dist > 360) {
                this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            } else {
                this.setVelocity(-Math.sin(angle) * this.speed * 0.7, Math.cos(angle) * this.speed * 0.7);
            }

            const shootCd = Math.max(1400, 2300 - this.difficultyLevel * 80);
            if (time - this.lastShootTime > shootCd) {
                this.lastShootTime = time;
                this.scene.fireEnemyBullet(this.x, this.y, angle, 250, 5 + this.difficultyLevel * 0.4, this);
            }
        } else if (this.type === 'elite') {
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            if (time - this.lastShootTime > (this.volleyCooldown || 2800)) {
                this.startWindUp('eliteVolley', this.volleyWindUp || 520, angle);
            }
        } else if (this.type === 'tank') {
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            if (time - this.lastShootTime > (this.slamCooldown || 3400)) {
                this.startWindUp('tankSlam', this.slamWindUp || 620, angle);
            }
        } else if (this.type === 'boss') {
            this.updateBoss(time, player, angle);
        } else {
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        }

        this.drawHpBar();
        this.clearWarning();
    }

    startWindUp(attackType, duration, angle) {
        this.isWindingUp = true;
        this.windUpElapsed = 0;
        this.windUpDuration = duration;
        this.pendingAttack = attackType;
        this.windUpAngle = angle;
        this.setVelocity(0, 0);
        // Brief red flash at start of telegraph
        this.setTint(0xff4444);
    }

    updateWindUp(time, delta, player) {
        this.windUpElapsed += delta;
        // Track player slightly during wind-up (partial aim)
        const aim = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.windUpAngle = Phaser.Math.Angle.RotateTo(this.windUpAngle, aim, 0.04);
        this.setRotation(this.windUpAngle + Math.PI / 2);
        this.setVelocity(0, 0);

        const t = Phaser.Math.Clamp(this.windUpElapsed / this.windUpDuration, 0, 1);
        // Pulse tint as attack approaches
        if (Math.floor(this.windUpElapsed / 80) % 2 === 0) {
            this.setTint(0xff2200);
        } else {
            this.setTint(this.getTintForType(this.type));
        }

        this.drawAttackWarning(t);

        if (this.windUpElapsed >= this.windUpDuration) {
            this.finishWindUp(player);
        }
    }

    drawAttackWarning(t) {
        if (!this.warningGfx) return;
        this.warningGfx.clear();
        this.warningGfx.setPosition(0, 0);

        const alpha = 0.25 + t * 0.55;
        const angle = this.windUpAngle;

        if (this.pendingAttack === 'eliteVolley') {
            // Three aim cones / lines toward player
            const spreads = [-0.2, 0, 0.2];
            const len = 90 + t * 70;
            spreads.forEach(spread => {
                const a = angle + spread;
                const x2 = this.x + Math.cos(a) * len;
                const y2 = this.y + Math.sin(a) * len;
                this.warningGfx.lineStyle(2 + t * 2, 0xff2244, alpha);
                this.warningGfx.lineBetween(this.x, this.y, x2, y2);
                // tip marker
                this.warningGfx.fillStyle(0xff4466, alpha);
                this.warningGfx.fillCircle(x2, y2, 3 + t * 2);
            });
            // Outer danger arc
            this.warningGfx.lineStyle(1.5, 0xff6688, alpha * 0.7);
            this.warningGfx.beginPath();
            this.warningGfx.arc(this.x, this.y, 40 + t * 20, angle - 0.35, angle + 0.35, false);
            this.warningGfx.strokePath();
        } else if (this.pendingAttack === 'tankSlam') {
            // Expanding slam ring + charge arrow
            const radius = 28 + t * 48;
            this.warningGfx.lineStyle(3, 0xff3300, alpha);
            this.warningGfx.strokeCircle(this.x, this.y, radius);
            this.warningGfx.fillStyle(0xff2200, 0.08 + t * 0.12);
            this.warningGfx.fillCircle(this.x, this.y, radius);

            // Direction of slam
            const len = 50 + t * 55;
            const x2 = this.x + Math.cos(angle) * len;
            const y2 = this.y + Math.sin(angle) * len;
            this.warningGfx.lineStyle(4, 0xffaa44, alpha);
            this.warningGfx.lineBetween(this.x, this.y, x2, y2);
            // Arrow head
            const left = angle + 2.5;
            const right = angle - 2.5;
            this.warningGfx.fillStyle(0xffaa44, alpha);
            this.warningGfx.fillTriangle(
                x2, y2,
                x2 + Math.cos(left) * 12, y2 + Math.sin(left) * 12,
                x2 + Math.cos(right) * 12, y2 + Math.sin(right) * 12
            );
        }
    }

    finishWindUp(player) {
        const attack = this.pendingAttack;
        const angle = this.windUpAngle;
        this.isWindingUp = false;
        this.pendingAttack = null;
        this.windUpElapsed = 0;
        this.lastShootTime = this.scene.time.now;
        this.setTint(this.getTintForType(this.type));
        this.clearWarning();

        if (!this.active) return;

        if (attack === 'eliteVolley') {
            for (let i = -1; i <= 1; i++) {
                this.scene.fireEnemyBullet(this.x, this.y, angle + i * 0.2, 270, 7, this);
            }
        } else if (attack === 'tankSlam') {
            this.executeTankSlam(angle, player);
        }
    }

    executeTankSlam(angle, player) {
        // Short lunge
        const lunge = 280;
        this.setVelocity(Math.cos(angle) * lunge, Math.sin(angle) * lunge);
        this.scene.cameras.main.shake(80, 0.006);

        // Impact ring VFX
        const ring = this.scene.add.circle(this.x, this.y, 20, 0xff4400, 0.45).setDepth(15);
        this.scene.tweens.add({
            targets: ring,
            radius: 70,
            alpha: 0,
            duration: 280,
            onComplete: () => ring.destroy()
        });

        // Damage if player in slam radius after brief delay (at impact)
        this.scene.time.delayedCall(120, () => {
            if (!this.active || !player || !player.active) return;
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (dist < 72) {
                player.takeDamage(this.damage * 1.35, {
                    kind: 'slam',
                    enemyType: 'tank'
                });
            }
        });
    }

    clearWarning() {
        if (this.warningGfx) this.warningGfx.clear();
    }

    drawHpBar() {
        if (!this.showHpBar || !this.hpBar || !this.active) return;

        const barW = this.type === 'tank' ? 44 : 38;
        const barH = 5;
        const yOff = this.type === 'tank' ? -36 : -32;
        const x = this.x - barW / 2;
        const y = this.y + yOff;

        const pct = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        const fillColor = pct > 0.5 ? 0x44cc66 : pct > 0.25 ? 0xddaa22 : 0xff3344;

        this.hpBar.clear();
        this.hpBar.fillStyle(0x111111, 0.8);
        this.hpBar.fillRoundedRect(x - 1, y - 1, barW + 2, barH + 2, 2);
        this.hpBar.fillStyle(fillColor, 1);
        this.hpBar.fillRoundedRect(x, y, barW * pct, barH, 2);
        this.hpBar.lineStyle(1, 0xffffff, 0.35);
        this.hpBar.strokeRoundedRect(x - 1, y - 1, barW + 2, barH + 2, 2);
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
        const base = 210 + this.phase * 18;
        for (let i = 0; i < bulletCount; i++) {
            const a = (i * Math.PI * 2) / bulletCount + angleOffset;
            this.scene.fireEnemyBullet(this.x, this.y, a, base, 6 + this.phase, this);
        }
    }

    bossSpiralAttack() {
        const count = 16;
        for (let i = 0; i < count; i++) {
            const a = (i * Math.PI * 2) / count + this.scene.gameTime * 0.002;
            this.scene.fireEnemyBullet(this.x, this.y, a, 195 + (i % 4) * 22, 7, this);
        }
    }

    takeDamage(amount, isCrit = false, opts = {}) {
        if (!this.active) return 0;

        const dealt = Math.min(this.health, amount);
        this.health -= amount;

        const showNum = opts.forceNumber || isCrit || amount >= 8 || Math.random() < 0.12;
        if (showNum && !opts.silent) {
            this.scene.showDamageNumber(this.x, this.y - 10, amount, isCrit);
        }

        if (!opts.silent && !this.isWindingUp) {
            this.setTint(0xffffff);
            this.scene.time.delayedCall(70, () => {
                if (this.active && !this.isWindingUp) {
                    this.setTint(this.getTintForType(this.type));
                }
            });
        }

        this.drawHpBar();

        if (this.health <= 0) {
            this.die();
        }
        return dealt;
    }

    destroyFx() {
        if (this.hpBar) {
            this.hpBar.destroy();
            this.hpBar = null;
        }
        if (this.warningGfx) {
            this.warningGfx.destroy();
            this.warningGfx = null;
        }
    }

    die() {
        this.destroyFx();
        soundManager.playExplosion();

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

        const xp = this.xpValue;
        if (this.scene.spawnXpBurst) {
            this.scene.spawnXpBurst(this.x, this.y, xp);
        } else {
            this.scene.spawnXpOrb(this.x, this.y, xp);
        }

        if (this.isBoss) {
            this.scene.spawnHealthPickup(this.x, this.y, true);
            this.scene.cameras.main.shake(250, 0.02);
        } else {
            const dropRoll = Math.random();
            const chance = this.type === 'tank' ? 0.18 : this.type === 'elite' ? 0.25 : 0.09;
            if (dropRoll < chance) {
                this.scene.spawnHealthPickup(this.x, this.y, false);
            }
        }

        this.scene.events.emit('enemyKilled', this);
        this.destroy();
    }

    destroy(fromScene) {
        this.destroyFx();
        super.destroy(fromScene);
    }
}
