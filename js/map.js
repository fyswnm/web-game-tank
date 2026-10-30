// Map grid and tile management
export const TILE_SIZE = 48; // Logic size per tile (15 tiles = 720x720)
export const MAP_COLS = 15;
export const MAP_ROWS = 15;

export const TILE_TYPE = {
    EMPTY: 0,
    WOOD: 1,      // 可摧毁木墙/砖块
    STONE: 2,     // 坚固石头/钢铁墙（普通炮弹不可破，强力炮弹可破）
    BASE: 3       // 己方老家
};

export class GameMap {
    constructor() {
        this.cols = MAP_COLS;
        this.rows = MAP_ROWS;
        this.grid = [];
        this.baseX = 7;
        this.baseY = 14;
        this.maxBaseHp = 5;
        this.baseHp = 5;
        this.baseDestroyed = false;
        this.baseHitFlashTimer = 0;

        // 老家防御罩 Buff 状态
        this.baseFortressActive = false;
        this.baseFortressTimer = 0;
        this.originalSurroundingTiles = [];

        this.init();
    }

    init() {
        this.grid = Array(this.rows).fill(0).map(() => Array(this.cols).fill(TILE_TYPE.EMPTY));
        this.baseDestroyed = false;
        this.baseHp = this.maxBaseHp;
        this.baseHitFlashTimer = 0;
        this.baseFortressActive = false;
        this.baseFortressTimer = 0;

        this.generateDefaultLevel();
    }

