import { getWeaponUpgradeDpsInfo, getPassiveDpsHint } from './WeaponStats.js';
import { getReadyEvolutionIds, evolutionToCard, EVOLUTIONS } from './Evolutions.js';

/** Weapon display names for synergy text */
const WEAPON_META = {
    blaster: { name: 'Кровавые когти', icon: '🐾' },
    spread: { name: 'Волчий рык', icon: '🐺' },
    orbital: { name: 'Духи Луны', icon: '🌕' },
    shield: { name: 'Аура Хищника', icon: '🩸' },
    lightning: { name: 'Лунный разряд', icon: '⚡' },
    rockets: { name: 'Призыв Стаи', icon: '👻' },
    mines: { name: 'Кровавые руны', icon: '🔮' }
};

const PASSIVE_META = {
    passive_speed: { name: 'Инстинкт-грация', icon: '🐾' },
    passive_health: { name: 'Густая шкура', icon: '🛡️' },
    passive_damage: { name: 'Жажда крови', icon: '⚔️' },
    passive_firerate: { name: 'Ярость зверя', icon: '⏱️' },
    passive_magnet: { name: 'Звериное чутьё', icon: '🌙' },
    passive_crit: { name: 'Смертельный клык', icon: '💥' },
    passive_lifesteal: { name: 'Кровавый пир', icon: '🧛' },
    passive_armor: { name: 'Костяной панцирь', icon: '🦴' },
    passive_regen: { name: 'Лунное исцеление', icon: '✨' },
    passive_dash: { name: 'Теневой рывок', icon: '💨' }
};

/**
 * Pairwise synergies: if player owns `withId` and card is `cardId` (or reverse),
 * show the synergy line. `label` is short UI text.
 */
const SYNERGY_PAIRS = [
    // Weapons + passives
    { a: 'weapon_blaster', b: 'passive_damage', label: 'Жажда крови × Когти' },
    { a: 'weapon_blaster', b: 'passive_crit', label: 'Крит-когти' },
    { a: 'weapon_blaster', b: 'passive_firerate', label: 'Яростные когти' },
    { a: 'weapon_blaster', b: 'passive_lifesteal', label: 'Кровавые когти' },
    { a: 'weapon_spread', b: 'passive_damage', label: 'Рык силы' },
    { a: 'weapon_spread', b: 'passive_firerate', label: 'Непрерывный рёв' },
    { a: 'weapon_orbital', b: 'passive_magnet', label: 'Духи тянут эссенцию' },
    { a: 'weapon_orbital', b: 'passive_damage', label: 'Лунный гнев' },
    { a: 'weapon_shield', b: 'passive_armor', label: 'Панцирь + аура' },
    { a: 'weapon_shield', b: 'passive_lifesteal', label: 'Аура вампира' },
    { a: 'weapon_shield', b: 'passive_health', label: 'Танк-хищник' },
    { a: 'weapon_lightning', b: 'passive_crit', label: 'Критический разряд' },
    { a: 'weapon_lightning', b: 'passive_firerate', label: 'Цепная буря' },
    { a: 'weapon_rockets', b: 'passive_damage', label: 'Стая-убийца' },
    { a: 'weapon_rockets', b: 'passive_magnet', label: 'Охотничий нюх стаи' },
    { a: 'weapon_mines', b: 'passive_damage', label: 'Смертельные руны' },
    { a: 'weapon_mines', b: 'passive_armor', label: 'Контроль зоны' },
    { a: 'passive_dash', b: 'weapon_shield', label: 'Рывок сквозь ауру' },
    { a: 'passive_regen', b: 'passive_health', label: 'Регенерация шкуры' },
    { a: 'passive_crit', b: 'passive_damage', label: 'Смертоносный билд' },
    // Weapon combos
    { a: 'weapon_blaster', b: 'weapon_shield', label: 'Когти + аура' },
    { a: 'weapon_spread', b: 'weapon_shield', label: 'Рык + аура' },
    { a: 'weapon_orbital', b: 'weapon_lightning', label: 'Луна + молния' },
    { a: 'weapon_rockets', b: 'weapon_mines', label: 'Стая + руны' },
    { a: 'weapon_spread', b: 'weapon_lightning', label: 'Рёв и гром' },
    { a: 'weapon_orbital', b: 'weapon_shield', label: 'Двойная орбита' },
    { a: 'weapon_blaster', b: 'weapon_rockets', label: 'Когти и стая' }
];

