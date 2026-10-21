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
        this.baseDestroyed = false;

        // 老家防御罩 Buff 状态
        this.baseFortressActive = false;
        this.baseFortressTimer = 0;
        this.originalSurroundingTiles = [];

        this.init();
    }

    init() {
        this.grid = Array(this.rows).fill(0).map(() => Array(this.cols).fill(TILE_TYPE.EMPTY));
        this.baseDestroyed = false;
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
            this.baseDestroyed = true;
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
        if (this.baseDestroyed) {
            // 老家被毁后的废墟
            ctx.fillStyle = '#212529';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#dc3545';
            ctx.font = '24px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☠', x + TILE_SIZE / 2, y + TILE_SIZE / 2);
            return;
        }

        // 老家基座 (老鹰/科技核心标志)
        ctx.fillStyle = '#102a43';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = '#627d98';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        // 老鹰/盾牌图腾
        ctx.fillStyle = '#f0b429';
        ctx.beginPath();
        const cx = x + TILE_SIZE / 2;
        const cy = y + TILE_SIZE / 2;
        // 展翅飞鹰几何
        ctx.moveTo(cx, cy - 14);
        ctx.lineTo(cx + 14, cy - 4);
        ctx.lineTo(cx + 8, cy + 12);
        ctx.lineTo(cx, cy + 16);
        ctx.lineTo(cx - 8, cy + 12);
        ctx.lineTo(cx - 14, cy - 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#975a16';
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // 闪烁核心宝石
        const pulse = Math.sin(Date.now() / 200) * 0.4 + 0.6;
        ctx.fillStyle = `rgba(245, 101, 101, ${pulse})`;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
