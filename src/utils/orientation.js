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