export class UpgradeSystem {
    constructor(scene, player, weaponSystem) {
        this.scene = scene;
        this.player = player;
        this.weaponSystem = weaponSystem;
        /** @type {Map<string, number>} passive id → times taken */
        this.passiveStacks = new Map();
        /** Option ids banned for the rest of the run */
        this.bannedIds = new Set();
    }

    resetRunState() {
        this.passiveStacks.clear();
        this.bannedIds.clear();
    }

    getWeaponDisplayName(key) {
        return WEAPON_META[key]?.name || key;
    }

    isOwned(optionId) {
        if (optionId.startsWith('weapon_')) {
            const key = optionId.replace('weapon_', '');
            return this.weaponSystem.getWeaponLevel(key) > 0;
        }
        return (this.passiveStacks.get(optionId) || 0) > 0;
    }

    /**
     * Synergies for a card given current loadout.
     * @returns {{ text: string, partnerIcon: string, partnerName: string }[]}
     */
    getSynergiesForOption(opt) {
        const cardId = opt.id;
        const results = [];

        SYNERGY_PAIRS.forEach(pair => {
            let partnerId = null;
            if (pair.a === cardId && this.isOwned(pair.b)) partnerId = pair.b;
            else if (pair.b === cardId && this.isOwned(pair.a)) partnerId = pair.a;
            // Also: upgrading weapon you already own still "owns" it — show future synergies
            // with passives you have when picking weapon upgrade
            if (!partnerId) return;

            const meta = partnerId.startsWith('weapon_')
                ? WEAPON_META[partnerId.replace('weapon_', '')]
                : PASSIVE_META[partnerId];

            results.push({
                text: pair.label,
                partnerIcon: meta?.icon || '✨',
                partnerName: meta?.name || partnerId
            });
        });

        // Deduplicate by label
        const seen = new Set();
        return results.filter(r => {
            if (seen.has(r.text)) return false;
            seen.add(r.text);
            return true;
        });
    }

    enrichOption(opt) {
        const synergies = this.getSynergiesForOption(opt);
        const primary = synergies[0] || null;

        let dpsInfo = null;
        if (opt.type === 'weapon' && opt.key) {
            const curLvl = this.weaponSystem.getWeaponLevel(opt.key);
            dpsInfo = getWeaponUpgradeDpsInfo(opt.key, curLvl, this.player);
        } else if (opt.type === 'passive' && opt.id) {
            dpsInfo = getPassiveDpsHint(opt.id, this.player);
        } else if (opt.type === 'evolution') {
            dpsInfo = {
                dpsLine: opt.dpsLine || 'Эволюция оружия',
                roleTag: opt.roleTag || '✨ ЭВО',
                roleColor: opt.roleColor || '#ffe600'
            };
        }

        // Evolution progress hint on weapons/passives that feed a recipe
        let evoHint = null;
        if (opt.type === 'weapon' || opt.type === 'passive') {
            evoHint = this.getEvolutionProgressHint(opt);
        }

        return {
            ...opt,
            synergies,
            synergyText: primary
                ? `Синергия: ${primary.partnerIcon} ${primary.partnerName}`
                : (evoHint || null),
            synergyDetail: primary ? primary.text : null,
            dpsInfo,
            dpsLine: dpsInfo?.dpsLine || null,
            roleTag: dpsInfo?.roleTag || null,
            roleColor: dpsInfo?.roleColor || null,
            dpsChart: dpsInfo?.chart || null
        };
    }

