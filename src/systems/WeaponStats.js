/**
 * Approximate weapon DPS for level-up tooltips.
 * Matches formulas in WeaponSystem (base damage before pipeline is re-applied with player mods).
 */

/** @typedef {'single' | 'aoe' | 'orbital' | 'aura' | 'chain' | 'summon' | 'trap'} WeaponRole */

const ROLE_UI = {
    single: { tag: '🎯 ST', label: 'Одна цель', color: '#88ccff' },
    aoe: { tag: '🌀 AoE', label: 'Площадь', color: '#ffaa66' },
    orbital: { tag: '🌕 Орбита', label: 'Орбиталь', color: '#66ffcc' },
    aura: { tag: '🩸 Аура', label: 'Аура', color: '#ff6688' },
    chain: { tag: '⚡ Цепь', label: 'Цепь', color: '#ffe066' },
    summon: { tag: '👻 Стая', label: 'Призыв', color: '#aaddff' },
    trap: { tag: '🔮 Ловушка', label: 'Ловушки', color: '#dd88ff' }
};

/**
 * @param {object} player
 * @returns {{ dmgMul: number, rateMul: number }}
 */
function playerMods(player) {
    if (!player) return { dmgMul: 1, rateMul: 1 };
    const critEV = 1 + (player.critChance || 0) * ((player.critMultiplier || 1.75) - 1);
    return {
        dmgMul: (player.damageMultiplier || 1) * critEV,
        rateMul: player.fireRateMultiplier || 1
    };
}

function roundDps(n) {
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (n < 10) return Math.round(n * 10) / 10;
    return Math.round(n);
}

/**
 * Estimate DPS at a specific weapon level (1–5).
 * Returns single-target and multi-target (crowd) figures.
 *
 * @param {string} key
 * @param {number} level
 * @param {object} [player]
 */
export function estimateWeaponDps(key, level, player = null) {
    const lvl = Math.max(1, Math.min(5, level | 0));
    const { dmgMul, rateMul } = playerMods(player);

    let st = 0;
    let aoe = 0;
    /** @type {WeaponRole} */
    let role = 'single';
    let note = '';

    switch (key) {
        case 'blaster': {
            role = 'single';
            const dmg = (22 + (lvl - 1) * 6) * dmgMul;
            const cd = Math.max(80, (250 - (lvl - 1) * 30) / rateMul) / 1000;
            let shots = 1;
            if (lvl >= 3) shots = 2;
            // lvl 5 adds a third stronger shot — count as +1.2
            const shotFactor = lvl >= 5 ? shots + 1.2 : shots;
            st = (dmg * shotFactor) / cd;
            aoe = st; // pure ST — same figure
            note = 'фокус по ближайшему';
            break;
        }
        case 'spread': {
            role = 'aoe';
            const dmg = (16 + (lvl - 1) * 5) * dmgMul;
            const cd = Math.max(120, (650 - (lvl - 1) * 40) / rateMul) / 1000;
            let pellets = 3;
            if (lvl >= 3) pellets = 5;
            if (lvl >= 5) pellets = 8;
            // ST: ~1–2 pellets hit same target in a fan
            const stHits = lvl >= 5 ? 1.2 : 1.4;
            st = (dmg * stHits) / cd;
            aoe = (dmg * pellets) / cd;
            note = `${pellets} волн`;
            break;
        }
        case 'orbital': {
            role = 'orbital';
            // Continuous tick: base*0.04 per frame while overlapping (~60fps)
            // Contact uptime on a single orbiting enemy ~35–50%
            const base = (25 + (lvl - 1) * 8) * dmgMul;
            const orbs = 2 + (lvl - 1) * 2;
            const tickPerSec = base * 0.04 * 60; // if stuck on target every frame
            const contact = 0.42;
            st = tickPerSec * contact * Math.min(orbs, 2); // at most ~2 orbs on one body
            aoe = tickPerSec * contact * orbs; // each orb on different enemy
            note = `${orbs} духа`;
            break;
        }
        case 'shield': {
            role = 'aura';
            const dmg = (15 + (lvl - 1) * 6) * dmgMul;
            const tickMs = Math.max(160, 320 - (lvl - 1) * 40);
            const ticks = 1000 / tickMs;
            st = dmg * ticks;
            // Assume ~2.5 enemies in aura mid-game
            aoe = st * 2.5;
            note = 'тиковый AoE';
            break;
        }
        case 'lightning': {
            role = 'chain';
            const dmg = (45 + (lvl - 1) * 12) * dmgMul;
            const cd = Math.max(200, (1000 - (lvl - 1) * 100) / rateMul) / 1000;
            const bounces = 3 + (lvl - 1) * 2;
            const chains = lvl >= 5 ? 2 : 1;
            st = (dmg * chains) / cd;
            aoe = (dmg * bounces * chains) / cd;
            note = `${bounces} отскока`;
            break;
        }
        case 'rockets': {
            role = 'summon';
            const dmg = (40 + (lvl - 1) * 10) * dmgMul;
            const cd = Math.max(300, (1400 - (lvl - 1) * 120) / rateMul) / 1000;
            const count = lvl >= 5 ? 5 : lvl >= 3 ? 3 : lvl >= 2 ? 2 : 1;
            // Homing: all can stack on one target
            st = (dmg * count) / cd;
            // Splash ~2 extras per rocket average
            aoe = (dmg * count * 2.2) / cd;
            note = `${count} волка`;
            break;
        }
        case 'mines': {
            role = 'trap';
            const dmg = (55 + (lvl - 1) * 15) * dmgMul;
            const cd = Math.max(400, (1800 - (lvl - 1) * 150) / rateMul) / 1000;
            const count = lvl >= 5 ? 4 : lvl >= 3 ? 2 : 1;
            st = (dmg * count * 0.7) / cd; // not every mine hits same target
            aoe = (dmg * count * 2.5) / cd;
            note = `${count} рун`;
            break;
        }
        default:
            break;
    }

    const stR = roundDps(st);
    const aoeR = roundDps(aoe);
    const roleUi = ROLE_UI[role] || ROLE_UI.single;
    const primary = role === 'single' ? stR : Math.max(stR, aoeR);

    return {
        key,
        level: lvl,
        role,
        roleTag: roleUi.tag,
        roleLabel: roleUi.label,
        roleColor: roleUi.color,
        stDps: stR,
        aoeDps: aoeR,
        primaryDps: primary,
        note,
        /** One-line tooltip for cards */
        dpsLine: formatDpsLine(stR, aoeR, role),
        /** Compact primary */
        dpsShort: `DPS~ ${primary}`
    };
}

