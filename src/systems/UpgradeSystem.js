export class UpgradeSystem {
    constructor(scene, player, weaponSystem) {
        this.scene = scene;
        this.player = player;
        this.weaponSystem = weaponSystem;
    }

    getAvailableOptions() {
        const pool = [];

        const weaponDefs = [
            { key: 'blaster', name: 'Кровавые когти', icon: '🐾', rarity: 'weapon',
              newDesc: 'Авто-разрезы по ближайшему врагу',
              upDesc: '+урон, +скорость, двойной/тройной разрез' },
            { key: 'spread', name: 'Волчий рык', icon: '🐺', rarity: 'weapon',
              newDesc: 'Веер ультразвуковых волн',
              upDesc: 'Больше волн (до кругового рёва на 5 ур.)' },
            { key: 'orbital', name: 'Духи Луны', icon: '🌕', rarity: 'weapon',
              newDesc: 'Вращающиеся лунные духи-щиты',
              upDesc: '+духи, +орбита, +урон касанием' },
            { key: 'shield', name: 'Аура Хищника', icon: '🩸', rarity: 'weapon',
              newDesc: 'Аура, жгущая врагов рядом',
              upDesc: '+радиус, +урон, отталкивание с 3 ур.' },
            { key: 'lightning', name: 'Лунный разряд', icon: '⚡', rarity: 'weapon',
              newDesc: 'Цепная молния по группе целей',
              upDesc: '+отскоки и урон (двойной разряд на 5 ур.)' },
            { key: 'rockets', name: 'Призыв Стаи', icon: '👻', rarity: 'weapon',
              newDesc: 'Призрачные волки с укусом по площади',
              upDesc: '+волки и радиус укуса' },
            { key: 'mines', name: 'Кровавые руны', icon: '🔮', rarity: 'weapon',
              newDesc: 'Руны-ловушки под ногами охотников',
              upDesc: '+руны и радиус детонации' }
        ];

        weaponDefs.forEach(w => {
            const curLvl = this.weaponSystem.getWeaponLevel(w.key);
            if (curLvl < 5) {
                const nextLvl = curLvl + 1;
                const isNew = curLvl === 0;
                pool.push({
                    id: 'weapon_' + w.key,
                    name: isNew ? `${w.name}` : `${w.name}`,
                    badge: isNew ? 'НОВОЕ' : `Ур. ${curLvl}→${nextLvl}`,
                    icon: w.icon,
                    description: isNew ? w.newDesc : w.upDesc,
                    type: 'weapon',
                    key: w.key,
                    rarity: isNew ? 'new' : 'upgrade'
                });
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

        passives.forEach(p => pool.push(p));
        return pool;
    }

    getRandomOptions(count = 3) {
        const available = this.getAvailableOptions();
        // Weight: slightly prefer weapons if player has few, passives if many weapons
        const weaponCount = Object.values(this.weaponSystem.weapons).filter(w => w.level > 0).length;
        const weighted = available.map(opt => {
            let w = 1;
            if (opt.type === 'weapon' && opt.rarity === 'new' && weaponCount < 3) w = 1.6;
            if (opt.type === 'weapon' && weaponCount >= 5) w = 0.7;
            if (opt.type === 'passive' && weaponCount >= 4) w = 1.3;
            return { opt, w };
        });

        const picked = [];
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

    applyUpgrade(option) {
        if (option.type === 'weapon') {
            this.weaponSystem.upgradeWeapon(option.key);
        } else if (option.type === 'passive' && option.apply) {
            option.apply(this.player);
        }
    }
}
