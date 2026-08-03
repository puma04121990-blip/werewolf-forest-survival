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

        // Overhead HP for tank / elite; bosses use HUD bar + telegraphs
        this.hpBar = null;
        this.warningGfx = null;
        if (type === 'tank' || type === 'elite' || this.isBoss) {
            this.hpBar = this.isBoss ? null : scene.add.graphics().setDepth(25);
            this.warningGfx = scene.add.graphics().setDepth(24);
            this.showHpBar = !this.isBoss && (type === 'tank' || type === 'elite');
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
                // Великий инквизитор — кольца и спирали пуль
                this.maxHealth = (550 + d * 180) * (1 + d * 0.08);
                this.speed = 48 + Math.min(25, d * 2);
                this.damage = 18 + d * 2.5;
                this.xpValue = 280 + d * 40;
                this.setScale(2.15);
                this.isBoss = true;
                this.bossId = 'inquisitor';
                this.bossTitle = '⚔ ВЕЛИКИЙ ИНКВИЗИТОР';
                this.bossShortName = 'ИНКВИЗИТОР';
                this.bossToastColor = '#ff2255';
                break;
            case 'boss_witch':
                // Лунная ведьма — вееры, лужи крови, призыв
                this.maxHealth = (480 + d * 160) * (1 + d * 0.08);
                this.speed = 62 + Math.min(20, d * 1.5);
                this.damage = 14 + d * 2;
                this.xpValue = 260 + d * 38;
                this.setScale(2.0);
                this.isBoss = true;
                this.bossId = 'witch';
                this.bossTitle = '🌙 ЛУННАЯ ВЕДЬМА';
                this.bossShortName = 'ВЕДЬМА';
                this.bossToastColor = '#cc66ff';
                break;
            case 'boss_beast':
                // Зверь леса — рывки, ударные волны, мало пуль
                this.maxHealth = (620 + d * 200) * (1 + d * 0.08);
                this.speed = 70 + Math.min(28, d * 2);
                this.damage = 22 + d * 3;
                this.xpValue = 300 + d * 45;
                this.setScale(2.25);
                this.isBoss = true;
                this.bossId = 'beast';
                this.bossTitle = '🐗 ЗВЕРЬ ЛЕСА';
                this.bossShortName = 'ЗВЕРЬ';
                this.bossToastColor = '#ff8844';
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
            case 'boss_witch': return 0xcc66ff;
            case 'boss_beast': return 0xff7722;
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
        } else if (this.isBoss) {
            this.updateBossAI(time, delta, player, angle);
        } else {
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        }

        this.drawHpBar();
        if (!this.isWindingUp) this.clearWarning();
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
        } else if (this.pendingAttack === 'tankSlam' || this.pendingAttack === 'beastCharge') {
            const radius = (this.pendingAttack === 'beastCharge' ? 40 : 28) + t * 48;
            this.warningGfx.lineStyle(3, 0xff3300, alpha);
            this.warningGfx.strokeCircle(this.x, this.y, radius);
            this.warningGfx.fillStyle(0xff2200, 0.08 + t * 0.12);
            this.warningGfx.fillCircle(this.x, this.y, radius);

            const len = 50 + t * 70;
            const x2 = this.x + Math.cos(angle) * len;
            const y2 = this.y + Math.sin(angle) * len;
            this.warningGfx.lineStyle(4, 0xffaa44, alpha);
            this.warningGfx.lineBetween(this.x, this.y, x2, y2);
            const left = angle + 2.5;
            const right = angle - 2.5;
            this.warningGfx.fillStyle(0xffaa44, alpha);
            this.warningGfx.fillTriangle(
                x2, y2,
                x2 + Math.cos(left) * 12, y2 + Math.sin(left) * 12,
                x2 + Math.cos(right) * 12, y2 + Math.sin(right) * 12
            );
        } else if (this.pendingAttack === 'inquisitorRing') {
            // Expanding danger ring around boss
            const r = 40 + t * 90;
            this.warningGfx.lineStyle(2 + t * 2, 0xff2255, alpha);
            this.warningGfx.strokeCircle(this.x, this.y, r);
            this.warningGfx.lineStyle(1, 0xff6688, alpha * 0.5);
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + t;
                this.warningGfx.lineBetween(
                    this.x + Math.cos(a) * 20,
                    this.y + Math.sin(a) * 20,
                    this.x + Math.cos(a) * r,
                    this.y + Math.sin(a) * r
                );
            }
        } else if (this.pendingAttack === 'witchFan') {
            const spreads = [-0.45, -0.22, 0, 0.22, 0.45];
            const len = 100 + t * 80;
            spreads.forEach(spread => {
                const a = angle + spread;
                this.warningGfx.lineStyle(2, 0xcc66ff, alpha);
                this.warningGfx.lineBetween(
                    this.x, this.y,
                    this.x + Math.cos(a) * len,
                    this.y + Math.sin(a) * len
                );
            });
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
            this.executeTankSlam(angle, player, false);
        } else if (attack === 'beastCharge') {
            this.executeTankSlam(angle, player, true);
        } else if (attack === 'inquisitorRing') {
            this.executeInquisitorAttack();
        } else if (attack === 'witchFan') {
            this.executeWitchFan(angle);
        }
    }

    executeTankSlam(angle, player, isBeast = false) {
        const lunge = isBeast ? 360 : 280;
        const hitR = isBeast ? 95 : 72;
        this.setVelocity(Math.cos(angle) * lunge, Math.sin(angle) * lunge);
        this.scene.cameras.main.shake(isBeast ? 140 : 80, isBeast ? 0.012 : 0.006);

        const ring = this.scene.add.circle(this.x, this.y, 20, isBeast ? 0xff6622 : 0xff4400, 0.45).setDepth(15);
        this.scene.tweens.add({
            targets: ring,
            radius: isBeast ? 100 : 70,
            alpha: 0,
            duration: 300,
            onComplete: () => ring.destroy()
        });

        this.scene.time.delayedCall(120, () => {
            if (!this.active || !player || !player.active) return;
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (dist < hitR) {
                player.takeDamage(this.damage * (isBeast ? 1.5 : 1.35), {
                    kind: 'slam',
                    enemyType: isBeast ? 'boss_beast' : 'tank'
                });
            }
            // Beast phase 2+: leave shockwave hazard
            if (isBeast && this.phase >= 2 && this.scene.spawnBossHazard) {
                this.scene.spawnBossHazard(this.x, this.y, {
                    radius: 85,
                    delay: 350,
                    damage: 10 + this.phase * 3,
                    color: 0xff6622,
                    enemyType: 'boss_beast'
                });
            }
        });
    }

    executeInquisitorAttack() {
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

    executeWitchFan(angle) {
        const count = this.phase >= 3 ? 7 : 5;
        const spread = this.phase >= 3 ? 0.18 : 0.22;
        for (let i = 0; i < count; i++) {
            const a = angle + (i - (count - 1) / 2) * spread;
            this.scene.fireEnemyBullet(this.x, this.y, a, 230 + this.phase * 15, 6 + this.phase, this);
        }
        if (this.phase >= 2 && this.scene.player) {
            const p = this.scene.player;
            this.scene.spawnBossHazard?.(p.x, p.y, {
                radius: 65 + this.phase * 8,
                delay: 650,
                damage: 11 + this.phase * 2,
                color: 0xaa2288,
                enemyType: 'boss_witch'
            });
        }
        if (this.phase >= 3) {
            this.witchSummonMinions();
        }
        this.scene.cameras.main.shake(90, 0.009);
        this.scene.events.emit('bossAttack', this);
    }

    witchSummonMinions() {
        if (!this.scene.enemies) return;
        const EnemyClass = this.constructor;
        for (let i = 0; i < 2; i++) {
            if (this.scene.enemies.countActive() >= 55) break;
            const a = Math.random() * Math.PI * 2;
            const mx = this.x + Math.cos(a) * 50;
            const my = this.y + Math.sin(a) * 50;
            const minion = new EnemyClass(this.scene, mx, my, i === 0 ? 'scout' : 'chaser', this.difficultyLevel);
            this.scene.enemies.add(minion);
        }
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

    updateBossPhase() {
        const hpRatio = this.health / this.maxHealth;
        if (hpRatio < 0.35) this.phase = 3;
        else if (hpRatio < 0.65) this.phase = 2;
        else this.phase = 1;
    }

    updateBossAI(time, delta, player, angle) {
        this.updateBossPhase();
        const id = this.bossId || 'inquisitor';
        if (id === 'witch') this.updateBossWitch(time, player, angle);
        else if (id === 'beast') this.updateBossBeast(time, player, angle);
        else this.updateBossInquisitor(time, player, angle);
    }

    /** Инквизитор: кольца / спирали, телеграф кольца */
    updateBossInquisitor(time, player, angle) {
        const spd = this.speed * (this.phase === 3 ? 1.35 : this.phase === 2 ? 1.15 : 1);
        this.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);

        const attackCd = this.phase === 3 ? 1800 : this.phase === 2 ? 2400 : 3000;
        if (time - this.lastShootTime > attackCd) {
            this.startWindUp('inquisitorRing', this.phase >= 3 ? 450 : 600, angle);
        }
    }

    /** Ведьма: держит дистанцию, веер + лужи + призыв */
    updateBossWitch(time, player, angle) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const ideal = 220;
        let vx = 0;
        let vy = 0;
        if (dist < ideal - 40) {
            vx = -Math.cos(angle) * this.speed;
            vy = -Math.sin(angle) * this.speed;
        } else if (dist > ideal + 50) {
            vx = Math.cos(angle) * this.speed * 0.9;
            vy = Math.sin(angle) * this.speed * 0.9;
        } else {
            // orbit strafe
            vx = -Math.sin(angle) * this.speed * 0.85;
            vy = Math.cos(angle) * this.speed * 0.85;
        }
        this.setVelocity(vx, vy);

        const attackCd = this.phase === 3 ? 2000 : this.phase === 2 ? 2600 : 3200;
        if (time - this.lastShootTime > attackCd) {
            this.startWindUp('witchFan', 550, angle);
        }
    }

    /** Зверь: агрессивный chase + телеграф-рывок */
    updateBossBeast(time, player, angle) {
        const spd = this.speed * (this.phase === 3 ? 1.25 : 1.05);
        this.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);

        const attackCd = this.phase === 3 ? 1600 : this.phase === 2 ? 2200 : 2800;
        if (time - this.lastShootTime > attackCd) {
            this.startWindUp('beastCharge', this.phase >= 3 ? 480 : 620, angle);
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
