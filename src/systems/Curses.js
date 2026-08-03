/**
 * Risk/reward curses for level-up — strong buff + permanent drawback.
 */

export const CURSES = {
    curse_blood_pact: {
        id: 'curse_blood_pact',
        name: 'Кровавый договор',
        icon: '☠️',
        badge: 'ПРОКЛЯТИЕ',
        description: '+25% урона всех атак  ·  −30 макс. HP',
        rarity: 'curse',
        maxStacks: 4,
        dpsLine: 'DPS↑ · HP↓',
        roleTag: '☠️ CURSE',
        roleColor: '#ff4466',
        apply(player) {
            player.damageMultiplier *= 1.25;
            const lose = 30;
            player.maxHealth = Math.max(50, player.maxHealth - lose);
            if (player.health > player.maxHealth) {
                player.health = player.maxHealth;
            }
        }
    },
    curse_hollow_moon: {
        id: 'curse_hollow_moon',
        name: 'Полая луна',
        icon: '🌑',
        badge: 'ПРОКЛЯТИЕ',
        description: '+20% скорости атак  ·  −35% радиуса магнита',
        rarity: 'curse',
        maxStacks: 4,
        dpsLine: 'Скорость↑ · Магнит↓',
        roleTag: '☠️ CURSE',
        roleColor: '#aa66ff',
        apply(player) {
            player.fireRateMultiplier *= 1.20;
            player.magnetRadius = Math.max(70, player.magnetRadius * 0.65);
        }
    }
};

export function curseToCard(curse, stacks = 0) {
    return {
        id: curse.id,
        name: curse.name,
        icon: curse.icon,
        badge: stacks > 0 ? `ПРОКЛЯТИЕ ×${stacks + 1}` : curse.badge,
        description: curse.description,
        type: 'curse',
        rarity: 'curse',
        dpsLine: curse.dpsLine,
        roleTag: curse.roleTag,
        roleColor: curse.roleColor,
        apply: curse.apply,
        maxStacks: curse.maxStacks
    };
}

export function getAvailableCurseCards(curseStacks) {
    return Object.values(CURSES)
        .filter(c => (curseStacks.get(c.id) || 0) < (c.maxStacks || 99))
        .map(c => curseToCard(c, curseStacks.get(c.id) || 0));
}
