// Particle system for explosions, sparks, and clash effects
export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    createExplosion(x, y, color = '#f97316', count = 15, sizeScale = 1.0) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 120 + 40;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: (Math.random() * 3 + 2) * sizeScale,
                color,
                alpha: 1,
                decay: Math.random() * 1.5 + 2.0
            });
        }
    }

    createClashEffect(x, y) {
        // 炮弹相撞抵消的耀眼星芒粒子
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2 + (Math.random() * 0.2);
            const speed = Math.random() * 160 + 60;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 2.5 + 2,
                color: i % 2 === 0 ? '#38bdf8' : '#fbbf24',
                alpha: 1,
                decay: 3.5
            });
        }
    }

    createBuffPickupEffect(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 90 + 30;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 2,
                color,
                alpha: 1,
                decay: 1.8
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.alpha -= p.decay * dt;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
}
