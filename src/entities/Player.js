import { soundManager } from '../systems/SoundManager.js';
import { BALANCE } from '../config.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setCircle(16);

        this.maxHealth = BALANCE.playerMaxHp;
        this.health = BALANCE.playerMaxHp;
        this.speed = BALANCE.playerSpeed;
        this.magnetRadius = BALANCE.playerMagnet;
        this.damageMultiplier = 1.0;
        this.fireRateMultiplier = 1.0;
        this.critChance = 0.05;
        this.critMultiplier = 1.75;
        this.lifesteal = 0;
        this.armor = 0; // damage reduction 0–0.45
        this.regenPerSec = BALANCE.baseRegenPerSec;

        this.canDash = true;
        this.isDashing = false;
        this.dashCooldown = BALANCE.dashCooldown;
        this.dashDuration = BALANCE.dashDuration;
        this.dashCooldownRemaining = 0;
        this.isInvulnerable = false;

        this.trailTimer = 0;
        this.regenTimer = 0;

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
    }

    handleMovement(time) {
        if (this.isDashing) return;

        let moveX = 0;
        let moveY = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) moveX += 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) moveY -= 1;
        if (this.cursors.down.isDown || this.wasd.down.isDown) moveY += 1;

        const pointer = this.scene.input.activePointer;
        if (pointer.isDown && pointer.getDuration() > 40) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
            const dist = Phaser.Math.Distance.Between(this.x, this.y, pointer.worldX, pointer.worldY);
            if (dist > 16) {
                moveX = Math.cos(angle);
                moveY = Math.sin(angle);
            }
        }

        if (this.scene.input.pointer2 && this.scene.input.pointer2.isDown && this.canDash && (moveX !== 0 || moveY !== 0)) {
            this.dash(moveX, moveY);
        }

        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
        }

        this.setVelocity(moveX * this.speed, moveY * this.speed);

        if (moveX !== 0 || moveY !== 0) {
            this.rotation = Math.atan2(moveY, moveX) + Math.PI / 2;
        }

        if (Phaser.Input.Keyboard.JustDown(this.wasd.space) && this.canDash && (moveX !== 0 || moveY !== 0)) {
            this.dash(moveX, moveY);
        }
    }

    dash(dirX, dirY) {
        this.canDash = false;
        this.isDashing = true;
        this.isInvulnerable = true;
        this.dashCooldownRemaining = this.dashCooldown;

        soundManager.playDash();

        const dashSpeed = this.speed * BALANCE.dashSpeedMul;
        this.setVelocity(dirX * dashSpeed, dirY * dashSpeed);
        this.setAlpha(0.55);

        // Brief trail burst
        for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall(i * 30, () => {
                if (!this.active) return;
                const clone = this.scene.add.image(this.x, this.y, 'player');
                clone.setRotation(this.rotation).setAlpha(0.35).setTint(0x88ffaa);
                this.scene.tweens.add({
                    targets: clone,
                    alpha: 0,
                    scale: 0.7,
                    duration: 180,
                    onComplete: () => clone.destroy()
                });
            });
        }

        this.scene.time.delayedCall(this.dashDuration, () => {
            this.isDashing = false;
            this.isInvulnerable = false;
            this.setAlpha(1.0);
        });
    }

    getDashCooldownRatio() {
        if (this.canDash) return 1;
        return 1 - Phaser.Math.Clamp(this.dashCooldownRemaining / this.dashCooldown, 0, 1);
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
                clone.setAlpha(0.28);
                clone.setTint(0x00ffcc);
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

    takeDamage(amount) {
        if (this.isInvulnerable || !this.active) return false;

        const reduced = amount * (1 - Phaser.Math.Clamp(this.armor, 0, 0.45));
        this.health -= reduced;
        soundManager.playHit();
        this.scene.cameras.main.shake(90, 0.008);

        this.isInvulnerable = true;
        this.setTint(0xff0000);

        this.scene.time.delayedCall(140, () => {
            if (this.active) this.clearTint();
        });

        this.scene.time.delayedCall(BALANCE.invulnAfterHit, () => {
            if (this.active) this.isInvulnerable = false;
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

    /** Roll crit and return { damage, isCrit } */
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
