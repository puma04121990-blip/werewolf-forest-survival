import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';

/** Tunable balance — keep gameplay knobs in one place */
export const BALANCE = {
    // Player
    playerMaxHp: 150,
    playerSpeed: 250,
    playerMagnet: 220,
    dashCooldown: 2800,
    dashDuration: 220,
    dashSpeedMul: 3.2,
    invulnAfterHit: 650,
    baseRegenPerSec: 0.8,

    // Progression
    xpBase: 45,
    xpGrowth: 1.28,
    xpComboWindow: 1600,
    comboBonusEvery: 10,
    comboXpBonus: 0.08, // +8% XP per 10 combo steps, capped
    comboXpBonusCap: 0.40,

    // XP orbs
    xpOrbMaxActive: 120,
    xpOrbLifetimeGreen: 11000,   // ms
    xpOrbLifetimeCyan: 15000,
    xpOrbLifetimeGold: 20000,
    xpOrbLifetimeMoon: 24000,
    xpOrbWarnMs: 2500,          // flash before expire
    xpOrbMagnetMulGreen: 1.0,
    xpOrbMagnetMulCyan: 1.08,
    xpOrbMagnetMulGold: 1.18,
    xpOrbMagnetMulMoon: 1.35,
    xpOrbPullBase: 320,
    xpOrbPullExtra: 380,
    xpOrbScatterSpeed: 140,
    xpOrbSplitThreshold: 40,    // split drops above this into multiple orbs
    xpOrbComboMoonEvery: 15,    // spawn moon orb every N combo
    xpOrbComboMoonValue: 35,    // base moon orb XP (+combo scale)
    xpOrbShowPickupText: true,

    // Level-up panel
    levelUpRerolls: 2,          // rerolls per level-up screen
    levelUpBans: 1,             // ban one card per level-up screen
    levelUpCardCount: 3,

    // Spawner
    spawnIntervalStart: 2000,
    spawnIntervalMin: 700,
    maxEnemiesStart: 28,
    maxEnemiesCap: 55,
    difficultyStepMs: 28000,
    bossIntervalSec: 150,

    // Enemy scaling per difficulty level (after 1)
    enemyHpPerLevel: 0.14,
    enemyDmgPerLevel: 0.09,
    enemySpeedPerLevel: 0.03,

    // Enemy projectiles (arrows / boss rings)
    // Final speed = base * (startMul + (wave-1) * perWave), clamped
    enemyBulletSpeedStartMul: 0.78,   // slower early game
    enemyBulletSpeedPerWave: 0.055,   // +5.5% per difficulty level
    enemyBulletSpeedMulCap: 1.55,
    enemyBulletDefaultBase: 240,

    // Pickups
    healthDropChance: 0.09,
    healthDropBoss: 0.55,
    healthDropTank: 0.18,
    healBase: 28,
    healMaxHpPct: 0.08,

    // High score key
    storageKey: 'werewolf_forest_best'
};

export const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#0b0c10',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: true,
        fullscreenTarget: 'game-container'
    },
    input: {
        activePointers: 3
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        BootScene,
        PreloadScene,
        MenuScene,
        GameScene,
        PauseScene,
        GameOverScene
    ]
};