    /** Soft hint: "→ Кровавая буря (когти 5/5)" */
    getEvolutionProgressHint(opt) {
        const ready = getReadyEvolutionIds(this.weaponSystem, this);
        if (ready.length) return null; // card will appear separately

        for (const evo of Object.values(EVOLUTIONS)) {
            if (this.weaponSystem.hasEvolution(evo.id)) continue;
            const req = evo.requires || {};
            let relevant = false;
            let parts = [];

            if (req.weapons && opt.type === 'weapon' && req.weapons[opt.key] != null) {
                relevant = true;
                Object.entries(req.weapons).forEach(([k, min]) => {
                    const cur = this.weaponSystem.getWeaponLevel(k);
                    parts.push(`${WEAPON_META[k]?.icon || k}${cur}/${min}`);
                });
            }
            if (req.passives && opt.type === 'passive' && req.passives[opt.id] != null) {
                relevant = true;
                Object.entries(req.passives).forEach(([id, min]) => {
                    const cur = this.passiveStacks.get(id) || 0;
                    parts.push(`${PASSIVE_META[id]?.icon || id}${cur}/${min}`);
                });
                if (req.weapons) {
                    Object.entries(req.weapons).forEach(([k, min]) => {
                        const cur = this.weaponSystem.getWeaponLevel(k);
                        parts.push(`${WEAPON_META[k]?.icon || k}${cur}/${min}`);
                    });
                }
            }
            if (relevant) {
                return `→ ${evo.icon} ${evo.name} (${parts.join(' ')})`;
            }
        }
        return null;
    }

    getAvailableOptions(excludeIds = []) {
        const exclude = new Set([...excludeIds, ...this.bannedIds]);
        const pool = [];

        // Ready evolutions (always in pool; getRandomOptions guarantees one slot)
        getReadyEvolutionIds(this.weaponSystem, this).forEach(evoId => {
            const card = evolutionToCard(evoId);
            if (card && !exclude.has(card.id)) {
                pool.push(this.enrichOption(card));
            }
        });

        const weaponDefs = [
            { key: 'blaster', name: 'Кровавые когти', icon: '🐾',
              newDesc: 'Авто-разрезы по ближайшему врагу',
              upDesc: '+урон, +скорость, двойной/тройной разрез' },
            { key: 'spread', name: 'Волчий рык', icon: '🐺',
              newDesc: 'Веер ультразвуковых волн',
              upDesc: 'Больше волн (до кругового рёва на 5 ур.)' },
            { key: 'orbital', name: 'Духи Луны', icon: '🌕',
              newDesc: 'Вращающиеся лунные духи-щиты',
              upDesc: '+духи, +орбита, +урон касанием' },
            { key: 'shield', name: 'Аура Хищника', icon: '🩸',
              newDesc: 'Аура, жгущая врагов рядом',
              upDesc: '+радиус, +урон, отталкивание с 3 ур.' },
            { key: 'lightning', name: 'Лунный разряд', icon: '⚡',
              newDesc: 'Цепная молния по группе целей',
              upDesc: '+отскоки и урон (двойной разряд на 5 ур.)' },
            { key: 'rockets', name: 'Призыв Стаи', icon: '👻',
              newDesc: 'Призрачные волки с укусом по площади',
              upDesc: '+волки и радиус укуса' },
            { key: 'mines', name: 'Кровавые руны', icon: '🔮',
              newDesc: 'Руны-ловушки под ногами охотников',
              upDesc: '+руны и радиус детонации' }
        ];

        weaponDefs.forEach(w => {
            const id = 'weapon_' + w.key;
            if (exclude.has(id)) return;
            // Evolved / consumed weapons no longer appear as base upgrades
            if (this.weaponSystem.isWeaponConsumed(w.key)) return;
            if (this.weaponSystem.weapons[w.key]?.merged) return;
            const curLvl = this.weaponSystem.getWeaponLevel(w.key);
            if (curLvl < 5) {
                const nextLvl = curLvl + 1;
                const isNew = curLvl === 0;
                pool.push(this.enrichOption({
                    id,
                    name: w.name,
                    badge: isNew ? 'НОВОЕ' : `Ур. ${curLvl}→${nextLvl}`,
                    icon: w.icon,
                    description: isNew ? w.newDesc : w.upDesc,
                    type: 'weapon',
                    key: w.key,
                    rarity: isNew ? 'new' : 'upgrade'
                }));
            }
        });

        const passives = [
            {
                id: 'passive_speed', name: 'Инстинкт-грация', icon: '🐾', rarity: 'passive',
                description: '+12% скорости бега',
                type: 'passive',
                apply: (p) => { p.speed *= 1.12; }
            },
            {
                id: 'passive_health', name: 'Густая шкура', icon: '🛡️', rarity: 'passive',
                description: '+30 макс. HP и полное +30 HP',
                type: 'passive',
                apply: (p) => { p.maxHealth += 30; p.heal(30); }
            },
            {
                id: 'passive_damage', name: 'Жажда крови', icon: '⚔️', rarity: 'passive',
                description: '+18% урона всех атак',
                type: 'passive',
                apply: (p) => { p.damageMultiplier *= 1.18; }
            },
            {
                id: 'passive_firerate', name: 'Ярость зверя', icon: '⏱️', rarity: 'passive',
                description: '+14% скорости атак',
                type: 'passive',
                apply: (p) => { p.fireRateMultiplier *= 1.14; }
            },
            {
                id: 'passive_magnet', name: 'Звериное чутьё', icon: '🌙', rarity: 'passive',
                description: '+40% радиуса сбора эссенции',
                type: 'passive',
                apply: (p) => { p.magnetRadius *= 1.40; }
            },
            {
                id: 'passive_crit', name: 'Смертельный клык', icon: '💥', rarity: 'passive',
                description: '+8% шанс крита (×1.75 урон)',
                type: 'passive',
                apply: (p) => { p.critChance = Math.min(0.45, p.critChance + 0.08); }
            },
            {
                id: 'passive_lifesteal', name: 'Кровавый пир', icon: '🧛', rarity: 'passive',
                description: '+3% вампиризма от нанесённого урона',
                type: 'passive',
                apply: (p) => { p.lifesteal = Math.min(0.15, p.lifesteal + 0.03); }
            },
            {
                id: 'passive_armor', name: 'Костяной панцирь', icon: '🦴', rarity: 'passive',
                description: '+8% снижение входящего урона (макс 45%)',
                type: 'passive',
                apply: (p) => { p.armor = Math.min(0.45, p.armor + 0.08); }
            },
            {
                id: 'passive_regen', name: 'Лунное исцеление', icon: '✨', rarity: 'passive',
                description: '+1.5 HP/сек регенерации',
                type: 'passive',
                apply: (p) => { p.regenPerSec += 1.5; }
            },
            {
                id: 'passive_dash', name: 'Теневой рывок', icon: '💨', rarity: 'passive',
                description: '−20% кулдаун рывка',
                type: 'passive',
                apply: (p) => { p.dashCooldown = Math.max(1200, p.dashCooldown * 0.80); }
            }
        ];

        passives.forEach(p => {
            if (exclude.has(p.id)) return;
            const stacks = this.passiveStacks.get(p.id) || 0;
            pool.push(this.enrichOption({
                ...p,
                badge: stacks > 0 ? `×${stacks + 1}` : null
            }));
        });

        return pool;
    }

