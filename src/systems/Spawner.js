import { Enemy } from '../entities/Enemy.js';
import { BALANCE } from '../config.js';

export class Spawner {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        this.spawnTimer = 400;
        this.spawnInterval = BALANCE.spawnIntervalStart;
        this.difficultyTimer = 0;
        this.difficultyLevel = 1;
        this.maxActiveEnemies = BALANCE.maxEnemiesStart;
        this.bossesSpawned = 0;
        this.nextBossAt = BALANCE.bossIntervalSec;
    }

    update(gameTimeMs, delta, enemyGroup) {
        if (!this.player || !this.player.active) return;

        this.spawnTimer += delta;
        this.difficultyTimer += delta;

        if (this.difficultyTimer > BALANCE.difficultyStepMs) {
            this.difficultyTimer = 0;
            this.difficultyLevel += 1;
            this.spawnInterval = Math.max(
                BALANCE.spawnIntervalMin,
                this.spawnInterval - 110
            );
            this.maxActiveEnemies = Math.min(
                BALANCE.maxEnemiesCap,
                this.maxActiveEnemies + 4
            );
            this.scene.events.emit('difficultyUp', this.difficultyLevel);
        }

        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            if (enemyGroup.countActive() < this.maxActiveEnemies) {
                this.spawnEnemyWave(enemyGroup);
            }
        }

        const totalSecs = Math.floor(gameTimeMs / 1000);
        if (totalSecs >= this.nextBossAt) {
            this.nextBossAt += BALANCE.bossIntervalSec;
            this.bossesSpawned += 1;
            this.spawnBoss(enemyGroup);
        }
    }

    spawnEnemyWave(enemyGroup) {
        const count = Math.min(6, 1 + Math.floor(this.difficultyLevel * 0.55));
        for (let i = 0; i < count; i++) {
            if (enemyGroup.countActive() >= this.maxActiveEnemies) break;
            const pos = this.getRandomSpawnPosition();
            const type = this.getRandomEnemyType();
            const enemy = new Enemy(this.scene, pos.x, pos.y, type, this.difficultyLevel);
            enemyGroup.add(enemy);
        }
    }

    spawnBoss(enemyGroup) {
        const pos = this.getRandomSpawnPosition();
        // Boss difficulty tracks how many bosses already spawned
        const bossDiff = this.difficultyLevel + this.bossesSpawned * 2;
        const boss = new Enemy(this.scene, pos.x, pos.y, 'boss', bossDiff);
        enemyGroup.add(boss);
        this.scene.events.emit('bossSpawned', boss);
    }

    getRandomEnemyType() {
        const d = this.difficultyLevel;
        const rand = Math.random();

        if (d >= 6 && rand < 0.12) return 'elite';
        if (d >= 4 && rand < 0.22) return 'shooter';
        if (d >= 3 && rand < 0.38) return 'tank';
        if (rand < 0.55) return 'chaser';
        return 'scout';
    }

    getRandomSpawnPosition() {
        const padding = 70;
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        let x, y;
        const side = Math.floor(Math.random() * 4);

        switch (side) {
            case 0:
                x = Math.random() * width;
                y = -padding;
                break;
            case 1:
                x = width + padding;
                y = Math.random() * height;
                break;
            case 2:
                x = Math.random() * width;
                y = height + padding;
                break;
            case 3:
            default:
                x = -padding;
                y = Math.random() * height;
                break;
        }

        return { x, y };
    }
}
