/**
 * Combat synergies: real stat bonuses when both halves are owned.
 * Applied once per run when the pair first completes.
 */

/**
 * @typedef {object} CombatSynergy
 * @property {string} id
 * @property {string} a - option id (weapon_X or passive_Y)
 * @property {string} b
 * @property {string} label
 * @property {string} [toast]
 * @property {(player: object, ctx: { weaponSystem: object, upgradeSystem: object }) => void} apply
 */

/** @type {CombatSynergy[]} */
export const COMBAT_SYNERGIES = [
    // —— Weapon + passive ——
    {
        id: 'blaster_damage',
        a: 'weapon_blaster', b: 'passive_damage',
        label: 'Жажда крови × Когти',
        toast: '⚔ Синергия: +12% урон',
        apply: (p) => { p.damageMultiplier *= 1.12; }
    },
    {
        id: 'blaster_crit',
        a: 'weapon_blaster', b: 'passive_crit',
        label: 'Крит-когти',
        toast: '💥 Синергия: +5% крит',
        apply: (p) => { p.critChance = Math.min(0.5, p.critChance + 0.05); }
    },
    {
        id: 'blaster_firerate',
        a: 'weapon_blaster', b: 'passive_firerate',
        label: 'Яростные когти',
        toast: '⏱ Синергия: +8% скорость атак',
        apply: (p) => { p.fireRateMultiplier *= 1.08; }
    },
    {
        id: 'blaster_lifesteal',
        a: 'weapon_blaster', b: 'passive_lifesteal',
        label: 'Кровавые когти',
        toast: '🧛 Синергия: +2% вампиризм',
        apply: (p) => { p.lifesteal = Math.min(0.18, p.lifesteal + 0.02); }
    },
    {
        id: 'spread_damage',
        a: 'weapon_spread', b: 'passive_damage',
        label: 'Рык силы',
        toast: '⚔ Синергия: +10% урон',
        apply: (p) => { p.damageMultiplier *= 1.10; }
    },
    {
        id: 'spread_firerate',
        a: 'weapon_spread', b: 'passive_firerate',
        label: 'Непрерывный рёв',
        toast: '⏱ Синергия: +10% скорость атак',
        apply: (p) => { p.fireRateMultiplier *= 1.10; }
    },
    {
        id: 'orbital_magnet',
        a: 'weapon_orbital', b: 'passive_magnet',
        label: 'Духи тянут эссенцию',
        toast: '🌙 Синергия: +25% магнит',
        apply: (p) => { p.magnetRadius *= 1.25; }
    },
    {
        id: 'orbital_damage',
        a: 'weapon_orbital', b: 'passive_damage',
        label: 'Лунный гнев',
        toast: '⚔ Синергия: +10% урон',
        apply: (p) => { p.damageMultiplier *= 1.10; }
    },
    {
        id: 'shield_armor',
        a: 'weapon_shield', b: 'passive_armor',
        label: 'Панцирь + аура',
        toast: '🦴 Синергия: +8% броня',
        apply: (p) => { p.armor = Math.min(0.5, p.armor + 0.08); }
    },
    {
        id: 'shield_lifesteal',
        a: 'weapon_shield', b: 'passive_lifesteal',
        label: 'Аура вампира',
        toast: '🧛 Синергия: +2% вампиризм',
        apply: (p) => { p.lifesteal = Math.min(0.18, p.lifesteal + 0.02); }
    },
    {
        id: 'shield_health',
        a: 'weapon_shield', b: 'passive_health',
        label: 'Танк-хищник',
        toast: '🛡 Синергия: +20 HP',
        apply: (p) => { p.maxHealth += 20; p.heal(20); }
    },
    {
        id: 'lightning_crit',
        a: 'weapon_lightning', b: 'passive_crit',
        label: 'Критический разряд',
        toast: '💥 Синергия: +6% крит',
        apply: (p) => { p.critChance = Math.min(0.5, p.critChance + 0.06); }
    },
    {
        id: 'lightning_firerate',
        a: 'weapon_lightning', b: 'passive_firerate',
        label: 'Цепная буря',
        toast: '⏱ Синергия: +8% скорость атак',
        apply: (p) => { p.fireRateMultiplier *= 1.08; }
    },
    {
        id: 'rockets_damage',
        a: 'weapon_rockets', b: 'passive_damage',
        label: 'Стая-убийца',
        toast: '⚔ Синергия: +12% урон',
        apply: (p) => { p.damageMultiplier *= 1.12; }
    },
    {
        id: 'rockets_magnet',
        a: 'weapon_rockets', b: 'passive_magnet',
        label: 'Охотничий нюх стаи',
        toast: '🌙 Синергия: +20% магнит',
        apply: (p) => { p.magnetRadius *= 1.20; }
    },
    {
        id: 'mines_damage',
        a: 'weapon_mines', b: 'passive_damage',
        label: 'Смертельные руны',
        toast: '⚔ Синергия: +10% урон',
        apply: (p) => { p.damageMultiplier *= 1.10; }
    },
    {
        id: 'mines_armor',
        a: 'weapon_mines', b: 'passive_armor',
        label: 'Контроль зоны',
        toast: '🦴 Синергия: +5% броня',
        apply: (p) => { p.armor = Math.min(0.5, p.armor + 0.05); }
    },
    {
        id: 'dash_shield',
        a: 'passive_dash', b: 'weapon_shield',
        label: 'Рывок сквозь ауру',
        toast: '💨 Синергия: −15% CD рывка',
        apply: (p) => { p.dashCooldown = Math.max(1000, p.dashCooldown * 0.85); }
    },
    {
        id: 'regen_health',
        a: 'passive_regen', b: 'passive_health',
        label: 'Регенерация шкуры',
        toast: '✨ Синергия: +1 HP/с',
        apply: (p) => { p.regenPerSec += 1.0; }
    },
    {
        id: 'crit_damage',
        a: 'passive_crit', b: 'passive_damage',
        label: 'Смертоносный билд',
        toast: '⚔ Синергия: +8% урон +3% крит',
        apply: (p) => {
            p.damageMultiplier *= 1.08;
            p.critChance = Math.min(0.5, p.critChance + 0.03);
        }
    },
    // —— Weapon combos ——
    {
        id: 'blaster_shield',
        a: 'weapon_blaster', b: 'weapon_shield',
        label: 'Когти + аура',
        toast: '🩸 Синергия: +8% урон',
        apply: (p) => { p.damageMultiplier *= 1.08; }
    },
    {
        id: 'spread_shield',
        a: 'weapon_spread', b: 'weapon_shield',
        label: 'Рык + аура',
        toast: '🐺 Синергия: +10% скорость атак',
        apply: (p) => { p.fireRateMultiplier *= 1.10; }
    },
    {
        id: 'orbital_lightning',
        a: 'weapon_orbital', b: 'weapon_lightning',
        label: 'Луна + молния',
        toast: '⚡ Синергия: +10% урон',
        apply: (p) => { p.damageMultiplier *= 1.10; }
    },
    {
        id: 'rockets_mines',
        a: 'weapon_rockets', b: 'weapon_mines',
        label: 'Стая + руны',
        toast: '👻 Синергия: +10% урон',
        apply: (p) => { p.damageMultiplier *= 1.10; }
    },
    {
        id: 'spread_lightning',
        a: 'weapon_spread', b: 'weapon_lightning',
        label: 'Рёв и гром',
        toast: '⚡ Синергия: +8% урон +5% скорость',
        apply: (p) => {
            p.damageMultiplier *= 1.08;
            p.fireRateMultiplier *= 1.05;
        }
    },
    {
        id: 'orbital_shield',
        a: 'weapon_orbital', b: 'weapon_shield',
        label: 'Двойная орбита',
        toast: '🌕 Синергия: +6% броня',
        apply: (p) => { p.armor = Math.min(0.5, p.armor + 0.06); }
    },
    {
        id: 'blaster_rockets',
        a: 'weapon_blaster', b: 'weapon_rockets',
        label: 'Когти и стая',
        toast: '🐾 Синергия: +10% урон',
        apply: (p) => { p.damageMultiplier *= 1.10; }
    }
];

/** For UI cards — same pairs without apply */
export function getSynergyPairsForUi() {
    return COMBAT_SYNERGIES.map(s => ({ a: s.a, b: s.b, label: s.label }));
}
