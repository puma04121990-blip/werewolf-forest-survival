import { soundManager } from './SoundManager.js';
import { Rocket } from '../entities/Rocket.js';
import { Mine } from '../entities/Mine.js';
import { EVOLUTIONS } from './Evolutions.js';

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

        /** @type {Set<string>} */
        this.evolutions = new Set();
        /** weaponKey → evolutionId that consumed it */
        this.consumedBy = {};
        this._moonChainAcc = 0;
    }

    hasEvolution(id) {
        return this.evolutions.has(id);
    }

    isWeaponConsumed(key) {
        return !!this.consumedBy[key];
    }

    getEvolutionOwningWeapon(key) {
        return this.consumedBy[key] || null;
    }

    /**
     * Apply evolution: mark weapons consumed, enable evolved combat.
     * @param {string} evoId
     */
    applyEvolution(evoId) {
        const evo = EVOLUTIONS[evoId];
        if (!evo || this.evolutions.has(evoId)) return false;

        this.evolutions.add(evoId);
        (evo.consumesWeapons || []).forEach(key => {
            this.consumedBy[key] = evoId;
            if (this.weapons[key]) {
                this.weapons[key].level = Math.max(this.weapons[key].level, 5);
                this.weapons[key].evolved = true;
            }
        });

        // Moon storm: lightning fully absorbed into orbital form
        if (evoId === 'moon_storm' && this.weapons.lightning) {
            this.weapons.lightning.level = 0;
            this.weapons.lightning.merged = true;
        }

        if (this.scene.hud?.showToast) {
            this.scene.hud.showToast(`✨ ${evo.name}!`, evo.color || '#ffe600');
        }
        soundManager.playLevelUp && soundManager.playLevelUp();
        return true;
    }

    getEvolutionDisplayName(weaponKey) {
        const evoId = this.consumedBy[weaponKey];
        if (!evoId) return null;
        return EVOLUTIONS[evoId]?.name || null;
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

        // —— Эволюция: Кровавая буря ——
        if (this.hasEvolution('blood_storm')) {
            this.updateBloodStorm(time, enemies);
            return;
        }

        const effectiveCooldown = (w.cooldown - (w.level - 1) * 30) / this.player.fireRateMultiplier;
        if (time - w.lastFired > effectiveCooldown) {
            const target = this.getClosestEnemy(enemies);
            if (target) {
                w.lastFired = time;
                const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
                const dmg = w.damage + (w.level - 1) * 6;

                if (w.level >= 3) {
                    this.scene.firePlayerBullet(this.player.x - 8, this.player.y, baseAngle, 650, dmg, 'blaster');
                    this.scene.firePlayerBullet(this.player.x + 8, this.player.y, baseAngle, 650, dmg, 'blaster');
                    if (w.level >= 5) {
                        this.scene.firePlayerBullet(this.player.x, this.player.y, baseAngle + 0.1, 700, dmg * 1.2, 'blaster');
                    }
                } else {
                    this.scene.firePlayerBullet(this.player.x, this.player.y, baseAngle, 650, dmg, 'blaster');
                }
                soundManager.playLaser();
            }
        }
    }

    /** 360° claw storm — evolved blaster + bloodlust */
    updateBloodStorm(time, enemies) {
        const w = this.weapons.blaster;
        const cd = 180 / this.player.fireRateMultiplier;
        if (time - w.lastFired <= cd) return;

        const hasEnemy = enemies.getChildren().some(e => e.active);
        if (!hasEnemy) return;

        w.lastFired = time;
        const blades = 10;
        const dmg = 28; // strong AoE hit
        const spin = time * 0.004;
        for (let i = 0; i < blades; i++) {
            const angle = spin + (i * Math.PI * 2) / blades;
            this.scene.firePlayerBullet(
                this.player.x,
                this.player.y,
                angle,
                520,
                dmg,
                'blaster'
            );
        }
        // Inner pulse slash VFX
        const ring = this.scene.add.circle(this.player.x, this.player.y, 16, 0xff2244, 0.35).setDepth(8);
        this.scene.tweens.add({
            targets: ring,
            radius: 70,
            alpha: 0,
            duration: 220,
            onComplete: () => ring.destroy()
        });
        soundManager.playLaser();
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
                    this.scene.firePlayerBullet(this.player.x, this.player.y, angle, 550, dmg, 'spread');
                }
                soundManager.playLaser();
            }
        }
    }

    updateOrbital(time, delta, enemies) {
        const w = this.weapons.orbital;
        if (w.level <= 0) return;

        const moonStorm = this.hasEvolution('moon_storm');
        const orbCount = moonStorm ? 12 : 2 + (w.level - 1) * 2;
        if (w.orbs.length !== orbCount) {
            this.rebuildOrbitalOrbs(orbCount);
        }

        if (!w.graphics) {
            w.graphics = this.scene.add.graphics().setDepth(5);
        }

        w.graphics.clear();

        const speed = w.speed * (1 + (w.level - 1) * 0.35) * (moonStorm ? 1.45 : 1);
        const baseAngle = time * speed * 0.0022;
        const pulse = 1.0 + Math.sin(time * 0.012) * 0.18;
        const radius = w.radius + (w.level - 1) * 12 + (moonStorm ? 28 : 0);
        const dmg = (w.damage + (w.level - 1) * 8) * (moonStorm ? 0.055 : 0.04);

        const ringColor = moonStorm ? 0xaa88ff : 0x00ffcc;
        w.graphics.lineStyle(1.5, ringColor, 0.25 + Math.sin(time * 0.005) * 0.1);
        w.graphics.strokeCircle(this.player.x, this.player.y, radius);

        if (w.level >= 3 || moonStorm) {
            w.graphics.lineStyle(1.5, moonStorm ? 0xddaaff : 0x88ffff, 0.35);
            for (let i = 0; i < orbCount; i++) {
                const nextIdx = (i + 1) % orbCount;
                const a1 = baseAngle + (i * Math.PI * 2) / orbCount;
                const a2 = baseAngle + (nextIdx * Math.PI * 2) / orbCount;
                w.graphics.lineBetween(
                    this.player.x + Math.cos(a1) * radius,
                    this.player.y + Math.sin(a1) * radius,
                    this.player.x + Math.cos(a2) * radius,
                    this.player.y + Math.sin(a2) * radius
                );
            }
        }

        // Moon storm: periodic chain lightning from orbs
        if (moonStorm) {
            this._moonChainAcc += delta;
            if (this._moonChainAcc >= 700 / this.player.fireRateMultiplier) {
                this._moonChainAcc = 0;
                const target = this.getClosestEnemy(enemies);
                if (target) {
                    this.castChainLightning(target, enemies, 6, 38, 'lightning');
                }
            }
        }

        w.orbs.forEach((orb, i) => {
            const angle = baseAngle + (i * Math.PI * 2) / orbCount;
            const targetX = this.player.x + Math.cos(angle) * radius;
            const targetY = this.player.y + Math.sin(angle) * radius;

            orb.x = targetX;
            orb.y = targetY;
            orb.setScale(pulse);
            orb.rotation = angle + time * (0.009 + (w.level - 1) * 0.004);

            if (Math.random() < (moonStorm ? 0.7 : 0.55)) {
                const trail = this.scene.add.circle(
                    targetX, targetY,
                    5 + Math.random() * 4,
                    moonStorm ? 0xcc88ff : 0x00ffcc,
                    0.55
                );
                trail.setDepth(4);
                this.scene.tweens.add({
                    targets: trail,
                    alpha: 0,
                    scale: 0.15,
                    duration: 280 + Math.random() * 120,
                    onComplete: () => trail.destroy()
                });
            }

            const coreSize = (moonStorm ? 11 : 9) * pulse;
            w.graphics.fillStyle(0xffffff, 0.95);
            w.graphics.fillCircle(targetX, targetY, coreSize * 0.45);
            w.graphics.fillStyle(moonStorm ? 0xbb66ff : 0x00ffcc, 0.85);
            w.graphics.fillCircle(targetX, targetY, coreSize);
            w.graphics.lineStyle(2.5, moonStorm ? 0xeeccff : 0x88ffff, 0.9);
            w.graphics.strokeCircle(targetX, targetY, coreSize + 4);
            w.graphics.lineStyle(1, moonStorm ? 0xffaaff : 0x00ffff, 0.35);
            w.graphics.strokeCircle(targetX, targetY, coreSize + 9);

            const hitR = moonStorm ? 38 : 32;
            enemies.getChildren().forEach(enemy => {
                if (enemy.active && Phaser.Math.Distance.Between(targetX, targetY, enemy.x, enemy.y) < hitR) {
                    if (this.scene.dealDamageToEnemy) {
                        this.scene.dealDamageToEnemy(enemy, dmg, { silent: false, source: 'orbital' });
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
                        this.scene.dealDamageToEnemy(enemy, dmg, { source: 'shield' });
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
        // Absorbed into moon storm
        if (this.hasEvolution('moon_storm') || w.merged) return;
        if (w.level <= 0) return;

        const cooldown = (w.cooldown - (w.level - 1) * 100) / this.player.fireRateMultiplier;
        if (time - w.lastFired > cooldown) {
            const target = this.getClosestEnemy(enemies);
            if (target) {
                w.lastFired = time;
                const bounces = w.bounces + (w.level - 1) * 2;
                const dmg = w.damage + (w.level - 1) * 12;

                this.castChainLightning(target, enemies, bounces, dmg, 'lightning');
                if (w.level >= 5) {
                    const enemiesList = enemies.getChildren().filter(e => e.active && e !== target);
                    if (enemiesList.length > 0) {
                        this.castChainLightning(enemiesList[0], enemies, bounces, dmg, 'lightning');
                    }
                }
            }
        }
    }

    castChainLightning(firstEnemy, enemies, maxBounces, damage, source = 'lightning') {
        let current = firstEnemy;
        let hitSet = new Set();

        let startX = this.player.x;
        let startY = this.player.y;
        const lineColor = source === 'lightning' && this.hasEvolution('moon_storm') ? 0xddaaff : 0xaaddff;

        for (let i = 0; i < maxBounces; i++) {
            if (!current || !current.active) break;

            hitSet.add(current);
            if (this.scene.dealDamageToEnemy) {
                this.scene.dealDamageToEnemy(current, damage, { source });
            } else {
                current.takeDamage(damage);
            }

            const line = this.scene.add.graphics();
            line.lineStyle(3, lineColor, 1.0);
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
                    rocket.weaponKey = 'rockets';
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
                mine.weaponKey = 'mines';
                mine.arm(this.player.x + offsetX, this.player.y + offsetY, dmg, 50, splash);
            }
        }
    }

    upgradeWeapon(weaponKey) {
        if (this.isWeaponConsumed(weaponKey) && this.weapons[weaponKey]?.evolved) {
            return; // evolved — no further base levels
        }
        if (this.weapons[weaponKey]) {
            if (this.weapons[weaponKey].level < this.weapons[weaponKey].maxLevel) {
                this.weapons[weaponKey].level += 1;
            }
        }
    }

    getWeaponLevel(weaponKey) {
        return this.weapons[weaponKey] ? this.weapons[weaponKey].level : 0;
    }

    /** List active evolutions for pause / HUD */
    getActiveEvolutions() {
        return [...this.evolutions].map(id => EVOLUTIONS[id]).filter(Boolean);
    }
}
