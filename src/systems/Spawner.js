import { Enemy } from '../entities/Enemy.js';
import { BALANCE } from '../config.js';
import { sceneRandom } from './RunSettings.js';

/** Ordered first appearances, then cycles */
export const BOSS_ROSTER = ['boss', 'boss_witch', 'boss_beast'];

export class Spawner {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        const diff = scene.runConfig?.difficulty;
        const spawnMul = diff?.spawnIntervalMul ?? 1;
        const maxMul = diff?.maxEnemiesMul ?? 1;

        this.spawnTimer = 400;
        this.spawnInterval = BALANCE.spawnIntervalStart * spawnMul;
        this.spawnIntervalMin = BALANCE.spawnIntervalMin * spawnMul;
        this.difficultyTimer = 0;
        this.difficultyLevel = 1;
        this.maxActiveEnemies = Math.round(BALANCE.maxEnemiesStart * maxMul);
        this.maxActiveEnemiesCap = Math.round(BALANCE.maxEnemiesCap * maxMul);
        this.bossesSpawned = 0;
        this.nextBossAt = BALANCE.bossIntervalSec;
    }

    rng() {
        return sceneRandom(this.scene);
    }

    update(gameTimeMs, delta, enemyGroup) {
        if (!this.player || !this.player.active) return;

        // delta may already be slowed by relic slow-time (from GameScene)
        this.spawnTimer += delta;
        this.difficultyTimer += delta;

        if (this.difficultyTimer > BALANCE.difficultyStepMs) {
            this.difficultyTimer = 0;
            this.difficultyLevel += 1;
            this.spawnInterval = Math.max(
                this.spawnIntervalMin,
                this.spawnInterval - 110
            );
            this.maxActiveEnemies = Math.min(
                this.maxActiveEnemiesCap,
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

    pickBossType() {
        // 1st Inquisitor, 2nd Witch, 3rd Beast, then cycle
        const idx = Math.max(0, this.bossesSpawned - 1) % BOSS_ROSTER.length;
        return BOSS_ROSTER[idx];
    }

    spawnBoss(enemyGroup) {
        const pos = this.getRandomSpawnPosition();
        const bossDiff = this.difficultyLevel + this.bossesSpawned * 2;
        const bossType = this.pickBossType();
        const boss = new Enemy(this.scene, pos.x, pos.y, bossType, bossDiff);
        enemyGroup.add(boss);
        this.scene.events.emit('bossSpawned', boss);
    }

    getRandomEnemyType() {
        const d = this.difficultyLevel;
        const rand = this.rng();

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
        const r = () => this.rng();

        let x, y;
        const side = Math.floor(r() * 4);

        switch (side) {
            case 0:
                x = r() * width;
                y = -padding;
                break;
            case 1:
                x = width + padding;
                y = r() * height;
                break;
            case 2:
                x = r() * width;
                y = height + padding;
                break;
            case 3:
            default:
                x = -padding;
                y = r() * height;
                break;
        }

        return { x, y };
    }
}
