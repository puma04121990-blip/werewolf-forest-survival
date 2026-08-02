import { Enemy } from '../entities/Enemy.js';

export class Spawner {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        this.spawnTimer = 500;
        this.spawnInterval = 1800; // ms (smoother initial pacing)
        this.difficultyTimer = 0;
        this.difficultyLevel = 1;
        this.maxActiveEnemies = 30; // Cap to keep game balanced & clean

        this.bossSpawnedTime = [];
    }

    update(time, delta, enemyGroup) {
        if (!this.player || !this.player.active) return;

        this.spawnTimer += delta;
        this.difficultyTimer += delta;

        // Increase difficulty every 30 seconds
        if (this.difficultyTimer > 30000) {
            this.difficultyTimer = 0;
            this.difficultyLevel += 1;
            this.spawnInterval = Math.max(800, this.spawnInterval - 100);
            this.maxActiveEnemies = Math.min(60, this.maxActiveEnemies + 5);
        }

        // Spawn normal enemies if under active cap
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            if (enemyGroup.countActive() < this.maxActiveEnemies) {
                this.spawnEnemyWave(enemyGroup);
            }
        }

        // Boss spawn every 3 minutes (180,000 ms)
        const totalSecs = Math.floor(time / 1000);
        if (totalSecs > 0 && totalSecs % 180 === 0 && !this.bossSpawnedTime.includes(totalSecs)) {
            this.bossSpawnedTime.push(totalSecs);
            this.spawnBoss(enemyGroup);
        }
    }

    spawnEnemyWave(enemyGroup) {
        const count = Math.min(5, 1 + Math.floor(this.difficultyLevel * 0.6));
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomSpawnPosition();
            const type = this.getRandomEnemyType();
            const enemy = new Enemy(this.scene, pos.x, pos.y, type);
            enemyGroup.add(enemy);
        }
    }

    spawnBoss(enemyGroup) {
        const pos = this.getRandomSpawnPosition();
        const boss = new Enemy(this.scene, pos.x, pos.y, 'boss');
        enemyGroup.add(boss);
        this.scene.events.emit('bossSpawned', boss);
    }

    getRandomEnemyType() {
        const rand = Math.random();
        if (this.difficultyLevel >= 4 && rand < 0.2) return 'shooter';
        if (this.difficultyLevel >= 3 && rand < 0.35) return 'tank';
        if (rand < 0.65) return 'chaser';
        return 'scout';
    }

    getRandomSpawnPosition() {
        const padding = 60;
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        let x, y;
        const side = Math.floor(Math.random() * 4);

        switch (side) {
            case 0: // Top
                x = Math.random() * width;
                y = -padding;
                break;
            case 1: // Right
                x = width + padding;
                y = Math.random() * height;
                break;
            case 2: // Bottom
                x = Math.random() * width;
                y = height + padding;
                break;
            case 3: // Left
            default:
                x = -padding;
                y = Math.random() * height;
                break;
        }

        return { x, y };
    }
}
