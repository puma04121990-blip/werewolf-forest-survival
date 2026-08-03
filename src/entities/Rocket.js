import { soundManager } from '../systems/SoundManager.js';

export class Rocket extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'rocket');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.target = null;
        this.damage = 40;
        this.splashRadius = 80;
        this.speed = 350;
        this.turnSpeed = 0.08;
        this.bornTime = 0;
        this.lifespan = 3500;
        this.trailTimer = 0;

        this.onUpdateListener = this.update.bind(this);
        scene.events.on('update', this.onUpdateListener);
    }

    launch(x, y, initialAngle, damage = 40, splashRadius = 80) {
        this.setPosition(x, y);
        this.setRotation(initialAngle);
        this.damage = damage;
        this.splashRadius = splashRadius;
        this.bornTime = this.scene.time.now;
        this.setActive(true);
        this.setVisible(true);

        this.setVelocity(Math.cos(initialAngle) * this.speed, Math.sin(initialAngle) * this.speed);
    }

    update(time, delta) {
        if (!this.active || !this.scene) return;

        if (time - this.bornTime > this.lifespan) {
            this.explode();
            return;
        }

        if (!this.target || !this.target.active) {
            this.target = this.scene.weaponSystem.getClosestEnemy(this.scene.enemies);
        }

        if (this.target && this.target.active) {
            const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            const currentAngle = this.rotation;
            const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, this.turnSpeed);
            this.setRotation(newAngle);
            this.setVelocity(Math.cos(newAngle) * this.speed, Math.sin(newAngle) * this.speed);

            if (Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y) < 25) {
                this.explode();
                return;
            }
        }

        this.trailTimer += delta || 16;
        if (this.trailTimer > 40) {
            this.trailTimer = 0;
            const particle = this.scene.add.circle(this.x, this.y, 4, 0xffaa00, 0.8);
            this.scene.tweens.add({
                targets: particle,
                alpha: 0,
                scale: 0.2,
                duration: 250,
                onComplete: () => particle.destroy()
            });
        }
    }

    explode() {
        if (!this.active) return;

        if (this.scene && this.onUpdateListener) {
            this.scene.events.off('update', this.onUpdateListener);
            this.onUpdateListener = null;
        }

        soundManager.playExplosion();
        this.scene.cameras.main.shake(80, 0.008);

        const blast = this.scene.add.circle(this.x, this.y, 10, 0xff5500, 0.7);
        blast.setStrokeStyle(3, 0xffff00);
        this.scene.tweens.add({
            targets: blast,
            radius: this.splashRadius,
            alpha: 0,
            duration: 300,
            onComplete: () => blast.destroy()
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
