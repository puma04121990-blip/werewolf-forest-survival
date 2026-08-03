import { BALANCE } from '../config.js';

/** Tier thresholds (by XP value) */
export const XP_TIER = {
    GREEN: 'green',
    CYAN: 'cyan',
    GOLD: 'gold',
    MOON: 'moon' // combo / special bonus
};

export function tierFromValue(value, forceTier = null) {
    if (forceTier) return forceTier;
    if (value >= 100) return XP_TIER.GOLD;
    if (value >= 25) return XP_TIER.CYAN;
    return XP_TIER.GREEN;
}

const TIER_STYLE = {
    green: {
        tint: 0x44ff88,
        scale: 0.78,
        glow: 0x22cc66,
        lifetime: () => BALANCE.xpOrbLifetimeGreen,
        magnetMul: () => BALANCE.xpOrbMagnetMulGreen,
        depth: 8
    },
    cyan: {
        tint: 0x44eeff,
        scale: 1.0,
        glow: 0x00ccff,
        lifetime: () => BALANCE.xpOrbLifetimeCyan,
        magnetMul: () => BALANCE.xpOrbMagnetMulCyan,
        depth: 9
    },
    gold: {
        tint: 0xffd700,
        scale: 1.35,
        glow: 0xffaa00,
        lifetime: () => BALANCE.xpOrbLifetimeGold,
        magnetMul: () => BALANCE.xpOrbMagnetMulGold,
        depth: 10
    },
    moon: {
        tint: 0xddaaff,
        scale: 1.45,
        glow: 0xaa66ff,
        lifetime: () => BALANCE.xpOrbLifetimeMoon,
        magnetMul: () => BALANCE.xpOrbMagnetMulMoon,
        depth: 11
    }
};

