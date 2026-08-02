export default class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

        this.add.text(width / 2, height / 2 - 50, 'ПАУЗА', {
            fontSize: '48px',
            fill: '#00ffcc',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const resumeBtn = this.add.rectangle(width / 2, height / 2 + 30, 220, 50, 0x00ffcc, 0.2);
        resumeBtn.setStrokeStyle(2, 0x00ffcc);
        resumeBtn.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(width / 2, height / 2 + 30, 'ПРОДОЛЖИТЬ', {
            fontSize: '20px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        resumeBtn.on('pointerdown', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });

        this.input.keyboard.on('keydown-P', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }
}
