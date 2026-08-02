export class XpOrb extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, value = 10) {
        super(scene, x, y, 'xp_orb');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.value = value;
        this.initOrbStyle(value);
    }

    initOrbStyle(value) {
        if (value >= 100) {
            this.setTint(0xffd700); // Gold
            this.setScale(1.3);
        } else if (value >= 25) {
            this.setTint(0x00ffff); // Cyan
            this.setScale(1.0);
        } else {
            this.setTint(0x00ff00); // Green
            this.setScale(0.8);
        }
    }

    update(time, delta) {
        const player = this.scene.player;
        if (!this.active || !player || !player.active) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (dist < player.magnetRadius) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            const pullSpeed = 350 + (1 - dist / player.magnetRadius) * 250;
            this.setVelocity(Math.cos(angle) * pullSpeed, Math.sin(angle) * pullSpeed);
        } else {
            this.setVelocity(0, 0);
        }
    }
}
