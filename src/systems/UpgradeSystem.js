export class UpgradeSystem {
    constructor(scene, player, weaponSystem) {
        this.scene = scene;
        this.player = player;
        this.weaponSystem = weaponSystem;
    }

    getAvailableOptions() {
        const pool = [];

        // Werewolf Weapon Defs
        const weaponDefs = [
            { key: 'blaster', name: 'Кровавые когти', icon: '🐾', newDesc: 'Открывает рассекающие удары когтями', upDesc: '+Урон, +Скорость маха, Двойной/Тройной разрез' },
            { key: 'spread', name: 'Волчий рык', icon: '🐺', newDesc: 'Открывает ультразвуковой рык волка по площади', upDesc: '+Больше звуковых волн (до 360-градусного рева)' },
            { key: 'orbital', name: 'Духи Луны', icon: '🌕', newDesc: 'Открывает вращающихся лунных духов вокруг оборотня', upDesc: '+Дополнительные лунные духи и расширение орбиты' },
            { key: 'shield', name: 'Аура Хищника', icon: '🩸', newDesc: 'Открывает клыкастую защитную ауру волка', upDesc: '+Радиус ауры, +Урон и эффект отталкивания врагов' },
            { key: 'lightning', name: 'Лунный разряд', icon: '⚡', newDesc: 'Открывает небесную лунную молнию по целям', upDesc: '+Количество отскоков и урон разряда' },
            { key: 'rockets', name: 'Призыв Стаи', icon: '🐺', newDesc: 'Призывает призрачных волков, набрасывающихся на врагов', upDesc: '+Количество призрачных волков и радиус укуса' },
            { key: 'mines', name: 'Кровавые руны', icon: '🔮', newDesc: 'Размещает на земле руны, взрывающиеся под ногами охотников', upDesc: '+Количество рун и радиус детонации' }
        ];

        weaponDefs.forEach(w => {
            const curLvl = this.weaponSystem.getWeaponLevel(w.key);
            if (curLvl < 5) {
                const nextLvl = curLvl + 1;
                const badge = curLvl === 0 ? '[НОВОЕ!]' : `[Ур. ${curLvl} → ${nextLvl}]`;
                const desc = curLvl === 0 ? w.newDesc : w.upDesc;

                pool.push({
                    id: 'weapon_' + w.key,
                    name: `${w.name} ${badge}`,
                    icon: w.icon,
                    description: desc,
                    type: 'weapon',
                    key: w.key
                });
            }
        });

        // Werewolf Passive Instincts
        const passives = [
            { id: 'passive_speed', name: 'Волчья инстинкт-грация', icon: '🐾', description: '+15% к скорости бега оборотня', type: 'passive', apply: (p) => p.speed *= 1.15 },
            { id: 'passive_health', name: 'Густая шкура', icon: '🛡️', description: '+25 к макс. HP и исцеление на 25 HP', type: 'passive', apply: (p) => { p.maxHealth += 25; p.heal(25); } },
            { id: 'passive_damage', name: 'Жажда крови', icon: '⚔️', description: '+20% к урону всех атак хищника', type: 'passive', apply: (p) => p.damageMultiplier *= 1.20 },
            { id: 'passive_firerate', name: 'Ярость зверя', icon: '⏱️', description: '+15% к скорости атак', type: 'passive', apply: (p) => p.fireRateMultiplier *= 1.15 },
            { id: 'passive_magnet', name: 'Звериное чутьё', icon: '🌙', description: '+35% к радиусу сбора эссенции луны', type: 'passive', apply: (p) => p.magnetRadius *= 1.35 }
        ];

        passives.forEach(p => pool.push(p));

        return pool;
    }

    getRandomOptions(count = 3) {
        const available = this.getAvailableOptions();
        const shuffled = [...available].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    applyUpgrade(option) {
        if (option.type === 'weapon') {
            this.weaponSystem.upgradeWeapon(option.key);
        } else if (option.type === 'passive' && option.apply) {
            option.apply(this.player);
        }
    }
}
