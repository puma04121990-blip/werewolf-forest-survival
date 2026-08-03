// Do NOT import BALANCE at module top-level — config.js imports MenuScene → MetaProgress
// which creates a circular dependency (TDZ: "Cannot access BALANCE before initialization").
const STORAGE_KEY = 'werewolf_forest_meta_v1';
const BASE_LEVELUP_REROLLS = 2;

/** Catalog of permanent unlocks */
export const META_UNLOCKS = {
    // Starting weapons (beyond default claws)
    start_spread: {
        id: 'start_spread',
        category: 'weapon',
        weaponKey: 'spread',
        name: 'Старт: Волчий рык',
        icon: '🐺',
        cost: 40,
        desc: 'Начинать забег с Волчьим рыком'
    },
    start_orbital: {
        id: 'start_orbital',
        category: 'weapon',
        weaponKey: 'orbital',
        name: 'Старт: Духи Луны',
        icon: '🌕',
        cost: 60,
        desc: 'Начинать забег с Духами Луны'
    },
    start_shield: {
        id: 'start_shield',
        category: 'weapon',
        weaponKey: 'shield',
        name: 'Старт: Аура Хищника',
        icon: '🩸',
        cost: 55,
        desc: 'Начинать забег с Аурой Хищника'
    },
    start_lightning: {
        id: 'start_lightning',
        category: 'weapon',
        weaponKey: 'lightning',
        name: 'Старт: Лунный разряд',
        icon: '⚡',
        cost: 75,
        desc: 'Начинать забег с Лунным разрядом'
    },
    start_rockets: {
        id: 'start_rockets',
        category: 'weapon',
        weaponKey: 'rockets',
        name: 'Старт: Призыв Стаи',
        icon: '👻',
        cost: 90,
        desc: 'Начинать забег с Призывом Стаи'
    },

    // Skins
    skin_snow: {
        id: 'skin_snow',
        category: 'skin',
        skinId: 'snow',
        name: 'Снежный оборотень',
        icon: '❄️',
        cost: 30,
        desc: 'Светлая шкура',
        tint: 0xc8ddff
    },
    skin_crimson: {
        id: 'skin_crimson',
        category: 'skin',
        skinId: 'crimson',
        name: 'Кровавый оборотень',
        icon: '🩸',
        cost: 45,
        desc: 'Багровая шкура',
        tint: 0xff4466
    },
    skin_gold: {
        id: 'skin_gold',
        category: 'skin',
        skinId: 'gold',
        name: 'Лунный страж',
        icon: '✨',
        cost: 80,
        desc: 'Золотистое свечение',
        tint: 0xffcc55
    },
    skin_shadow: {
        id: 'skin_shadow',
        category: 'skin',
        skinId: 'shadow',
        name: 'Тень леса',
        icon: '🌑',
        cost: 100,
        desc: 'Тёмная шкура',
        tint: 0x556688
    },

    // QoL
    extra_reroll: {
        id: 'extra_reroll',
        category: 'perk',
        name: '+1 Реролл',
        icon: '🎲',
        cost: 50,
        desc: '+1 реролл на каждом level-up (навсегда)'
    },
    extra_reroll_2: {
        id: 'extra_reroll_2',
        category: 'perk',
        name: '+1 Реролл II',
        icon: '🎲',
        cost: 120,
        desc: 'Ещё +1 реролл (итого +2). Нужен +1 Реролл',
        requires: ['extra_reroll']
    }
};

export const DEFAULT_WEAPON = 'blaster';
export const DEFAULT_SKIN = 'default';

const DEFAULT_SKIN_META = {
    id: 'default',
    name: 'Лесной оборотень',
    icon: '🐺',
    tint: null
};

function defaultState() {
    return {
        essence: 0,
        totalEssenceEarned: 0,
        unlocked: [],
        selectedWeapon: DEFAULT_WEAPON,
        selectedSkin: DEFAULT_SKIN,
        runsCompleted: 0
    };
}

