import { config } from './config.js';

/**
 * ES modules are deferred and may run AFTER window "load" already fired.
 * Listening only to "load" then never starts the game → black screen.
 */
function startGame() {
    if (typeof Phaser === 'undefined') {
        showFatal('Phaser не загрузился (CDN / сеть). Обнови страницу или отключи блокировщик.');
        return;
    }
    try {
        if (window.game) {
            try { window.game.destroy(true); } catch (e) { /* ignore */ }
        }
        window.game = new Phaser.Game(config);
        hideBootUI();
    } catch (err) {
        console.error(err);
        showFatal('Ошибка запуска: ' + (err && err.message ? err.message : String(err)));
    }
}

function showFatal(msg) {
    const el = document.getElementById('boot-error');
    if (el) {
        el.style.display = 'block';
        el.textContent = msg;
    } else {
        alert(msg);
    }
}

function hideBootUI() {
    const el = document.getElementById('boot-status');
    if (el) el.style.display = 'none';
}

// Prefer immediate start when module runs (Phaser script is above us in HTML)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // microtask: let Phaser global settle if classic script just finished
    queueMicrotask(startGame);
} else {
    window.addEventListener('DOMContentLoaded', startGame);
    // fallback if DOMContentLoaded already passed in odd browsers
    window.addEventListener('load', () => {
        if (!window.game) startGame();
    });
}
