import { BALANCE } from '../config.js';
import { soundManager } from './SoundManager.js';

/** Arena power-up relic definitions */
export const RELICS = {
    shield: {
        id: 'shield',
        name: 'Лунный щит',
        icon: '🛡️',
        color: 0x66ccff,
        tint: 0x66ccff,
        duration: 8000,
        toast: '🛡️ ЩИТ 8 с',
        toastColor: '#88ddff'
    },
    xp2: {
        id: 'xp2',
        name: 'Двойная эссенция',
        icon: '✨',
        color: 0xffe600,
        tint: 0xffee55,
        duration: 12000,
        toast: '✨ ×2 XP 12 с',
        toastColor: '#ffe600'
    },
    slow: {
        id: 'slow',
        name: 'Застывший лес',
        icon: '⏳',
        color: 0xaa88ff,
        tint: 0xbb99ff,
        duration: 7000,
        toast: '⏳ SLOW-TIME 7 с',
        toastColor: '#cc99ff'
    },
    clear: {
        id: 'clear',
        name: 'Рёв очищения',
        icon: '💥',
        color: 0xff5533,
        tint: 0xff6644,
        duration: 0, // instant
        toast: '💥 ВОЛНА ОЧИЩЕНА',
        toastColor: '#ff8866'
    }
};

const RELIC_IDS = Object.keys(RELICS);

/**
 * Spawns arena relics and tracks timed buffs (shield, ×2 XP, slow-mo, clear wave).
 */
export class RelicSystem {
    constructor(scene) {
        this.scene = scene;
        this.spawnTimer = 8000 + Math.random() * 4000;
        this.group = scene.physics.add.group();
        this.buffs = {
            shieldUntil: 0,
            xp2Until: 0,
            slowUntil: 0
        };
        this.shieldGfx = null;
        this._lastBuffKey = '';

        scene.physics.add.overlap(
            scene.player,
            this.group,
            (player, relic) => this.collect(relic),
            null,
            this
        );
    }

    update(time, delta) {
        // Spawn timer (paused during level-up via GameScene not calling us)
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = BALANCE.relicSpawnIntervalMin +
                Math.random() * (BALANCE.relicSpawnIntervalMax - BALANCE.relicSpawnIntervalMin);
            this.trySpawn();
        }

        // Lifetime of ground relics
        this.group.getChildren().forEach(r => {
            if (!r.active) return;
            r.life -= delta;
            // pulse
            r.setScale(1 + Math.sin(time * 0.008 + (r._ph || 0)) * 0.08);
            if (r.life < 2500) {
                r.setAlpha(0.4 + 0.6 * Math.abs(Math.sin(time * 0.02)));
            }
            if (r.life <= 0) {
                this.destroyRelic(r);
            }
        });