    generateDefaultLevel() {
        // 设置经典坦克大战风格地图
        // 1. 老家位置
        this.grid[this.baseY][this.baseX] = TILE_TYPE.BASE;

        // 2. 老家周围的保护木墙
        this.protectBaseWith(TILE_TYPE.WOOD);

        // 3. 对称分布的木墙(WOOD)和石墙(STONE)
        const symmetricLayout = [
            // [row, col, type]
            // 第2行障碍
            [1, 2, TILE_TYPE.WOOD], [1, 3, TILE_TYPE.WOOD], [1, 11, TILE_TYPE.WOOD], [1, 12, TILE_TYPE.WOOD],
            [2, 2, TILE_TYPE.WOOD], [2, 3, TILE_TYPE.WOOD], [2, 11, TILE_TYPE.WOOD], [2, 12, TILE_TYPE.WOOD],
            [2, 5, TILE_TYPE.STONE], [2, 9, TILE_TYPE.STONE],

            // 中上部
            [4, 1, TILE_TYPE.WOOD], [4, 2, TILE_TYPE.WOOD], [4, 6, TILE_TYPE.WOOD], [4, 8, TILE_TYPE.WOOD], [4, 12, TILE_TYPE.WOOD], [4, 13, TILE_TYPE.WOOD],
            [5, 1, TILE_TYPE.WOOD], [5, 2, TILE_TYPE.WOOD], [5, 6, TILE_TYPE.STONE], [5, 7, TILE_TYPE.STONE], [5, 8, TILE_TYPE.STONE], [5, 12, TILE_TYPE.WOOD], [5, 13, TILE_TYPE.WOOD],
            [6, 4, TILE_TYPE.WOOD], [6, 10, TILE_TYPE.WOOD],

            // 中央核心防区
            [7, 2, TILE_TYPE.STONE], [7, 4, TILE_TYPE.WOOD], [7, 10, TILE_TYPE.WOOD], [7, 12, TILE_TYPE.STONE],
            [8, 2, TILE_TYPE.STONE], [8, 6, TILE_TYPE.WOOD], [8, 8, TILE_TYPE.WOOD], [8, 12, TILE_TYPE.STONE],
            [9, 4, TILE_TYPE.WOOD], [9, 6, TILE_TYPE.STONE], [9, 8, TILE_TYPE.STONE], [9, 10, TILE_TYPE.WOOD],

            // 下部防御群
            [11, 1, TILE_TYPE.WOOD], [11, 2, TILE_TYPE.WOOD], [11, 5, TILE_TYPE.WOOD], [11, 9, TILE_TYPE.WOOD], [11, 12, TILE_TYPE.WOOD], [11, 13, TILE_TYPE.WOOD],
            [12, 1, TILE_TYPE.WOOD], [12, 5, TILE_TYPE.STONE], [12, 9, TILE_TYPE.STONE], [12, 13, TILE_TYPE.WOOD],
            [13, 3, TILE_TYPE.WOOD], [13, 11, TILE_TYPE.WOOD]
        ];

        symmetricLayout.forEach(([r, c, type]) => {
            if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                this.grid[r][c] = type;
            }
        });
    }

    protectBaseWith(type) {
        // 老家周围 3 个方向的墙
        const walls = [
            { r: 13, c: 6 },
            { r: 13, c: 7 },
            { r: 13, c: 8 },
            { r: 14, c: 6 },
            { r: 14, c: 8 }
        ];
        walls.forEach(({ r, c }) => {
            this.grid[r][c] = type;
        });
    }

    activateBaseFortress(duration = 15) {
        // 激活老家金钟罩/钢铁防线
        this.baseFortressActive = true;
        this.baseFortressTimer = duration;
        this.protectBaseWith(TILE_TYPE.STONE);
    }

    update(dt) {
        if (this.baseHitFlashTimer > 0) {
            this.baseHitFlashTimer -= dt;
            if (this.baseHitFlashTimer < 0) this.baseHitFlashTimer = 0;
        }

        if (this.baseFortressActive) {
            this.baseFortressTimer -= dt;
            if (this.baseFortressTimer <= 0) {
                this.baseFortressActive = false;
                this.baseFortressTimer = 0;
                // 恢复为木墙
                this.protectBaseWith(TILE_TYPE.WOOD);
            }
        }
    }

    isSolid(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return true;
        const type = this.grid[row][col];
        return type !== TILE_TYPE.EMPTY;
    }

    isBlockedForMovement(col, row) {
        // 老家、木头、石头都阻挡坦克通行
        return this.isSolid(col, row);
    }

    damageTile(col, row, canBreakStone = false) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
        const type = this.grid[row][col];

        if (type === TILE_TYPE.WOOD) {
            this.grid[row][col] = TILE_TYPE.EMPTY;
            return true;
        }

        if (type === TILE_TYPE.STONE) {
            if (canBreakStone) {
                this.grid[row][col] = TILE_TYPE.EMPTY;
                return true;
            }
            return false; // 石头未被打穿
        }

        if (type === TILE_TYPE.BASE) {
            if (this.baseDestroyed) return false;

            this.baseHp--;
            this.baseHitFlashTimer = 0.35; // 受击震颤红光
            if (this.baseHp <= 0) {
                this.baseHp = 0;
                this.baseDestroyed = true;
            }
            return true;
        }

        return false;
    }

    draw(ctx) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const type = this.grid[r][c];
                const x = c * TILE_SIZE;
                const y = r * TILE_SIZE;

                if (type === TILE_TYPE.WOOD) {
                    this.drawWoodTile(ctx, x, y);
                } else if (type === TILE_TYPE.STONE) {
                    const isFortress = this.baseFortressActive && (
                        (r === 13 && c >= 6 && c <= 8) || (r === 14 && (c === 6 || c === 8))
                    );
                    this.drawStoneTile(ctx, x, y, isFortress);
                } else if (type === TILE_TYPE.BASE) {
                    this.drawBase(ctx, x, y);
                }
            }
        }
    }

    drawWoodTile(ctx, x, y) {
        // 木纹/红砖质感
        ctx.fillStyle = '#b85d18';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // 砖纹缝隙与木纹条理
        ctx.fillStyle = '#542807';
        ctx.fillRect(x, y + 11, TILE_SIZE, 2);
        ctx.fillRect(x, y + 23, TILE_SIZE, 2);
        ctx.fillRect(x, y + 35, TILE_SIZE, 2);
        ctx.fillRect(x + 12, y, 2, 12);
        ctx.fillRect(x + 36, y, 2, 12);
        ctx.fillRect(x + 24, y + 12, 2, 12);
        ctx.fillRect(x + 12, y + 24, 2, 12);
        ctx.fillRect(x + 36, y + 24, 2, 12);

        // 高光边缘
        ctx.fillStyle = 'rgba(255, 200, 120, 0.35)';
        ctx.fillRect(x, y, TILE_SIZE, 2);
        ctx.fillRect(x, y, 2, TILE_SIZE);
    }

    drawStoneTile(ctx, x, y, isFortress = false) {
        // 坚硬花岗岩/钢石质感，老家无敌时呈现金光流转
        if (isFortress) {
            const glow = Math.sin(Date.now() / 150) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 215, 0, ${glow})`;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            ctx.fillStyle = '#d4af37';
            ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else {
            ctx.fillStyle = '#7a8288';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            ctx.fillStyle = '#adb5bd';
            ctx.fillRect(x + 4, y + 4, 18, 18);
            ctx.fillRect(x + 26, y + 26, 18, 18);

            ctx.fillStyle = '#495057';
            ctx.fillRect(x + 24, y + 4, 20, 20);
            ctx.fillRect(x + 4, y + 24, 20, 20);

            // 白色反光与暗角
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(x, y, TILE_SIZE, 2);
            ctx.fillRect(x, y, 2, TILE_SIZE);

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
            ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
        }
    }

    drawBase(ctx, x, y) {
        const cx = x + TILE_SIZE / 2;
        const cy = y + TILE_SIZE / 2;

        if (this.baseDestroyed) {
            // 老家被毁后的废墟
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 1.5, y + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 大号 ☠ 骷髅与 0 HP
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 18px monospace';
            ctx.fillText('☠', cx - 11, cy + 1);

            ctx.font = '900 26px "Arial Black", -apple-system, sans-serif';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3.5;
            ctx.strokeText('0', cx + 10, cy + 1);
            ctx.fillText('0', cx + 10, cy + 1);
            ctx.restore();
            return;
        }

        // 1. 基座底板 (受击时高亮警报红光闪烁)
        if (this.baseHitFlashTimer > 0) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        } else {
            ctx.fillStyle = '#0a0f1d';
        }
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // 2. 基座外边框 (根据血量变色，残血时心跳警报剧烈闪烁)
        if (this.baseHitFlashTimer > 0) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
        } else if (this.baseHp === 1) {
            const warnPulse = Math.sin(Date.now() / 90) * 0.4 + 0.6;
            ctx.strokeStyle = `rgba(239, 68, 68, ${warnPulse})`;
            ctx.lineWidth = 2.5;
        } else if (this.baseHp === 2) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
        }
        ctx.strokeRect(x + 1.5, y + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);

        // 3. 背景暗纹：半透明老鹰图腾 (保留经典坦克老家底蕴)
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = this.baseHp <= 2 ? '#ef4444' : '#f0b429';
        ctx.beginPath();
        const eagleY = cy + 2;
        ctx.moveTo(cx, eagleY - 14);
        ctx.lineTo(cx + 16, eagleY - 4);
        ctx.lineTo(cx + 9, eagleY + 11);
        ctx.lineTo(cx, eagleY + 15);
        ctx.lineTo(cx - 9, eagleY + 11);
        ctx.lineTo(cx - 16, eagleY - 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 4. 老家顶部：5格高亮精准血槽 (Health Bar)
        const barX = x + 3;
        const barY = y + 3;
        const totalBarW = 42;
        const segW = 6.8;
        const segGap = 2;
        const segH = 5;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(barX - 1, barY - 1, totalBarW + 2, segH + 2);

        for (let i = 0; i < this.maxBaseHp; i++) {
            const sx = barX + i * (segW + segGap);
            if (i < this.baseHp) {
                if (this.baseHp >= 4) ctx.fillStyle = '#10b981';
                else if (this.baseHp >= 2) ctx.fillStyle = '#f59e0b';
                else ctx.fillStyle = '#ef4444';
            } else {
                ctx.fillStyle = '#334155';
            }
            ctx.fillRect(sx, barY, segW, segH);
        }

        // 5. 老家中央：超大字号血量展示 (特大号大数字 + 爱心图标，超清醒目)
        const contentY = cy + 5;
        let hpColor = '#4ade80';
        let heartIcon = '❤️';

        if (this.baseHp === 2) {
            hpColor = '#fde047';
            heartIcon = '❤️';
        } else if (this.baseHp === 1) {
            hpColor = '#ff4d4f';
            heartIcon = Math.sin(Date.now() / 120) > 0 ? '💔' : '⚠️';
        }

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 左侧爱心图标 (15px)
        ctx.font = '15px sans-serif';
        ctx.fillText(heartIcon, cx - 11, contentY);

        // 右侧特大号血量大数字 (26px 极粗特大号数字！)
        ctx.font = '900 26px "Arial Black", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        // 黑色外描边提升对比度
        ctx.strokeStyle = '#050b14';
        ctx.lineWidth = 3.5;
        ctx.strokeText(String(this.baseHp), cx + 10, contentY + 1);

        // 高亮大数字填充
        ctx.fillStyle = hpColor;
        ctx.fillText(String(this.baseHp), cx + 10, contentY + 1);
        ctx.restore();

        // 6. 受击瞬间浮动大红字警告 (Damage Popup)
        if (this.baseHitFlashTimer > 0) {
            ctx.save();
            ctx.fillStyle = '#ff2222';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 6;
            ctx.font = '900 15px "Arial Black", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('-1 HP', cx, y - 6);
            ctx.restore();
        }
    }
}
