// Power-up collectibles and buffs
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from './map.js?v=3';

export const BUFF_TYPE = {
    FORTRESS: 'fortress',       // 老家铁壁无敌
    POWER_SHELL: 'powershell',  // 穿石强力弹
    SHIELD: 'shield',           // 自身无敌护盾
    SPEED: 'speed',             // 自身加速
    BOMB: 'bomb'                // 全屏大炸弹 (清屏消灭所有敌军)
};

export class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = 32;
        this.lifetime = 18; // 18秒未拾取自动消失
        this.age = 0;
        this.active = true;
    }

    update(dt) {
        this.age += dt;
        if (this.age >= this.lifetime) {
            this.active = false;
        }
    }

    checkCollision(tankX, tankY, tankSize) {
        if (!this.active) return false;
        const dist = Math.hypot(this.x - tankX, this.y - tankY);
        return dist < (this.size / 2 + tankSize / 2);
    }

    draw(ctx) {
        if (!this.active) return;

        // 快消失时高频闪烁
        if (this.lifetime - this.age < 4 && Math.floor(this.age * 8) % 2 === 0) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // 呼吸光晕
        const pulse = Math.sin(this.age * 6) * 4 + 18;
        ctx.shadowColor = this.getColor();
        ctx.shadowBlur = 10;

        // 道具外框底座
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

        ctx.strokeStyle = this.getColor();
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-this.size / 2 + 1, -this.size / 2 + 1, this.size - 2, this.size - 2);

        // 绘制对应图标
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        switch (this.type) {
            case BUFF_TYPE.FORTRESS:
                // 铲子/城堡图标
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText('🏰', 0, 1);
                break;
            case BUFF_TYPE.POWER_SHELL:
                // 穿石强力五星
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText('⭐', 0, 1);
                break;
            case BUFF_TYPE.SHIELD:
                // 护盾/头盔
                ctx.fillStyle = '#3b82f6';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText('🛡️', 0, 1);
                break;
            case BUFF_TYPE.SPEED:
                // 闪电加速
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText('⚡', 0, 1);
                break;
            case BUFF_TYPE.BOMB:
                // 全屏大炸弹
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 20px sans-serif';
                ctx.fillText('💣', 0, 1);
                break;
        }

        ctx.restore();
    }

    getColor() {
        switch (this.type) {
            case BUFF_TYPE.FORTRESS: return '#fbbf24';
            case BUFF_TYPE.POWER_SHELL: return '#f87171';
            case BUFF_TYPE.SHIELD: return '#60a5fa';
            case BUFF_TYPE.SPEED: return '#34d399';
            case BUFF_TYPE.BOMB: return '#ef4444';
            default: return '#ffffff';
        }
    }

    static spawnRandom(gameMap) {
        // 在空地上随机生成一个 Buff
        const emptyTiles = [];
        for (let r = 1; r < MAP_ROWS - 2; r++) {
            for (let c = 1; c < MAP_COLS - 1; c++) {
                if (!gameMap.isSolid(c, r)) {
                    emptyTiles.push({ c, r });
                }
            }
        }
        if (emptyTiles.length === 0) return null;

        const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        
        // 提高大炸弹(BOMB)的抽取权重（例如权重约30%），其余Buff均匀分布
        const weightedTypes = [
            BUFF_TYPE.BOMB,
            BUFF_TYPE.BOMB,
            BUFF_TYPE.BOMB,
            BUFF_TYPE.FORTRESS,
            BUFF_TYPE.POWER_SHELL,
            BUFF_TYPE.SHIELD,
            BUFF_TYPE.SPEED
        ];
        const randomType = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];

        return new PowerUp(
            tile.c * TILE_SIZE + TILE_SIZE / 2,
            tile.r * TILE_SIZE + TILE_SIZE / 2,
            randomType
        );
    }
}
