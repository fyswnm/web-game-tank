// Web Audio API 8-bit retro sound generator
class SoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playShoot() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.13);
        } catch (e) {
            console.warn('playShoot audio error:', e);
        }
    }

    playExplosion(isLarge = false) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const duration = isLarge ? 0.35 : 0.2;
            const now = this.ctx.currentTime;

            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(isLarge ? 400 : 800, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + duration);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(isLarge ? 0.45 : 0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + duration);
        } catch (e) {
            console.warn('playExplosion audio error:', e);
        }
    }

    playBulletClash() {
        // 炮弹相撞抵消的金属清脆撞击声
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {
            console.warn('playBulletClash audio error:', e);
        }
    }

    playPowerUp() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const notes = [330, 440, 550, 660, 880];
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.04);

                gain.gain.setValueAtTime(0.2, now + idx * 0.04);
                gain.gain.exponentialRampToValueAtTime(0.01, now + (idx + 1) * 0.04);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + idx * 0.04);
                osc.stop(now + (idx + 1) * 0.04);
            });
        } catch (e) {
            console.warn('playPowerUp audio error:', e);
        }
    }

    playLaserHum() {
        // 柔和科幻能量光束嗡鸣 (温润的中低频双振荡，低通滤波杜绝尖锐刺耳感)
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const duration = 0.36;

            // 1. 低通滤波器 (过滤 600Hz 以上的所有毛刺高频)
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(550, now);

            // 2. 总音量平缓包络 (低音量，柔和平滑淡入淡出，无任何冲击和破音)
            const mainGain = this.ctx.createGain();
            mainGain.gain.setValueAtTime(0.001, now);
            mainGain.gain.linearRampToValueAtTime(0.045, now + 0.08);
            mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // 3. 主音：温和正弦波 (280Hz -> 250Hz)
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(250, now + duration);

            // 4. 次谐波：厚重三角波底蕴 (140Hz)
            const subOsc = this.ctx.createOscillator();
            subOsc.type = 'triangle';
            subOsc.frequency.setValueAtTime(140, now);
            subOsc.frequency.exponentialRampToValueAtTime(125, now + duration);

            osc.connect(filter);
            subOsc.connect(filter);
            filter.connect(mainGain);
            mainGain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
            subOsc.start(now);
            subOsc.stop(now + duration);
        } catch (e) {
            console.warn('playLaserHum audio error:', e);
        }
    }

    playLaserHit() {
        // 柔和能量灼烧消融音 (温润的能量脉冲，不刺耳)
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const duration = 0.14;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(160, now + duration);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(650, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.07, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.warn('playLaserHit audio error:', e);
        }
    }

    playNukeBomb() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;

            // 1. 低沉剧烈的超重低音震荡
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);

            oscGain.gain.setValueAtTime(0.5, now);
            oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.85);

            // 2. 持续巨响核爆白噪音
            const duration = 0.9;
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(60, now + duration);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.6, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + duration);
        } catch (e) {
            console.warn('playNukeBomb audio error:', e);
        }
    }

    playBaseHit() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.25);

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.26);
        } catch (e) {
            console.warn('playBaseHit audio error:', e);
        }
    }

    playGameOver() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const notes = [440, 415, 392, 349];
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now + idx * 0.15);

                gain.gain.setValueAtTime(0.3, now + idx * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + (idx + 1) * 0.15);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + idx * 0.15);
                osc.stop(now + (idx + 1) * 0.15);
            });
        } catch (e) {
            console.warn('playGameOver audio error:', e);
        }
    }

    playVictory() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, now + idx * 0.12);

                gain.gain.setValueAtTime(0.25, now + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, now + (idx + 1) * 0.12);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + idx * 0.12);
                osc.stop(now + (idx + 1) * 0.12);
            });
        } catch (e) {
            console.warn('playVictory audio error:', e);
        }
    }
}

export const sound = new SoundFX();
