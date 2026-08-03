/**
 * Weapon evolutions (Vampire Survivors style).
 * Conditions must be met → special level-up card → permanent evolved form.
 */

export const EVOLUTIONS = {
    blood_storm: {
        id: 'blood_storm',
        name: 'Кровавая буря',
        icon: '🩸',
        badge: 'ЭВОЛЮЦИЯ',
        description: 'Когти Ур.5 + Жажда крови → 360° буря кровавых разрезов',
        /** @type {{ weapons?: Record<string, number>, passives?: Record<string, number> }} */
        requires: {
            weapons: { blaster: 5 },
            passives: { passive_damage: 1 }
        },
        /** Weapons absorbed / no longer upgradeable as base */
        consumesWeapons: ['blaster'],
        primaryWeapon: 'blaster',
        color: '#ff3355',
        dpsHint: 'DPS~ AoE буря · 🎯→🌀'
    },
    moon_storm: {
        id: 'moon_storm',
        name: 'Лунная буря',
        icon: '🌕',
        badge: 'ЭВОЛЮЦИЯ',
        description: 'Духи Ур.5 + Разряд Ур.5 → орбита + цепные молнии с духов',
        requires: {
            weapons: { orbital: 5, lightning: 5 }
        },
        consumesWeapons: ['orbital', 'lightning'],
        primaryWeapon: 'orbital',
        color: '#88eeff',
        dpsHint: 'DPS~ Орбита + Цепь · 🌕⚡'
    }
};

/**
 * @param {import('./WeaponSystem.js').WeaponSystem} weaponSystem
 * @param {import('./UpgradeSystem.js').UpgradeSystem} upgradeSystem
 * @returns {string[]} evolution ids that can be taken now
 */
export function getReadyEvolutionIds(weaponSystem, upgradeSystem) {
    const ready = [];
    Object.values(EVOLUTIONS).forEach(evo => {
        if (weaponSystem.hasEvolution(evo.id)) return;
        if (meetsRequirements(evo, weaponSystem, upgradeSystem)) {
            ready.push(evo.id);
        }
    });
    return ready;
}

export function meetsRequirements(evo, weaponSystem, upgradeSystem) {
    const req = evo.requires || {};
    if (req.weapons) {
        for (const [key, minLvl] of Object.entries(req.weapons)) {
            if (weaponSystem.getWeaponLevel(key) < minLvl) return false;
        }
    }
    if (req.passives) {
        for (const [id, minStacks] of Object.entries(req.passives)) {
            const stacks = upgradeSystem.passiveStacks.get(id) || 0;
            if (stacks < minStacks) return false;
        }
    }
    // Don't offer if a consumed weapon already evolved into something else conflicting
    if (evo.consumesWeapons) {
        for (const key of evo.consumesWeapons) {
            if (weaponSystem.isWeaponConsumed(key) && !weaponSystem.hasEvolution(evo.id)) {
                // already consumed by another evo
                const owner = weaponSystem.getEvolutionOwningWeapon(key);
                if (owner && owner !== evo.id) return false;
            }
        }
    }
    return true;
}

export function evolutionToCard(evoId) {
    const evo = EVOLUTIONS[evoId];
    if (!evo) return null;
    return {
        id: 'evo_' + evo.id,
        evoId: evo.id,
        name: evo.name,
        icon: evo.icon,
        badge: evo.badge,
        description: evo.description,
        type: 'evolution',
        rarity: 'evolution',
        dpsLine: evo.dpsHint,
        roleTag: '✨ ЭВО',
        roleColor: evo.color,
        synergyText: null,
        synergyDetail: null,
        dpsChart: null
    };
}
