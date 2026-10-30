// Bullet class with collision detection and bullet-bullet canceling
import { TILE_SIZE, TILE_TYPE } from './map.js?v=3';
import { sound } from './audio.js?v=3';

export class Bullet {
    constructor(x, y, dirAngle, speed, isPlayer = false, canBreakStone = false) {
        this.x = x;
        this.y = y;
        this.dirAngle = dirAngle; // 弧度 0: 右, PI/2: 下, PI: 左, -PI/2: 上
        this.speed = speed;
        this.isPlayer = isPlayer;
        this.canBreakStone = canBreakStone;
        this.radius = canBreakStone ? 4.5 : 3.5;
        this.active = true;

        // 计算线速度
        this.vx = Math.cos(dirAngle) * speed;
        this.vy = Math.sin(dirAngle) * speed;

        // 拖尾特效
        this.trail = [];
    }

    update(dt) {
        if (!this.active) return;

        // 记录拖尾
        this.trail.push({ x: this.x, y: this.y, alpha: 0.8 });
        if (this.trail.length > 5) {
            this.trail.shift();
        }
        this.trail.forEach(t => t.alpha -= dt * 3);

        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    checkMapCollision(gameMap, particles) {
        if (!this.active) return false;

        const col = Math.floor(this.x / TILE_SIZE);
        const row = Math.floor(this.y / TILE_SIZE);

        // 出界检测
        if (col < 0 || col >= gameMap.cols || row < 0 || row >= gameMap.rows) {
            this.active = false;
            return true;
        }

        const tileType = gameMap.grid[row][col];
        if (tileType !== TILE_TYPE.EMPTY) {
            const hitResult = gameMap.damageTile(col, row, this.canBreakStone);

            // 撞击音效与特殊判定 (老家受损音效反馈)
            if (tileType === TILE_TYPE.BASE) {
                if (gameMap.baseDestroyed) {
                    sound.playExplosion(true);
                } else {
                    sound.playBaseHit();
                }
            }

            // 产生撞击火花/碎屑粒子
            let sparkColor = '#d97706';
            if (tileType === TILE_TYPE.STONE) {
                sparkColor = '#ced4da';
            } else if (tileType === TILE_TYPE.BASE) {
                sparkColor = '#ef4444';
            }

            if (particles) {
                const count = tileType === TILE_TYPE.BASE ? 22 : 8;
                const scale = tileType === TILE_TYPE.BASE ? 1.8 : 1.2;
                particles.createExplosion(this.x, this.y, sparkColor, count, scale);
            }

            this.active = false;
            return true;
        }

        return false;
    }

    draw(ctx) {
        if (!this.active) return;

        // 绘制拖尾
        this.trail.forEach(t => {
            if (t.alpha > 0) {
                ctx.fillStyle = this.isPlayer 
                    ? `rgba(56, 189, 248, ${t.alpha * 0.5})` 
                    : `rgba(239, 68, 68, ${t.alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, this.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // 绘制弹头
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.canBreakStone) {
            // 强化穿石弹：金色发光大弹头
            const glow = Math.sin(Date.now() / 80) * 2 + 6;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = glow;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 普通炮弹
            ctx.fillStyle = this.isPlayer ? '#38bdf8' : '#f87171';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // 高光亮点
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
