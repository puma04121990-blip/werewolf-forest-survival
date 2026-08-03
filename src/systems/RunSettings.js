/**
 * Difficulty modes + daily seed for deterministic runs.
 */

export const DIFFICULTIES = {
    easy: {
        id: 'easy',
        name: 'Лёгкий',
        icon: '🌿',
        color: '#88ffaa',
        desc: '−HP/урон врагов, реже спавн',
        enemyHpMul: 0.72,
        enemyDmgMul: 0.78,
        spawnIntervalMul: 1.2,   // slower spawns
        maxEnemiesMul: 0.85,
        playerHpMul: 1.1,
        xpMul: 0.9,
        essenceMul: 0.8
    },
    normal: {
        id: 'normal',
        name: 'Нормал',
        icon: '🐺',
        color: '#ffe600',
        desc: 'Баланс по умолчанию',
        enemyHpMul: 1,
        enemyDmgMul: 1,
        spawnIntervalMul: 1,
        maxEnemiesMul: 1,
        playerHpMul: 1,
        xpMul: 1,
        essenceMul: 1
    },
    blood: {
        id: 'blood',
        name: 'Кровавая луна',
        icon: '🩸',
        color: '#ff4466',
        desc: '+HP/урон врагов, плотнее волны, +XP/эссенция',
        enemyHpMul: 1.5,
        enemyDmgMul: 1.35,
        spawnIntervalMul: 0.78,
        maxEnemiesMul: 1.2,
        playerHpMul: 1,
        xpMul: 1.3,
        essenceMul: 1.5
    }
};

const SETTINGS_KEY = 'werewolf_forest_run_settings';
const DAILY_KEY = 'werewolf_forest_daily_v1';

/** Mulberry32 — small seeded PRNG */
export function createRng(seed) {
    let s = (seed >>> 0) || 1;
    return function random() {
        s |= 0;
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function hashStringToSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** UTC date key YYYY-MM-DD */
export function getUtcDateKey(date = new Date()) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function getDailySeedInfo() {
    const dateKey = getUtcDateKey();
    const seed = hashStringToSeed(`werewolf-daily-${dateKey}`);
    return { dateKey, seed };
}

export class RunSettings {
    static loadPrefs() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) return { difficulty: 'normal' };
            const data = JSON.parse(raw);
            return {
                difficulty: DIFFICULTIES[data.difficulty] ? data.difficulty : 'normal'
            };
        } catch (e) {
            return { difficulty: 'normal' };
        }
    }

    static savePrefs(prefs) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(prefs));
        } catch (e) { /* ignore */ }
    }

    static getDifficultyId() {
        return this.loadPrefs().difficulty || 'normal';
    }

    static setDifficultyId(id) {
        if (!DIFFICULTIES[id]) return;
        const p = this.loadPrefs();
        p.difficulty = id;
        this.savePrefs(p);
    }

    static getDifficulty(id = null) {
        return DIFFICULTIES[id || this.getDifficultyId()] || DIFFICULTIES.normal;
    }

    /**
     * Build run config for GameScene.init
     * @param {{ mode?: 'casual'|'daily', difficulty?: string }} opts
     */
    static buildRunConfig(opts = {}) {
        const mode = opts.mode === 'daily' ? 'daily' : 'casual';
        const difficultyId = opts.difficulty || this.getDifficultyId();
        const difficulty = this.getDifficulty(difficultyId);
        let seed = null;
        let dateKey = null;

        if (mode === 'daily') {
            const daily = getDailySeedInfo();
            seed = daily.seed;
            dateKey = daily.dateKey;
            // Daily always on chosen difficulty (stored pref)
        } else if (opts.seed != null) {
            seed = opts.seed >>> 0;
        }

        return {
            mode,
            difficultyId: difficulty.id,
            difficulty,
            seed,
            dateKey,
            isDaily: mode === 'daily'
        };
    }

    static loadDailyBoard() {
        try {
            const raw = localStorage.getItem(DAILY_KEY);
            if (!raw) return {};
            return JSON.parse(raw) || {};
        } catch (e) {
            return {};
        }
    }

    static saveDailyBoard(board) {
        try {
            localStorage.setItem(DAILY_KEY, JSON.stringify(board));
        } catch (e) { /* ignore */ }
    }

    /**
     * Best run for today's daily (by difficulty).
     * Score: longer time wins, then kills.
     */
    static getTodayDailyBest(difficultyId = null) {
        const { dateKey } = getDailySeedInfo();
        const diff = difficultyId || this.getDifficultyId();
        const board = this.loadDailyBoard();
        const day = board[dateKey];
        if (!day || !day[diff]) return null;
        return day[diff];
    }

    /**
     * @returns {{ isNew: boolean, best: object }}
     */
    static submitDailyRun(stats, difficultyId) {
        const { dateKey, seed } = getDailySeedInfo();
        const diff = difficultyId || 'normal';
        const board = this.loadDailyBoard();
        if (!board[dateKey]) board[dateKey] = {};

        const run = {
            time: stats.time || 0,
            kills: stats.kills || 0,
            level: stats.level || 1,
            wave: stats.wave || 1,
            maxCombo: stats.maxCombo || 0,
            seed,
            difficulty: diff,
            dateKey
        };

        const prev = board[dateKey][diff];
        let isNew = false;
        if (
            !prev ||
            run.time > prev.time ||
            (run.time === prev.time && run.kills > prev.kills)
        ) {
            board[dateKey][diff] = run;
            isNew = true;
            this.saveDailyBoard(board);
        }

        return { isNew, best: board[dateKey][diff], run };
    }
}

/**
 * Scene helper: seeded random or Math.random
 */
export function sceneRandom(scene) {
    if (scene && typeof scene.rng === 'function') return scene.rng();
    return Math.random();
}
