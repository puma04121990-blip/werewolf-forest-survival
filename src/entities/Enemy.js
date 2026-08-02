import { soundManager } from '../systems/SoundManager.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type = 'chaser') {
        super(scene, x, y, 'enemy_' + type);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.type = type;
        this.initTypeStats(type);

        this.lastShootTime = 0;
    }

    initTypeStats(type) {
        switch (type) {
            case 'scout':
                this.maxHealth = 15;
                this.speed = 150;
                this.damage = 4;
                this.xpValue = 10;
                this.setScale(0.8);
                break;
            case 'tank':
                this.maxHealth = 80;
                this.speed = 60;
                this.damage = 15;
                this.xpValue = 40;
                this.setScale(1.4);
                break;
            case 'shooter':
                this.maxHealth = 30;
                this.speed = 90;
                this.damage = 6;
                this.xpValue = 20;
                this.setScale(1.0);
                break;
            case 'boss':
                this.maxHealth = 600;
                this.speed = 50;
                this.damage = 25;
                this.xpValue = 250;
                this.setScale(2.2);
                this.isBoss = true;
                break;
            case 'chaser':
            default:
                this.maxHealth = 25;
                this.speed = 100;
                this.damage = 8;
                this.xpValue = 15;
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

        // Shooter behavior (keep distance and fire)
        if (this.type === 'shooter') {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (dist < 250) {
                this.setVelocity(-Math.cos(angle) * this.speed, -Math.sin(angle) * this.speed);
            } else {
                this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            }

            if (time - this.lastShootTime > 2200) {
                this.lastShootTime = time;
                this.scene.fireEnemyBullet(this.x, this.y, angle);
            }
        } else if (this.type === 'boss') {
            // Boss behavior
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);

            if (time - this.lastShootTime > 3000) {
                this.lastShootTime = time;
                this.bossRingAttack();
            }
        } else {
            // Standard chase behavior
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        }
    }

    bossRingAttack() {
        const bulletCount = 10;
        for (let i = 0; i < bulletCount; i++) {
            const angle = (i * Math.PI * 2) / bulletCount;
            this.scene.fireEnemyBullet(this.x, this.y, angle);
        }
    }

    takeDamage(amount) {
        if (!this.active) return;

        this.health -= amount;

        // Floating Damage Number
        this.scene.showDamageNumber(this.x, this.y - 10, amount);

        // Flash white on hit
        this.setTint(0xffffff);
        this.scene.time.delayedCall(80, () => {
            if (this.active) {
                this.setTint(this.getTintForType(this.type));
            }
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        soundManager.playExplosion();
        this.scene.spawnXpOrb(this.x, this.y, this.xpValue);

        // 10% chance to spawn a Health Medkit pickup
        if (Math.random() < 0.10) {
            this.scene.spawnHealthPickup(this.x, this.y);
        }

        this.scene.events.emit('enemyKilled', this);
        this.destroy();
    }
}