    /**
     * @param {number} count
     * @param {string[]} [excludeIds] — do not offer these (current hand / banned extra)
     * @param {string[]} [avoidIds] — prefer not to repeat on reroll (soft exclude until pool empty)
     */
    getRandomOptions(count = 3, excludeIds = [], avoidIds = []) {
        const hardExclude = new Set(excludeIds);
        let available = this.getAvailableOptions([...hardExclude]);

        // Soft-avoid: try to not re-show the same cards on reroll
        if (avoidIds.length > 0) {
            const filtered = available.filter(o => !avoidIds.includes(o.id));
            if (filtered.length >= count) available = filtered;
        }

        const picked = [];
        // Guarantee evolution card when ready (classic Survivors moment)
        const evoCards = available.filter(o => o.type === 'evolution');
        if (evoCards.length > 0) {
            picked.push(evoCards[0]);
            available = available.filter(o => o.id !== evoCards[0].id);
            count -= 1;
        }

        const weaponCount = Object.values(this.weaponSystem.weapons).filter(w => w.level > 0 && !w.merged).length;
        const weighted = available.map(opt => {
            let w = 1;
            if (opt.type === 'evolution') w = 0; // already handled
            if (opt.type === 'weapon' && opt.rarity === 'new' && weaponCount < 3) w = 1.6;
            if (opt.type === 'weapon' && weaponCount >= 5) w = 0.7;
            if (opt.type === 'passive' && weaponCount >= 4) w = 1.3;
            if (opt.synergies && opt.synergies.length > 0) w *= 1.25;
            return { opt, w };
        }).filter(x => x.w > 0);

        const pool = [...weighted];
        for (let i = 0; i < count && pool.length > 0; i++) {
            const total = pool.reduce((s, x) => s + x.w, 0);
            let r = Math.random() * total;
            let idx = 0;
            for (; idx < pool.length; idx++) {
                r -= pool[idx].w;
                if (r <= 0) break;
            }
            idx = Math.min(idx, pool.length - 1);
            picked.push(pool[idx].opt);
            pool.splice(idx, 1);
        }
        return picked;
    }

