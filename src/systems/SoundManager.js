export class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.musicPlaying = false;
        this.musicInterval = null;
        this.sampleRate = 44100;
        this.init();
    }

    init() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            if (this.ctx) {
                this.sampleRate = this.ctx.sampleRate || 44100;
            }
        } catch (e) {
            console.warn('Web Audio API не поддерживается', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBackgroundMusic();
        } else {
            this.startBackgroundMusic();
        }
        return this.isMuted;
    }

    // --- 32-BIT FLOAT AUDIO BUFFER GENERATOR ---
    create32BitAudioBuffer(durationSeconds, generatorFn) {
        if (!this.ctx) return null;
        const numSamples = Math.floor(this.sampleRate * durationSeconds);
        const buffer = this.ctx.createBuffer(1, numSamples, this.sampleRate);
        // Direct 32-Bit IEEE Floating-Point PCM Audio Buffer
        const channelData = buffer.getChannelData(0); // Float32Array
        for (let i = 0; i < numSamples; i++) {
            channelData[i] = generatorFn(i, numSamples, i / this.sampleRate);
        }
        return buffer;
    }

    // --- МРАЧНОЕ ГОТИЧЕСКОЕ МУЗЫКАЛЬНОЕ СОПРОВОЖДЕНИЕ (32-Bit Sub-Bass Dark Ambient) ---
    startBackgroundMusic() {
        if (this.isMuted || !this.ctx || this.musicPlaying) return;
        this.resume();
        this.musicPlaying = true;

        // Gloomy D Minor Sub-Bass & Minor 3rd Droop Notes
        const darkNotes = [36.71, 36.71, 32.70, 34.65, 29.14]; // D1, D1, C1, C#1, A0 Sub-Bass
        let noteIdx = 0;

        this.musicInterval = setInterval(() => {
            if (this.isMuted || !this.musicPlaying) return;

            const now = this.ctx.currentTime;
            const freq = darkNotes[noteIdx];

            // 1. Deep Sub-Bass Drone
            const oscSub = this.ctx.createOscillator();
            const gainSub = this.ctx.createGain();

            oscSub.type = 'sawtooth';
            oscSub.frequency.setValueAtTime(freq, now);
            oscSub.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.95);

            // Lowpass Filter for Dark Gloomy Tone
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(220, now);
            filter.frequency.linearRampToValueAtTime(80, now + 0.95);

            gainSub.gain.setValueAtTime(0.18, now);
            gainSub.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

            oscSub.connect(filter);
            filter.connect(gainSub);
            gainSub.connect(this.ctx.destination);

            oscSub.start();
            oscSub.stop(now + 0.95);

            // 2. High Eerie Whisper Arpeggio (every 2nd tick)
            if (noteIdx % 2 === 0) {
                const oscEerie = this.ctx.createOscillator();
                const gainEerie = this.ctx.createGain();

                oscEerie.type = 'sine';
                oscEerie.frequency.setValueAtTime(freq * 8, now + 0.1); // High minor harmonic
                oscEerie.frequency.exponentialRampToValueAtTime(freq * 6, now + 0.6);

                gainEerie.gain.setValueAtTime(0.03, now + 0.1);
                gainEerie.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

                oscEerie.connect(gainEerie);
                gainEerie.connect(this.ctx.destination);

                oscEerie.start(now + 0.1);
                oscEerie.stop(now + 0.6);
            }

            noteIdx = (noteIdx + 1) % darkNotes.length;
        }, 800);
    }

    stopBackgroundMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }

    // --- ЗВУКОВЫЕ ЭФФЕКТЫ (32-Bit Float Dynamic Range SFX) ---

    playClaw() {
        if (this.isMuted || !this.ctx) return;
        this.resume();

        // 32-Bit Float Synthesized Claw Slash
        const buffer = this.create32BitAudioBuffer(0.09, (i, total, t) => {
            const freq = 650 - (t / 0.09) * 500;
            const noise = (Math.random() * 2 - 1) * 0.3;
            const sine = Math.sin(2 * Math.PI * freq * t);
            const env = Math.exp(-t * 35);
            return (sine + noise) * env * 0.25;
        });

        if (buffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(this.ctx.destination);
            src.start();
        }
    }

    playHowl() {
        if (this.isMuted || !this.ctx) return;
        this.resume();

        // 32-Bit Float Werewolf Howl
        const buffer = this.create32BitAudioBuffer(0.55, (i, total, t) => {
            let freq;
            if (t < 0.25) {
                freq = 200 + (t / 0.25) * 220; // Rise A3 -> A4
            } else {
                freq = 420 - ((t - 0.25) / 0.3) * 110; // Fall A4 -> E4
            }
            const sine = Math.sin(2 * Math.PI * freq * t);
            const env = Math.exp(-t * 3.5);
            return sine * env * 0.3;
        });

        if (buffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(this.ctx.destination);
            src.start();
        }
    }

    playDash() {
        this.playHowl();
    }

    playHit() {
        if (this.isMuted || !this.ctx) return;
        this.resume();

        // 32-Bit Float Dark Impact Thud
        const buffer = this.create32BitAudioBuffer(0.18, (i, total, t) => {
            const freq = 180 - (t / 0.18) * 140;
            const noise = (Math.random() * 2 - 1) * 0.4;
            const tri = (Math.abs((t * freq) % 1 - 0.5) - 0.25) * 4;
            const env = Math.exp(-t * 22);
            return (tri + noise) * env * 0.35;
        });

        if (buffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(this.ctx.destination);
            src.start();
        }
    }

    playExplosion() {
        if (this.isMuted || !this.ctx) return;
        this.resume();

        // 32-Bit Float Heavy Sub-Bass Explosion
        const buffer = this.create32BitAudioBuffer(0.25, (i, total, t) => {
            const noise = Math.random() * 2 - 1;
            const subFreq = 80 - (t / 0.25) * 60;
            const subSine = Math.sin(2 * Math.PI * subFreq * t);
            const env = Math.exp(-t * 12);
            return (noise * 0.6 + subSine * 0.8) * env * 0.4;
        });

        if (buffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(this.ctx.destination);
            src.start();
        }
    }

    playXp() {
        if (this.isMuted || !this.ctx) return;
        this.resume();

        const buffer = this.create32BitAudioBuffer(0.12, (i, total, t) => {
            const freq = t < 0.06 ? 587.33 : 880.00;
            const sine = Math.sin(2 * Math.PI * freq * t);
            const env = Math.exp(-t * 20);
            return sine * env * 0.15;
        });

        if (buffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(this.ctx.destination);
            src.start();
        }
    }

    playHeal() {
        if (this.isMuted || !this.ctx) return;
        this.resume();

        const buffer = this.create32BitAudioBuffer(0.25, (i, total, t) => {
            let freq = 440;
            if (t > 0.14) freq = 659.25;
            else if (t > 0.07) freq = 554.37;
            const sine = Math.sin(2 * Math.PI * freq * t);
            const env = Math.exp(-t * 8);
            return sine * env * 0.2;
        });

        if (buffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(this.ctx.destination);
            src.start();
        }
    }

    playLevelUp() {
        if (this.isMuted || !this.ctx) return;
        this.resume();

        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.08 + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(this.ctx.currentTime + idx * 0.08);
            osc.stop(this.ctx.currentTime + idx * 0.08 + 0.22);
        });
    }

    playButtonClick() {
        if (this.isMuted || !this.ctx) return;
        this.resume();

        const buffer = this.create32BitAudioBuffer(0.06, (i, total, t) => {
            const freq = 400 - (t / 0.06) * 200;
            const sine = Math.sin(2 * Math.PI * freq * t);
            const env = Math.exp(-t * 40);
            return sine * env * 0.15;
        });

        if (buffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(this.ctx.destination);
            src.start();
        }
    }

    playLaser() {
        this.playClaw();
    }
}

export const soundManager = new SoundManager();