        // Shield bubble follow player
        this.updateShieldVisual();
    }

    trySpawn() {
        if (this.group.countActive() >= (BALANCE.relicMaxActive || 2)) return;
        if (Math.random() > (BALANCE.relicSpawnChance || 0.85)) return;

        const id = RELIC_IDS[Math.floor(Math.random() * RELIC_IDS.length)];
        this.spawnRelic(id);
    }

    /** Chance drop on elite/boss kill */
    maybeDropOnKill(enemy) {
        if (!enemy) return;
        let chance = 0.04;
        if (enemy.isBoss) chance = 0.55;
        else if (enemy.type === 'elite') chance = 0.18;
        else if (enemy.type === 'tank') chance = 0.08;
        if (Math.random() > chance) return;
        if (this.group.countActive() >= (BALANCE.relicMaxActive || 2) + 1) return;

        // Prefer clear/shield on bosses
        let id;
        if (enemy.isBoss) {
            id = Math.random() < 0.4 ? 'clear' : (Math.random() < 0.5 ? 'shield' : RELIC_IDS[Math.floor(Math.random() * RELIC_IDS.length)]);
        } else {
            id = RELIC_IDS[Math.floor(Math.random() * RELIC_IDS.length)];
        }
        this.spawnRelic(id, enemy.x, enemy.y);
    }

    spawnRelic(id, x = null, y = null) {
        const def = RELICS[id];
        if (!def) return null;

        const w = this.scene.scale.width;
        const h = this.scene.scale.height;
        const px = x != null ? x : Phaser.Math.Clamp(80 + Math.random() * (w - 160), 60, w - 60);
        const py = y != null ? y : Phaser.Math.Clamp(80 + Math.random() * (h - 160), 60, h - 60);

        const tex = this.scene.textures.exists('relic_pickup') ? 'relic_pickup' : 'xp_orb';
        const spr = this.scene.physics.add.sprite(px, py, tex);
        spr.setTint(def.tint);
        spr.setScale(1.35);
        spr.setDepth(12);
        spr.relicId = id;
        spr.life = BALANCE.relicLifetimeMs || 14000;
        spr._ph = Math.random() * 10;

        // Icon label above
        spr.label = this.scene.add.text(px, py - 22, def.icon, {
            fontSize: '20px'
        }).setOrigin(0.5).setDepth(13);

        // Soft glow ring
        spr.ring = this.scene.add.circle(px, py, 18, def.color, 0.2).setDepth(11);
        spr.ring.setStrokeStyle(2, def.color, 0.7);

        this.group.add(spr);

        // Pop-in
        spr.setScale(0.3);
        this.scene.tweens.add({
            targets: [spr, spr.ring],
            scale: 1.35,
            duration: 200,
            ease: 'Back.easeOut'
        });

        return spr;
    }

    destroyRelic(r) {
        if (r.label) r.label.destroy();
        if (r.ring) r.ring.destroy();
        r.destroy();
    }

    collect(relic) {
        if (!relic || !relic.active || relic._collected) return;
        relic._collected = true;
        const id = relic.relicId;
        const def = RELICS[id];
        this.destroyRelic(relic);
        this.applyRelic(id);

        soundManager.playHeal && soundManager.playHeal();
        if (def && this.scene.hud?.showToast) {
            this.scene.hud.showToast(def.toast, def.toastColor);
        }
    }

    applyRelic(id) {
        const now = this.scene.time.now;
        const def = RELICS[id];
        if (!def) return;

        switch (id) {
            case 'shield':
                this.buffs.shieldUntil = Math.max(this.buffs.shieldUntil, now) + def.duration;
                break;
            case 'xp2':
                this.buffs.xp2Until = Math.max(this.buffs.xp2Until, now) + def.duration;
                break;
            case 'slow':
                this.buffs.slowUntil = Math.max(this.buffs.slowUntil, now) + def.duration;
                break;
            case 'clear':
                this.clearWave();
                break;
        }
    }

    clearWave() {
        const scene = this.scene;
        if (!scene.enemies) return;
        let cleared = 0;
        scene.enemies.getChildren().slice().forEach(e => {
            if (!e.active || e.isBoss) return;
            // Soft kill: XP but no health drops spam — still give XP
            const xp = Math.floor((e.xpValue || 10) * 0.6);
            if (scene.spawnXpBurst) scene.spawnXpBurst(e.x, e.y, xp);
            else if (scene.spawnXpOrb) scene.spawnXpOrb(e.x, e.y, xp);
            e.destroyFx && e.destroyFx();
            e.destroy();
            cleared++;
        });
        // Clear enemy bullets
        if (scene.enemyBullets) {
            scene.enemyBullets.getChildren().slice().forEach(b => {
                if (b.active) b.destroy();
            });
        }
        scene.cameras.main.shake(200, 0.018);
        scene.cameras.main.flash(180, 255, 100, 60, false);
        if (cleared > 0 && scene.kills != null) {
            // don't count as full kills for combo chaos — optional small combo
            scene.combo = (scene.combo || 0) + Math.min(5, Math.floor(cleared / 4));
        }
    }

    hasShield() {
        return this.scene.time.now < this.buffs.shieldUntil;
    }

    getXpMultiplier() {
        return this.scene.time.now < this.buffs.xp2Until ? 2 : 1;
    }

    /** Enemy/world slow factor (1 = normal, ~0.4 = slow-mo) */
    getEnemyTimeScale() {
        return this.scene.time.now < this.buffs.slowUntil
            ? (BALANCE.relicSlowFactor || 0.4)
            : 1;
    }

    getActiveBuffs() {
        const now = this.scene.time.now;
        const list = [];
        if (now < this.buffs.shieldUntil) {
            list.push({
                id: 'shield',
                icon: '🛡️',
                remain: this.buffs.shieldUntil - now,
                color: '#88ddff'
            });
        }
        if (now < this.buffs.xp2Until) {
            list.push({
                id: 'xp2',
                icon: '✨',
                remain: this.buffs.xp2Until - now,
                color: '#ffe600'
            });
        }
        if (now < this.buffs.slowUntil) {
            list.push({
                id: 'slow',
                icon: '⏳',
                remain: this.buffs.slowUntil - now,
                color: '#cc99ff'
            });
        }
        return list;
    }

    updateShieldVisual() {
        const player = this.scene.player;
        const active = this.hasShield() && player && player.active;

        if (active) {
            if (!this.shieldGfx) {
                this.shieldGfx = this.scene.add.graphics().setDepth(14);
            }
            this.shieldGfx.clear();
            const pulse = 1 + Math.sin(this.scene.time.now * 0.01) * 0.06;
            const r = 28 * pulse;
            this.shieldGfx.lineStyle(3, 0x66ccff, 0.75);
            this.shieldGfx.strokeCircle(player.x, player.y, r);
            this.shieldGfx.fillStyle(0x4499ff, 0.12);
            this.shieldGfx.fillCircle(player.x, player.y, r);
            this.shieldGfx.lineStyle(1, 0xaaddff, 0.4);
            this.shieldGfx.strokeCircle(player.x, player.y, r + 6);
        } else if (this.shieldGfx) {
            this.shieldGfx.clear();
        }

        // Keep labels/rings glued to relics
        this.group.getChildren().forEach(r => {
            if (!r.active) return;
            if (r.label) r.label.setPosition(r.x, r.y - 22);
            if (r.ring) r.ring.setPosition(r.x, r.y);
        });
    }

    destroy() {
        if (this.shieldGfx) this.shieldGfx.destroy();
        this.group.getChildren().slice().forEach(r => this.destroyRelic(r));
    }
}
