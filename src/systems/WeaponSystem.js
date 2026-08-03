import { soundManager } from './SoundManager.js';
import { Rocket } from '../entities/Rocket.js';
import { Mine } from '../entities/Mine.js';

export class WeaponSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Weapons Config with 5 Levels each
        this.weapons = {
            blaster: { level: 1, maxLevel: 5, lastFired: 0, cooldown: 250, damage: 22, count: 1 },
            spread: { level: 0, maxLevel: 5, lastFired: 0, cooldown: 650, damage: 16, count: 3 },
            orbital: { level: 0, maxLevel: 5, orbs: [], graphics: null, speed: 0.12, radius: 110, damage: 25 },
            shield: { level: 0, maxLevel: 5, auraGraphics: null, radius: 90, damage: 15, lastTick: 0 },
            lightning: { level: 0, maxLevel: 5, lastFired: 0, cooldown: 1000, damage: 45, bounces: 3 },
            rockets: { level: 0, maxLevel: 5, lastFired: 0, cooldown: 1400, damage: 40, count: 1 },
            mines: { level: 0, maxLevel: 5, lastFired: 0, cooldown: 1800, damage: 55, count: 1 }
        };
    }

    update(time, delta, enemies) {
        if (!this.player || !this.player.active) return;

        this.updateBlaster(time, enemies);
        this.updateSpread(time, enemies);
        this.updateOrbital(time, delta, enemies);
        this.updateShield(time, enemies);
        this.updateLightning(time, enemies);
        this.updateRockets(time, enemies);
        this.updateMines(time);
    }

    getClosestEnemy(enemies) {
        let closest = null;
        let minDistance = Infinity;

        enemies.getChildren().forEach(enemy => {
            if (enemy.active) {
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    closest = enemy;
                }
            }
        });

        return closest;
    }

    updateBlaster(time, enemies) {
        const w = this.weapons.blaster;
        if (w.level <= 0) return;

        const effectiveCooldown = (w.cooldown - (w.level - 1) * 30) / this.player.fireRateMultiplier;
        if (time - w.lastFired > effectiveCooldown) {
            const target = this.getClosestEnemy(enemies);
            if (target) {
                w.lastFired = time;
                const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
                // Pure base damage — crit/multiplier applied on hit
                const dmg = w.damage + (w.level - 1) * 6;

                if (w.level >= 3) {
                    this.scene.firePlayerBullet(this.player.x - 8, this.player.y, baseAngle, 650, dmg);
                    this.scene.firePlayerBullet(this.player.x + 8, this.player.y, baseAngle, 650, dmg);
                    if (w.level >= 5) {
                        this.scene.firePlayerBullet(this.player.x, this.player.y, baseAngle + 0.1, 700, dmg * 1.2);
                    }
                } else {
                    this.scene.firePlayerBullet(this.player.x, this.player.y, baseAngle, 650, dmg);
                }
                soundManager.playLaser();
            }
        }
    }

    updateSpread(time, enemies) {
        const w = this.weapons.spread;
        if (w.level <= 0) return;

        const effectiveCooldown = (w.cooldown - (w.level - 1) * 40) / this.player.fireRateMultiplier;
        if (time - w.lastFired > effectiveCooldown) {
            const target = this.getClosestEnemy(enemies);
            if (target) {
                w.lastFired = time;
                const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);

                let projectileCount = 3;
                if (w.level >= 3) projectileCount = 5;
                if (w.level >= 5) projectileCount = 8;

                const spreadAngle = w.level >= 5 ? (Math.PI * 2) / projectileCount : 0.22;
                const dmg = w.damage + (w.level - 1) * 5;

                for (let i = 0; i < projectileCount; i++) {
                    const angle = w.level >= 5 ? i * spreadAngle : baseAngle + (i - (projectileCount - 1) / 2) * spreadAngle;
                    this.scene.firePlayerBullet(this.player.x, this.player.y, angle, 550, dmg);
                }
                soundManager.playLaser();
            }
        }
    }

    updateOrbital(time, delta, enemies) {
        const w = this.weapons.orbital;
        if (w.level <= 0) return;

        const orbCount = 2 + (w.level - 1) * 2;
        if (w.orbs.length !== orbCount) {
            this.rebuildOrbitalOrbs(orbCount);
        }

        if (!w.graphics) {
            w.graphics = this.scene.add.graphics().setDepth(5);
        }

        w.graphics.clear();

        // Скорость вращения растёт с каждым уровнем (+35% за уровень)
        const speed = w.speed * (1 + (w.level - 1) * 0.35);
        const baseAngle = time * speed * 0.0022;
        const pulse = 1.0 + Math.sin(time * 0.012) * 0.18;
        const radius = w.radius + (w.level - 1) * 12;
        // Per-frame tick (~60fps): ~0.04 of hit ≈ original feel, scaled by pipeline
        const dmg = (w.damage + (w.level - 1) * 8) * 0.04;

        // Мягкое вращающееся кольцо-орбита
        w.graphics.lineStyle(1.5, 0x00ffcc, 0.25 + Math.sin(time * 0.005) * 0.1);
        w.graphics.strokeCircle(this.player.x, this.player.y, radius);

        // Соединяющие линии между духами (с 3 уровня)
        if (w.level >= 3) {
            w.graphics.lineStyle(1.5, 0x88ffff, 0.35);
            for (let i = 0; i < orbCount; i++) {
                const nextIdx = (i + 1) % orbCount;
                const a1 = baseAngle + (i * Math.PI * 2) / orbCount;
                const a2 = baseAngle + (nextIdx * Math.PI * 2) / orbCount;
                const x1 = this.player.x + Math.cos(a1) * radius;
                const y1 = this.player.y + Math.sin(a1) * radius;
                const x2 = this.player.x + Math.cos(a2) * radius;
                const y2 = this.player.y + Math.sin(a2) * radius;
                w.graphics.lineBetween(x1, y1, x2, y2);
            }
        }

        w.orbs.forEach((orb, i) => {
            const angle = baseAngle + (i * Math.PI * 2) / orbCount;
            const targetX = this.player.x + Math.cos(angle) * radius;
            const targetY = this.player.y + Math.sin(angle) * radius;

            // Плавное следование + собственное вращение духа
            orb.x = targetX;
            orb.y = targetY;
            orb.setScale(pulse);
            orb.rotation = angle + time * (0.009 + (w.level - 1) * 0.004); // ускоряется с уровнем

            // Длинный светящийся шлейф по орбите
            if (Math.random() < 0.55) {
                const trail = this.scene.add.circle(targetX, targetY, 5 + Math.random() * 4, 0x00ffcc, 0.55);
                trail.setDepth(4);
                this.scene.tweens.add({
                    targets: trail,
                    alpha: 0,
                    scale: 0.15,
                    duration: 280 + Math.random() * 120,
                    onComplete: () => trail.destroy()
                });
            }

            // Основной дух (яркое ядро + свечение)
            const coreSize = 9 * pulse;
            w.graphics.fillStyle(0xffffff, 0.95);
            w.graphics.fillCircle(targetX, targetY, coreSize * 0.45);

            w.graphics.fillStyle(0x00ffcc, 0.85);
            w.graphics.fillCircle(targetX, targetY, coreSize);

            w.graphics.lineStyle(2.5, 0x88ffff, 0.9);
            w.graphics.strokeCircle(targetX, targetY, coreSize + 4);

            // Внешнее мягкое свечение
            w.graphics.lineStyle(1, 0x00ffff, 0.35);
            w.graphics.strokeCircle(targetX, targetY, coreSize + 9);

            enemies.getChildren().forEach(enemy => {
                if (enemy.active && Phaser.Math.Distance.Between(targetX, targetY, enemy.x, enemy.y) < 32) {
                    if (this.scene.dealDamageToEnemy) {
                        this.scene.dealDamageToEnemy(enemy, dmg, { silent: false });
                    } else {
                        enemy.takeDamage(dmg);
                    }
                }
            });
        });
    }

    rebuildOrbitalOrbs(count) {
        const w = this.weapons.orbital;
        w.orbs.forEach(o => o.destroy());
        w.orbs = [];

        for (let i = 0; i < count; i++) {
            // Используем невидимый спрайт-якорь + рисуем всё через graphics
            const orb = this.scene.add.circle(this.player.x, this.player.y, 8, 0x00ffff, 0);
            orb.setVisible(false);
            orb.setDepth(6);
            this.scene.physics.add.existing(orb);
            w.orbs.push(orb);
        }
    }

    updateShield(time, enemies) {
        const w = this.weapons.shield;
        if (w.level <= 0) return;

        if (!w.auraGraphics) {
            w.auraGraphics = this.scene.add.graphics();
        }

        const radius = w.radius + (w.level - 1) * 15;
        const dmg = w.damage + (w.level - 1) * 6;

        w.auraGraphics.clear();
        w.auraGraphics.lineStyle(3, 0xff2244, 0.65);
        w.auraGraphics.fillStyle(0xff0033, 0.10);
        w.auraGraphics.strokeCircle(this.player.x, this.player.y, radius);
        w.auraGraphics.fillCircle(this.player.x, this.player.y, radius);

        const tickInterval = Math.max(160, 320 - (w.level - 1) * 40);
        if (time - w.lastTick > tickInterval) {
            w.lastTick = time;
            enemies.getChildren().forEach(enemy => {
                if (enemy.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) < radius) {
                    if (this.scene.dealDamageToEnemy) {
                        this.scene.dealDamageToEnemy(enemy, dmg);
                    } else {
                        enemy.takeDamage(dmg);
                    }

                    if (w.level >= 3) {
                        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                        enemy.x += Math.cos(angle) * (18 + w.level * 2);
                        enemy.y += Math.sin(angle) * (18 + w.level * 2);
                    }
                }
            });
        }
    }

    updateLightning(time, enemies) {
        const w = this.weapons.lightning;
        if (w.level <= 0) return;

        const cooldown = (w.cooldown - (w.level - 1) * 100) / this.player.fireRateMultiplier;
        if (time - w.lastFired > cooldown) {
            const target = this.getClosestEnemy(enemies);
            if (target) {
                w.lastFired = time;
                const bounces = w.bounces + (w.level - 1) * 2;
                const dmg = w.damage + (w.level - 1) * 12;

                this.castChainLightning(target, enemies, bounces, dmg);
                if (w.level >= 5) {
                    const enemiesList = enemies.getChildren().filter(e => e.active && e !== target);
                    if (enemiesList.length > 0) {
                        this.castChainLightning(enemiesList[0], enemies, bounces, dmg);
                    }
                }
            }
        }
    }

    castChainLightning(firstEnemy, enemies, maxBounces, damage) {
        let current = firstEnemy;
        let hitSet = new Set();

        let startX = this.player.x;
        let startY = this.player.y;

        for (let i = 0; i < maxBounces; i++) {
            if (!current || !current.active) break;

            hitSet.add(current);
            if (this.scene.dealDamageToEnemy) {
                this.scene.dealDamageToEnemy(current, damage);
            } else {
                current.takeDamage(damage);
            }

            const line = this.scene.add.graphics();
            line.lineStyle(3, 0xaaddff, 1.0);
            line.lineBetween(startX, startY, current.x, current.y);
            this.scene.tweens.add({
                targets: line,
                alpha: 0,
                duration: 220,
                onComplete: () => line.destroy()
            });

            startX = current.x;
            startY = current.y;

            let nextEnemy = null;
            let minDist = Infinity;
            enemies.getChildren().forEach(enemy => {
                if (enemy.active && !hitSet.has(enemy)) {
                    const dist = Phaser.Math.Distance.Between(current.x, current.y, enemy.x, enemy.y);
                    if (dist < 300 && dist < minDist) {
                        minDist = dist;
                        nextEnemy = enemy;
                    }
                }
            });

            current = nextEnemy;
        }
    }

    updateRockets(time, enemies) {
        const w = this.weapons.rockets;
        if (w.level <= 0) return;

        const cooldown = (w.cooldown - (w.level - 1) * 120) / this.player.fireRateMultiplier;
        if (time - w.lastFired > cooldown) {
            const target = this.getClosestEnemy(enemies);
            if (target) {
                w.lastFired = time;
                const count = w.level >= 5 ? 5 : (w.level >= 3 ? 3 : (w.level >= 2 ? 2 : 1));
                const dmg = w.damage + (w.level - 1) * 10;
                const splash = 80 + (w.level - 1) * 15;

                for (let i = 0; i < count; i++) {
                    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y) + (i - (count - 1) / 2) * 0.3;
                    const rocket = new Rocket(this.scene, this.player.x, this.player.y);
                    if (this.scene.rockets) this.scene.rockets.add(rocket);
                    rocket.launch(this.player.x, this.player.y, angle, dmg, splash);
                }
                soundManager.playLaser();
            }
        }
    }

    updateMines(time) {
        const w = this.weapons.mines;
        if (w.level <= 0) return;

        const cooldown = (w.cooldown - (w.level - 1) * 150) / this.player.fireRateMultiplier;
        if (time - w.lastFired > cooldown) {
            w.lastFired = time;
            const count = w.level >= 5 ? 4 : (w.level >= 3 ? 2 : 1);
            const dmg = (w.damage + (w.level - 1) * 15);
            const splash = 90 + (w.level - 1) * 15;

            for (let i = 0; i < count; i++) {
                const offsetX = (Math.random() - 0.5) * 80;
                const offsetY = (Math.random() - 0.5) * 80;
                const mine = new Mine(this.scene, this.player.x + offsetX, this.player.y + offsetY);
                if (this.scene.mines) this.scene.mines.add(mine);
                mine.arm(this.player.x + offsetX, this.player.y + offsetY, dmg, 50, splash);
            }
        }
    }

    upgradeWeapon(weaponKey) {
        if (this.weapons[weaponKey]) {
            if (this.weapons[weaponKey].level < this.weapons[weaponKey].maxLevel) {
                this.weapons[weaponKey].level += 1;
            }
        }
    }

    getWeaponLevel(weaponKey) {
        return this.weapons[weaponKey] ? this.weapons[weaponKey].level : 0;
    }
}
