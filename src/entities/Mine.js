import { soundManager } from '../systems/SoundManager.js';

export class Mine extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'mine');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.damage = 55;
        this.triggerRadius = 50;
        this.splashRadius = 100;
        this.pulseTimer = 0;
        this.armTime = 0;
        this.detonateTimeout = 5000; // 5 seconds

        // Ensure update is registered with Phaser scene update loop
        this.onUpdateListener = this.update.bind(this);
        scene.events.on('update', this.onUpdateListener);
    }

    arm(x, y, damage = 55, triggerRadius = 50, splashRadius = 100) {
        this.setPosition(x, y);
        this.damage = damage;
        this.triggerRadius = triggerRadius;
        this.splashRadius = splashRadius;
        this.armTime = this.scene.time.now;
        this.setActive(true);
        this.setVisible(true);
    }

    update(time, delta) {
        if (!this.active || !this.scene) return;

        const age = time - this.armTime;

        // 1. Auto-detonate after 5 seconds (5000 ms)
        if (age >= this.detonateTimeout) {
            this.explode();
            return;
        }

        // Fast warning pulse as 5-second timeout approaches
        const pulseSpeed = age > 3500 ? 0.03 : 0.01;
        this.pulseTimer += delta || 16;
        this.setScale(1.0 + Math.sin(this.pulseTimer * pulseSpeed) * 0.2);

        // Flash red faster near 5-second expiration
        if (age > 3500 && Math.floor(time / 100) % 2 === 0) {
            this.setTint(0xff0000);
        } else {
            this.clearTint();
        }

        // 2. Proximity check with enemies (Enemy steps on mine)
        if (this.scene && this.scene.enemies) {
            const enemies = this.scene.enemies.getChildren();
            for (let i = 0; i < enemies.length; i++) {
                const enemy = enemies[i];
                if (enemy.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) <= this.triggerRadius) {
                    this.explode();
                    break;
                }
            }
        }
    }

    explode() {
        if (!this.active) return;

        // Clean up scene update listener
        if (this.scene && this.onUpdateListener) {
            this.scene.events.off('update', this.onUpdateListener);
            this.onUpdateListener = null;
        }

        soundManager.playExplosion();
        this.scene.cameras.main.shake(100, 0.012);

        // Visual Blast Wave
        const wave = this.scene.add.circle(this.x, this.y, 10, 0xffe600, 0.85);
        wave.setStrokeStyle(4, 0xff0000);
        this.scene.tweens.add({
            targets: wave,
            radius: this.splashRadius,
            alpha: 0,
            duration: 350,
            onComplete: () => wave.destroy()
        });

        if (this.scene && this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(enemy => {
                if (enemy.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) <= this.splashRadius) {
                    if (this.scene.dealDamageToEnemy) {
                        this.scene.dealDamageToEnemy(enemy, this.damage, { forceNumber: true });
                    } else {
                        enemy.takeDamage(this.damage);
                    }
                }
            });
        }

        this.destroy();
    }

    destroy(fromScene) {
        if (this.scene && this.onUpdateListener) {
            this.scene.events.off('update', this.onUpdateListener);
            this.onUpdateListener = null;
        }
        super.destroy(fromScene);
    }
}