export class MetaProgress {
    static load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaultState();
            const data = JSON.parse(raw);
            return {
                ...defaultState(),
                ...data,
                unlocked: Array.isArray(data.unlocked) ? data.unlocked : []
            };
        } catch (e) {
            return defaultState();
        }
    }

    static save(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    static getEssence() {
        return this.load().essence || 0;
    }

    static isUnlocked(id) {
        if (!id || id === 'default' || id === DEFAULT_WEAPON) return true;
        // default claws always free
        if (id === 'start_blaster') return true;
        return this.load().unlocked.includes(id);
    }

    static canUnlock(id) {
        const def = META_UNLOCKS[id];
        if (!def) return false;
        if (this.isUnlocked(id)) return false;
        if (def.requires) {
            for (const req of def.requires) {
                if (!this.isUnlocked(req)) return false;
            }
        }
        return this.getEssence() >= def.cost;
    }

    static unlock(id) {
        const def = META_UNLOCKS[id];
        if (!def || !this.canUnlock(id)) return { ok: false, reason: 'cannot' };
        const state = this.load();
        if (state.essence < def.cost) return { ok: false, reason: 'essence' };
        state.essence -= def.cost;
        if (!state.unlocked.includes(id)) state.unlocked.push(id);
        this.save(state);
        return { ok: true, state };
    }

    static getExtraRerolls() {
        let n = 0;
        if (this.isUnlocked('extra_reroll')) n += 1;
        if (this.isUnlocked('extra_reroll_2')) n += 1;
        return n;
    }

    static getLevelUpRerolls() {
        return BASE_LEVELUP_REROLLS + this.getExtraRerolls();
    }

    static getSelectedWeapon() {
        const state = this.load();
        const key = state.selectedWeapon || DEFAULT_WEAPON;
        // Validate still unlocked
        if (key === DEFAULT_WEAPON) return key;
        const unlockId = Object.values(META_UNLOCKS).find(
            u => u.category === 'weapon' && u.weaponKey === key
        )?.id;
        if (unlockId && this.isUnlocked(unlockId)) return key;
        return DEFAULT_WEAPON;
    }

    static setSelectedWeapon(weaponKey) {
        const state = this.load();
        if (weaponKey === DEFAULT_WEAPON) {
            state.selectedWeapon = DEFAULT_WEAPON;
            this.save(state);
            return true;
        }
        const unlockId = Object.values(META_UNLOCKS).find(
            u => u.category === 'weapon' && u.weaponKey === weaponKey
        )?.id;
        if (!unlockId || !this.isUnlocked(unlockId)) return false;
        state.selectedWeapon = weaponKey;
        this.save(state);
        return true;
    }

    static getSelectedSkin() {
        const state = this.load();
        const id = state.selectedSkin || DEFAULT_SKIN;
        if (id === DEFAULT_SKIN) return DEFAULT_SKIN;
        const unlockId = Object.values(META_UNLOCKS).find(
            u => u.category === 'skin' && u.skinId === id
        )?.id;
        if (unlockId && this.isUnlocked(unlockId)) return id;
        return DEFAULT_SKIN;
    }

    static setSelectedSkin(skinId) {
        const state = this.load();
        if (skinId === DEFAULT_SKIN) {
            state.selectedSkin = DEFAULT_SKIN;
            this.save(state);
            return true;
        }
        const unlockId = Object.values(META_UNLOCKS).find(
            u => u.category === 'skin' && u.skinId === skinId
        )?.id;
        if (!unlockId || !this.isUnlocked(unlockId)) return false;
        state.selectedSkin = skinId;
        this.save(state);
        return true;
    }

    static getSkinMeta(skinId) {
        if (!skinId || skinId === DEFAULT_SKIN) return DEFAULT_SKIN_META;
        const u = Object.values(META_UNLOCKS).find(
            x => x.category === 'skin' && x.skinId === skinId
        );
        if (!u) return DEFAULT_SKIN_META;
        return { id: u.skinId, name: u.name, icon: u.icon, tint: u.tint };
    }

    static getUnlockedStartWeapons() {
        const list = [
            { key: DEFAULT_WEAPON, name: 'Кровавые когти', icon: '🐾', free: true }
        ];
        Object.values(META_UNLOCKS).forEach(u => {
            if (u.category !== 'weapon') return;
            if (!this.isUnlocked(u.id)) return;
            list.push({
                key: u.weaponKey,
                name: u.name.replace('Старт: ', ''),
                icon: u.icon,
                free: false
            });
        });
        return list;
    }

    static getUnlockedSkins() {
        const list = [{ ...DEFAULT_SKIN_META, free: true }];
        Object.values(META_UNLOCKS).forEach(u => {
            if (u.category !== 'skin') return;
            if (!this.isUnlocked(u.id)) return;
            list.push({
                id: u.skinId,
                name: u.name,
                icon: u.icon,
                tint: u.tint,
                free: false
            });
        });
        return list;
    }

    /**
     * Essence from a finished run.
     * ~ time/12 + kills/3 + level*2 + wave + combo/20, min 5
     */
    static calculateRunEssence(stats = {}) {
        const time = stats.time || 0;
        const kills = stats.kills || 0;
        const level = stats.level || 1;
        const wave = stats.wave || 1;
        const maxCombo = stats.maxCombo || 0;
        const mul = stats.essenceMul != null ? stats.essenceMul : 1;
        const raw =
            Math.floor(time / 12) +
            Math.floor(kills / 3) +
            level * 2 +
            wave +
            Math.floor(maxCombo / 20);
        return Math.max(5, Math.floor(raw * mul));
    }

    /**
     * Award essence after a run. Idempotent per call (caller once).
     * @returns {{ earned: number, total: number, runs: number }}
     */
    static awardRun(stats) {
        const earned = this.calculateRunEssence(stats);
        const state = this.load();
        state.essence = (state.essence || 0) + earned;
        state.totalEssenceEarned = (state.totalEssenceEarned || 0) + earned;
        state.runsCompleted = (state.runsCompleted || 0) + 1;
        this.save(state);
        return {
            earned,
            total: state.essence,
            runs: state.runsCompleted
        };
    }

    static listShopItems() {
        return Object.values(META_UNLOCKS).map(u => {
            const unlocked = this.isUnlocked(u.id);
            const reqOk = !u.requires || u.requires.every(r => this.isUnlocked(r));
            return {
                ...u,
                unlocked,
                reqOk,
                affordable: this.getEssence() >= u.cost,
                canBuy: !unlocked && reqOk && this.getEssence() >= u.cost
            };
        });
    }
}
