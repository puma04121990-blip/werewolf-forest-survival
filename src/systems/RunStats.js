/** Labels for damage breakdown & death cause */

export const WEAPON_DAMAGE_META = {
    blaster: { icon: '🐾', name: 'Кровавые когти' },
    spread: { icon: '🐺', name: 'Волчий рык' },
    orbital: { icon: '🌕', name: 'Духи Луны' },
    shield: { icon: '🩸', name: 'Аура Хищника' },
    lightning: { icon: '⚡', name: 'Лунный разряд' },
    rockets: { icon: '👻', name: 'Призыв Стаи' },
    mines: { icon: '🔮', name: 'Кровавые руны' },
    dash: { icon: '💨', name: 'Рывок' }
};

export const ENEMY_TYPE_META = {
    scout: { name: 'Крестьянин', icon: '🧑‍🌾' },
    chaser: { name: 'Вампир', icon: '🦇' },
    tank: { name: 'Волк-танк', icon: '🐺' },
    shooter: { name: 'Охотник', icon: '🏹' },
    elite: { name: 'Серебряный охотник', icon: '⚔️' },
    boss: { name: 'Великий инквизитор', icon: '👑' }
};

/**
 * Human-readable death cause from hit source info.
 * @param {{ kind?: string, enemyType?: string, label?: string } | null} cause
 */
export function formatDeathCause(cause) {
    if (!cause) return { line: 'Неизвестно… лес хранит тайну', short: 'Неизвестно' };

    if (cause.label) {
        return { line: cause.label, short: cause.short || cause.label };
    }

    const meta = ENEMY_TYPE_META[cause.enemyType] || { name: 'Враг', icon: '💀' };

    if (cause.kind === 'bullet') {
        const line = `${meta.icon} Снаряд: ${meta.name}`;
        return { line, short: `Снаряд (${meta.name})` };
    }
    if (cause.kind === 'slam') {
        const line = `${meta.icon} Удар танка: ${meta.name}`;
        return { line, short: `Удар (${meta.name})` };
    }
    if (cause.kind === 'contact') {
        const line = `${meta.icon} Контакт: ${meta.name}`;
        return { line, short: meta.name };
    }

    return { line: `${meta.icon} ${meta.name}`, short: meta.name };
}

/**
 * Build sorted damage breakdown for UI.
 * @param {Record<string, number>} damageBySource
 * @returns {{ key: string, icon: string, name: string, damage: number, pct: number }[]}
 */
export function buildDamageBreakdown(damageBySource = {}) {
    const entries = Object.entries(damageBySource)
        .filter(([, v]) => v > 0)
        .map(([key, damage]) => {
            const meta = WEAPON_DAMAGE_META[key] || { icon: '•', name: key };
            return { key, icon: meta.icon, name: meta.name, damage: Math.round(damage) };
        })
        .sort((a, b) => b.damage - a.damage);

    const total = entries.reduce((s, e) => s + e.damage, 0) || 1;
    return entries.map(e => ({
        ...e,
        pct: Math.round((e.damage / total) * 1000) / 10
    }));
}

/**
 * Share / clipboard text for a finished run.
 */
export function buildShareText(stats) {
    const mins = Math.floor((stats.time || 0) / 60).toString().padStart(2, '0');
    const secs = ((stats.time || 0) % 60).toString().padStart(2, '0');
    const death = formatDeathCause(stats.deathCause);
    const dmg = buildDamageBreakdown(stats.damageByWeapon || {});
    const top = dmg.slice(0, 4).map(d => `${d.icon} ${d.name} ${d.pct}%`).join(' · ');

    return [
        '🐺 Оборотень: Лесное Выживание',
        `⏱ ${mins}:${secs}  ·  💀 ${stats.kills || 0}  ·  Ур.${stats.level || 1}  ·  Волна ${stats.wave || 1}`,
        `Макс. комбо ×${stats.maxCombo || 0}`,
        `Убит: ${death.short}`,
        top ? `Урон: ${top}` : null,
        'https://github.com/puma04121990-blip/werewolf-forest-survival'
    ].filter(Boolean).join('\n');
}

/**
 * Runtime damage + death tracker used by GameScene.
 */
export class RunStatsTracker {
    constructor() {
        this.reset();
    }

    reset() {
        this.damageByWeapon = {
            blaster: 0,
            spread: 0,
            orbital: 0,
            shield: 0,
            lightning: 0,
            rockets: 0,
            mines: 0,
            dash: 0
        };
        this.deathCause = null;
        this.lastHit = null;
    }

    addDamage(source, amount) {
        if (!source || amount <= 0) return;
        if (this.damageByWeapon[source] == null) this.damageByWeapon[source] = 0;
        this.damageByWeapon[source] += amount;
    }

    recordHit(cause) {
        this.lastHit = cause;
    }

    recordDeath() {
        this.deathCause = this.lastHit;
    }

    getSnapshot() {
        return {
            damageByWeapon: { ...this.damageByWeapon },
            deathCause: this.deathCause ? { ...this.deathCause } : null
        };
    }
}
