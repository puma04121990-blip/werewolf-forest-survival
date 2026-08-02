export class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture = 'bullet') {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.damage = 10;
        this.isEnemyBullet = false;
        this.lifespan = 2000; // ms
        this.bornTime = 0;
    }

    fire(x, y, angle, speed, damage, isEnemy = false, texture = 'bullet') {
        this.setTexture(texture);
        this.setPosition(x, y);
        this.setRotation(angle + Math.PI / 2);
        this.setActive(true);
        this.setVisible(true);

        this.damage = damage;
        this.isEnemyBullet = isEnemy;
        this.bornTime = this.scene.time.now;

        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;

        this.setVelocity(velocityX, velocityY);
    }

    update(time, delta) {
        if (!this.active) return;

        if (time - this.bornTime > this.lifespan) {
            this.destroy();
        }
    }
}
