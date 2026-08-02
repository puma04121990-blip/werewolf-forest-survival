export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Nothing heavy here
    }

    create() {
        this.scene.start('PreloadScene');
    }
}