/**
 * Format ST vs AoE line depending on role.
 */
export function formatDpsLine(st, aoe, role) {
    if (role === 'single') {
        return `DPS~ ${st} · 🎯 ST`;
    }
    if (role === 'orbital') {
        return `DPS~ ST ${st} · Орб. ${aoe}`;
    }
    if (role === 'aura') {
        return `DPS~ ST ${st} · Аура ${aoe}`;
    }
    if (role === 'chain') {
        return `DPS~ ST ${st} · Цепь ${aoe}`;
    }
    // general multi
    if (Math.abs(st - aoe) < 1) {
        return `DPS~ ${st}`;
    }
    return `DPS~ ST ${st} · AoE ${aoe}`;
}

/**
 * Compare current level vs next for upgrade cards.
 * @param {string} key
 * @param {number} currentLevel 0 if new
 * @param {object} player
 */
export function getWeaponUpgradeDpsInfo(key, currentLevel, player) {
    const fromLvl = Math.max(0, currentLevel);
    const toLvl = Math.min(5, fromLvl + 1);
    const next = estimateWeaponDps(key, Math.max(1, toLvl), player);
    let prev = null;
    let deltaSt = null;
    let deltaAoe = null;

    if (fromLvl >= 1) {
        prev = estimateWeaponDps(key, fromLvl, player);
        deltaSt = next.stDps - prev.stDps;
        deltaAoe = next.aoeDps - prev.aoeDps;
    }

    const deltaPart = prev
        ? ` (${deltaSt >= 0 ? '+' : ''}${roundDps(deltaSt)} ST)`
        : '';

    return {
        ...next,
        prev,
        deltaSt,
        deltaAoe,
        dpsLine: next.dpsLine + deltaPart,
        chart: {
            st: next.stDps,
            aoe: next.aoeDps,
            stPrev: prev ? prev.stDps : 0,
            aoePrev: prev ? prev.aoeDps : 0,
            max: Math.max(next.stDps, next.aoeDps, prev ? prev.stDps : 0, prev ? prev.aoeDps : 0, 1)
        }
    };
}

/**
 * Passive cards: rough global DPS impact hint.
 */
export function getPassiveDpsHint(passiveId, player) {
    if (!player) return null;
    const base = 100; // abstract "current loadout power" index
    switch (passiveId) {
        case 'passive_damage':
            return { dpsLine: 'DPS~ всех атак +18%', roleTag: '⚔️', roleColor: '#ff8866' };
        case 'passive_firerate':
            return { dpsLine: 'Скорость атак +14% ≈ DPS↑', roleTag: '⏱️', roleColor: '#88ddff' };
        case 'passive_crit':
            return { dpsLine: 'Крит +8% → ср. DPS↑', roleTag: '💥', roleColor: '#ffee66' };
        case 'passive_lifesteal':
            return { dpsLine: 'Вампиризм 3% от урона', roleTag: '🧛', roleColor: '#cc66aa' };
        default:
            return null;
    }
}

export { ROLE_UI };
