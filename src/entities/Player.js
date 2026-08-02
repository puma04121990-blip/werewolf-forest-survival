import { soundManager } from '../systems/SoundManager.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setCircle(16);

        // Rebalanced Stats
        this.maxHealth = 150;
        this.health = 150;
        this.speed = 250;
        this.magnetRadius = 220;
        this.damageMultiplier = 1.0;
        this.fireRateMultiplier = 1.0;

        // Dash ability
        this.canDash = true;
        this.isDashing = false;
        this.dashCooldown = 2500; // ms
        this.dashDuration = 220; // ms
        this.isInvulnerable = false;

        // Visual effects & Passive HP regen
        this.trailTimer = 0;
        this.regenTimer = 0;

        // Controls setup
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

        this.handleMovement(time);
        this.updateTrail(delta);
        this.handleRegen(delta);
    }

    handleMovement(time) {
        if (this.isDashing) return;

        let moveX = 0;
        let moveY = 0;

        // Keyboard input
        if (this.cursors.left.isDown || this.wasd.left.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) moveX += 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) moveY -= 1;
        if (this.cursors.down.isDown || this.wasd.down.isDown) moveY += 1;

        // Pointer / Touch Controls
        const pointer = this.scene.input.activePointer;
        if (pointer.isDown && pointer.getDuration() > 100) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
            const dist = Phaser.Math.Distance.Between(this.x, this.y, pointer.worldX, pointer.worldY);
            if (dist > 20) {
                moveX = Math.cos(angle);
                moveY = Math.sin(angle);
            }
        }

        // Normalize vector
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
        }

        this.setVelocity(moveX * this.speed, moveY * this.speed);

        // Rotate sprite towards movement
        if (moveX !== 0 || moveY !== 0) {
            this.rotation = Math.atan2(moveY, moveX) + Math.PI / 2;
        }

        // Dash trigger
        if (Phaser.Input.Keyboard.JustDown(this.wasd.space) && this.canDash && (moveX !== 0 || moveY !== 0)) {
            this.dash(moveX, moveY);
        }
    }

    dash(dirX, dirY) {
        this.canDash = false;
        this.isDashing = true;
        this.isInvulnerable = true;

        soundManager.playDash();

        const dashSpeed = this.speed * 3.2;
        this.setVelocity(dirX * dashSpeed, dirY * dashSpeed);

        this.setAlpha(0.6);

        this.scene.time.delayedCall(this.dashDuration, () => {
            this.isDashing = false;
            this.isInvulnerable = false;
            this.setAlpha(1.0);
        });

        this.scene.time.delayedCall(this.dashCooldown, () => {
            this.canDash = true;
        });
    }

    handleRegen(delta) {
        this.regenTimer += delta;
        if (this.regenTimer >= 1000) {
            this.regenTimer = 0;
            if (this.health < this.maxHealth) {
                this.health = Math.min(this.maxHealth, this.health + 1); // 1 HP per second regen
            }
        }
    }

    updateTrail(delta) {
        if (this.isDashing || this.body.speed > 50) {
            this.trailTimer += delta;
            if (this.trailTimer > 50) {
                this.trailTimer = 0;
                const clone = this.scene.add.image(this.x, this.y, 'player');
                clone.setRotation(this.rotation);
                clone.setAlpha(0.3);
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
        if (this.isInvulnerable || !this.active) return;

        this.health -= amount;
        soundManager.playHit();
        this.scene.cameras.main.shake(100, 0.01);

        // Grant 600ms Invincibility Frames (I-Frames)
        this.isInvulnerable = true;
        this.setTint(0xff0000);

        this.scene.time.delayedCall(150, () => {
            if (this.active) this.clearTint();
        });

        this.scene.time.delayedCall(600, () => {
            if (this.active) this.isInvulnerable = false;
        });

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    die() {
        this.setActive(false);
        this.setVisible(false);
        soundManager.playExplosion();
        this.scene.events.emit('playerDied');
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
}