export class XpOrb extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {number} value
     * @param {{ tier?: string, scatter?: boolean }} [opts]
     */
    constructor(scene, x, y, value = 10, opts = {}) {
        super(scene, x, y, 'xp_orb');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.value = Math.max(1, Math.round(value));
        this.tier = tierFromValue(this.value, opts.tier || null);
        this.age = 0;
        this.vacuum = false;
        this.collected = false;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.glow = null;

        this.applyTierStyle();
        this.setDepth(TIER_STYLE[this.tier].depth);
        this.setCircle(7);

        // Soft spawn pop + optional scatter so piles look juicy
        this.setScale(this.baseScale * 0.3);
        this.setAlpha(0.5);
        scene.tweens.add({
            targets: this,
            scale: this.baseScale,
            alpha: 1,
            duration: 180,
            ease: 'Back.easeOut'
        });

        if (opts.scatter !== false) {
            const a = Math.random() * Math.PI * 2;
            const spd = BALANCE.xpOrbScatterSpeed * (0.5 + Math.random() * 0.8);
            this.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd);
            this.scatterTimer = 180 + Math.random() * 120;
        } else {
            this.scatterTimer = 0;
        }

        // Ambient glow (destroyed with orb)
        this.glow = scene.add.circle(x, y, 10 * this.baseScale, TIER_STYLE[this.tier].glow, 0.28);
        this.glow.setDepth(this.depth - 1);
        this.glow.setBlendMode(Phaser.BlendModes.ADD);
    }

    applyTierStyle() {
        const style = TIER_STYLE[this.tier] || TIER_STYLE.green;
        this.baseScale = style.scale;
        this.lifetime = style.lifetime();
        this.magnetMul = style.magnetMul();
        this.setTint(style.tint);
        this.setScale(this.baseScale);
    }

    /** Force fly-to-player (level-up vacuum, death magnet, etc.) */
    startVacuum() {
        this.vacuum = true;
        this.scatterTimer = 0;
    }

    update(time, delta) {
        if (!this.active || this.collected) return;

        this.age += delta;
        this.pulsePhase += delta * 0.008;

        // Lifetime expire
        if (this.age >= this.lifetime) {
            this.expire();
            return;
        }

        // Warning flash near end of life
        const warn = BALANCE.xpOrbWarnMs;
        if (this.age > this.lifetime - warn) {
            const t = (this.age - (this.lifetime - warn)) / warn;
            this.setAlpha(0.35 + 0.65 * Math.abs(Math.sin(time * 0.02)));
            if (this.glow) this.glow.setAlpha(0.1 + 0.2 * (1 - t));
        }

        // Idle pulse
        const pulse = 1 + Math.sin(this.pulsePhase) * (this.tier === XP_TIER.MOON ? 0.12 : 0.06);
        if (!this.vacuum) {
            this.setScale(this.baseScale * pulse);
        }

        if (this.glow && this.glow.active) {
            this.glow.setPosition(this.x, this.y);
            this.glow.setScale(pulse * (this.tier === XP_TIER.GOLD || this.tier === XP_TIER.MOON ? 1.4 : 1.1));
        }

        // Scatter decay
        if (this.scatterTimer > 0) {
            this.scatterTimer -= delta;
            this.setVelocity(this.body.velocity.x * 0.92, this.body.velocity.y * 0.92);
            if (this.scatterTimer <= 0) {
                this.setVelocity(0, 0);
            }
            return;
        }

        const player = this.scene.player;
        if (!player || !player.active) {
            this.setVelocity(0, 0);
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const magnetR = player.magnetRadius * this.magnetMul;

        if (this.vacuum || dist < magnetR) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            let pull;
            if (this.vacuum) {
                pull = 1100 + (1 - Math.min(dist, 500) / 500) * 700;
            } else {
                const t = 1 - dist / magnetR;
                pull = (BALANCE.xpOrbPullBase + t * BALANCE.xpOrbPullExtra) * this.magnetMul;
            }

            // Manual move when vacuuming: physics is often paused on level-up
            if (this.vacuum) {
                const step = pull * (delta / 1000);
                this.x += Math.cos(angle) * step;
                this.y += Math.sin(angle) * step;
                if (this.body) {
                    this.body.reset(this.x, this.y);
                }
            } else {
                this.setVelocity(Math.cos(angle) * pull, Math.sin(angle) * pull);
            }

            // Moon / gold leave a faint trail
            if ((this.tier === XP_TIER.GOLD || this.tier === XP_TIER.MOON) && Math.random() < 0.25) {
                const spark = this.scene.add.circle(this.x, this.y, 2.5, TIER_STYLE[this.tier].glow, 0.7);
                spark.setDepth(this.depth - 1);
                this.scene.tweens.add({
                    targets: spark,
                    alpha: 0,
                    scale: 0.2,
                    duration: 200,
                    onComplete: () => spark.destroy()
                });
            }
        } else {
            this.setVelocity(0, 0);
        }
    }

    expire() {
        if (!this.active) return;
        // Soft despawn — no XP (pressure to collect)
        if (this.glow) {
            this.scene.tweens.add({
                targets: [this, this.glow],
                alpha: 0,
                scale: 0.2,
                duration: 200,
                onComplete: () => this.destroy()
            });
        } else {
            this.destroy();
        }
    }

    destroy(fromScene) {
        if (this.glow) {
            this.glow.destroy();
            this.glow = null;
        }
        super.destroy(fromScene);
    }
}

/**
 * Split a total XP drop into juicy multi-orb values.
 * @returns {{ value: number, tier?: string }[]}
 */
export function splitXpValues(total) {
    total = Math.max(1, Math.round(total));
    const pieces = [];

    if (total < BALANCE.xpOrbSplitThreshold) {
        pieces.push({ value: total });
        return pieces;
    }

    // Prefer a few medium/large over dozens of tiny
    let remaining = total;
    while (remaining > 0) {
        if (remaining >= 100) {
            const chunk = Math.min(remaining, 100 + Math.floor(Math.random() * 40));
            pieces.push({ value: chunk });
            remaining -= chunk;
        } else if (remaining >= 40) {
            const chunk = Math.min(remaining, 25 + Math.floor(Math.random() * 20));
            pieces.push({ value: chunk });
            remaining -= chunk;
        } else if (remaining >= 15) {
            const chunk = Math.min(remaining, 10 + Math.floor(Math.random() * 10));
            pieces.push({ value: chunk });
            remaining -= chunk;
        } else {
            pieces.push({ value: remaining });
            remaining = 0;
        }
        if (pieces.length >= 8) {
            // Merge rest into last
            if (remaining > 0) {
                pieces[pieces.length - 1].value += remaining;
                remaining = 0;
            }
            break;
        }
    }
    return pieces;
}
