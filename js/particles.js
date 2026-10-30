// Particle system for explosions, sparks, and clash effects
export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.shockwaves = [];
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

    createShockwave(x, y, maxRadius = 180, color = 'rgba(255, 200, 50, 0.8)') {
        this.shockwaves.push({
            x,
            y,
            radius: 8,
            maxRadius,
            color,
            lineWidth: 6,
            alpha: 1,
            speed: 420
        });
    }

    createNukeExplosion(x, y) {
        // 多重扩散能量冲击波
        this.createShockwave(x, y, 320, 'rgba(239, 68, 68, 0.9)');
        this.createShockwave(x, y, 220, 'rgba(249, 115, 22, 0.95)');
        this.createShockwave(x, y, 140, 'rgba(255, 255, 255, 1.0)');

        // 巨量核心烈焰与火花粒子
        this.createExplosion(x, y, '#ef4444', 45, 2.6);
        this.createExplosion(x, y, '#f97316', 35, 2.0);
        this.createExplosion(x, y, '#fbbf24', 25, 1.5);
        this.createExplosion(x, y, '#ffffff', 20, 1.2);
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
        // 粒子更新
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.alpha -= p.decay * dt;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 冲击波更新
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed * dt;
            sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
            sw.lineWidth = Math.max(1, 6 * sw.alpha);
            if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // 先绘制冲击波光环
        this.shockwaves.forEach(sw => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, sw.alpha);
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = sw.lineWidth;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        // 绘制爆炸碎屑粒子
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