    banOption(optionId) {
        if (optionId) this.bannedIds.add(optionId);
    }

    /**
     * Passive stacks for HUD — stable order by PASSIVE_META keys.
     * @returns {{ id: string, name: string, icon: string, stacks: number, short: string }[]}
     */
    getPassiveStacksForHud() {
        const list = [];
        Object.keys(PASSIVE_META).forEach(id => {
            const stacks = this.passiveStacks.get(id) || 0;
            if (stacks <= 0) return;
            const meta = PASSIVE_META[id];
            list.push({
                id,
                name: meta.name,
                icon: meta.icon,
                stacks,
                short: `${meta.icon} ${meta.name} ×${stacks}`,
                compact: `${meta.icon}×${stacks}`
            });
        });
        return list;
    }

    /**
     * Full loadout for pause / summary screens.
     * @returns {{ weapons: {key,name,icon,level}[], passives: {id,name,icon,stacks}[] }}
     */
    getLoadoutSummary() {
        const weapons = [];
        const shownEvo = new Set();

        Object.keys(WEAPON_META).forEach(key => {
            const level = this.weaponSystem.getWeaponLevel(key);
            if (level <= 0 && !this.weaponSystem.isWeaponConsumed(key)) return;
            if (this.weaponSystem.weapons[key]?.merged) return;

            const evoId = this.weaponSystem.getEvolutionOwningWeapon(key);
            if (evoId) {
                if (shownEvo.has(evoId)) return;
                shownEvo.add(evoId);
                const evo = EVOLUTIONS[evoId];
                weapons.push({
                    key: evoId,
                    name: evo.name,
                    icon: evo.icon,
                    level: 5,
                    evolved: true,
                    line: `${evo.icon} ${evo.name}  ✨`
                });
                return;
            }

            if (level <= 0) return;
            const meta = WEAPON_META[key];
            weapons.push({
                key,
                name: meta.name,
                icon: meta.icon,
                level,
                line: `${meta.icon} ${meta.name}  Ур.${level}`
            });
        });

        weapons.sort((a, b) => {
            if (a.evolved && !b.evolved) return -1;
            if (!a.evolved && b.evolved) return 1;
            return b.level - a.level || a.name.localeCompare(b.name, 'ru');
        });

        const passives = this.getPassiveStacksForHud().map(p => ({
            id: p.id,
            name: p.name,
            icon: p.icon,
            stacks: p.stacks,
            line: p.stacks > 1
                ? `${p.icon} ${p.name} ×${p.stacks}`
                : `${p.icon} ${p.name}`
        }));

        return { weapons, passives };
    }

    applyUpgrade(option) {
        if (option.type === 'evolution' && option.evoId) {
            this.weaponSystem.applyEvolution(option.evoId);
        } else if (option.type === 'weapon') {
            this.weaponSystem.upgradeWeapon(option.key);
            this.maybeToastEvolutionReady();
        } else if (option.type === 'passive' && option.apply) {
            option.apply(this.player);
            const n = this.passiveStacks.get(option.id) || 0;
            this.passiveStacks.set(option.id, n + 1);
            this.maybeToastEvolutionReady();
        }
    }

    maybeToastEvolutionReady() {
        const ready = getReadyEvolutionIds(this.weaponSystem, this);
        if (ready.length === 0) return;
        const evo = EVOLUTIONS[ready[0]];
        if (evo && this.scene.hud?.showToast) {
            this.scene.hud.showToast(`✨ Доступна эволюция: ${evo.name}`, evo.color || '#ffe600');
        }
    }
}
