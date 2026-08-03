import { soundManager } from '../systems/SoundManager.js';
import { BALANCE } from '../config.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setCircle(16);
        this.skinTint = null;

        this.maxHealth = BALANCE.playerMaxHp;
        this.health = BALANCE.playerMaxHp;
        this.speed = BALANCE.playerSpeed;
        this.magnetRadius = BALANCE.playerMagnet;
        this.damageMultiplier = 1.0;
        this.fireRateMultiplier = 1.0;
        this.critChance = 0.05;
        this.critMultiplier = 1.75;
        this.lifesteal = 0;
        this.armor = 0;
        this.regenPerSec = BALANCE.baseRegenPerSec;

        this.canDash = true;
        this.isDashing = false;
        this.dashCooldown = BALANCE.dashCooldown;
        this.dashDuration = BALANCE.dashDuration;
        this.dashCooldownRemaining = 0;
        this.isInvulnerable = false;

        // Dash combat state
        this.dashDirX = 0;
        this.dashDirY = 0;
        this.dashHitEnemies = new Set();
        this.dashTrailHit = new Set(); // enemy ids hit by trail this dash
        this.dashTrailNodes = []; // { x, y, age }
        this.dashTrailAcc = 0;
        this.dashSlashGfx = null;

        this.trailTimer = 0;
        this.regenTimer = 0;

        // Last non-zero move vector (for dash button when standing still)
        this.lastMoveX = 0;
        this.lastMoveY = -1;

        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE
        });
    }

    update(time, delta) {
        if (!this.active) return;

        if (this.dashCooldownRemaining > 0) {
            this.dashCooldownRemaining = Math.max(0, this.dashCooldownRemaining - delta);
            if (this.dashCooldownRemaining <= 0) {
                this.canDash = true;
            }
        }

        this.handleMovement(time);
        this.updateTrail(delta);
        this.handleRegen(delta);

        if (this.isDashing) {
            this.updateDashCombat(delta);
        } else if (this.dashTrailNodes.length > 0) {
            // Trail can outlive the dash briefly
            this.updateDashTrailOnly(delta);
        }
    }

    handleMovement(time) {
        if (this.isDashing) return;

        let moveX = 0;
        let moveY = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) moveX += 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) moveY -= 1;
        if (this.cursors.down.isDown || this.wasd.down.isDown) moveY += 1;

        // Touch move: ignore pointers that started on UI (dash / pause / mute)
        const uiPointers = this.scene.uiPointers;
        const pointer = this.scene.input.activePointer;
        const pointerIsUi = uiPointers && uiPointers.has(pointer.id);
        if (pointer.isDown && !pointerIsUi && pointer.getDuration() > 40) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
            const dist = Phaser.Math.Distance.Between(this.x, this.y, pointer.worldX, pointer.worldY);
            if (dist > 16) {
                moveX = Math.cos(angle);
                moveY = Math.sin(angle);
            }
        }

        // Legacy: second finger still dashes
        if (this.scene.input.pointer2 && this.scene.input.pointer2.isDown) {
            const p2ui = uiPointers && uiPointers.has(this.scene.input.pointer2.id);
            if (!p2ui && this.canDash && (moveX !== 0 || moveY !== 0)) {
                this.dash(moveX, moveY);
            }
        }

        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
        }

        if (moveX !== 0 || moveY !== 0) {
            this.lastMoveX = moveX;
            this.lastMoveY = moveY;
            this.rotation = Math.atan2(moveY, moveX) + Math.PI / 2;
        }

        this.setVelocity(moveX * this.speed, moveY * this.speed);

        if (Phaser.Input.Keyboard.JustDown(this.wasd.space) && this.canDash) {
            this.tryDash();
        }
    }

    /**
     * Dash in last movement direction (or facing). Used by Space + mobile button.
     * @returns {boolean}
     */
    tryDash() {
        if (!this.canDash || this.isDashing || !this.active) return false;

        let dx = this.lastMoveX;
        let dy = this.lastMoveY;

        // If currently moving, prefer live velocity
        if (this.body && (Math.abs(this.body.velocity.x) > 20 || Math.abs(this.body.velocity.y) > 20)) {
            dx = this.body.velocity.x;
            dy = this.body.velocity.y;
        }

        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
            // Facing direction (sprite rotation is moveAngle + PI/2)
            const a = this.rotation - Math.PI / 2;
            dx = Math.cos(a);
            dy = Math.sin(a);
        }

        this.dash(dx, dy);
        return true;
    }

    dash(dirX, dirY) {
        // Normalize
        const len = Math.hypot(dirX, dirY) || 1;
        dirX /= len;
        dirY /= len;

        this.canDash = false;
        this.isDashing = true;
        this.isInvulnerable = true;
        this.dashCooldownRemaining = this.dashCooldown;
        this.dashDirX = dirX;
        this.dashDirY = dirY;
        this.dashHitEnemies.clear();
        this.dashTrailHit.clear();
        this.dashTrailNodes = [];
        this.dashTrailAcc = 0;

        soundManager.playDash();

        const dashSpeed = this.speed * BALANCE.dashSpeedMul;
        this.setVelocity(dirX * dashSpeed, dirY * dashSpeed);
        this.setAlpha(0.55);
        this.rotation = Math.atan2(dirY, dirX) + Math.PI / 2;

        // Opening slash VFX
        this.spawnDashSlashVfx(dirX, dirY);

        // Ghost clones along dash
        for (let i = 0; i < 5; i++) {
            this.scene.time.delayedCall(i * 28, () => {
                if (!this.active) return;
                const clone = this.scene.add.image(this.x, this.y, 'player');
                clone.setRotation(this.rotation).setAlpha(0.4).setTint(0x88ffaa).setDepth(6);
                this.scene.tweens.add({
                    targets: clone,
                    alpha: 0,
                    scale: 0.65,
                    duration: 200,
                    onComplete: () => clone.destroy()
                });
            });
        }

        this.scene.time.delayedCall(this.dashDuration, () => {
            this.isDashing = false;
            // Keep i-frames a hair longer than the dash body so exit isn't punishy
            this.scene.time.delayedCall(40, () => {
                if (this.active && !this.isDashing) {
                    this.isInvulnerable = false;
                    this.setAlpha(1.0);
                }
            });
        });
    }

    spawnDashSlashVfx(dirX, dirY) {
        const g = this.scene.add.graphics().setDepth(12);
        const angle = Math.atan2(dirY, dirX);
        const arc = () => {
            g.clear();
            g.lineStyle(3, 0xaaffcc, 0.85);
            g.beginPath();
            const r = 34;
            g.arc(this.x, this.y, r, angle - 1.1, angle + 1.1, false);
            g.strokePath();
            g.lineStyle(2, 0xffffff, 0.5);
            g.beginPath();
            g.arc(this.x, this.y, r - 6, angle - 0.7, angle + 0.7, false);
            g.strokePath();
        };
        arc();
        this.scene.tweens.add({
            targets: { t: 0 },
            t: 1,
            duration: 160,
            onUpdate: () => {
                if (this.active) arc();
            },
            onComplete: () => g.destroy()
        });
    }

    updateDashCombat(delta) {
        // Body strike — once per enemy per dash
        this.applyDashBodyHits();

        // Drop trail nodes
        this.dashTrailAcc += delta;
        while (this.dashTrailAcc >= BALANCE.dashTrailTickMs) {
            this.dashTrailAcc -= BALANCE.dashTrailTickMs;
            this.dashTrailNodes.push({ x: this.x, y: this.y, age: 0 });
            this.spawnTrailSlashMark(this.x, this.y);
        }

        this.updateDashTrailOnly(delta);
    }

    updateDashTrailOnly(delta) {
        const life = BALANCE.dashTrailLifeMs;
        const radius = BALANCE.dashTrailRadius;

        for (let i = this.dashTrailNodes.length - 1; i >= 0; i--) {
            const node = this.dashTrailNodes[i];
            node.age += delta;
            if (node.age >= life) {
                this.dashTrailNodes.splice(i, 1);
                continue;
            }
            this.applyTrailHitsAt(node.x, node.y, radius);
        }
    }

    applyDashBodyHits() {
        const enemies = this.scene.enemies;
        if (!enemies) return;

        const radius = BALANCE.dashHitRadius;
        const kb = BALANCE.dashKnockback;

        enemies.getChildren().forEach(enemy => {
            if (!enemy.active || this.dashHitEnemies.has(enemy)) return;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist > radius) return;

            this.dashHitEnemies.add(enemy);
            this.dealDashDamage(enemy, BALANCE.dashDamage, true);

            // Knockback along dash direction
            if (enemy.body) {
                enemy.x += this.dashDirX * (kb * 0.15);
                enemy.y += this.dashDirY * (kb * 0.15);
                enemy.setVelocity?.(
                    this.dashDirX * kb,
                    this.dashDirY * kb
                );
            }

            // Hit spark
            const spark = this.scene.add.circle(enemy.x, enemy.y, 8, 0xaaffcc, 0.8).setDepth(20);
            this.scene.tweens.add({
                targets: spark,
                radius: 22,
                alpha: 0,
                duration: 160,
                onComplete: () => spark.destroy()
            });
            this.scene.cameras.main.shake(40, 0.004);
        });
    }

    applyTrailHitsAt(x, y, radius) {
        const enemies = this.scene.enemies;
        if (!enemies) return;

        enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            // Trail hits enemies not already struck by body, or weaker re-hit key
            if (this.dashHitEnemies.has(enemy) || this.dashTrailHit.has(enemy)) return;
            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (dist > radius) return;

            this.dashTrailHit.add(enemy);
            this.dealDashDamage(enemy, BALANCE.dashTrailDamage, false);
        });
    }

    dealDashDamage(enemy, baseDamage, isBody) {
        if (!enemy || !enemy.active) return;
        if (this.scene.dealDamageToEnemy) {
            this.scene.dealDamageToEnemy(enemy, baseDamage, {
                forceNumber: true,
                source: 'dash'
            });
        } else if (enemy.takeDamage) {
            const { damage, isCrit } = this.rollDamage(baseDamage);
            enemy.takeDamage(damage, isCrit, { forceNumber: true });
        }

        if (isBody && Math.random() < 0.35) {
            soundManager.playLaser && soundManager.playLaser();
        }
    }

    spawnTrailSlashMark(x, y) {
        const g = this.scene.add.graphics().setDepth(5);
        const angle = Math.atan2(this.dashDirY, this.dashDirX);
        g.lineStyle(2.5, 0x66ffaa, 0.7);
        const len = 18;
        const perp = angle + Math.PI / 2;
        g.lineBetween(
            x + Math.cos(perp) * len,
            y + Math.sin(perp) * len,
            x - Math.cos(perp) * len,
            y - Math.sin(perp) * len
        );
        g.lineStyle(1.5, 0xffffff, 0.4);
        g.lineBetween(
            x + Math.cos(angle) * 6,
            y + Math.sin(angle) * 6,
            x - Math.cos(angle) * 10,
            y - Math.sin(angle) * 10
        );
        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: BALANCE.dashTrailLifeMs,
            onComplete: () => g.destroy()
        });
    }

    getDashCooldownRatio() {
        if (this.canDash) return 1;
        return 1 - Phaser.Math.Clamp(this.dashCooldownRemaining / this.dashCooldown, 0, 1);
    }

    /**
     * Meta skin tint (null = default forest wolf).
     * @param {number|null} tint
     */
    applySkin(tint) {
        this.skinTint = tint != null ? tint : null;
        if (this.skinTint != null) this.setTint(this.skinTint);
        else this.clearTint();
    }

    /** Restore skin tint after hit flash */
    restoreSkinTint() {
        if (this.skinTint != null) this.setTint(this.skinTint);
        else this.clearTint();
    }

    handleRegen(delta) {
        this.regenTimer += delta;
        if (this.regenTimer >= 1000) {
            this.regenTimer = 0;
            if (this.health < this.maxHealth && this.regenPerSec > 0) {
                this.health = Math.min(this.maxHealth, this.health + this.regenPerSec);
            }
        }
    }

    updateTrail(delta) {
        if (this.isDashing || this.body.speed > 50) {
            this.trailTimer += delta;
            if (this.trailTimer > 55) {
                this.trailTimer = 0;
                const clone = this.scene.add.image(this.x, this.y, 'player');
                clone.setRotation(this.rotation);
                clone.setAlpha(this.isDashing ? 0.4 : 0.28);
                clone.setTint(this.isDashing ? 0x88ffaa : 0x00ffcc);
                this.scene.tweens.add({
                    targets: clone,
                    alpha: 0,
                    scale: 0.8,
                    duration: 200,
                    onComplete: () => clone.destroy()
                });
            }
        }
    }

    /**
     * @param {number} amount
     * @param {{ kind?: string, enemyType?: string, label?: string } | null} [source]
     */
    takeDamage(amount, source = null) {
        if (this.isInvulnerable || !this.active) return false;

        if (source && this.scene.runStats) {
            this.scene.runStats.recordHit(source);
        }

        const reduced = amount * (1 - Phaser.Math.Clamp(this.armor, 0, 0.45));
        this.health -= reduced;
        soundManager.playHit();
        this.scene.cameras.main.shake(90, 0.008);

        this.isInvulnerable = true;
        this.setTint(0xff0000);

        this.scene.time.delayedCall(140, () => {
            if (this.active) this.restoreSkinTint();
        });

        this.scene.time.delayedCall(BALANCE.invulnAfterHit, () => {
            if (this.active && !this.isDashing) this.isInvulnerable = false;
        });

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
        return true;
    }

    die() {
        this.setActive(false);
        this.setVisible(false);
        soundManager.playExplosion();
        this.scene.events.emit('playerDied');
    }

    heal(amount) {
        const before = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        return this.health - before;
    }

    rollDamage(baseDamage) {
        const isCrit = Math.random() < this.critChance;
        const damage = baseDamage * this.damageMultiplier * (isCrit ? this.critMultiplier : 1);
        return { damage, isCrit };
    }

    applyLifesteal(dealtDamage) {
        if (this.lifesteal <= 0 || !this.active) return;
        const heal = dealtDamage * this.lifesteal;
        if (heal >= 0.5) this.heal(heal);
    }
}
