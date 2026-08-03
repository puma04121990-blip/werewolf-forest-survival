/**
 * Определяет реальную ориентацию устройства (не логический размер Phaser 1280x720).
 * true  = телефон в портрете (вертикально)
 * false = landscape / десктоп
 */
export function isPortraitMode() {
    // Реальные размеры окна браузера
    if (typeof window !== 'undefined' && window.innerWidth && window.innerHeight) {
        return window.innerHeight > window.innerWidth;
    }
    // Fallback
    return false;
}

/**
 * Touch / mobile-like input — show on-screen dash button.
 */
export function isTouchDevice() {
    if (typeof window === 'undefined') return false;
    try {
        if (navigator.maxTouchPoints > 0) return true;
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
        if ('ontouchstart' in window) return true;
    } catch (e) { /* ignore */ }
    return false;
}
