export default class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72);

        this.add.text(width / 2, height / 2 - 70, 'ПАУЗА', {
            fontSize: '48px',
            fill: '#00ffcc',
            fontStyle: 'bold',
            stroke: '#003322',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 - 20, 'Лес замер. Враги ждут.', {
            fontSize: '15px',
            fill: '#88aa99'
        }).setOrigin(0.5);

        const resumeBtn = this.add.rectangle(width / 2, height / 2 + 40, 240, 52, 0x00ffcc, 0.2);
        resumeBtn.setStrokeStyle(2, 0x00ffcc);
        resumeBtn.setInteractive({ useHandCursor: true });

        this.add.text(width / 2, height / 2 + 40, 'ПРОДОЛЖИТЬ', {
            fontSize: '20px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const resume = () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        };

        resumeBtn.on('pointerover', () => resumeBtn.setFillStyle(0x00ffcc, 0.45));
        resumeBtn.on('pointerout', () => resumeBtn.setFillStyle(0x00ffcc, 0.2));
        resumeBtn.on('pointerdown', resume);

        this.input.keyboard.on('keydown-P', resume);
        this.input.keyboard.on('keydown-ESC', resume);
        this.input.keyboard.on('keydown-SPACE', resume);
    }
}
